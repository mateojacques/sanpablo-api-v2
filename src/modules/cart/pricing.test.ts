import { describe, expect, it } from 'vitest';
import { getEffectivePrice, repriceItems, type PricedItem } from './pricing.js';

describe('getEffectivePrice', () => {
  it.each([
    [{ regularPrice: '10.00', salePrice: null }, '10.00'],
    [{ regularPrice: '10.00', salePrice: '8.00' }, '8.00'],
    [{ regularPrice: '10.00', salePrice: '12.00' }, '10.00'],
    [{ regularPrice: '10.00', salePrice: '10.00' }, '10.00'],
    [{ regularPrice: '10.00', salePrice: '0.00' }, '10.00'],
  ])('effective price of %o', (product, expected) => {
    expect(getEffectivePrice(product)).toBe(expected);
  });
});

describe('repriceItems', () => {
  const item = (
    priceAtAdd: string,
    product: Partial<NonNullable<PricedItem['product']>> | null
  ): PricedItem => ({
    id: 'i1',
    priceAtAdd,
    product: product && {
      regularPrice: '10.00',
      salePrice: null,
      isActive: true,
      deletedAt: null,
      ...product,
    },
  });

  it('updates an item whose product price changed', () => {
    const { items, changes } = repriceItems([item('8.00', {})]);
    expect(items[0].priceAtAdd).toBe('10.00');
    expect(changes).toEqual([{ id: 'i1', priceAtAdd: '10.00' }]);
  });

  it('treats equal numbers as unchanged', () => {
    expect(repriceItems([item('10.0', {})]).changes).toEqual([]);
  });

  it.each([
    ['inactive', { isActive: false }],
    ['soft-deleted', { deletedAt: new Date() }],
    ['missing', null],
  ])('leaves a %s product alone', (_name, product) => {
    const { items, changes } = repriceItems([item('8.00', product)]);
    expect(items[0].priceAtAdd).toBe('8.00');
    expect(changes).toEqual([]);
  });
});
