'use server';

import { getCartSuggestions } from '@/lib/data';
import type { Product } from '@/lib/types';

/**
 * Cross-sell for the cart. The cart itself lives in the browser (localStorage),
 * so the client hands us the product ids it's holding and we look up what pairs
 * with them. Reads public catalogue data only — nothing here is user-specific,
 * so there's no ownership check to make; the ids are just bounded so a crafted
 * request can't turn this into an expensive query.
 */
export async function fetchCartSuggestions(productIds: string[]): Promise<Product[]> {
  const ids = [...new Set(productIds)]
    .filter(id => typeof id === 'string' && id.length > 0 && id.length <= 64)
    .slice(0, 20);
  if (!ids.length) return [];
  return getCartSuggestions(ids, 4);
}
