import type { Request, Response, NextFunction } from 'express';
import { cartService } from './cart.service';
import type { AddItemInput, UpdateItemInput, MergeCartInput } from './cart.schemas';

// Session ID header name for guest carts
const SESSION_HEADER = 'x-session-id';

/**
 * Extract user ID (from auth) and session ID (from header) for cart identification
 */
function getCartIdentifiers(req: Request): { userId?: string; sessionId?: string } {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userId = (req as any).user?.id as string | undefined;
  const headerValue = req.headers[SESSION_HEADER];
  // Header can be string, string[], or undefined - normalize to string | undefined
  let sessionId: string | undefined;
  if (Array.isArray(headerValue)) {
    sessionId = headerValue[0];
  } else {
    sessionId = headerValue;
  }
  return { userId, sessionId };
}

export const cartController = {
  /**
   * Get current cart
   * GET /api/cart
   */
  async getCart(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, sessionId } = getCartIdentifiers(req);

      if (!userId && !sessionId) {
        return res.status(400).json({
          error: {
            code: 'CART_IDENTIFIER_REQUIRED',
            message: `Provide either authentication or ${SESSION_HEADER} header`,
          },
        });
      }

      const cart = await cartService.getCart(userId, sessionId);
      res.json({ data: cart });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Add item to cart
   * POST /api/cart/items
   */
  async addItem(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, sessionId } = getCartIdentifiers(req);

      if (!userId && !sessionId) {
        return res.status(400).json({
          error: {
            code: 'CART_IDENTIFIER_REQUIRED',
            message: `Provide either authentication or ${SESSION_HEADER} header`,
          },
        });
      }

      const input: AddItemInput = req.body;
      const cart = await cartService.addItem(input, userId, sessionId);
      res.status(201).json({ data: cart });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update item quantity
   * PUT /api/cart/items/:itemId
   */
  async updateItem(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, sessionId } = getCartIdentifiers(req);

      if (!userId && !sessionId) {
        return res.status(400).json({
          error: {
            code: 'CART_IDENTIFIER_REQUIRED',
            message: `Provide either authentication or ${SESSION_HEADER} header`,
          },
        });
      }

      const { itemId } = req.params;
      const input: UpdateItemInput = req.body;
      const cart = await cartService.updateItem(
        itemId as string,
        input,
        userId,
        sessionId
      );
      res.json({ data: cart });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Remove item from cart
   * DELETE /api/cart/items/:itemId
   */
  async removeItem(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, sessionId } = getCartIdentifiers(req);

      if (!userId && !sessionId) {
        return res.status(400).json({
          error: {
            code: 'CART_IDENTIFIER_REQUIRED',
            message: `Provide either authentication or ${SESSION_HEADER} header`,
          },
        });
      }

      const { itemId } = req.params;
      const cart = await cartService.removeItem(itemId as string, userId, sessionId);
      res.json({ data: cart });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Clear all items from cart
   * DELETE /api/cart
   */
  async clearCart(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, sessionId } = getCartIdentifiers(req);

      if (!userId && !sessionId) {
        return res.status(400).json({
          error: {
            code: 'CART_IDENTIFIER_REQUIRED',
            message: `Provide either authentication or ${SESSION_HEADER} header`,
          },
        });
      }

      const cart = await cartService.clearCart(userId, sessionId);
      res.json({ data: cart });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Merge guest cart to user cart
   * POST /api/cart/merge
   * Requires authentication
   */
  async mergeCart(req: Request, res: Response, next: NextFunction) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
      }

      const { sessionId }: MergeCartInput = req.body;
      const cart = await cartService.mergeCart(sessionId, userId);
      res.json({ data: cart });
    } catch (error) {
      next(error);
    }
  },
};
