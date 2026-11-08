import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findCart: vi.fn(),
  findOrder: vi.fn(),
  dbUpdateSet: vi.fn(),
  syncCartPrices: vi.fn(),
  sendNewOrderNotification: vi.fn(),
  sendOrderConfirmationToCustomer: vi.fn(),
  txInsertValues: vi.fn(),
  txUpdateSet: vi.fn(),
  txDeleteReturning: vi.fn(),
}));

vi.mock('../../config/database.js', () => ({
  db: {
    query: {
      carts: { findFirst: mocks.findCart },
      orders: { findFirst: mocks.findOrder },
    },
    update: () => ({
      set: (values: unknown) => {
        mocks.dbUpdateSet(values);
        return { where: () => Promise.resolve() };
      },
    }),
    transaction: (callback: (tx: unknown) => unknown) =>
      callback({
        insert: () => ({
          values: (values: unknown) => {
            mocks.txInsertValues(values);
            return {
              returning: () =>
                Promise.resolve([{ id: 'o1', orderNumber: 'SP-1', total: '24.00' }]),
            };
          },
        }),
        delete: () => ({ where: () => ({ returning: mocks.txDeleteReturning }) }),
        update: () => ({
          set: (values: unknown) => {
            mocks.txUpdateSet(values);
            return { where: () => Promise.resolve() };
          },
        }),
      }),
  },
}));

vi.mock('../cart/cart.service.js', () => ({ syncCartPrices: mocks.syncCartPrices }));

vi.mock('../../shared/utils/email.js', () => ({
  emailService: {
    sendNewOrderNotification: mocks.sendNewOrderNotification,
    sendOrderConfirmationToCustomer: mocks.sendOrderConfirmationToCustomer,
  },
}));

import { CHECKOUT_CONTACT_TTL_MS } from './checkout-contact.js';
import { checkoutService } from './checkout.service.js';

const { findCart, syncCartPrices, sendNewOrderNotification, txDeleteReturning } = mocks;

const contact = {
  fullName: 'Ana Pérez',
  email: 'ana@ejemplo.com',
  phone: '+5491155123456',
  address: 'Calle Falsa 123, Buenos Aires',
};
const past = new Date(Date.now() - 60_000);
const future = new Date(Date.now() + 60_000);

type CartOptions = {
  checkoutContactExpiresAt?: Date;
  product?: { isActive?: boolean; deletedAt?: Date | null };
};

const cartWith = ({ checkoutContactExpiresAt = future, product }: CartOptions = {}) => ({
  id: 'c1',
  checkoutContact: contact,
  checkoutContactExpiresAt,
  items: [
    {
      id: 'i1',
      productId: 'p1',
      quantity: 2,
      priceAtAdd: '10.00',
      product: {
        name: 'Cuaderno',
        sku: 'A1',
        imageUrl: null,
        regularPrice: '10.00',
        salePrice: null,
        isActive: true,
        deletedAt: null,
        ...product,
      },
    },
  ],
});

type TestCart = ReturnType<typeof cartWith>;

const withPrice = (cart: TestCart, priceAtAdd: string): TestCart => ({
  ...cart,
  items: cart.items.map((item) => ({ ...item, priceAtAdd })),
});

const insertedOrder = () => mocks.txInsertValues.mock.calls[0][0];
const insertedItems = () => mocks.txInsertValues.mock.calls[1][0];
const txUpdateSet = () => mocks.txUpdateSet.mock.calls[0][0];

describe('checkoutService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findCart.mockResolvedValue(cartWith());
    mocks.findOrder.mockResolvedValue(undefined);
    syncCartPrices.mockImplementation(async (cart: TestCart) => cart);
    txDeleteReturning.mockResolvedValue([{ id: 'i1' }]);
  });

  it('saves the contact on the cart with its expiry', async () => {
    const before = Date.now();

    await checkoutService.saveContact(contact, 'u1');

    const saved = mocks.dbUpdateSet.mock.calls[0][0];
    expect(saved.checkoutContact).toEqual(contact);
    expect(saved.checkoutContactExpiresAt.getTime()).toBeGreaterThanOrEqual(
      before + CHECKOUT_CONTACT_TTL_MS
    );
  });

  it('review fails when the saved contact has expired', async () => {
    findCart.mockResolvedValue(cartWith({ checkoutContactExpiresAt: past }));
    await expect(checkoutService.review('u1')).rejects.toMatchObject({
      code: 'CONTACT_NOT_PROVIDED',
    });
  });

  it('review reports a deactivated product', async () => {
    findCart.mockResolvedValue(cartWith({ product: { isActive: false } }));
    await expect(checkoutService.review('u1')).rejects.toMatchObject({
      code: 'PRODUCTS_UNAVAILABLE',
    });
  });

  it('confirm orders at the synced price', async () => {
    syncCartPrices.mockImplementation(async (cart: TestCart) => withPrice(cart, '12.00'));

    await checkoutService.confirm('u1');

    expect(insertedOrder().total).toBe('24.00');
    expect(insertedItems()[0].unitPrice).toBe('12.00');
  });

  it('confirm clears the contact in the transaction', async () => {
    await checkoutService.confirm('u1');
    expect(txUpdateSet()).toEqual({
      checkoutContact: null,
      checkoutContactExpiresAt: null,
    });
  });

  it('a second confirm finds nothing to delete and fails', async () => {
    txDeleteReturning.mockResolvedValue([]);
    await expect(checkoutService.confirm('u1')).rejects.toMatchObject({
      code: 'CART_EMPTY',
    });
    expect(sendNewOrderNotification).not.toHaveBeenCalled();
  });
});
