import type { CheckoutContact } from '../../db/schema/carts.js';

export const CHECKOUT_CONTACT_TTL_MS = 30 * 60 * 1000;

/**
 * The contact saved on a cart, or null when there is none or it has expired
 */
export function readCheckoutContact(
  cart: {
    checkoutContact: CheckoutContact | null;
    checkoutContactExpiresAt: Date | null;
  },
  now: Date = new Date()
): CheckoutContact | null {
  if (!cart.checkoutContact || !cart.checkoutContactExpiresAt) {
    return null;
  }
  return cart.checkoutContactExpiresAt > now ? cart.checkoutContact : null;
}
