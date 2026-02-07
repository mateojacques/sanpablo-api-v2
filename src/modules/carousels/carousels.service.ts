import { eq, and, isNull, asc, ne, inArray } from 'drizzle-orm';

import { db } from '../../config/database';
import {
  carousels,
  carouselItems,
  type Carousel,
  type CarouselItem,
} from '../../db/schema/carousels';
import { products, type Product } from '../../db/schema/products';
import { categories, type Category } from '../../db/schema/categories.js';
import { notFound, conflict, badRequest } from '../../shared/utils/errors';

import type {
  CreateCarouselInput,
  UpdateCarouselInput,
  CarouselProductsInput,
  ReorderCarouselItemsInput,
  ReorderCarouselsInput,
  ListCarouselsQuery,
} from './carousels.schemas';
import { slugify } from './carousels.schemas';

// Carousel with products for frontend consumption
export interface CarouselWithProducts extends Carousel {
  products: Product[];
  category: Category | null;
}

/**
 * Carousels service - handles all carousel business logic
 */
export const carouselsService = {
  /**
   * Get all carousels ordered by sortOrder
   */
  async findAll(query?: ListCarouselsQuery): Promise<Carousel[]> {
    const conditions = [isNull(carousels.deletedAt)];

    if (query?.isActive !== undefined) {
      conditions.push(eq(carousels.isActive, query.isActive));
    }
    if (query?.type) {
      conditions.push(eq(carousels.type, query.type));
    }

    return db
      .select()
      .from(carousels)
      .where(and(...conditions))
      .orderBy(asc(carousels.sortOrder), asc(carousels.name));
  },

  /**
   * Get all active carousels with their products (for storefront)
   */
  async findAllWithProducts(): Promise<CarouselWithProducts[]> {
    const allCarousels = await db
      .select()
      .from(carousels)
      .where(and(isNull(carousels.deletedAt), eq(carousels.isActive, true)))
      .orderBy(asc(carousels.sortOrder));

    const result: CarouselWithProducts[] = [];

    for (const carousel of allCarousels) {
      const carouselWithProducts = await this.getCarouselWithProducts(carousel);
      result.push(carouselWithProducts);
    }

    return result;
  },

  /**
   * Get a single carousel by ID
   */
  async findById(id: string): Promise<Carousel> {
    const [carousel] = await db
      .select()
      .from(carousels)
      .where(and(eq(carousels.id, id), isNull(carousels.deletedAt)))
      .limit(1);

    if (!carousel) {
      throw notFound('Carousel', id);
    }

    return carousel;
  },

  /**
   * Get a single carousel by ID with products
   */
  async findByIdWithProducts(id: string): Promise<CarouselWithProducts> {
    const carousel = await this.findById(id);
    return this.getCarouselWithProducts(carousel);
  },

  /**
   * Get a single carousel by slug
   */
  async findBySlug(slug: string): Promise<Carousel> {
    const [carousel] = await db
      .select()
      .from(carousels)
      .where(and(eq(carousels.slug, slug), isNull(carousels.deletedAt)))
      .limit(1);

    if (!carousel) {
      throw notFound('Carousel');
    }

    return carousel;
  },

  /**
   * Get a single carousel by slug with products
   */
  async findBySlugWithProducts(slug: string): Promise<CarouselWithProducts> {
    const carousel = await this.findBySlug(slug);
    return this.getCarouselWithProducts(carousel);
  },

  /**
   * Helper: Get products for a carousel
   */
  async getCarouselWithProducts(carousel: Carousel): Promise<CarouselWithProducts> {
    let carouselProducts: Product[] = [];
    let category: Category | null = null;

    if (carousel.type === 'category' && carousel.categoryId) {
      // Get category info
      const [cat] = await db
        .select()
        .from(categories)
        .where(and(eq(categories.id, carousel.categoryId), isNull(categories.deletedAt)))
        .limit(1);

      category = cat || null;

      // Get all products in the category
      carouselProducts = await db
        .select()
        .from(products)
        .where(
          and(
            eq(products.categoryId, carousel.categoryId),
            eq(products.isActive, true),
            isNull(products.deletedAt)
          )
        )
        .orderBy(asc(products.name));
    } else if (carousel.type === 'manual') {
      // Get manually selected products through carousel_items
      const items = await db
        .select({
          product: products,
          sortOrder: carouselItems.sortOrder,
        })
        .from(carouselItems)
        .innerJoin(products, eq(carouselItems.productId, products.id))
        .where(
          and(
            eq(carouselItems.carouselId, carousel.id),
            eq(products.isActive, true),
            isNull(products.deletedAt)
          )
        )
        .orderBy(asc(carouselItems.sortOrder));

      carouselProducts = items.map((item) => item.product);
    }

    return {
      ...carousel,
      products: carouselProducts,
      category,
    };
  },

  /**
   * Create a new carousel
   */
  async create(input: CreateCarouselInput): Promise<Carousel> {
    // Generate slug from name if not provided
    const slug = input.slug || slugify(input.name);

    // Check for slug uniqueness
    const existingSlug = await db
      .select({ id: carousels.id })
      .from(carousels)
      .where(and(eq(carousels.slug, slug), isNull(carousels.deletedAt)))
      .limit(1);

    if (existingSlug.length > 0) {
      throw conflict(
        'SLUG_ALREADY_EXISTS',
        `Carousel with slug '${slug}' already exists`
      );
    }

    // Validate category exists if type is category
    if (input.type === 'category' && input.categoryId) {
      const [cat] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(and(eq(categories.id, input.categoryId), isNull(categories.deletedAt)))
        .limit(1);

      if (!cat) {
        throw badRequest(
          'INVALID_CATEGORY',
          `Category with id '${input.categoryId}' not found`
        );
      }
    }

    // Validate products exist if provided
    if (input.productIds && input.productIds.length > 0) {
      const existingProducts = await db
        .select({ id: products.id })
        .from(products)
        .where(and(inArray(products.id, input.productIds), isNull(products.deletedAt)));

      const existingIds = new Set(existingProducts.map((p) => p.id));
      const missingIds = input.productIds.filter((id) => !existingIds.has(id));

      if (missingIds.length > 0) {
        throw badRequest(
          'INVALID_PRODUCTS',
          `Products not found: ${missingIds.join(', ')}`
        );
      }
    }

    // Create carousel
    const [created] = await db
      .insert(carousels)
      .values({
        name: input.name,
        slug,
        description: input.description,
        type: input.type,
        categoryId: input.type === 'category' ? input.categoryId : null,
        sortOrder: input.sortOrder,
        isActive: input.isActive,
      })
      .returning();

    // If manual type with products, add them
    if (input.type === 'manual' && input.productIds && input.productIds.length > 0) {
      await this.addProducts(created.id, { productIds: input.productIds });
    }

    return created;
  },

  /**
   * Update a carousel
   */
  async update(id: string, input: UpdateCarouselInput): Promise<Carousel> {
    // Verify carousel exists
    const existing = await this.findById(id);

    // Check slug uniqueness if being updated
    if (input.slug) {
      const existingSlug = await db
        .select({ id: carousels.id })
        .from(carousels)
        .where(
          and(
            eq(carousels.slug, input.slug),
            isNull(carousels.deletedAt),
            ne(carousels.id, id)
          )
        )
        .limit(1);

      if (existingSlug.length > 0) {
        throw conflict(
          'SLUG_ALREADY_EXISTS',
          `Carousel with slug '${input.slug}' already exists`
        );
      }
    }

    // Validate category if changing to category type
    const newType = input.type || existing.type;
    const newCategoryId =
      input.categoryId !== undefined ? input.categoryId : existing.categoryId;

    if (newType === 'category' && newCategoryId) {
      const [cat] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(and(eq(categories.id, newCategoryId), isNull(categories.deletedAt)))
        .limit(1);

      if (!cat) {
        throw badRequest(
          'INVALID_CATEGORY',
          `Category with id '${newCategoryId}' not found`
        );
      }
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.slug !== undefined) updateData.slug = input.slug;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.type !== undefined) updateData.type = input.type;
    if (input.categoryId !== undefined) updateData.categoryId = input.categoryId;
    if (input.sortOrder !== undefined) updateData.sortOrder = input.sortOrder;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;

    const [updated] = await db
      .update(carousels)
      .set(updateData)
      .where(eq(carousels.id, id))
      .returning();

    return updated;
  },

  /**
   * Soft delete a carousel
   */
  async delete(id: string): Promise<void> {
    // Verify exists
    await this.findById(id);

    await db
      .update(carousels)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(carousels.id, id));
  },

  /**
   * Add products to a manual carousel
   */
  async addProducts(
    carouselId: string,
    input: CarouselProductsInput
  ): Promise<CarouselItem[]> {
    const carousel = await this.findById(carouselId);

    if (carousel.type !== 'manual') {
      throw badRequest(
        'INVALID_CAROUSEL_TYPE',
        'Cannot add products to a category-based carousel'
      );
    }

    // Validate products exist
    const existingProducts = await db
      .select({ id: products.id })
      .from(products)
      .where(and(inArray(products.id, input.productIds), isNull(products.deletedAt)));

    const existingIds = new Set(existingProducts.map((p) => p.id));
    const missingIds = input.productIds.filter((id) => !existingIds.has(id));

    if (missingIds.length > 0) {
      throw badRequest(
        'INVALID_PRODUCTS',
        `Products not found: ${missingIds.join(', ')}`
      );
    }

    // Get current max sort order
    const existingItems = await db
      .select({ sortOrder: carouselItems.sortOrder })
      .from(carouselItems)
      .where(eq(carouselItems.carouselId, carouselId))
      .orderBy(asc(carouselItems.sortOrder));

    const maxSortOrder =
      existingItems.length > 0 ? Math.max(...existingItems.map((i) => i.sortOrder)) : -1;

    // Check which products are already in the carousel
    const alreadyAdded = await db
      .select({ productId: carouselItems.productId })
      .from(carouselItems)
      .where(
        and(
          eq(carouselItems.carouselId, carouselId),
          inArray(carouselItems.productId, input.productIds)
        )
      );

    const alreadyAddedIds = new Set(alreadyAdded.map((i) => i.productId));
    const newProductIds = input.productIds.filter((id) => !alreadyAddedIds.has(id));

    if (newProductIds.length === 0) {
      // All products already in carousel
      return db
        .select()
        .from(carouselItems)
        .where(eq(carouselItems.carouselId, carouselId))
        .orderBy(asc(carouselItems.sortOrder));
    }

    // Add new products
    const newItems = newProductIds.map((productId, index) => ({
      carouselId,
      productId,
      sortOrder: maxSortOrder + 1 + index,
    }));

    await db.insert(carouselItems).values(newItems);

    return db
      .select()
      .from(carouselItems)
      .where(eq(carouselItems.carouselId, carouselId))
      .orderBy(asc(carouselItems.sortOrder));
  },

  /**
   * Remove products from a manual carousel
   */
  async removeProducts(carouselId: string, input: CarouselProductsInput): Promise<void> {
    const carousel = await this.findById(carouselId);

    if (carousel.type !== 'manual') {
      throw badRequest(
        'INVALID_CAROUSEL_TYPE',
        'Cannot remove products from a category-based carousel'
      );
    }

    await db
      .delete(carouselItems)
      .where(
        and(
          eq(carouselItems.carouselId, carouselId),
          inArray(carouselItems.productId, input.productIds)
        )
      );
  },

  /**
   * Reorder products within a carousel
   */
  async reorderItems(
    carouselId: string,
    input: ReorderCarouselItemsInput
  ): Promise<void> {
    const carousel = await this.findById(carouselId);

    if (carousel.type !== 'manual') {
      throw badRequest(
        'INVALID_CAROUSEL_TYPE',
        'Cannot reorder products in a category-based carousel'
      );
    }

    await db.transaction(async (tx) => {
      for (const item of input.items) {
        await tx
          .update(carouselItems)
          .set({ sortOrder: item.sortOrder })
          .where(
            and(
              eq(carouselItems.carouselId, carouselId),
              eq(carouselItems.productId, item.productId)
            )
          );
      }
    });
  },

  /**
   * Reorder carousels (display order in storefront)
   */
  async reorder(input: ReorderCarouselsInput): Promise<void> {
    // Validate all carousel IDs exist
    for (const item of input.carousels) {
      await this.findById(item.id);
    }

    // Update each carousel's sort order
    await db.transaction(async (tx) => {
      for (const item of input.carousels) {
        await tx
          .update(carousels)
          .set({
            sortOrder: item.sortOrder,
            updatedAt: new Date(),
          })
          .where(eq(carousels.id, item.id));
      }
    });
  },

  /**
   * Get items of a carousel
   */
  async getItems(carouselId: string): Promise<CarouselItem[]> {
    await this.findById(carouselId);

    return db
      .select()
      .from(carouselItems)
      .where(eq(carouselItems.carouselId, carouselId))
      .orderBy(asc(carouselItems.sortOrder));
  },
};
