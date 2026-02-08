import { Router } from 'express';
import { cartController } from './cart.controller.js';
import { validateRequest } from '../../shared/middleware/validate-request.js';
import { optionalAuth, requireAuth } from '../auth/auth.middleware.js';
import {
  addItemBodySchema,
  updateItemBodySchema,
  itemIdParamSchema,
  mergeCartBodySchema,
} from './cart.schemas.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Cart
 *   description: Shopping cart management
 */

/**
 * @swagger
 * /api/cart:
 *   get:
 *     summary: Get current cart
 *     description: Returns the cart for authenticated user or guest session. Requires either authentication or x-session-id header.
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-session-id
 *         schema:
 *           type: string
 *         description: Session ID for guest cart (alternative to authentication)
 *     responses:
 *       200:
 *         description: Cart retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Cart'
 *       400:
 *         description: No cart identifier provided
 */
router.get('/', optionalAuth, cartController.getCart);

/**
 * @swagger
 * /api/cart/items:
 *   post:
 *     summary: Add item to cart
 *     description: Adds a product to the cart. If the product already exists, quantity is increased.
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-session-id
 *         schema:
 *           type: string
 *         description: Session ID for guest cart (alternative to authentication)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *             properties:
 *               productId:
 *                 type: string
 *                 format: uuid
 *                 description: Product to add
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 default: 1
 *                 description: Quantity to add
 *     responses:
 *       201:
 *         description: Item added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Cart'
 *       400:
 *         description: Validation error or no cart identifier
 *       404:
 *         description: Product not found
 */
router.post(
  '/items',
  optionalAuth,
  validateRequest({ body: addItemBodySchema }),
  cartController.addItem
);

/**
 * @swagger
 * /api/cart/items/{itemId}:
 *   put:
 *     summary: Update item quantity
 *     description: Updates the quantity of a cart item
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Cart item ID
 *       - in: header
 *         name: x-session-id
 *         schema:
 *           type: string
 *         description: Session ID for guest cart
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quantity
 *             properties:
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 description: New quantity
 *     responses:
 *       200:
 *         description: Item updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Cart'
 *       404:
 *         description: Cart item not found
 */
router.put(
  '/items/:itemId',
  optionalAuth,
  validateRequest({ params: itemIdParamSchema, body: updateItemBodySchema }),
  cartController.updateItem
);

/**
 * @swagger
 * /api/cart/items/{itemId}:
 *   delete:
 *     summary: Remove item from cart
 *     description: Removes an item from the cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Cart item ID
 *       - in: header
 *         name: x-session-id
 *         schema:
 *           type: string
 *         description: Session ID for guest cart
 *     responses:
 *       200:
 *         description: Item removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Cart'
 *       404:
 *         description: Cart item not found
 */
router.delete(
  '/items/:itemId',
  optionalAuth,
  validateRequest({ params: itemIdParamSchema }),
  cartController.removeItem
);

/**
 * @swagger
 * /api/cart:
 *   delete:
 *     summary: Clear cart
 *     description: Removes all items from the cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-session-id
 *         schema:
 *           type: string
 *         description: Session ID for guest cart
 *     responses:
 *       200:
 *         description: Cart cleared successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Cart'
 */
router.delete('/', optionalAuth, cartController.clearCart);

/**
 * @swagger
 * /api/cart/merge:
 *   post:
 *     summary: Merge guest cart to user cart
 *     description: Merges items from a guest cart into the authenticated user's cart. Use this after login to preserve guest cart items.
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *             properties:
 *               sessionId:
 *                 type: string
 *                 description: Guest session ID to merge from
 *     responses:
 *       200:
 *         description: Carts merged successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Cart'
 *       401:
 *         description: Authentication required
 */
router.post(
  '/merge',
  requireAuth,
  validateRequest({ body: mergeCartBodySchema }),
  cartController.mergeCart
);

/**
 * @swagger
 * components:
 *   schemas:
 *     CartItem:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         productId:
 *           type: string
 *           format: uuid
 *         quantity:
 *           type: integer
 *         priceAtAdd:
 *           type: string
 *           description: Price when item was added to cart
 *         product:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             name:
 *               type: string
 *             sku:
 *               type: string
 *             imageUrl:
 *               type: string
 *               nullable: true
 *             regularPrice:
 *               type: string
 *             salePrice:
 *               type: string
 *               nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     Cart:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         userId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         sessionId:
 *           type: string
 *           nullable: true
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CartItem'
 *         itemCount:
 *           type: integer
 *           description: Total number of items in cart
 *         subtotal:
 *           type: string
 *           description: Cart subtotal before discounts
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

export default router;
