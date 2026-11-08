import { z } from 'zod';
import { toWhatsAppPhone } from '../../shared/utils/phone.js';

// ============ Request Schemas ============

// Step 1: Contact information
export const saveContactBodySchema = z.object({
  fullName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres.').max(255),
  email: z.string().email('Correo electrónico no válido.'),
  phone: z
    .string()
    .max(50)
    .transform((value, ctx) => {
      const phone = toWhatsAppPhone(value);
      if (phone === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Ingrese un número de WhatsApp válido, con código de área.',
        });
        return z.NEVER;
      }
      return phone;
    }),
  address: z
    .string()
    .min(10, 'La dirección debe tener al menos 10 caracteres.')
    .max(1000),
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
