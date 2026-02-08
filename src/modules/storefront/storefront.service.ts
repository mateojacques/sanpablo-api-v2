import {
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { s3Client } from '../../config/aws.js';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/utils/errors.js';
import {
  storefrontConfigSchema,
  defaultStorefrontConfig,
  type StorefrontConfig,
} from './storefront.schemas.js';

const CONFIG_KEY = 'storefront/config.json';

export const storefrontService = {
  /**
   * Get current storefront configuration
   * Returns default config if none exists
   */
  async getConfig(): Promise<StorefrontConfig> {
    try {
      // Check if config exists
      await s3Client.send(
        new HeadObjectCommand({
          Bucket: env.S3_BUCKET,
          Key: CONFIG_KEY,
        })
      );

      // Fetch config
      const response = await s3Client.send(
        new GetObjectCommand({
          Bucket: env.S3_BUCKET,
          Key: CONFIG_KEY,
        })
      );

      const bodyString = await response.Body?.transformToString();
      if (!bodyString) {
        return defaultStorefrontConfig;
      }

      const config = JSON.parse(bodyString);

      // Validate and return (with defaults for missing fields)
      const validated = storefrontConfigSchema.parse(config);
      return validated;
    } catch (error: unknown) {
      // If file doesn't exist, return default config
      if (
        error &&
        typeof error === 'object' &&
        'name' in error &&
        error.name === 'NotFound'
      ) {
        return defaultStorefrontConfig;
      }
      // For S3 errors, also try to return default
      if (error && typeof error === 'object' && '$metadata' in error) {
        const s3Error = error as { $metadata?: { httpStatusCode?: number } };
        if (s3Error.$metadata?.httpStatusCode === 404) {
          return defaultStorefrontConfig;
        }
      }
      throw error;
    }
  },

  /**
   * Update full storefront configuration
   */
  async updateConfig(config: StorefrontConfig): Promise<StorefrontConfig> {
    // Add timestamp
    const updatedConfig: StorefrontConfig = {
      ...config,
      lastUpdated: new Date().toISOString(),
    };

    // Validate
    const validated = storefrontConfigSchema.parse(updatedConfig);

    // Save to S3
    await s3Client.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: CONFIG_KEY,
        Body: JSON.stringify(validated, null, 2),
        ContentType: 'application/json',
      })
    );

    return validated;
  },

  /**
   * Update a specific section of the configuration
   */
  async updateSection<K extends keyof StorefrontConfig>(
    section: K,
    data: StorefrontConfig[K]
  ): Promise<StorefrontConfig> {
    // Get current config
    const currentConfig = await this.getConfig();

    const now = new Date().toISOString();

    const nextSectionValue = (() => {
      if (section === 'legal') {
        const incoming = data as StorefrontConfig['legal'];
        return {
          ...currentConfig.legal,
          ...incoming,
          lastUpdated: now,
        } as StorefrontConfig[K];
      }
      return data;
    })();

    // Merge section
    const updatedConfig: StorefrontConfig = {
      ...currentConfig,
      [section]: nextSectionValue,
      lastUpdated: now,
    };

    // Validate full config
    const validated = storefrontConfigSchema.parse(updatedConfig);

    // Save to S3
    await s3Client.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: CONFIG_KEY,
        Body: JSON.stringify(validated, null, 2),
        ContentType: 'application/json',
      })
    );

    return validated;
  },

  /**
   * Upload storefront asset (logo, banner, etc.)
   * Returns the public URL
   */
  async uploadAsset(
    file: Buffer,
    filename: string,
    contentType: string
  ): Promise<string> {
    // Generate unique key
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `storefront/assets/${timestamp}-${sanitizedFilename}`;

    // Validate content type
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
    ];
    if (!allowedTypes.includes(contentType)) {
      throw new AppError(
        400,
        'INVALID_FILE_TYPE',
        `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`
      );
    }

    // Upload to S3
    await s3Client.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: key,
        Body: file,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000', // 1 year cache
      })
    );

    // Return public URL
    // For LocalStack, use endpoint URL; for production, use standard S3 URL
    if (env.AWS_ENDPOINT_URL) {
      return `${env.AWS_ENDPOINT_URL}/${env.S3_BUCKET}/${key}`;
    }
    return `https://${env.S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
  },
};
