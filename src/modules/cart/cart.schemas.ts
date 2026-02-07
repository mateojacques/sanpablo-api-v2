import { z } from 'zod';

// ============ Request Schemas ============

// Add item to cart - body schema
export const addItemBodySchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().int().positive('Quantity must be positive').default(1),
});

// Update item quantity - body schema
export const updateItemBodySchema = z.object({
  quantity: z.number().int().positive('Quantity must be positive'),
});

// Item ID param schema
export const itemIdParamSchema = z.object({
  itemId: z.string().uuid('Invalid item ID'),
});

// Merge guest cart to user - body schema
export const mergeCartBodySchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
});

// ============ Type Exports ============

export type AddItemInput = z.infer<typeof addItemBodySchema>;
export type UpdateItemInput = z.infer<typeof updateItemBodySchema>;
export type MergeCartInput = z.infer<typeof mergeCartBodySchema>;

// ============ Response Schemas (for OpenAPI docs) ============

export const cartItemResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    productId: { type: 'string', format: 'uuid' },
    quantity: { type: 'integer' },
    priceAtAdd: { type: 'string' },
    product: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        sku: { type: 'string' },
        imageUrl: { type: 'string', nullable: true },
        regularPrice: { type: 'string' },
        salePrice: { type: 'string', nullable: true },
      },
    },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

export const cartResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    userId: { type: 'string', format: 'uuid', nullable: true },
    sessionId: { type: 'string', nullable: true },
    items: {
      type: 'array',
      items: cartItemResponseSchema,
    },
    itemCount: { type: 'integer' },
    subtotal: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};
