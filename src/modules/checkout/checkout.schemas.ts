import { z } from 'zod';

// ============ Request Schemas ============

// Step 1: Contact information
export const saveContactBodySchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(255),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(8, 'Phone must be at least 8 characters').max(50),
  address: z.string().min(10, 'Address must be at least 10 characters').max(1000),
  customerNotes: z.string().max(1000).optional(),
});

// Step 2: Confirm order
export const confirmOrderBodySchema = z.object({
  // Optional: can pass session ID to merge if user just logged in
  sessionId: z.string().optional(),
});

// ============ Type Exports ============

export type SaveContactInput = z.infer<typeof saveContactBodySchema>;
export type ConfirmOrderInput = z.infer<typeof confirmOrderBodySchema>;

// ============ Response Schemas (for OpenAPI docs) ============

export const checkoutReviewResponseSchema = {
  type: 'object',
  properties: {
    contact: {
      type: 'object',
      properties: {
        fullName: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        address: { type: 'string' },
        customerNotes: { type: 'string', nullable: true },
      },
    },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          productId: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          sku: { type: 'string' },
          quantity: { type: 'integer' },
          unitPrice: { type: 'string' },
          totalPrice: { type: 'string' },
        },
      },
    },
    subtotal: { type: 'string' },
    total: { type: 'string' },
  },
};
