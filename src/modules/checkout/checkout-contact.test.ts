import { describe, expect, it } from 'vitest';
import { readCheckoutContact } from './checkout-contact.js';

const now = new Date('2026-11-08T12:00:00Z');
const before = new Date(now.getTime() - 1000);
const after = new Date(now.getTime() + 1000);
const checkoutContact = {
  fullName: 'Ana Pérez',
  email: 'ana@ejemplo.com',
  phone: '+5491155123456',
  address: 'Calle Falsa 123, Buenos Aires',
};

describe('readCheckoutContact', () => {
  it('returns the contact while it has not expired', () => {
    expect(
      readCheckoutContact({ checkoutContact, checkoutContactExpiresAt: after }, now)
    ).toEqual(checkoutContact);
  });

  it.each([
    ['the contact is null', { checkoutContact: null, checkoutContactExpiresAt: after }],
    ['expiresAt is null', { checkoutContact, checkoutContactExpiresAt: null }],
    ['expiresAt is past', { checkoutContact, checkoutContactExpiresAt: before }],
    ['expiresAt equals now', { checkoutContact, checkoutContactExpiresAt: now }],
  ])('returns null when %s', (_name, cart) => {
    expect(readCheckoutContact(cart, now)).toBeNull();
  });
});
