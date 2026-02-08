import { Router } from 'express';
import { categoriesController } from './categories.controller.js';
import { requireAuth, requireAdmin } from '../auth/auth.middleware.js';
import { validateRequest } from '../../shared/middleware/validate-request.js';
import {
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamSchema,
  reorderCategoriesSchema,
} from './categories.schemas.js';

const router = Router();

/**
 * @openapi
 * /api/categories:
 *   get:
 *     tags: [Categories]
 *     summary: Get all categories as tree structure
 *     responses:
 *       200:
 *         description: Category tree
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CategoryTree'
 */
router.get('/', categoriesController.getTree);

/**
 * @openapi
 * /api/categories/flat:
 *   get:
 *     tags: [Categories]
 *     summary: Get all categories as flat list
 *     responses:
 *       200:
 *         description: Flat list of categories
 */
router.get('/flat', categoriesController.getAll);

/**
 * @openapi
 * /api/categories/slug/{slug}:
 *   get:
 *     tags: [Categories]
 *     summary: Get category by slug
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category found
 *       404:
 *         description: Category not found
 */
router.get('/slug/:slug', categoriesController.getBySlug);

/**
 * @openapi
 * /api/categories/reorder:
 *   put:
 *     tags: [Categories]
 *     summary: Reorder categories (batch update positions)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               categories:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     parentId:
 *                       type: string
 *                       format: uuid
 *                       nullable: true
 *                     sortOrder:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Categories reordered
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.put(
  '/reorder',
  requireAuth,
  requireAdmin,
  validateRequest({ body: reorderCategoriesSchema }),
  categoriesController.reorder
);

/**
 * @openapi
 * /api/categories/{id}:
 *   get:
 *     tags: [Categories]
 *     summary: Get category by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Category found
 *       404:
 *         description: Category not found
 */
router.get(
  '/:id',
  validateRequest({ params: categoryIdParamSchema }),
  categoriesController.getById
);

/**
 * @openapi
 * /api/categories:
 *   post:
 *     tags: [Categories]
 *     summary: Create a new category
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               slug:
 *                 type: string
 *               description:
 *                 type: string
 *               parentId:
 *                 type: string
 *                 format: uuid
 *               sortOrder:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Category created
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       409:
 *         description: Slug already exists
 */
router.post(
  '/',
  requireAuth,
  requireAdmin,
  validateRequest({ body: createCategorySchema }),
  categoriesController.create
);

/**
 * @openapi
 * /api/categories/{id}:
 *   put:
 *     tags: [Categories]
 *     summary: Update a category
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               slug:
 *                 type: string
 *               description:
 *                 type: string
 *               parentId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               sortOrder:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Category updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Category not found
 */
router.put(
  '/:id',
  requireAuth,
  requireAdmin,
  validateRequest({ params: categoryIdParamSchema, body: updateCategorySchema }),
  categoriesController.update
);

/**
 * @openapi
 * /api/categories/{id}:
 *   delete:
 *     tags: [Categories]
 *     summary: Delete a category (soft delete)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Category deleted
 *       400:
 *         description: Category has children
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Category not found
 */
router.delete(
  '/:id',
  requireAuth,
  requireAdmin,
  validateRequest({ params: categoryIdParamSchema }),
  categoriesController.delete
);

export default router;
