/**
 * Custom application error class for operational errors.
 * These are errors we expect and handle gracefully.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

// Common error factory functions
export const notFound = (resource: string, id?: string) =>
  new AppError(
    404,
    `${resource.toUpperCase()}_NOT_FOUND`,
    id ? `${resource} with id '${id}' not found` : `${resource} not found`
  );

export const badRequest = (code: string, message: string) =>
  new AppError(400, code, message);

export const unauthorized = (message = 'Unauthorized') =>
  new AppError(401, 'UNAUTHORIZED', message);

export const forbidden = (message = 'Forbidden') =>
  new AppError(403, 'FORBIDDEN', message);

export const conflict = (code: string, message: string) =>
  new AppError(409, code, message);

export const validationError = (message: string, details?: unknown) => {
  const error = new AppError(400, 'VALIDATION_ERROR', message);
  (error as AppError & { details?: unknown }).details = details;
  return error;
};
