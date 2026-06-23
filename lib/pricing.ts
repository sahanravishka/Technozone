import type { Discount, Product, Pricing } from './types';

function bestDiscountFor(p: Product, discounts: Discount[], price: number): number {
  let best = 0;
  for (const d of discounts) {
    const applies =
      d.scope === 'all' ||
      (d.scope === 'product' && d.product_id === p.id) ||
      (d.scope === 'category' && d.category_id === p.category_id);
    if (!applies) continue;
    const off = d.type === 'percentage' ? (price * d.value) / 100 : d.value;
    if (off > best) best = off;
  }
  return Math.min(best, price);
}

/** Cheapest active variant + best applicable discount -> storefront price. */
export function priceProduct(p: Product, discounts: Discount[]): Pricing {
  const variants = (p.product_variants ?? []).filter(v => v.is_active);
  const v = variants.sort((a, b) => a.price - b.price)[0]
        ?? { id: '', sku: '', price: p.base_price, stock_qty: 0, reserved_qty: 0 } as never;
  const off = bestDiscountFor(p, discounts, v.price);
  return {
    price: Math.round(v.price - off),
    compareAt: off > 0 ? v.price : null,
    variantId: v.id, sku: v.sku,
    stock: Math.max(v.stock_qty - v.reserved_qty, 0)
  };
}

export function priceVariant(p: Product, variantPrice: number, discounts: Discount[]) {
  const off = bestDiscountFor(p, discounts, variantPrice);
  return { price: Math.round(variantPrice - off), compareAt: off > 0 ? variantPrice : null };
}
