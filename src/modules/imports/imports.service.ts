import { eq, and, desc, sql } from 'drizzle-orm';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { SendMessageCommand } from '@aws-sdk/client-sqs';
import { db } from '../../config/database.js';
import { s3Client, sqsClient } from '../../config/aws.js';
import { env } from '../../config/env.js';
import { importJobs, products } from '../../db/schema/index.js';
import { AppError } from '../../shared/utils/errors.js';
import type { ListImportsQuery } from './imports.schemas.js';

const CHUNK_SIZE = 100; // Process 100 rows per chunk

export const importsService = {
  /**
   * Create a new import job and upload CSV to S3
   */
  async createImportJob(
    file: Buffer,
    filename: string,
    userId: string
  ): Promise<typeof importJobs.$inferSelect> {
    // Validate file extension
    if (!filename.toLowerCase().endsWith('.csv')) {
      throw new AppError(400, 'INVALID_FILE_TYPE', 'Only CSV files are allowed');
    }

    // Generate S3 key
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileKey = `imports/${timestamp}-${sanitizedFilename}`;

    // Upload CSV to S3
    await s3Client.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: fileKey,
        Body: file,
        ContentType: 'text/csv',
      })
    );

    // Count rows (excluding header)
    const content = file.toString('utf-8');
    const lines = content.split('\n').filter((line) => line.trim());
    const totalRows = Math.max(0, lines.length - 1); // Exclude header

    // Create import job
    const [job] = await db
      .insert(importJobs)
      .values({
        userId,
        type: 'csv',
        filename,
        fileKey,
        fileSize: file.length,
        status: 'pending',
        totalRows,
        processedRows: 0,
        successRows: 0,
        errorRows: 0,
      })
      .returning();

    // Send message to SQS queue (if configured)
    if (env.SQS_IMPORT_QUEUE_URL) {
      await sqsClient.send(
        new SendMessageCommand({
          QueueUrl: env.SQS_IMPORT_QUEUE_URL,
          MessageBody: JSON.stringify({
            jobId: job.id,
            fileKey,
          }),
        })
      );
    } else {
      // If no queue, process immediately (for development)
      this.processImportJob(job.id).catch((err) => {
        console.error('Import job processing failed:', err);
      });
    }

    return job;
  },

  /**
   * List import jobs with pagination
   */
  async list(query: ListImportsQuery, userId?: string, isAdmin = false) {
    const { page, limit, status } = query;
    const offset = (page - 1) * limit;

    // Build conditions
    const conditions = [];

    if (!isAdmin && userId) {
      conditions.push(eq(importJobs.userId, userId));
    }

    if (status) {
      conditions.push(eq(importJobs.status, status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(importJobs)
      .where(whereClause);

    // Get jobs
    const result = await db.query.importJobs.findMany({
      where: whereClause,
      orderBy: [desc(importJobs.createdAt)],
      limit,
      offset,
    });

    return {
      data: result,
      meta: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    };
  },

  /**
   * Get import job by ID
   */
  async getById(jobId: string, userId?: string, isAdmin = false) {
    const job = await db.query.importJobs.findFirst({
      where: eq(importJobs.id, jobId),
    });

    if (!job) {
      throw new AppError(404, 'IMPORT_JOB_NOT_FOUND', 'Import job not found');
    }

    if (!isAdmin && job.userId !== userId) {
      throw new AppError(403, 'FORBIDDEN', 'Access denied');
    }

    // Parse errors if present
    let errors: Array<{ row: number; error: string }> = [];
    if (job.errors) {
      try {
        errors = JSON.parse(job.errors);
      } catch {
        errors = [];
      }
    }

    return {
      ...job,
      errors,
    };
  },

  /**
   * Cancel import job (if pending)
   */
  async cancel(jobId: string, userId?: string, isAdmin = false) {
    const job = await this.getById(jobId, userId, isAdmin);

    if (job.status !== 'pending') {
      throw new AppError(400, 'CANNOT_CANCEL', 'Only pending jobs can be cancelled');
    }

    const [updated] = await db
      .update(importJobs)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(importJobs.id, jobId))
      .returning();

    return updated;
  },

  /**
   * Process import job (called by worker or directly)
   */
  async processImportJob(jobId: string): Promise<void> {
    // Update status to processing
    await db
      .update(importJobs)
      .set({
        status: 'processing',
        startedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(importJobs.id, jobId));

    const job = await db.query.importJobs.findFirst({
      where: eq(importJobs.id, jobId),
    });

    if (!job) {
      throw new Error(`Import job ${jobId} not found`);
    }

    // Download CSV from S3
    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: job.fileKey,
      })
    );

    const content = await response.Body?.transformToString();
    if (!content) {
      throw new Error('Empty CSV file');
    }

    // Parse CSV
    const lines = content.split('\n').filter((line) => line.trim());
    const headers = this.parseCsvLine(lines[0]);
    const rows = lines.slice(1);

    let processedRows = 0;
    let successRows = 0;
    let errorRows = 0;
    const errors: Array<{ row: number; error: string }> = [];

    // Get all categories for lookup
    const allCategories = await db.query.categories.findMany();
    const categoryBySlug = new Map(allCategories.map((c) => [c.slug, c]));

    // Process in chunks
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);

      for (let j = 0; j < chunk.length; j++) {
        const rowNum = i + j + 2; // +2 for 1-based indexing and header
        const row = chunk[j];

        try {
          const values = this.parseCsvLine(row);
          const rowData = this.parseRow(headers, values);

          // Find category if specified
          let categoryId: string | null = null;
          if (rowData.category_slug) {
            const category = categoryBySlug.get(rowData.category_slug);
            if (category) {
              categoryId = category.id;
            }
          }

          // Upsert product by SKU
          const existing = await db.query.products.findFirst({
            where: eq(products.sku, rowData.sku),
          });

          if (existing) {
            // Update
            await db
              .update(products)
              .set({
                name: rowData.name,
                description: rowData.description || null,
                regularPrice: rowData.regular_price.toString(),
                salePrice: rowData.sale_price?.toString() || null,
                specialPrice: rowData.special_price?.toString() || null,
                categoryId,
                imageUrl: rowData.image_url || null,
                videoUrl: rowData.video_url || null,
                weight: rowData.weight?.toString() || null,
                dimensionLength: rowData.dimension_length?.toString() || null,
                dimensionWidth: rowData.dimension_width?.toString() || null,
                dimensionHeight: rowData.dimension_height?.toString() || null,
                isActive: rowData.is_active,
                updatedAt: new Date(),
              })
              .where(eq(products.id, existing.id));
          } else {
            // Insert
            await db.insert(products).values({
              sku: rowData.sku,
              name: rowData.name,
              description: rowData.description || null,
              regularPrice: rowData.regular_price.toString(),
              salePrice: rowData.sale_price?.toString() || null,
              specialPrice: rowData.special_price?.toString() || null,
              categoryId,
              imageUrl: rowData.image_url || null,
              videoUrl: rowData.video_url || null,
              weight: rowData.weight?.toString() || null,
              dimensionLength: rowData.dimension_length?.toString() || null,
              dimensionWidth: rowData.dimension_width?.toString() || null,
              dimensionHeight: rowData.dimension_height?.toString() || null,
              isActive: rowData.is_active,
            });
          }

          successRows++;
        } catch (error) {
          errorRows++;
          errors.push({
            row: rowNum,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }

        processedRows++;
      }

      // Update progress after each chunk
      await db
        .update(importJobs)
        .set({
          processedRows,
          successRows,
          errorRows,
          updatedAt: new Date(),
        })
        .where(eq(importJobs.id, jobId));
    }

    // Mark as completed
    await db
      .update(importJobs)
      .set({
        status: errorRows > 0 && successRows === 0 ? 'failed' : 'completed',
        processedRows,
        successRows,
        errorRows,
        errors: errors.length > 0 ? JSON.stringify(errors.slice(0, 100)) : null, // Limit stored errors
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(importJobs.id, jobId));
  },

  /**
   * Parse a CSV line handling quoted values
   */
  parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  },

  /**
   * Parse row values into object
   */
  parseRow(
    headers: string[],
    values: string[]
  ): {
    sku: string;
    name: string;
    description?: string;
    regular_price: number;
    sale_price?: number | null;
    special_price?: number | null;
    category_slug?: string | null;
    image_url?: string | null;
    video_url?: string | null;
    weight?: number | null;
    dimension_length?: number | null;
    dimension_width?: number | null;
    dimension_height?: number | null;
    is_active: boolean;
  } {
    const obj: Record<string, string> = {};
    headers.forEach((header, i) => {
      obj[header.toLowerCase().trim()] = values[i] || '';
    });

    // Validate required fields
    if (!obj.sku) throw new Error('SKU is required');
    if (!obj.name) throw new Error('Name is required');
    if (!obj.regular_price) throw new Error('Regular price is required');

    const regularPrice = parseFloat(obj.regular_price);
    if (isNaN(regularPrice) || regularPrice <= 0) {
      throw new Error('Invalid regular price');
    }

    return {
      sku: obj.sku,
      name: obj.name,
      description: obj.description || undefined,
      regular_price: regularPrice,
      sale_price: obj.sale_price ? parseFloat(obj.sale_price) || null : null,
      special_price: obj.special_price ? parseFloat(obj.special_price) || null : null,
      category_slug: obj.category_slug || null,
      image_url: obj.image_url || null,
      video_url: obj.video_url || null,
      weight: obj.weight ? parseFloat(obj.weight) || null : null,
      dimension_length: obj.dimension_length
        ? parseFloat(obj.dimension_length) || null
        : null,
      dimension_width: obj.dimension_width
        ? parseFloat(obj.dimension_width) || null
        : null,
      dimension_height: obj.dimension_height
        ? parseFloat(obj.dimension_height) || null
        : null,
      is_active: obj.is_active?.toLowerCase() !== 'false' && obj.is_active !== '0',
    };
  },

  /**
   * Create a bulk images import job and upload JSON to S3
   */
  async createBulkImagesImportJob(
    file: Buffer,
    filename: string,
    userId: string
  ): Promise<typeof importJobs.$inferSelect> {
    // Validate file extension
    if (!filename.toLowerCase().endsWith('.json')) {
      throw new AppError(
        400,
        'INVALID_FILE_TYPE',
        'Only JSON files are allowed for bulk images import'
      );
    }

    // Generate S3 key
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileKey = `imports/bulk-images/${timestamp}-${sanitizedFilename}`;

    // Upload JSON to S3
    await s3Client.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: fileKey,
        Body: file,
        ContentType: 'application/json',
      })
    );

    // Parse and count products
    let totalRows = 0;
    try {
      const content = file.toString('utf-8');
      const data = JSON.parse(content);
      totalRows = Array.isArray(data) ? data.length : 0;
    } catch {
      totalRows = 0;
    }

    // Create import job with type 'bulk_images'
    const [job] = await db
      .insert(importJobs)
      .values({
        userId,
        type: 'bulk_images',
        filename,
        fileKey,
        fileSize: file.length,
        status: 'pending',
        totalRows,
        processedRows: 0,
        successRows: 0,
        errorRows: 0,
      })
      .returning();

    // Send message to SQS queue (if configured)
    if (env.SQS_IMPORT_QUEUE_URL) {
      await sqsClient.send(
        new SendMessageCommand({
          QueueUrl: env.SQS_IMPORT_QUEUE_URL,
          MessageBody: JSON.stringify({
            jobId: job.id,
            fileKey,
            type: 'bulk_images',
          }),
        })
      );
    } else {
      // If no queue, process immediately (for development)
      this.processBulkImagesJob(job.id).catch((err) => {
        console.error('Bulk images import job processing failed:', err);
      });
    }

    return job;
  },

  /**
   * Process bulk images import job
   */
  async processBulkImagesJob(jobId: string): Promise<void> {
    try {
      // Update status to processing
      await db
        .update(importJobs)
        .set({
          status: 'processing',
          startedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(importJobs.id, jobId));

      const job = await db.query.importJobs.findFirst({
        where: eq(importJobs.id, jobId),
      });

      if (!job) {
        throw new Error(`Import job ${jobId} not found`);
      }

      // Download JSON from S3
      const response = await s3Client.send(
        new GetObjectCommand({
          Bucket: env.S3_BUCKET,
          Key: job.fileKey,
        })
      );

      const content = await response.Body?.transformToString();
      if (!content) {
        throw new Error('Empty JSON file');
      }

      // Parse JSON - handle both file as string and raw JSON
      let data: unknown[];
      try {
        // Try parsing as JSON directly first
        data = JSON.parse(content);
        if (!Array.isArray(data)) {
          throw new Error('JSON must be an array');
        }
      } catch (parseError) {
        throw new Error(
          `Invalid JSON format: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`
        );
      }

      let processedRows = 0;
      let successRows = 0;
      let errorRows = 0;
      const errors: Array<{ row: number; error: string }> = [];

      // Process in chunks
      for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        const chunk = data.slice(i, i + CHUNK_SIZE);

        for (let j = 0; j < chunk.length; j++) {
          const rowNum = i + j + 1;
          const item = chunk[j];

          try {
            // Skip non-object items
            if (!item || typeof item !== 'object') {
              throw new Error('Each item must be an object');
            }

            const itemObj = item as Record<string, unknown>;

            // Extract SKU and image URLs
            const sku = itemObj.sku;
            const imageUrls = itemObj.image_urls as string[] | undefined;
            const images = itemObj.images as Array<{ url: string }> | undefined;

            // Validate SKU
            if (!sku || typeof sku !== 'string' || !sku.trim()) {
              throw new Error('SKU is required and must be a non-empty string');
            }

            // Determine which image URL to use (prefer first image URL from either source)
            let imageUrl: string | null = null;

            if (imageUrls && Array.isArray(imageUrls) && imageUrls.length > 0) {
              imageUrl = imageUrls[0]?.toString() || null;
            }

            if (!imageUrl && images && Array.isArray(images) && images.length > 0) {
              const firstImage = images[0];
              if (firstImage && typeof firstImage === 'object' && 'url' in firstImage) {
                imageUrl = (firstImage.url as string) || null;
              }
            }

            if (!imageUrl) {
              throw new Error('No image URL found in image_urls or images');
            }

            // Find and update product by SKU
            const product = await db.query.products.findFirst({
              where: eq(products.sku, sku.trim()),
            });

            if (product) {
              await db
                .update(products)
                .set({
                  imageUrl,
                  updatedAt: new Date(),
                })
                .where(eq(products.id, product.id));
              successRows++;
            } else {
              // SKU not found, still count as processed but not successful
              // Do not increment errorRows for missing SKUs
            }
          } catch (itemError) {
            errorRows++;
            errors.push({
              row: rowNum,
              error: itemError instanceof Error ? itemError.message : 'Unknown error',
            });
          }

          processedRows++;
        }

        // Update progress after each chunk
        await db
          .update(importJobs)
          .set({
            processedRows,
            successRows,
            errorRows,
            updatedAt: new Date(),
          })
          .where(eq(importJobs.id, jobId));
      }

      // Mark as completed
      await db
        .update(importJobs)
        .set({
          status:
            processedRows === 0 || (errorRows > 0 && successRows === 0)
              ? 'failed'
              : 'completed',
          processedRows,
          successRows,
          errorRows,
          errors: errors.length > 0 ? JSON.stringify(errors.slice(0, 100)) : null,
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(importJobs.id, jobId));
    } catch (jobError) {
      // If there's an error processing the job, mark it as failed
      await db
        .update(importJobs)
        .set({
          status: 'failed',
          errors: JSON.stringify([
            {
              row: 0,
              error: jobError instanceof Error ? jobError.message : 'Unknown error',
            },
          ]),
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(importJobs.id, jobId))
        .catch(() => {
          // Silently fail if we can't update the job
        });

      throw jobError;
    }
  },
};
