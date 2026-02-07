import { eq } from 'drizzle-orm';
import { db } from '../../config/database';
import { carts, cartItems, orders, orderItems } from '../../db/schema';
import { AppError } from '../../shared/utils/errors';
import { emailService } from '../../shared/utils/email';
import type { SaveContactInput } from './checkout.schemas';

// Store contact info temporarily in memory (in production, use Redis or DB)
// Key: cartId, Value: contact info
const checkoutSessions = new Map<
  string,
  {
    contact: SaveContactInput;
    expiresAt: Date;
  }
>();

// Cleanup expired sessions every 10 minutes
setInterval(
  () => {
    const now = new Date();
    for (const [key, value] of checkoutSessions) {
      if (value.expiresAt < now) {
        checkoutSessions.delete(key);
      }
    }
  },
  10 * 60 * 1000
);

/**
 * Generate unique order number: SP-YYYYMMDD-XXXX
 */
function generateOrderNumber(): string {
  const date = new Date();
  const datePart = date.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SP-${datePart}-${randomPart}`;
}

/**
 * Get cart with items and products
 */
async function getCartWithItems(userId?: string, sessionId?: string) {
  if (!userId && !sessionId) {
    throw new AppError(400, 'CART_IDENTIFIER_REQUIRED', 'Cart identifier is required');
  }

  const whereCondition = userId
    ? eq(carts.userId, userId)
    : eq(carts.sessionId, sessionId!);

  const cart = await db.query.carts.findFirst({
    where: whereCondition,
    with: {
      items: {
        with: {
          product: true,
        },
      },
    },
  });

  if (!cart || cart.items.length === 0) {
    throw new AppError(400, 'CART_EMPTY', 'Cart is empty');
  }

  return cart;
}

export const checkoutService = {
  /**
   * Step 1: Save contact information for checkout
   */
  async saveContact(input: SaveContactInput, userId?: string, sessionId?: string) {
    const cart = await getCartWithItems(userId, sessionId);

    // Store contact info with 30 minute expiration
    checkoutSessions.set(cart.id, {
      contact: input,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    });

    return {
      message: 'Contact information saved',
      cartId: cart.id,
    };
  },

  /**
   * Step 2: Review order before confirmation
   */
  async review(userId?: string, sessionId?: string) {
    const cart = await getCartWithItems(userId, sessionId);
    const session = checkoutSessions.get(cart.id);

    if (!session) {
      throw new AppError(
        400,
        'CONTACT_NOT_PROVIDED',
        'Please provide contact information first'
      );
    }

    // Verify all products are still active
    const invalidItems = cart.items.filter(
      (item) => !item.product || !item.product.isActive || item.product.deletedAt
    );

    if (invalidItems.length > 0) {
      throw new AppError(
        400,
        'PRODUCTS_UNAVAILABLE',
        'Some products in your cart are no longer available'
      );
    }

    // Calculate totals
    const items = cart.items.map((item) => ({
      productId: item.productId,
      name: item.product!.name,
      sku: item.product!.sku,
      imageUrl: item.product!.imageUrl,
      quantity: item.quantity,
      unitPrice: item.priceAtAdd,
      totalPrice: (parseFloat(item.priceAtAdd) * item.quantity).toFixed(2),
    }));

    const subtotal = items.reduce((sum, item) => sum + parseFloat(item.totalPrice), 0);

    return {
      contact: session.contact,
      items,
      subtotal: subtotal.toFixed(2),
      total: subtotal.toFixed(2), // No discounts/shipping for now
    };
  },

  /**
   * Step 3: Confirm and create order
   */
  async confirm(userId?: string, sessionId?: string) {
    const cart = await getCartWithItems(userId, sessionId);
    const session = checkoutSessions.get(cart.id);

    if (!session) {
      throw new AppError(
        400,
        'CONTACT_NOT_PROVIDED',
        'Please provide contact information first'
      );
    }

    // Verify all products are still active
    const invalidItems = cart.items.filter(
      (item) => !item.product || !item.product.isActive || item.product.deletedAt
    );

    if (invalidItems.length > 0) {
      throw new AppError(
        400,
        'PRODUCTS_UNAVAILABLE',
        'Some products in your cart are no longer available'
      );
    }

    // Calculate totals
    const subtotal = cart.items.reduce(
      (sum, item) => sum + parseFloat(item.priceAtAdd) * item.quantity,
      0
    );

    // Create order in a transaction
    const result = await db.transaction(async (tx) => {
      // Create order
      const [order] = await tx
        .insert(orders)
        .values({
          orderNumber: generateOrderNumber(),
          userId: userId || null,
          status: 'pending',
          contactFullName: session.contact.fullName,
          contactEmail: session.contact.email,
          contactPhone: session.contact.phone,
          contactAddress: session.contact.address,
          customerNotes: session.contact.customerNotes || null,
          subtotal: subtotal.toFixed(2),
          total: subtotal.toFixed(2),
        })
        .returning();

      // Create order items
      const orderItemsData = cart.items.map((item) => ({
        orderId: order.id,
        productId: item.productId,
        productSku: item.product!.sku,
        productName: item.product!.name,
        quantity: item.quantity,
        unitPrice: item.priceAtAdd,
        totalPrice: (parseFloat(item.priceAtAdd) * item.quantity).toFixed(2),
      }));

      await tx.insert(orderItems).values(orderItemsData);

      // Clear cart items
      await tx.delete(cartItems).where(eq(cartItems.cartId, cart.id));

      // Clear checkout session
      checkoutSessions.delete(cart.id);

      return order;
    });

    // Fetch complete order with items for email
    const completeOrder = await db.query.orders.findFirst({
      where: eq(orders.id, result.id),
      with: {
        items: true,
      },
    });

    // Send emails (don't await, fire and forget)
    if (completeOrder) {
      Promise.all([
        emailService.sendNewOrderNotification(completeOrder).catch((err) => {
          console.error('Failed to send owner notification:', err);
        }),
        emailService.sendOrderConfirmationToCustomer(completeOrder).catch((err) => {
          console.error('Failed to send customer confirmation:', err);
        }),
      ]);
    }

    return {
      orderId: result.id,
      orderNumber: result.orderNumber,
      total: result.total,
      message: 'Order placed successfully. We will contact you soon!',
    };
  },
};
