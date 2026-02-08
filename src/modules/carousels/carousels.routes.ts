import { Router } from 'express';
import { carouselsController } from './carousels.controller.js';
import { requireAuth, requireAdmin } from '../auth/auth.middleware.js';
import { validateRequest } from '../../shared/middleware/validate-request.js';
import {
  createCarouselSchema,
  updateCarouselSchema,
  carouselIdParamSchema,
  carouselProductsSchema,
  reorderCarouselItemsSchema,
  reorderCarouselsSchema,
  listCarouselsQuerySchema,
} from './carousels.schemas.js';

const router = Router();

/**
 * @openapi
 * /api/carousels:
 *   get:
 *     tags: [Carousels]
 *     summary: Get all carousels
 *     parameters:
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [manual, category]
 *         description: Filter by carousel type
 *     responses:
 *       200:
 *         description: List of carousels
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Carousel'
 */
router.get(
  '/',
  validateRequest({ query: listCarouselsQuerySchema }),
  carouselsController.getAll
);

/**
 * @openapi
 * /api/carousels/storefront:
 *   get:
 *     tags: [Carousels]
 *     summary: Get all active carousels with products (for storefront display)
 *     description: Returns all active carousels ordered by sortOrder, with their products included
 *     responses:
 *       200:
 *         description: List of carousels with products
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CarouselWithProducts'
 */
router.get('/storefront', carouselsController.getStorefront);

/**
 * @openapi
 * /api/carousels/reorder:
 *   put:
 *     tags: [Carousels]
 *     summary: Reorder carousels (display order in storefront)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               carousels:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     sortOrder:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Carousels reordered
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.put(
  '/reorder',
  requireAuth,
  requireAdmin,
  validateRequest({ body: reorderCarouselsSchema }),
  carouselsController.reorder
);

/**
 * @openapi
 * /api/carousels/slug/{slug}:
 *   get:
 *     tags: [Carousels]
 *     summary: Get carousel by slug with products
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Carousel found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/CarouselWithProducts'
 *       404:
 *         description: Carousel not found
 */
router.get('/slug/:slug', carouselsController.getBySlug);

/**
 * @openapi
 * /api/carousels/{id}:
 *   get:
 *     tags: [Carousels]
 *     summary: Get carousel by ID with products
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Carousel found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/CarouselWithProducts'
 *       404:
 *         description: Carousel not found
 */
router.get(
  '/:id',
  validateRequest({ params: carouselIdParamSchema }),
  carouselsController.getById
);

/**
 * @openapi
 * /api/carousels:
 *   post:
 *     tags: [Carousels]
 *     summary: Create a new carousel
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
 *                 description: Auto-generated from name if not provided
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [manual, category]
 *                 default: manual
 *               categoryId:
 *                 type: string
 *                 format: uuid
 *                 description: Required when type is "category"
 *               sortOrder:
 *                 type: integer
 *                 default: 0
 *               isActive:
 *                 type: boolean
 *                 default: true
 *               productIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: Products to add (for manual type only)
 *     responses:
 *       201:
 *         description: Carousel created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Carousel'
 *       400:
 *         description: Validation error
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
  validateRequest({ body: createCarouselSchema }),
  carouselsController.create
);

/**
 * @openapi
 * /api/carousels/{id}:
 *   put:
 *     tags: [Carousels]
 *     summary: Update a carousel
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
 *                 nullable: true
 *               type:
 *                 type: string
 *                 enum: [manual, category]
 *               categoryId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               sortOrder:
 *                 type: integer
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Carousel updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Carousel not found
 */
router.put(
  '/:id',
  requireAuth,
  requireAdmin,
  validateRequest({ params: carouselIdParamSchema, body: updateCarouselSchema }),
  carouselsController.update
);

/**
 * @openapi
 * /api/carousels/{id}:
 *   delete:
 *     tags: [Carousels]
 *     summary: Delete a carousel (soft delete)
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
 *         description: Carousel deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Carousel not found
 */
router.delete(
  '/:id',
  requireAuth,
  requireAdmin,
  validateRequest({ params: carouselIdParamSchema }),
  carouselsController.delete
);

/**
 * @openapi
 * /api/carousels/{id}/items:
 *   get:
 *     tags: [Carousels]
 *     summary: Get items of a carousel
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Carousel items
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CarouselItem'
 *       404:
 *         description: Carousel not found
 */
router.get(
  '/:id/items',
  validateRequest({ params: carouselIdParamSchema }),
  carouselsController.getItems
);

/**
 * @openapi
 * /api/carousels/{id}/products:
 *   post:
 *     tags: [Carousels]
 *     summary: Add products to a manual carousel
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
 *             required:
 *               - productIds
 *             properties:
 *               productIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       201:
 *         description: Products added
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CarouselItem'
 *       400:
 *         description: Invalid carousel type or products not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Carousel not found
 */
router.post(
  '/:id/products',
  requireAuth,
  requireAdmin,
  validateRequest({ params: carouselIdParamSchema, body: carouselProductsSchema }),
  carouselsController.addProducts
);

/**
 * @openapi
 * /api/carousels/{id}/products:
 *   delete:
 *     tags: [Carousels]
 *     summary: Remove products from a manual carousel
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
 *             required:
 *               - productIds
 *             properties:
 *               productIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       204:
 *         description: Products removed
 *       400:
 *         description: Invalid carousel type
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Carousel not found
 */
router.delete(
  '/:id/products',
  requireAuth,
  requireAdmin,
  validateRequest({ params: carouselIdParamSchema, body: carouselProductsSchema }),
  carouselsController.removeProducts
);

/**
 * @openapi
 * /api/carousels/{id}/products/reorder:
 *   put:
 *     tags: [Carousels]
 *     summary: Reorder products within a manual carousel
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
 *             required:
 *               - items
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: string
 *                       format: uuid
 *                     sortOrder:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Products reordered
 *       400:
 *         description: Invalid carousel type
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Carousel not found
 */
router.put(
  '/:id/products/reorder',
  requireAuth,
  requireAdmin,
  validateRequest({ params: carouselIdParamSchema, body: reorderCarouselItemsSchema }),
  carouselsController.reorderItems
);

export default router;
