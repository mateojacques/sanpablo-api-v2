import {
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

import { s3Client } from '../../config/aws';
import { env } from '../../config/env';
import { badRequest } from '../utils/errors';

// Allowed image MIME types
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
];

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export interface UploadResult {
  url: string;
  key: string;
}

export interface UploadOptions {
  folder?: string;
  filename?: string;
  contentType: string;
  isPublic?: boolean;
}

/**
 * S3 utilities for file upload/download
 */
export const s3Utils = {
  /**
   * Upload a file buffer to S3
   */
  async uploadFile(buffer: Buffer, options: UploadOptions): Promise<UploadResult> {
    const { folder = 'uploads', filename, contentType, isPublic = true } = options;

    // Validate content type for images
    if (contentType.startsWith('image/') && !ALLOWED_IMAGE_TYPES.includes(contentType)) {
      throw badRequest('INVALID_FILE_TYPE', `File type '${contentType}' is not allowed`);
    }

    // Validate file size
    if (buffer.length > MAX_FILE_SIZE) {
      throw badRequest(
        'FILE_TOO_LARGE',
        `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`
      );
    }

    // Generate unique filename if not provided
    const extension = this.getExtensionFromMimeType(contentType);
    const finalFilename = filename || `${randomUUID()}${extension}`;
    const key = `${folder}/${finalFilename}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ...(isPublic && { ACL: 'public-read' }),
      })
    );

    const url = this.getPublicUrl(key);

    return { url, key };
  },

  /**
   * Delete a file from S3
   */
  async deleteFile(key: string): Promise<void> {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: key,
      })
    );
  },

  /**
   * Get a signed URL for temporary access (for private files)
   */
  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
    });

    return getSignedUrl(s3Client, command, { expiresIn });
  },

  /**
   * Get public URL for a file
   */
  getPublicUrl(key: string): string {
    // For LocalStack or custom endpoint
    if (env.AWS_ENDPOINT_URL) {
      return `${env.AWS_ENDPOINT_URL}/${env.S3_BUCKET}/${key}`;
    }

    // For real S3
    return `https://${env.S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
  },

  /**
   * Extract key from full URL
   */
  getKeyFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      // Remove leading slash
      return urlObj.pathname.substring(1);
    } catch {
      return null;
    }
  },

  /**
   * Get file extension from MIME type
   */
  getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'image/svg+xml': '.svg',
      'application/pdf': '.pdf',
      'text/csv': '.csv',
    };

    return mimeToExt[mimeType] || '';
  },

  /**
   * Validate that a URL is a valid image URL
   */
  isValidImageUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname.toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'].some((ext) =>
        path.endsWith(ext)
      );
    } catch {
      return false;
    }
  },
};
