import type { Request, Response, NextFunction } from 'express';
import { ordersService } from './orders.service.js';
import type { ListOrdersQuery, UpdateStatusInput } from './orders.schemas.js';

export const ordersController = {
  /**
   * List orders
   * GET /api/orders
   */
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const user = (req as any).user;
      const isAdmin = user?.role === 'admin' || user?.role === 'owner';

      const query: ListOrdersQuery = req.query as unknown as ListOrdersQuery;
      const result = await ordersService.list(query, user?.id, isAdmin);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get order by ID
   * GET /api/orders/:id
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const user = (req as any).user;
      const isAdmin = user?.role === 'admin' || user?.role === 'owner';

      const { id } = req.params;
      const order = await ordersService.getById(id as string, user?.id, isAdmin);
      res.json({ data: order });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get order by order number
   * GET /api/orders/number/:orderNumber
   */
  async getByOrderNumber(req: Request, res: Response, next: NextFunction) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const user = (req as any).user;
      const isAdmin = user?.role === 'admin' || user?.role === 'owner';

      const { orderNumber } = req.params;
      const order = await ordersService.getByOrderNumber(
        orderNumber as string,
        user?.id,
        isAdmin
      );
      res.json({ data: order });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update order status (admin only)
   * PUT /api/orders/:id/status
   */
  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const input: UpdateStatusInput = req.body;
      const order = await ordersService.updateStatus(id as string, input);
      res.json({ data: order });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Delete order (soft delete, admin only)
   * DELETE /api/orders/:id
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await ordersService.delete(id as string);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};
