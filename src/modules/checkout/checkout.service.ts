import { eq } from 'drizzle-orm';
import { db } from '../../config/database.js';
import { carts, cartItems, orders, orderItems } from '../../db/schema/index.js';
import { AppError } from '../../shared/utils/errors.js';
import { emailService } from '../../shared/utils/email.js';
import { syncCartPrices } from '../cart/cart.service.js';
import { CHECKOUT_CONTACT_TTL_MS, readCheckoutContact } from './checkout-contact.js';
import type { SaveContactInput } from './checkout.schemas.js';

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
    throw new AppError(
      400,
      'CART_IDENTIFIER_REQUIRED',
      'No se pudo identificar el carrito.'
    );
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
    throw new AppError(400, 'CART_EMPTY', 'El carrito está vacío.');
  }

  return syncCartPrices(cart);
}

export const checkoutService = {
  /**
   * Step 1: Save contact information for checkout
   */
  async saveContact(input: SaveContactInput, userId?: string, sessionId?: string) {
    const cart = await getCartWithItems(userId, sessionId);

    await db
      .update(carts)
      .set({
        checkoutContact: input,
        checkoutContactExpiresAt: new Date(Date.now() + CHECKOUT_CONTACT_TTL_MS),
      })
      .where(eq(carts.id, cart.id));

    return {
      message: 'Datos de contacto guardados.',
      cartId: cart.id,
    };
  },

  /**
   * Step 2: Review order before confirmation
   */
  async review(userId?: string, sessionId?: string) {
    const cart = await getCartWithItems(userId, sessionId);
    const contact = readCheckoutContact(cart);

    if (!contact) {
      throw new AppError(400, 'CONTACT_NOT_PROVIDED', 'Faltan los datos de contacto.');
    }

    // Verify all products are still active
    const invalidItems = cart.items.filter(
      (item) => !item.product || !item.product.isActive || item.product.deletedAt
    );

    if (invalidItems.length > 0) {
      throw new AppError(
        400,
        'PRODUCTS_UNAVAILABLE',
        'Algunos productos del carrito ya no están disponibles.'
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
      contact,
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
    const contact = readCheckoutContact(cart);

    if (!contact) {
      throw new AppError(400, 'CONTACT_NOT_PROVIDED', 'Faltan los datos de contacto.');
    }

    // Verify all products are still active
    const invalidItems = cart.items.filter(
      (item) => !item.product || !item.product.isActive || item.product.deletedAt
    );

    if (invalidItems.length > 0) {
      throw new AppError(
        400,
        'PRODUCTS_UNAVAILABLE',
        'Algunos productos del carrito ya no están disponibles.'
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
          contactFullName: contact.fullName,
          contactEmail: contact.email,
          contactPhone: contact.phone,
          contactAddress: contact.address,
          customerNotes: contact.customerNotes || null,
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

      // Clear cart items. An overlapping confirm waits on these rows and then
      // deletes nothing, which rolls back its duplicate order.
      const deleted = await tx
        .delete(cartItems)
        .where(eq(cartItems.cartId, cart.id))
        .returning({ id: cartItems.id });

      if (deleted.length === 0) {
        throw new AppError(400, 'CART_EMPTY', 'El carrito está vacío.');
      }

      await tx
        .update(carts)
        .set({ checkoutContact: null, checkoutContactExpiresAt: null })
        .where(eq(carts.id, cart.id));

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
      message: 'Pedido recibido.',
    };
  },
};
