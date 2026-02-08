import { sql, isNull, and, gte, lte, eq, desc } from 'drizzle-orm';
import { db } from '../../config/database.js';
import { products, categories, orders, importJobs } from '../../db/schema/index.js';
import type { MetricsQuery, MetricsOverview } from './metrics.schemas.js';

export const metricsService = {
  /**
   * Get business overview metrics
   * If no date range provided, returns historical totals
   * If date range provided, counts entities created within that period
   */
  async getOverview(query: MetricsQuery): Promise<MetricsOverview> {
    const { startDate, endDate } = query;

    const startDateObj = startDate ? new Date(startDate) : null;
    const endDateObj = endDate ? new Date(endDate) : null;

    // Count products
    const productConditions = [isNull(products.deletedAt)];
    if (startDateObj) {
      productConditions.push(gte(products.createdAt, startDateObj));
    }
    if (endDateObj) {
      productConditions.push(lte(products.createdAt, endDateObj));
    }

    const [{ totalProducts }] = await db
      .select({ totalProducts: sql<number>`count(*)::int` })
      .from(products)
      .where(and(...productConditions));

    // Count categories
    const categoryConditions = [isNull(categories.deletedAt)];
    if (startDateObj) {
      categoryConditions.push(gte(categories.createdAt, startDateObj));
    }
    if (endDateObj) {
      categoryConditions.push(lte(categories.createdAt, endDateObj));
    }

    const [{ totalCategories }] = await db
      .select({ totalCategories: sql<number>`count(*)::int` })
      .from(categories)
      .where(and(...categoryConditions));

    // Count orders
    const orderConditions = [isNull(orders.deletedAt)];
    if (startDateObj) {
      orderConditions.push(gte(orders.createdAt, startDateObj));
    }
    if (endDateObj) {
      orderConditions.push(lte(orders.createdAt, endDateObj));
    }

    const [{ totalOrders }] = await db
      .select({ totalOrders: sql<number>`count(*)::int` })
      .from(orders)
      .where(and(...orderConditions));

    // Get last successful import
    // For imports, we look for the most recent completed import overall (not filtered by date range)
    // as this represents the last time data was successfully imported
    const lastImport = await db.query.importJobs.findFirst({
      where: eq(importJobs.status, 'completed'),
      orderBy: [desc(importJobs.completedAt)],
      columns: {
        completedAt: true,
      },
    });

    return {
      totalProducts,
      totalCategories,
      totalOrders,
      lastSuccessfulImportAt: lastImport?.completedAt?.toISOString() ?? null,
      dateRange: {
        startDate: startDate ?? null,
        endDate: endDate ?? null,
      },
    };
  },
};
