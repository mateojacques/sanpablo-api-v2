import type { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { unauthorized, forbidden } from '../../shared/utils/errors';
import type { UserRole, AuthenticatedRequest } from '../../shared/types/index';

/**
 * Middleware that requires authentication.
 * Extracts and verifies JWT from Authorization header.
 * Attaches user payload to request.
 */
export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw unauthorized('No token provided');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const user = authService.verifyToken(token);

    // Attach user to request
    (req as AuthenticatedRequest).user = user;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware that optionally authenticates.
 * If token is present, verifies and attaches user.
 * If no token, continues without user.
 */
export const optionalAuth = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const user = authService.verifyToken(token);
      (req as AuthenticatedRequest).user = user;
    }

    next();
  } catch {
    // Token invalid, continue without user
    next();
  }
};

/**
 * Middleware factory that requires specific roles.
 * Must be used after requireAuth.
 */
export const requireRoles = (allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      return next(unauthorized('Authentication required'));
    }

    if (!allowedRoles.includes(user.role)) {
      return next(forbidden(`Access denied. Required roles: ${allowedRoles.join(', ')}`));
    }

    next();
  };
};

/**
 * Convenience middleware for admin-only routes
 */
export const requireAdmin = requireRoles(['owner', 'admin']);

/**
 * Convenience middleware for owner-only routes
 */
export const requireOwner = requireRoles(['owner']);
