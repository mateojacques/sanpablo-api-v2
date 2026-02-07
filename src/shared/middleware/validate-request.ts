import type { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { AppError } from '../utils/errors';

type RequestLocation = 'body' | 'query' | 'params';

interface ValidateOptions {
  body?: z.ZodType;
  query?: z.ZodType;
  params?: z.ZodType;
}

/**
 * Middleware factory for validating request data using Zod schemas.
 *
 * @example
 * router.post('/products',
 *   validateRequest({ body: createProductSchema }),
 *   controller.create
 * );
 */
export const validateRequest = (schemas: ValidateOptions) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const locations: RequestLocation[] = ['body', 'query', 'params'];

      for (const location of locations) {
        const schema = schemas[location];
        if (schema) {
          const result = await schema.safeParseAsync(req[location]);
          if (!result.success) {
            throw result.error;
          }
          // Replace with parsed data (includes defaults, coercion, etc.)
          req[location] = result.data;
        }
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        }));

        const appError = new AppError(400, 'VALIDATION_ERROR', 'Invalid request data');
        (appError as AppError & { details?: unknown }).details = formattedErrors;
        next(appError);
        return;
      }
      next(error);
    }
  };
};
