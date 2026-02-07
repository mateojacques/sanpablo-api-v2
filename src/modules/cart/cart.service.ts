import { eq, and, isNull, sql } from 'drizzle-orm';
import { db } from '../../config/database';
import { carts, cartItems, products } from '../../db/schema';
import { AppError } from '../../shared/utils/errors';
import type { AddItemInput, UpdateItemInput } from './cart.schemas';

// Guest cart expiration: 7 days
const GUEST_CART_EXPIRATION_DAYS = 7;

/**
 * Get or create a cart for user or guest session
 */
async function getOrCreateCart(userId?: string, sessionId?: string) {
  if (!userId && !sessionId) {
    throw new AppError(
      400,
      'CART_IDENTIFIER_REQUIRED',
      'Either userId or sessionId is required'
    );
  }

  // Try to find existing cart
  const whereCondition = userId
    ? eq(carts.userId, userId)
    : eq(carts.sessionId, sessionId!);

  const existingCart = await db.query.carts.findFirst({
    where: whereCondition,
    with: {
      items: {
        with: {
          product: true,
        },
      },
    },
  });

  if (existingCart) {
    return existingCart;
  }

  // Create new cart
  const expiresAt = !userId
    ? new Date(Date.now() + GUEST_CART_EXPIRATION_DAYS * 24 * 60 * 60 * 1000)
    : null;

  const [newCart] = await db
    .insert(carts)
    .values({
      userId: userId || null,
      sessionId: !userId ? sessionId : null,
      expiresAt,
    })
    .returning();

  return { ...newCart, items: [] };
}

/**
 * Calculate cart totals
 */
function calculateCartTotals(items: Array<{ quantity: number; priceAtAdd: string }>) {
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * parseFloat(item.priceAtAdd),
    0
  );
  return { itemCount, subtotal: subtotal.toFixed(2) };
}

/**
 * Get the effective price for a product (sale price if available, otherwise regular)
 */
function getEffectivePrice(product: {
  regularPrice: string;
  salePrice: string | null;
}): string {
  return product.salePrice || product.regularPrice;
}

export const cartService = {
  /**
   * Get cart for user or session
   */
  async getCart(userId?: string, sessionId?: string) {
    const cart = await getOrCreateCart(userId, sessionId);
    const totals = calculateCartTotals(cart.items);

    return {
      ...cart,
      ...totals,
    };
  },

  /**
   * Add item to cart
   */
  async addItem(input: AddItemInput, userId?: string, sessionId?: string) {
    const { productId, quantity } = input;

    // Verify product exists and is active
    const product = await db.query.products.findFirst({
      where: and(
        eq(products.id, productId),
        eq(products.isActive, true),
        isNull(products.deletedAt)
      ),
    });

    if (!product) {
      throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found or not available');
    }

    const cart = await getOrCreateCart(userId, sessionId);
    const effectivePrice = getEffectivePrice(product);

    // Check if item already exists in cart
    const existingItem = cart.items.find((item) => item.productId === productId);

    if (existingItem) {
      // Update quantity
      await db
        .update(cartItems)
        .set({
          quantity: existingItem.quantity + quantity,
          updatedAt: new Date(),
        })
        .where(eq(cartItems.id, existingItem.id));

      return this.getCart(userId, sessionId);
    }

    // Add new item
    await db.insert(cartItems).values({
      cartId: cart.id,
      productId,
      quantity,
      priceAtAdd: effectivePrice,
    });

    return this.getCart(userId, sessionId);
  },

  /**
   * Update item quantity
   */
  async updateItem(
    itemId: string,
    input: UpdateItemInput,
    userId?: string,
    sessionId?: string
  ) {
    const cart = await getOrCreateCart(userId, sessionId);

    // Verify item belongs to this cart
    const item = cart.items.find((i) => i.id === itemId);
    if (!item) {
      throw new AppError(404, 'CART_ITEM_NOT_FOUND', 'Cart item not found');
    }

    await db
      .update(cartItems)
      .set({
        quantity: input.quantity,
        updatedAt: new Date(),
      })
      .where(eq(cartItems.id, itemId));

    // Update cart timestamp
    await db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cart.id));

    return this.getCart(userId, sessionId);
  },

  /**
   * Remove item from cart
   */
  async removeItem(itemId: string, userId?: string, sessionId?: string) {
    const cart = await getOrCreateCart(userId, sessionId);

    // Verify item belongs to this cart
    const item = cart.items.find((i) => i.id === itemId);
    if (!item) {
      throw new AppError(404, 'CART_ITEM_NOT_FOUND', 'Cart item not found');
    }

    await db.delete(cartItems).where(eq(cartItems.id, itemId));

    // Update cart timestamp
    await db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cart.id));

    return this.getCart(userId, sessionId);
  },

  /**
   * Clear all items from cart
   */
  async clearCart(userId?: string, sessionId?: string) {
    const cart = await getOrCreateCart(userId, sessionId);

    await db.delete(cartItems).where(eq(cartItems.cartId, cart.id));

    // Update cart timestamp
    await db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cart.id));

    return this.getCart(userId, sessionId);
  },

  /**
   * Merge guest cart into user cart (when user logs in)
   */
  async mergeCart(sessionId: string, userId: string) {
    // Find guest cart
    const guestCart = await db.query.carts.findFirst({
      where: eq(carts.sessionId, sessionId),
      with: {
        items: true,
      },
    });

    if (!guestCart || guestCart.items.length === 0) {
      // No guest cart or empty, just return user's cart
      return this.getCart(userId);
    }

    // Get or create user cart
    const userCart = await getOrCreateCart(userId);

    // Merge items from guest cart to user cart
    for (const guestItem of guestCart.items) {
      const existingItem = userCart.items.find(
        (i) => i.productId === guestItem.productId
      );

      if (existingItem) {
        // Update quantity (add guest quantity to existing)
        await db
          .update(cartItems)
          .set({
            quantity: existingItem.quantity + guestItem.quantity,
            updatedAt: new Date(),
          })
          .where(eq(cartItems.id, existingItem.id));
      } else {
        // Add item to user cart
        await db.insert(cartItems).values({
          cartId: userCart.id,
          productId: guestItem.productId,
          quantity: guestItem.quantity,
          priceAtAdd: guestItem.priceAtAdd,
        });
      }
    }

    // Delete guest cart (cascade will delete items)
    await db.delete(carts).where(eq(carts.id, guestCart.id));

    return this.getCart(userId);
  },

  /**
   * Clean up expired guest carts (for background job)
   */
  async cleanupExpiredCarts() {
    const result = await db
      .delete(carts)
      .where(and(isNull(carts.userId), sql`${carts.expiresAt} < NOW()`))
      .returning({ id: carts.id });

    return { deletedCount: result.length };
  },
};
