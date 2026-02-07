import { eq, and, isNull, asc, ne } from 'drizzle-orm';

import { db } from '../../config/database';
import { categories, type Category } from '../../db/schema/categories.js';
import { notFound, conflict, badRequest } from '../../shared/utils/errors';

import type {
  CreateCategoryInput,
  UpdateCategoryInput,
  ReorderCategoriesInput,
} from './categories.schemas';
import { slugify } from './categories.schemas';

// Category with children for tree structure
export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
}

/**
 * Categories service - handles all category business logic
 */
export const categoriesService = {
  /**
   * Get all categories as a flat list
   */
  async findAll(): Promise<Category[]> {
    return db
      .select()
      .from(categories)
      .where(isNull(categories.deletedAt))
      .orderBy(asc(categories.sortOrder), asc(categories.name));
  },

  /**
   * Get categories as a tree structure
   */
  async getTree(): Promise<CategoryTreeNode[]> {
    const allCategories = await this.findAll();
    return this.buildTree(allCategories);
  },

  /**
   * Build tree structure from flat list
   */
  buildTree(flatCategories: Category[]): CategoryTreeNode[] {
    const categoryMap = new Map<string, CategoryTreeNode>();
    const roots: CategoryTreeNode[] = [];

    // First pass: create nodes
    for (const cat of flatCategories) {
      categoryMap.set(cat.id, { ...cat, children: [] });
    }

    // Second pass: build tree
    for (const cat of flatCategories) {
      const node = categoryMap.get(cat.id);
      if (!node) continue;

      if (cat.parentId) {
        const parent = categoryMap.get(cat.parentId);
        if (parent) {
          parent.children.push(node);
        } else {
          roots.push(node);
        }
      } else {
        roots.push(node);
      }
    }

    return roots;
  },

  /**
   * Get a single category by ID
   */
  async findById(id: string): Promise<Category> {
    const [category] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, id), isNull(categories.deletedAt)))
      .limit(1);

    if (!category) {
      throw notFound('Category', id);
    }

    return category;
  },

  /**
   * Get a single category by slug
   */
  async findBySlug(slug: string): Promise<Category> {
    const [category] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.slug, slug), isNull(categories.deletedAt)))
      .limit(1);

    if (!category) {
      throw notFound('Category');
    }

    return category;
  },

  /**
   * Create a new category
   */
  async create(input: CreateCategoryInput): Promise<Category> {
    // Generate slug from name if not provided
    const slug = input.slug || slugify(input.name);

    // Check for slug uniqueness
    const existingSlug = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.slug, slug), isNull(categories.deletedAt)))
      .limit(1);

    if (existingSlug.length > 0) {
      throw conflict(
        'SLUG_ALREADY_EXISTS',
        `Category with slug '${slug}' already exists`
      );
    }

    // Validate parent exists if provided
    if (input.parentId) {
      await this.findById(input.parentId);
    }

    const [created] = await db
      .insert(categories)
      .values({
        name: input.name,
        slug,
        description: input.description,
        parentId: input.parentId ?? null,
        sortOrder: input.sortOrder,
      })
      .returning();

    return created;
  },

  /**
   * Update a category
   */
  async update(id: string, input: UpdateCategoryInput): Promise<Category> {
    // Verify category exists
    await this.findById(id);

    // Check slug uniqueness if being updated
    if (input.slug) {
      const existingSlug = await db
        .select({ id: categories.id })
        .from(categories)
        .where(
          and(
            eq(categories.slug, input.slug),
            isNull(categories.deletedAt),
            ne(categories.id, id)
          )
        )
        .limit(1);

      if (existingSlug.length > 0) {
        throw conflict(
          'SLUG_ALREADY_EXISTS',
          `Category with slug '${input.slug}' already exists`
        );
      }
    }

    // Prevent circular reference
    if (input.parentId) {
      if (input.parentId === id) {
        throw badRequest('INVALID_PARENT', 'Category cannot be its own parent');
      }

      // Check if new parent is a descendant of this category
      const descendants = await this.getDescendantIds(id);
      if (descendants.includes(input.parentId)) {
        throw badRequest(
          'CIRCULAR_REFERENCE',
          'Cannot set a descendant as parent (would create circular reference)'
        );
      }

      // Verify parent exists
      await this.findById(input.parentId);
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.slug !== undefined) updateData.slug = input.slug;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.parentId !== undefined) updateData.parentId = input.parentId;
    if (input.sortOrder !== undefined) updateData.sortOrder = input.sortOrder;

    const [updated] = await db
      .update(categories)
      .set(updateData)
      .where(eq(categories.id, id))
      .returning();

    return updated;
  },

  /**
   * Get all descendant IDs of a category
   */
  async getDescendantIds(categoryId: string): Promise<string[]> {
    const allCategories = await this.findAll();
    const descendants: string[] = [];

    const findDescendants = (parentId: string) => {
      for (const cat of allCategories) {
        if (cat.parentId === parentId) {
          descendants.push(cat.id);
          findDescendants(cat.id);
        }
      }
    };

    findDescendants(categoryId);
    return descendants;
  },

  /**
   * Soft delete a category
   */
  async delete(id: string): Promise<void> {
    // Verify exists
    await this.findById(id);

    // Check if has children
    const children = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.parentId, id), isNull(categories.deletedAt)))
      .limit(1);

    if (children.length > 0) {
      throw badRequest(
        'CATEGORY_HAS_CHILDREN',
        'Cannot delete category with subcategories. Delete or reassign children first.'
      );
    }

    await db
      .update(categories)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(categories.id, id));
  },

  /**
   * Reorder categories (batch update positions and parents)
   */
  async reorder(input: ReorderCategoriesInput): Promise<void> {
    // Validate all category IDs exist
    for (const item of input.categories) {
      await this.findById(item.id);
      if (item.parentId) {
        await this.findById(item.parentId);
      }
    }

    // Update each category
    await db.transaction(async (tx) => {
      for (const item of input.categories) {
        await tx
          .update(categories)
          .set({
            parentId: item.parentId ?? null,
            sortOrder: item.sortOrder,
            updatedAt: new Date(),
          })
          .where(eq(categories.id, item.id));
      }
    });
  },
};
