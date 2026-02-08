import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import { db } from '../../config/database.js';
import { orders } from '../../db/schema/index.js';
import { AppError } from '../../shared/utils/errors.js';
import type { ListOrdersQuery, UpdateStatusInput } from './orders.schemas.js';

export const ordersService = {
  /**
   * List orders with pagination and optional filters
   * For admin: all orders
   * For user: only their orders
   */
  async list(query: ListOrdersQuery, requestingUserId?: string, isAdmin = false) {
    const { page, limit, status, userId } = query;
    const offset = (page - 1) * limit;

    // Build conditions
    const conditions = [isNull(orders.deletedAt)];

    if (status) {
      conditions.push(eq(orders.status, status));
    }

    // Non-admin users can only see their own orders
    if (!isAdmin) {
      if (!requestingUserId) {
        throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
      }
      conditions.push(eq(orders.userId, requestingUserId));
    } else if (userId) {
      // Admin filtering by specific user
      conditions.push(eq(orders.userId, userId));
    }

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(and(...conditions));

    // Get orders
    const result = await db.query.orders.findMany({
      where: and(...conditions),
      with: {
        items: true,
      },
      orderBy: [desc(orders.createdAt)],
      limit,
      offset,
    });

    return {
      data: result,
      meta: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    };
  },

  /**
   * Get order by ID
   * Validates that user has access to the order
   */
  async getById(orderId: string, requestingUserId?: string, isAdmin = false) {
    const order = await db.query.orders.findFirst({
      where: and(eq(orders.id, orderId), isNull(orders.deletedAt)),
      with: {
        items: true,
        user: true,
      },
    });

    if (!order) {
      throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
    }

    // Non-admin users can only view their own orders
    if (!isAdmin && order.userId !== requestingUserId) {
      throw new AppError(403, 'FORBIDDEN', 'Access denied');
    }

    return order;
  },

  /**
   * Get order by order number
   */
  async getByOrderNumber(
    orderNumber: string,
    requestingUserId?: string,
    isAdmin = false
  ) {
    const order = await db.query.orders.findFirst({
      where: and(eq(orders.orderNumber, orderNumber), isNull(orders.deletedAt)),
      with: {
        items: true,
      },
    });

    if (!order) {
      throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
    }

    // Non-admin users can only view their own orders
    if (!isAdmin && order.userId !== requestingUserId) {
      throw new AppError(403, 'FORBIDDEN', 'Access denied');
    }

    return order;
  },

  /**
   * Update order status (admin only)
   */
  async updateStatus(orderId: string, input: UpdateStatusInput) {
    const existingOrder = await db.query.orders.findFirst({
      where: and(eq(orders.id, orderId), isNull(orders.deletedAt)),
    });

    if (!existingOrder) {
      throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
    }

    const updateData: Partial<typeof orders.$inferInsert> = {
      status: input.status,
      updatedAt: new Date(),
    };

    if (input.internalNotes !== undefined) {
      // Append to existing notes
      updateData.internalNotes = existingOrder.internalNotes
        ? `${existingOrder.internalNotes}\n\n[${new Date().toISOString()}] ${input.internalNotes}`
        : `[${new Date().toISOString()}] ${input.internalNotes}`;
    }

    const [updated] = await db
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, orderId))
      .returning();

    return updated;
  },

  /**
   * Soft delete order (admin only)
   */
  async delete(orderId: string) {
    const existingOrder = await db.query.orders.findFirst({
      where: and(eq(orders.id, orderId), isNull(orders.deletedAt)),
    });

    if (!existingOrder) {
      throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
    }

    const [deleted] = await db
      .update(orders)
      .set({ deletedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();

    return deleted;
  },
};
