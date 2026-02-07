import type { Request, Response, NextFunction } from 'express';
import { productsService } from './products.service';

import type {
  CreateProductInput,
  UpdateProductInput,
  ListProductsQuery,
} from './products.schemas';

export const productsController = {
  /**
   * GET /api/products
   * List products with filtering and pagination
   */
  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query as unknown as ListProductsQuery;
      const result = await productsService.findAll(query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/products/:id
   * Get single product by ID
   */
  getById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const product = await productsService.findById(id);
      res.json({ data: product });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/products/sku/:sku
   * Get single product by SKU
   */
  getBySku: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sku = req.params.sku as string;
      const product = await productsService.findBySku(sku);
      res.json({ data: product });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/products
   * Create a new product
   */
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = req.body as CreateProductInput;
      const product = await productsService.create(input);
      res.status(201).json({ data: product });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/products/:id
   * Update a product
   */
  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const input = req.body as UpdateProductInput;
      const product = await productsService.update(id, input);
      res.json({ data: product });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/products/:id
   * Soft delete a product
   */
  delete: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      await productsService.delete(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};
