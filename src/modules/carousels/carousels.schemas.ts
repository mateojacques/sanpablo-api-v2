import { z } from 'zod';

/**
 * @openapi
 * components:
 *   schemas:
 *     CarouselType:
 *       type: string
 *       enum: [manual, category]
 *       description: Type of carousel - manual (hand-picked products) or category (all products from a category)
 *     Carousel:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         slug:
 *           type: string
 *         description:
 *           type: string
 *           nullable: true
 *         type:
 *           $ref: '#/components/schemas/CarouselType'
 *         categoryId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         sortOrder:
 *           type: integer
 *         isActive:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     CarouselItem:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         carouselId:
 *           type: string
 *           format: uuid
 *         productId:
 *           type: string
 *           format: uuid
 *         sortOrder:
 *           type: integer
 *         createdAt:
 *           type: string
 *           format: date-time
 *     CarouselWithProducts:
 *       allOf:
 *         - $ref: '#/components/schemas/Carousel'
 *         - type: object
 *           properties:
 *             products:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 *             category:
 *               $ref: '#/components/schemas/Category'
 */

// Utility to generate slug from name
const slugify = (text: string): string =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

// Carousel type validation
const carouselTypeSchema = z.enum(['manual', 'category']);

export const createCarouselSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(255),
    slug: z
      .string()
      .min(1)
      .max(255)
      .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens')
      .optional()
      .transform((val) => val || undefined),
    description: z.string().max(500).optional(),
    type: carouselTypeSchema.default('manual'),
    categoryId: z.string().uuid('Invalid category ID').nullable().optional(),
    sortOrder: z.number().int().min(0).default(0),
    isActive: z.boolean().default(true),
    // For manual type: list of product IDs to include
    productIds: z.array(z.string().uuid()).optional(),
  })
  .refine(
    (data) => {
      // If type is category, categoryId is required
      if (data.type === 'category' && !data.categoryId) {
        return false;
      }
      return true;
    },
    {
      message: 'categoryId is required when type is "category"',
      path: ['categoryId'],
    }
  );

export const updateCarouselSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    slug: z
      .string()
      .min(1)
      .max(255)
      .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens')
      .optional(),
    description: z.string().max(500).nullable().optional(),
    type: carouselTypeSchema.optional(),
    categoryId: z.string().uuid('Invalid category ID').nullable().optional(),
    sortOrder: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) => {
      // If type is being set to category, categoryId must be provided
      if (data.type === 'category' && data.categoryId === undefined) {
        return false;
      }
      return true;
    },
    {
      message: 'categoryId is required when type is "category"',
      path: ['categoryId'],
    }
  );

export const carouselIdParamSchema = z.object({
  id: z.string().uuid('Invalid carousel ID'),
});

// Schema for adding/removing products from a manual carousel
export const carouselProductsSchema = z.object({
  productIds: z.array(z.string().uuid('Invalid product ID')).min(1),
});

// Schema for reordering products within a carousel
export const reorderCarouselItemsSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      sortOrder: z.number().int().min(0),
    })
  ),
});

// Schema for reordering carousels (display order)
export const reorderCarouselsSchema = z.object({
  carousels: z.array(
    z.object({
      id: z.string().uuid(),
      sortOrder: z.number().int().min(0),
    })
  ),
});

// Query schema for listing carousels
export const listCarouselsQuerySchema = z.object({
  isActive: z
    .string()
    .optional()
    .transform((val) => {
      if (val === 'true') return true;
      if (val === 'false') return false;
      return undefined;
    }),
  type: carouselTypeSchema.optional(),
});

// Type exports
export type CreateCarouselInput = z.infer<typeof createCarouselSchema>;
export type UpdateCarouselInput = z.infer<typeof updateCarouselSchema>;
export type CarouselProductsInput = z.infer<typeof carouselProductsSchema>;
export type ReorderCarouselItemsInput = z.infer<typeof reorderCarouselItemsSchema>;
export type ReorderCarouselsInput = z.infer<typeof reorderCarouselsSchema>;
export type ListCarouselsQuery = z.infer<typeof listCarouselsQuerySchema>;

// Utility export
export { slugify };
