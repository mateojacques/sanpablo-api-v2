import type { Request, Response, NextFunction } from 'express';
import { carouselsService } from './carousels.service';

import type {
  CreateCarouselInput,
  UpdateCarouselInput,
  CarouselProductsInput,
  ReorderCarouselItemsInput,
  ReorderCarouselsInput,
  ListCarouselsQuery,
} from './carousels.schemas';

export const carouselsController = {
  /**
   * GET /api/carousels
   * Get all carousels
   */
  getAll: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query as unknown as ListCarouselsQuery;
      const carousels = await carouselsService.findAll(query);
      res.json({ data: carousels });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/carousels/storefront
   * Get all active carousels with products (for frontend display)
   */
  getStorefront: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const carousels = await carouselsService.findAllWithProducts();
      res.json({ data: carousels });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/carousels/:id
   * Get single carousel by ID
   */
  getById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const carousel = await carouselsService.findByIdWithProducts(id);
      res.json({ data: carousel });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/carousels/slug/:slug
   * Get single carousel by slug
   */
  getBySlug: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const slug = req.params.slug as string;
      const carousel = await carouselsService.findBySlugWithProducts(slug);
      res.json({ data: carousel });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/carousels
   * Create a new carousel
   */
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = req.body as CreateCarouselInput;
      const carousel = await carouselsService.create(input);
      res.status(201).json({ data: carousel });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/carousels/:id
   * Update a carousel
   */
  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const input = req.body as UpdateCarouselInput;
      const carousel = await carouselsService.update(id, input);
      res.json({ data: carousel });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/carousels/:id
   * Soft delete a carousel
   */
  delete: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      await carouselsService.delete(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/carousels/:id/products
   * Add products to a manual carousel
   */
  addProducts: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const input = req.body as CarouselProductsInput;
      const items = await carouselsService.addProducts(id, input);
      res.status(201).json({ data: items });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/carousels/:id/products
   * Remove products from a manual carousel
   */
  removeProducts: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const input = req.body as CarouselProductsInput;
      await carouselsService.removeProducts(id, input);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/carousels/:id/products/reorder
   * Reorder products within a manual carousel
   */
  reorderItems: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const input = req.body as ReorderCarouselItemsInput;
      await carouselsService.reorderItems(id, input);
      res.json({ data: { message: 'Products reordered successfully' } });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/carousels/reorder
   * Reorder carousels (display order)
   */
  reorder: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = req.body as ReorderCarouselsInput;
      await carouselsService.reorder(input);
      res.json({ data: { message: 'Carousels reordered successfully' } });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/carousels/:id/items
   * Get items of a carousel
   */
  getItems: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const items = await carouselsService.getItems(id);
      res.json({ data: items });
    } catch (error) {
      next(error);
    }
  },
};
