import type { Request, Response, NextFunction } from 'express';
import { checkoutService } from './checkout.service.js';
import type { SaveContactInput } from './checkout.schemas.js';

// Session ID header name for guest carts
const SESSION_HEADER = 'x-session-id';

/**
 * Extract user ID (from auth) and session ID (from header) for cart identification
 */
function getCartIdentifiers(req: Request): { userId?: string; sessionId?: string } {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userId = (req as any).user?.id as string | undefined;
  const headerValue = req.headers[SESSION_HEADER];
  let sessionId: string | undefined;
  if (Array.isArray(headerValue)) {
    sessionId = headerValue[0];
  } else {
    sessionId = headerValue;
  }
  return { userId, sessionId };
}

export const checkoutController = {
  /**
   * Step 1: Save contact information
   * POST /api/checkout/contact
   */
  async saveContact(req: Request, res: Response, next: NextFunction) {
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

      const input: SaveContactInput = req.body;
      const result = await checkoutService.saveContact(input, userId, sessionId);
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Step 2: Review order
   * GET /api/checkout/review
   */
  async review(req: Request, res: Response, next: NextFunction) {
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

      const result = await checkoutService.review(userId, sessionId);
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Step 3: Confirm and create order
   * POST /api/checkout/confirm
   */
  async confirm(req: Request, res: Response, next: NextFunction) {
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

      const result = await checkoutService.confirm(userId, sessionId);
      res.status(201).json({ data: result });
    } catch (error) {
      next(error);
    }
  },
};
