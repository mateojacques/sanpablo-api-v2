import multer from 'multer';
import { badRequest } from '../../shared/utils/errors';

// Allowed image MIME types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Multer configuration for image uploads
 */
export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      cb(
        badRequest(
          'INVALID_FILE_TYPE',
          'Only JPEG, PNG, WebP, and GIF images are allowed'
        )
      );
      return;
    }
    cb(null, true);
  },
});

/**
 * Multer configuration for CSV uploads
 */
export const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB for CSV files
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'text/csv' && !file.originalname.endsWith('.csv')) {
      cb(badRequest('INVALID_FILE_TYPE', 'Only CSV files are allowed'));
      return;
    }
    cb(null, true);
  },
});

/**
 * Multer configuration for JSON uploads
 */
export const jsonUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB for JSON files
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/json' && !file.originalname.endsWith('.json')) {
      cb(badRequest('INVALID_FILE_TYPE', 'Only JSON files are allowed'));
      return;
    }
    cb(null, true);
  },
});
