import { MulterError } from 'multer';
import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import { env } from '../../config/env.js';
import { DbfFormatError } from '../../modules/imports/dbf/dbf-errors.js';

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

  // Uploads over the multer size limit
  if (err instanceof MulterError && err.code === 'LIMIT_FILE_SIZE') {
    res.status(400).json({
      error: {
        code: 'FILE_TOO_LARGE',
        message: 'File exceeds the maximum allowed size',
      },
    });
    return;
  }

  // DBF uploads that can't be read or lack required fields
  if (err instanceof DbfFormatError) {
    res.status(400).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined && { details: err.details }),
      },
    });
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
