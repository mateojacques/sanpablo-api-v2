import { describe, it, expect, vi } from 'vitest';
import multer from 'multer';
import { DbfFormatError } from '../../modules/imports/dbf/dbf-errors.js';
import { errorHandler } from './error-handler.js';
import type { Request, Response, NextFunction } from 'express';

vi.mock('../../config/env.js', () => ({ env: { NODE_ENV: 'test' } }));

function handle(err: Error) {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };
  errorHandler(
    err,
    {} as Request,
    res as unknown as Response,
    (() => {}) as NextFunction
  );
  return res;
}

describe('errorHandler', () => {
  it('maps an oversized upload to 400 FILE_TOO_LARGE', () => {
    const res = handle(new multer.MulterError('LIMIT_FILE_SIZE', 'file'));

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      error: { code: 'FILE_TOO_LARGE', message: 'File exceeds the maximum allowed size' },
    });
  });

  it('maps a DbfFormatError to 400 with its code and details', () => {
    const res = handle(
      new DbfFormatError(
        'DBF_MISSING_FIELDS',
        'Missing required DBF fields: STPRECUNI2',
        {
          missing: ['STPRECUNI2'],
        }
      )
    );

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      error: {
        code: 'DBF_MISSING_FIELDS',
        message: 'Missing required DBF fields: STPRECUNI2',
        details: { missing: ['STPRECUNI2'] },
      },
    });
  });
});
