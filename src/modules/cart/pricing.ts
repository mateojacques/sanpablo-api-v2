export type PricedItem = {
  id: string;
  priceAtAdd: string;
  product: {
    regularPrice: string;
    salePrice: string | null;
    isActive: boolean;
    deletedAt: Date | null;
  } | null;
};

/**
 * The price a product sells at. A sale price only applies when it's above zero
 * and lower than the regular price.
 */
export function getEffectivePrice(product: {
  regularPrice: string;
  salePrice: string | null;
}): string {
  const { regularPrice, salePrice } = product;
  if (salePrice === null) {
    return regularPrice;
  }
  const sale = parseFloat(salePrice);
  return sale > 0 && sale < parseFloat(regularPrice) ? salePrice : regularPrice;
}

/**
 * Bring each item to its product's current price. Items whose product is gone or
 * unavailable are left as they are, and the checkout review reports them.
 */
export function repriceItems<T extends PricedItem>(
  items: T[]
): { items: T[]; changes: { id: string; priceAtAdd: string }[] } {
  const changes: { id: string; priceAtAdd: string }[] = [];

  const repriced = items.map((item) => {
    const { product } = item;
    if (!product || !product.isActive || product.deletedAt) {
      return item;
    }

    const priceAtAdd = getEffectivePrice(product);
    if (parseFloat(priceAtAdd) === parseFloat(item.priceAtAdd)) {
      return item;
    }

    changes.push({ id: item.id, priceAtAdd });
    return { ...item, priceAtAdd };
  });

  return { items: repriced, changes };
}
