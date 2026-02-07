import { z } from 'zod';

/**
 * @openapi
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         sku:
 *           type: string
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         regularPrice:
 *           type: string
 *         salePrice:
 *           type: string
 *           nullable: true
 *         specialPrice:
 *           type: string
 *           nullable: true
 *         imageUrl:
 *           type: string
 *           nullable: true
 *         thumbnailUrl:
 *           type: string
 *           nullable: true
 *         videoUrl:
 *           type: string
 *           nullable: true
 *         weight:
 *           type: string
 *           nullable: true
 *         dimensionLength:
 *           type: string
 *           nullable: true
 *         dimensionWidth:
 *           type: string
 *           nullable: true
 *         dimensionHeight:
 *           type: string
 *           nullable: true
 *         categoryId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         isActive:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

// Helpers for price validation
const priceSchema = z
  .union([z.string(), z.number()])
  .transform((val) => (typeof val === 'string' ? parseFloat(val) : val))
  .refine((val) => !isNaN(val) && val >= 0, 'Must be a valid positive number');

const optionalPriceSchema = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((val) => {
    if (val === null || val === undefined || val === '') return null;
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return isNaN(num) ? null : num;
  });

const optionalDimensionSchema = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((val) => {
    if (val === null || val === undefined || val === '') return null;
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return isNaN(num) || num < 0 ? null : num;
  });

export const createProductSchema = z.object({
  sku: z
    .string()
    .min(1, 'SKU is required')
    .max(100)
    .transform((val) => val.toUpperCase().trim()),
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().optional(),
  regularPrice: priceSchema,
  salePrice: optionalPriceSchema,
  specialPrice: optionalPriceSchema,
  imageUrl: z.string().url('Invalid image URL').max(500).optional().nullable(),
  thumbnailUrl: z.string().url('Invalid thumbnail URL').max(500).optional().nullable(),
  videoUrl: z.string().url('Invalid video URL').max(500).optional().nullable(),
  weight: optionalDimensionSchema,
  dimensionLength: optionalDimensionSchema,
  dimensionWidth: optionalDimensionSchema,
  dimensionHeight: optionalDimensionSchema,
  categoryId: z.string().uuid('Invalid category ID').optional().nullable(),
  isActive: z.boolean().default(true),
});

export const updateProductSchema = z.object({
  sku: z
    .string()
    .min(1)
    .max(100)
    .transform((val) => val.toUpperCase().trim())
    .optional(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  regularPrice: priceSchema.optional(),
  salePrice: optionalPriceSchema,
  specialPrice: optionalPriceSchema,
  imageUrl: z.string().url('Invalid image URL').max(500).nullable().optional(),
  thumbnailUrl: z.string().url('Invalid thumbnail URL').max(500).nullable().optional(),
  videoUrl: z.string().url('Invalid video URL').max(500).nullable().optional(),
  weight: optionalDimensionSchema,
  dimensionLength: optionalDimensionSchema,
  dimensionWidth: optionalDimensionSchema,
  dimensionHeight: optionalDimensionSchema,
  categoryId: z.string().uuid('Invalid category ID').nullable().optional(),
  isActive: z.boolean().optional(),
});

export const productIdParamSchema = z.object({
  id: z.string().uuid('Invalid product ID'),
});

export const productSkuParamSchema = z.object({
  sku: z.string().min(1).max(100),
});

export const listProductsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  categorySlug: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
  sortBy: z.enum(['name', 'price', 'createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Type exports
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
