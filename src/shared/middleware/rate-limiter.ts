import rateLimit from 'express-rate-limit';
import { env } from '../../config/env';

/**
 * Helper to create rate limiters with common configuration
 */
function createLimiter(options: { windowMs: number; max: number; message: string }) {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: options.message,
      },
    },
    skip: () => env.NODE_ENV === 'test',
  });
}

/**
 * General API rate limiter - 100 requests per minute per IP
 */
export const apiLimiter = createLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: 'Too many requests, please try again later',
});

/**
 * Strict rate limiter for auth endpoints - 5 requests per 15 minutes per IP
 * Applied to: POST /auth/login, POST /auth/register
 */
export const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many authentication attempts, please try again later',
});

/**
 * Rate limiter for password reset - 3 per hour
 * Applied to: POST /auth/forgot-password
 */
export const passwordResetLimiter = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: 'Too many password reset requests, please try again later',
});

/**
 * Rate limiter for import operations - 3 per hour
 * Applied to: POST /imports
 */
export const importLimiter = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: 'Import limit reached, please try again later',
});

/**
 * Rate limiter for checkout operations - 10 per hour per IP
 * Prevents abuse of order creation
 * Applied to: POST /checkout/confirm
 */
export const checkoutLimiter = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Too many checkout attempts, please try again later',
});

/**
 * Rate limiter for file uploads - 20 per hour per IP
 * Applied to: POST /products/:id/image, POST /storefront/assets
 */
export const uploadLimiter = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: 'Upload limit reached, please try again later',
});

/**
 * Rate limiter for write operations - 30 per minute per IP
 * Applied to: POST, PUT, DELETE on most endpoints
 */
export const writeLimiter = createLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: 'Too many write operations, please slow down',
});
