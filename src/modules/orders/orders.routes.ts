import { Router } from 'express';
import { ordersController } from './orders.controller';
import { validateRequest } from '../../shared/middleware/validate-request';
import { requireAuth, requireAdmin } from '../auth/auth.middleware';
import {
  listOrdersQuerySchema,
  orderIdParamSchema,
  updateStatusBodySchema,
} from './orders.schemas';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Order management endpoints
 */

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: List orders
 *     description: List orders with pagination. Users see their own orders, admins see all.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, processing, shipped, delivered, cancelled]
 *         description: Filter by status
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by user ID (admin only)
 *     responses:
 *       200:
 *         description: Orders list with pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Order'
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
 *       401:
 *         description: Authentication required
 */
router.get(
  '/',
  requireAuth,
  validateRequest({ query: listOrdersQuerySchema }),
  ordersController.list
);

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get order by ID
 *     description: Get order details. Users can only view their own orders.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Order'
 *       403:
 *         description: Access denied
 *       404:
 *         description: Order not found
 */
router.get(
  '/:id',
  requireAuth,
  validateRequest({ params: orderIdParamSchema }),
  ordersController.getById
);

/**
 * @swagger
 * /api/orders/number/{orderNumber}:
 *   get:
 *     summary: Get order by order number
 *     description: Get order details by order number (e.g., SP-20240115-XYZ1)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderNumber
 *         required: true
 *         schema:
 *           type: string
 *         description: Order number
 *         example: SP-20240115-XYZ1
 *     responses:
 *       200:
 *         description: Order details
 *       403:
 *         description: Access denied
 *       404:
 *         description: Order not found
 */
router.get('/number/:orderNumber', requireAuth, ordersController.getByOrderNumber);

/**
 * @swagger
 * /api/orders/{id}/status:
 *   put:
 *     summary: Update order status
 *     description: Update order status and optionally add internal notes. Admin only.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, confirmed, processing, shipped, delivered, cancelled]
 *               internalNotes:
 *                 type: string
 *                 maxLength: 2000
 *                 description: Internal notes (appended to existing notes)
 *     responses:
 *       200:
 *         description: Order updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Order'
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Order not found
 */
router.put(
  '/:id/status',
  requireAdmin,
  validateRequest({ params: orderIdParamSchema, body: updateStatusBodySchema }),
  ordersController.updateStatus
);

/**
 * @swagger
 * /api/orders/{id}:
 *   delete:
 *     summary: Delete order
 *     description: Soft delete an order. Admin only.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Order ID
 *     responses:
 *       204:
 *         description: Order deleted
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Order not found
 */
router.delete(
  '/:id',
  requireAdmin,
  validateRequest({ params: orderIdParamSchema }),
  ordersController.delete
);

/**
 * @swagger
 * components:
 *   schemas:
 *     OrderItem:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         productId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         productSku:
 *           type: string
 *         productName:
 *           type: string
 *         quantity:
 *           type: integer
 *         unitPrice:
 *           type: string
 *         totalPrice:
 *           type: string
 *     Order:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         orderNumber:
 *           type: string
 *           example: SP-20240115-XYZ1
 *         userId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         status:
 *           type: string
 *           enum: [pending, confirmed, processing, shipped, delivered, cancelled]
 *         contactFullName:
 *           type: string
 *         contactEmail:
 *           type: string
 *         contactPhone:
 *           type: string
 *         contactAddress:
 *           type: string
 *         subtotal:
 *           type: string
 *         total:
 *           type: string
 *         customerNotes:
 *           type: string
 *           nullable: true
 *         internalNotes:
 *           type: string
 *           nullable: true
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/OrderItem'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

export default router;
