import { beforeEach, describe, expect, it, vi } from 'vitest';

const { set, where } = vi.hoisted(() => ({ set: vi.fn(), where: vi.fn() }));

vi.mock('../../config/database.js', () => ({
  db: { update: vi.fn(() => ({ set })) },
}));

import { db } from '../../config/database.js';
import { syncCartPrices } from './cart.service.js';

const product = {
  regularPrice: '10.00',
  salePrice: null,
  isActive: true,
  deletedAt: null,
};

describe('syncCartPrices', () => {
  beforeEach(() => {
    vi.mocked(db.update).mockClear();
    set.mockReset().mockReturnValue({ where });
    where.mockReset().mockResolvedValue(undefined);
  });

  it('writes and returns the current price of a stale item', async () => {
    const cart = { id: 'c1', items: [{ id: 'i1', priceAtAdd: '8.00', product }] };

    const synced = await syncCartPrices(cart);

    expect(synced.items[0].priceAtAdd).toBe('10.00');
    expect(db.update).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ priceAtAdd: '10.00' }));
  });

  it('writes nothing when every price is current', async () => {
    const cart = { id: 'c1', items: [{ id: 'i1', priceAtAdd: '10.00', product }] };

    await syncCartPrices(cart);

    expect(db.update).not.toHaveBeenCalled();
  });
});
