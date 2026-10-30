export type DbfErrorCode = 'INVALID_DBF' | 'UNSUPPORTED_CODE_PAGE' | 'DBF_MISSING_FIELDS';

/**
 * A DBF file that can't be read or doesn't have the expected structure.
 * The error handler maps it to a 400 with its own code and details.
 */
export class DbfFormatError extends Error {
  public readonly code: DbfErrorCode;
  public readonly details?: unknown;

  constructor(code: DbfErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'DbfFormatError';
    this.code = code;
    this.details = details;
  }
}
