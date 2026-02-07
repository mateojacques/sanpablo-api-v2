import { z } from 'zod';

// Query params for metrics endpoint
export const metricsQuerySchema = z.object({
  startDate: z
    .string()
    .datetime({ message: 'startDate must be a valid ISO 8601 date' })
    .optional(),
  endDate: z
    .string()
    .datetime({ message: 'endDate must be a valid ISO 8601 date' })
    .optional(),
});

export type MetricsQuery = z.infer<typeof metricsQuerySchema>;

// Response type for metrics
export interface MetricsOverview {
  totalProducts: number;
  totalCategories: number;
  totalOrders: number;
  lastSuccessfulImportAt: string | null;
  dateRange: {
    startDate: string | null;
    endDate: string | null;
  };
}
