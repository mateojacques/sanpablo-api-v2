import { z } from 'zod';
import { orderStatuses } from '../../db/schema/orders.js';

// ============ Request Schemas ============

// List orders query params
export const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(orderStatuses).optional(),
  userId: z.string().uuid().optional(),
});

// Get order by ID
export const orderIdParamSchema = z.object({
  id: z.string().uuid('Invalid order ID'),
});

// Update order status
export const updateStatusBodySchema = z.object({
  status: z.enum(orderStatuses),
  internalNotes: z.string().max(2000).optional(),
});

// ============ Type Exports ============

export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusBodySchema>;
