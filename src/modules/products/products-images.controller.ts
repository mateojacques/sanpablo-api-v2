import type { Request, Response, NextFunction } from 'express';
import { productsService } from './products.service';
import { s3Utils } from '../../shared/utils/s3';
import { badRequest } from '../../shared/utils/errors';

export const productImagesController = {
  /**
   * POST /api/products/:id/images
   * Upload product image
   */
  uploadImage: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const file = req.file;

      if (!file) {
        throw badRequest('NO_FILE', 'No image file provided');
      }

      // Verify product exists
      const product = await productsService.findById(id);

      // Delete old image if exists
      if (product.imageUrl) {
        const oldKey = s3Utils.getKeyFromUrl(product.imageUrl);
        if (oldKey) {
          try {
            await s3Utils.deleteFile(oldKey);
          } catch {
            // Ignore deletion errors for old files
          }
        }
      }

      // Upload new image
      const { url: imageUrl } = await s3Utils.uploadFile(file.buffer, {
        folder: `products/${id}`,
        contentType: file.mimetype,
      });

      // Generate thumbnail (for now, use same image - could use sharp for actual thumbnails)
      // In a production app, you'd resize the image here
      const thumbnailUrl = imageUrl;

      // Update product with new image URLs
      const updated = await productsService.updateImages(id, imageUrl, thumbnailUrl);

      res.json({
        data: {
          imageUrl: updated.imageUrl,
          thumbnailUrl: updated.thumbnailUrl,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/products/:id/images
   * Delete product image
   */
  deleteImage: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;

      // Verify product exists
      const product = await productsService.findById(id);

      // Delete image from S3 if exists
      if (product.imageUrl) {
        const key = s3Utils.getKeyFromUrl(product.imageUrl);
        if (key) {
          try {
            await s3Utils.deleteFile(key);
          } catch {
            // Ignore deletion errors
          }
        }
      }

      // Delete thumbnail from S3 if different from main image
      if (product.thumbnailUrl && product.thumbnailUrl !== product.imageUrl) {
        const key = s3Utils.getKeyFromUrl(product.thumbnailUrl);
        if (key) {
          try {
            await s3Utils.deleteFile(key);
          } catch {
            // Ignore deletion errors
          }
        }
      }

      // Update product to remove image URLs
      await productsService.updateImages(id, null, null);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};
