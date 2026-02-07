import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { env } from '../../config/env';

interface ErrorWithDetails extends AppError {
  details?: unknown;
}

/**
 * Global error handler middleware.
 * Catches all errors and returns consistent JSON response.
 */
export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log error in development
  if (env.NODE_ENV === 'development') {
    console.error('Error:', err);
  }

  // Handle AppError (operational errors)
  if (err instanceof AppError) {
    const errorResponse: {
      error: {
        code: string;
        message: string;
        details?: unknown;
      };
    } = {
      error: {
        code: err.code,
        message: err.message,
      },
    };

    // Include details if present
    if ((err as ErrorWithDetails).details) {
      errorResponse.error.details = (err as ErrorWithDetails).details;
    }

    res.status(err.statusCode).json(errorResponse);
    return;
  }

  // Handle unexpected errors
  console.error('Unexpected error:', err);

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message:
        env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
    },
  });
};
