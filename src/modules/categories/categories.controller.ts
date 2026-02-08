import type { Request, Response, NextFunction } from 'express';
import { categoriesService } from './categories.service.js';

import type {
  CreateCategoryInput,
  UpdateCategoryInput,
  ReorderCategoriesInput,
} from './categories.schemas.js';

export const categoriesController = {
  /**
   * GET /api/categories
   * Get all categories as tree structure
   */
  getTree: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const tree = await categoriesService.getTree();
      res.json({ data: tree });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/categories/flat
   * Get all categories as flat list
   */
  getAll: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const categories = await categoriesService.findAll();
      res.json({ data: categories });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/categories/:id
   * Get single category by ID
   */
  getById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const category = await categoriesService.findById(id);
      res.json({ data: category });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/categories/slug/:slug
   * Get single category by slug
   */
  getBySlug: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const slug = req.params.slug as string;
      const category = await categoriesService.findBySlug(slug);
      res.json({ data: category });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/categories
   * Create a new category
   */
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = req.body as CreateCategoryInput;
      const category = await categoriesService.create(input);
      res.status(201).json({ data: category });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/categories/:id
   * Update a category
   */
  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const input = req.body as UpdateCategoryInput;
      const category = await categoriesService.update(id, input);
      res.json({ data: category });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/categories/:id
   * Soft delete a category
   */
  delete: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      await categoriesService.delete(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/categories/reorder
   * Reorder categories (batch update)
   */
  reorder: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = req.body as ReorderCategoriesInput;
      await categoriesService.reorder(input);
      res.json({ data: { message: 'Categories reordered successfully' } });
    } catch (error) {
      next(error);
    }
  },
};
