import { eq, and, isNull, ilike, gte, lte, asc, desc, sql, ne } from 'drizzle-orm';

import { db } from '../../config/database';
import { products, type Product } from '../../db/schema/products';
import { categories } from '../../db/schema/categories.js';
import { notFound, conflict, badRequest } from '../../shared/utils/errors';
import type { PaginatedResult } from '../../shared/types/index';

import type {
  CreateProductInput,
  UpdateProductInput,
  ListProductsQuery,
} from './products.schemas';

// Product with category info
export interface ProductWithCategory extends Product {
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

/**
 * Products service - handles all product business logic
 */
export const productsService = {
  /**
   * List products with filtering, search, and pagination
   */
  async findAll(query: ListProductsQuery): Promise<PaginatedResult<ProductWithCategory>> {
    const {
      page,
      limit,
      search,
      categoryId,
      categorySlug,
      minPrice,
      maxPrice,
      isActive,
      sortBy,
      sortOrder,
    } = query;
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [isNull(products.deletedAt)];

    if (search) {
      conditions.push(
        sql`(${ilike(products.name, `%${search}%`)} OR ${ilike(products.sku, `%${search}%`)})`
      );
    }

    if (categoryId) {
      conditions.push(eq(products.categoryId, categoryId));
    }

    if (categorySlug) {
      // Get category by slug first
      const [cat] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(and(eq(categories.slug, categorySlug), isNull(categories.deletedAt)))
        .limit(1);

      if (cat) {
        conditions.push(eq(products.categoryId, cat.id));
      } else {
        // No matching category, return empty
        return {
          data: [],
          meta: { page, limit, total: 0, totalPages: 0 },
        };
      }
    }

    if (minPrice !== undefined) {
      conditions.push(gte(products.regularPrice, minPrice.toString()));
    }

    if (maxPrice !== undefined) {
      conditions.push(lte(products.regularPrice, maxPrice.toString()));
    }

    if (isActive !== undefined) {
      conditions.push(eq(products.isActive, isActive));
    }

    const whereClause = and(...conditions);

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(whereClause);

    // Build order by
    const orderByColumn = {
      name: products.name,
      price: products.regularPrice,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
    }[sortBy];

    const orderByFn = sortOrder === 'asc' ? asc : desc;

    // Get products with category
    const productList = await db
      .select({
        product: products,
        category: {
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
        },
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(whereClause)
      .orderBy(orderByFn(orderByColumn))
      .limit(limit)
      .offset(offset);

    const data: ProductWithCategory[] = productList.map((row) => ({
      ...row.product,
      category: row.category?.id ? row.category : null,
    }));

    return {
      data,
      meta: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    };
  },

  /**
   * Get a single product by ID
   */
  async findById(id: string): Promise<ProductWithCategory> {
    const [result] = await db
      .select({
        product: products,
        category: {
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
        },
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(eq(products.id, id), isNull(products.deletedAt)))
      .limit(1);

    if (!result) {
      throw notFound('Product', id);
    }

    return {
      ...result.product,
      category: result.category?.id ? result.category : null,
    };
  },

  /**
   * Get a single product by SKU
   */
  async findBySku(sku: string): Promise<ProductWithCategory> {
    const [result] = await db
      .select({
        product: products,
        category: {
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
        },
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(eq(products.sku, sku.toUpperCase()), isNull(products.deletedAt)))
      .limit(1);

    if (!result) {
      throw notFound('Product');
    }

    return {
      ...result.product,
      category: result.category?.id ? result.category : null,
    };
  },

  /**
   * Create a new product
   */
  async create(input: CreateProductInput): Promise<Product> {
    // Check SKU uniqueness
    const existingSku = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.sku, input.sku), isNull(products.deletedAt)))
      .limit(1);

    if (existingSku.length > 0) {
      throw conflict(
        'SKU_ALREADY_EXISTS',
        `Product with SKU '${input.sku}' already exists`
      );
    }

    // Validate category exists if provided
    if (input.categoryId) {
      const [cat] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(and(eq(categories.id, input.categoryId), isNull(categories.deletedAt)))
        .limit(1);

      if (!cat) {
        throw badRequest('INVALID_CATEGORY', 'Category not found');
      }
    }

    const [created] = await db
      .insert(products)
      .values({
        sku: input.sku,
        name: input.name,
        description: input.description,
        regularPrice: input.regularPrice.toString(),
        salePrice: input.salePrice?.toString() ?? null,
        specialPrice: input.specialPrice?.toString() ?? null,
        imageUrl: input.imageUrl ?? null,
        thumbnailUrl: input.thumbnailUrl ?? null,
        videoUrl: input.videoUrl ?? null,
        weight: input.weight?.toString() ?? null,
        dimensionLength: input.dimensionLength?.toString() ?? null,
        dimensionWidth: input.dimensionWidth?.toString() ?? null,
        dimensionHeight: input.dimensionHeight?.toString() ?? null,
        categoryId: input.categoryId ?? null,
        isActive: input.isActive,
      })
      .returning();

    return created;
  },

  /**
   * Update a product
   */
  async update(id: string, input: UpdateProductInput): Promise<Product> {
    // Verify product exists
    await this.findById(id);

    // Check SKU uniqueness if being updated
    if (input.sku) {
      const existingSku = await db
        .select({ id: products.id })
        .from(products)
        .where(
          and(
            eq(products.sku, input.sku),
            isNull(products.deletedAt),
            ne(products.id, id)
          )
        )
        .limit(1);

      if (existingSku.length > 0) {
        throw conflict(
          'SKU_ALREADY_EXISTS',
          `Product with SKU '${input.sku}' already exists`
        );
      }
    }

    // Validate category exists if being updated
    if (input.categoryId) {
      const [cat] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(and(eq(categories.id, input.categoryId), isNull(categories.deletedAt)))
        .limit(1);

      if (!cat) {
        throw badRequest('INVALID_CATEGORY', 'Category not found');
      }
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (input.sku !== undefined) updateData.sku = input.sku;
    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.regularPrice !== undefined)
      updateData.regularPrice = input.regularPrice.toString();
    if (input.salePrice !== undefined)
      updateData.salePrice = input.salePrice?.toString() ?? null;
    if (input.specialPrice !== undefined)
      updateData.specialPrice = input.specialPrice?.toString() ?? null;
    if (input.imageUrl !== undefined) updateData.imageUrl = input.imageUrl;
    if (input.thumbnailUrl !== undefined) updateData.thumbnailUrl = input.thumbnailUrl;
    if (input.videoUrl !== undefined) updateData.videoUrl = input.videoUrl;
    if (input.weight !== undefined) updateData.weight = input.weight?.toString() ?? null;
    if (input.dimensionLength !== undefined)
      updateData.dimensionLength = input.dimensionLength?.toString() ?? null;
    if (input.dimensionWidth !== undefined)
      updateData.dimensionWidth = input.dimensionWidth?.toString() ?? null;
    if (input.dimensionHeight !== undefined)
      updateData.dimensionHeight = input.dimensionHeight?.toString() ?? null;
    if (input.categoryId !== undefined) updateData.categoryId = input.categoryId;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;

    const [updated] = await db
      .update(products)
      .set(updateData)
      .where(eq(products.id, id))
      .returning();

    return updated;
  },

  /**
   * Soft delete a product
   */
  async delete(id: string): Promise<void> {
    // Verify exists
    await this.findById(id);

    await db
      .update(products)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(products.id, id));
  },

  /**
   * Update product images
   */
  async updateImages(
    id: string,
    imageUrl: string | null,
    thumbnailUrl: string | null
  ): Promise<Product> {
    // Verify exists
    await this.findById(id);

    const [updated] = await db
      .update(products)
      .set({
        imageUrl,
        thumbnailUrl,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning();

    return updated;
  },
};
