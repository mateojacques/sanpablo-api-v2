import { z } from 'zod';
import { importJobStatuses } from '../../db/schema/import-jobs';

// ============ Request Schemas ============

// List import jobs query
export const listImportsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(importJobStatuses).optional(),
});

// Get import job by ID
export const importIdParamSchema = z.object({
  id: z.string().uuid('Invalid import job ID'),
});

// ============ Type Exports ============

export type ListImportsQuery = z.infer<typeof listImportsQuerySchema>;

// ============ CSV Row Schema (for validation) ============

export const csvProductRowSchema = z.object({
  sku: z.string().min(1).max(100),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  regular_price: z.coerce.number().positive(),
  sale_price: z.coerce.number().positive().optional().nullable(),
  special_price: z.coerce.number().positive().optional().nullable(),
  category_slug: z.string().optional().nullable(),
  image_url: z.string().url().optional().nullable(),
  video_url: z.string().url().optional().nullable(),
  weight: z.coerce.number().positive().optional().nullable(),
  dimension_length: z.coerce.number().positive().optional().nullable(),
  dimension_width: z.coerce.number().positive().optional().nullable(),
  dimension_height: z.coerce.number().positive().optional().nullable(),
  is_active: z.coerce.boolean().default(true),
});

export type CsvProductRow = z.infer<typeof csvProductRowSchema>;

// Expected CSV headers
export const CSV_HEADERS = [
  'sku',
  'name',
  'description',
  'regular_price',
  'sale_price',
  'special_price',
  'category_slug',
  'image_url',
  'video_url',
  'weight',
  'dimension_length',
  'dimension_width',
  'dimension_height',
  'is_active',
];

// ============ Bulk Images Import Schema ============

// Schema for a single product image in bulk import
export const bulkImageRowSchema = z.object({
  sku: z.string().min(1).max(100),
  image_urls: z.array(z.string().url()).optional(),
  images: z
    .array(
      z.object({
        url: z.string().url(),
        path: z.string().optional(),
        checksum: z.string().optional(),
        status: z.string().optional(),
      })
    )
    .optional(),
});

export type BulkImageRow = z.infer<typeof bulkImageRowSchema>;

// Schema for bulk images import job creation (body)
export const bulkImagesImportSchema = z.object({
  fileName: z.string().min(1),
  imageFieldSource: z
    .enum(['image_urls', 'images'])
    .default('image_urls')
    .describe(
      'Which field to use for image URLs: "image_urls" (array of strings) or "images" (array of objects with url property)'
    ),
});
