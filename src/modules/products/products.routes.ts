import { Router } from 'express';
import { productsController } from './products.controller';
import { productImagesController } from './products-images.controller';
import { requireAuth, requireAdmin } from '../auth/auth.middleware';
import { validateRequest } from '../../shared/middleware/validate-request';
import { imageUpload } from '../../shared/middleware/upload';
import {
  createProductSchema,
  updateProductSchema,
  productIdParamSchema,
  productSkuParamSchema,
  listProductsQuerySchema,
} from './products.schemas';

const router = Router();

/**
 * @openapi
 * /api/products:
 *   get:
 *     tags: [Products]
 *     summary: List products with filtering and pagination
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or SKU
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: categorySlug
 *         schema:
 *           type: string
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, price, createdAt, updatedAt]
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Paginated list of products
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 */
router.get(
  '/',
  validateRequest({ query: listProductsQuerySchema }),
  productsController.list
);

/**
 * @openapi
 * /api/products/sku/{sku}:
 *   get:
 *     tags: [Products]
 *     summary: Get product by SKU
 *     parameters:
 *       - in: path
 *         name: sku
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product found
 *       404:
 *         description: Product not found
 */
router.get(
  '/sku/:sku',
  validateRequest({ params: productSkuParamSchema }),
  productsController.getBySku
);

/**
 * @openapi
 * /api/products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Get product by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Product found
 *       404:
 *         description: Product not found
 */
router.get(
  '/:id',
  validateRequest({ params: productIdParamSchema }),
  productsController.getById
);

/**
 * @openapi
 * /api/products:
 *   post:
 *     tags: [Products]
 *     summary: Create a new product
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sku
 *               - name
 *               - regularPrice
 *             properties:
 *               sku:
 *                 type: string
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               regularPrice:
 *                 type: number
 *               salePrice:
 *                 type: number
 *               specialPrice:
 *                 type: number
 *               imageUrl:
 *                 type: string
 *               thumbnailUrl:
 *                 type: string
 *               videoUrl:
 *                 type: string
 *               weight:
 *                 type: number
 *               dimensionLength:
 *                 type: number
 *               dimensionWidth:
 *                 type: number
 *               dimensionHeight:
 *                 type: number
 *               categoryId:
 *                 type: string
 *                 format: uuid
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Product created
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       409:
 *         description: SKU already exists
 */
router.post(
  '/',
  requireAuth,
  requireAdmin,
  validateRequest({ body: createProductSchema }),
  productsController.create
);

/**
 * @openapi
 * /api/products/{id}:
 *   put:
 *     tags: [Products]
 *     summary: Update a product
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
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       200:
 *         description: Product updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Product not found
 */
router.put(
  '/:id',
  requireAuth,
  requireAdmin,
  validateRequest({ params: productIdParamSchema, body: updateProductSchema }),
  productsController.update
);

/**
 * @openapi
 * /api/products/{id}:
 *   delete:
 *     tags: [Products]
 *     summary: Delete a product (soft delete)
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
 *         description: Product deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Product not found
 */
router.delete(
  '/:id',
  requireAuth,
  requireAdmin,
  validateRequest({ params: productIdParamSchema }),
  productsController.delete
);

/**
 * @openapi
 * /api/products/{id}/images:
 *   post:
 *     tags: [Products]
 *     summary: Upload product image
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Image uploaded
 *       400:
 *         description: Invalid file
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Product not found
 */
router.post(
  '/:id/images',
  requireAuth,
  requireAdmin,
  validateRequest({ params: productIdParamSchema }),
  imageUpload.single('image'),
  productImagesController.uploadImage
);

/**
 * @openapi
 * /api/products/{id}/images:
 *   delete:
 *     tags: [Products]
 *     summary: Delete product image
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
 *         description: Image deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Product not found
 */
router.delete(
  '/:id/images',
  requireAuth,
  requireAdmin,
  validateRequest({ params: productIdParamSchema }),
  productImagesController.deleteImage
);

export default router;
