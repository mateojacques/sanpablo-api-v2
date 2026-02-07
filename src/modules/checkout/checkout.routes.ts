import { Router } from 'express';
import { checkoutController } from './checkout.controller';
import { validateRequest } from '../../shared/middleware/validate-request';
import { checkoutLimiter } from '../../shared/middleware/rate-limiter';
import { optionalAuth } from '../auth/auth.middleware';
import { saveContactBodySchema } from './checkout.schemas';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Checkout
 *   description: Checkout flow endpoints
 */

/**
 * @swagger
 * /api/checkout/contact:
 *   post:
 *     summary: Step 1 - Save contact information
 *     description: Save customer contact details for the order. This is the first step in the checkout process.
 *     tags: [Checkout]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-session-id
 *         schema:
 *           type: string
 *         description: Session ID for guest checkout
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - email
 *               - phone
 *               - address
 *             properties:
 *               fullName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 255
 *                 example: Juan Pérez
 *               email:
 *                 type: string
 *                 format: email
 *                 example: juan@example.com
 *               phone:
 *                 type: string
 *                 minLength: 8
 *                 maxLength: 50
 *                 example: +54 11 1234-5678
 *               address:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 1000
 *                 example: Av. Corrientes 1234, CABA, Argentina
 *               customerNotes:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Optional notes from the customer
 *     responses:
 *       200:
 *         description: Contact information saved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                     cartId:
 *                       type: string
 *                       format: uuid
 *       400:
 *         description: Cart is empty or validation error
 */
router.post(
  '/contact',
  optionalAuth,
  validateRequest({ body: saveContactBodySchema }),
  checkoutController.saveContact
);

/**
 * @swagger
 * /api/checkout/review:
 *   get:
 *     summary: Step 2 - Review order
 *     description: Review the order summary before confirmation. Contact info must be saved first.
 *     tags: [Checkout]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-session-id
 *         schema:
 *           type: string
 *         description: Session ID for guest checkout
 *     responses:
 *       200:
 *         description: Order review data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     contact:
 *                       type: object
 *                       properties:
 *                         fullName:
 *                           type: string
 *                         email:
 *                           type: string
 *                         phone:
 *                           type: string
 *                         address:
 *                           type: string
 *                         customerNotes:
 *                           type: string
 *                           nullable: true
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           productId:
 *                             type: string
 *                             format: uuid
 *                           name:
 *                             type: string
 *                           sku:
 *                             type: string
 *                           quantity:
 *                             type: integer
 *                           unitPrice:
 *                             type: string
 *                           totalPrice:
 *                             type: string
 *                     subtotal:
 *                       type: string
 *                     total:
 *                       type: string
 *       400:
 *         description: Contact not provided or cart is empty
 */
router.get('/review', optionalAuth, checkoutController.review);

/**
 * @swagger
 * /api/checkout/confirm:
 *   post:
 *     summary: Step 3 - Confirm order
 *     description: Confirm and place the order. Contact info must be saved first.
 *     tags: [Checkout]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-session-id
 *         schema:
 *           type: string
 *         description: Session ID for guest checkout
 *     responses:
 *       201:
 *         description: Order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     orderId:
 *                       type: string
 *                       format: uuid
 *                     orderNumber:
 *                       type: string
 *                       example: SP-20240115-XYZ1
 *                     total:
 *                       type: string
 *                     message:
 *                       type: string
 *       400:
 *         description: Cart is empty, contact not provided, or products unavailable
 */
router.post('/confirm', optionalAuth, checkoutLimiter, checkoutController.confirm);

export default router;
