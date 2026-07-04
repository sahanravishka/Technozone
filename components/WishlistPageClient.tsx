'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Dict } from '@/lib/i18n/dictionaries';
import type { Locale } from '@/lib/i18n/config';
import type { Product, Discount } from '@/lib/types';
import { getProductsByIds, getActiveDiscounts } from '@/lib/data';
import { useWishlist } from '@/lib/wishlist-store';
import ProductGrid from './ProductGrid';

export default function WishlistPageClient({ locale, dict }: { locale: Locale; dict: Dict }) {
  const { ids, hydrated } = useWishlist();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [discounts, setDiscounts] = useState<Discount[]>([]);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    (async () => {
      const [p, d] = await Promise.all([getProductsByIds([...ids]), getActiveDiscounts()]);
      if (!cancelled) { setProducts(p); setDiscounts(d); }
    })();
    return () => { cancelled = true; };
  }, [hydrated, ids]);

  if (!hydrated || products === null) {
    return <div className="py-16 text-center text-[13.5px] text-muted">Loading your wishlist…</div>;
  }

  if (products.length === 0) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="text-[15px] font-semibold">Your wishlist is empty</p>
        <p className="mt-1.5 text-[13.5px] text-muted">Tap the heart on any product to save it here.</p>
        <Link href={`/${locale}`} className="pressable mt-5 inline-flex h-12 items-center rounded-btn bg-volt px-6 font-semibold text-white hover:bg-volt-deep">
          Continue shopping
        </Link>
      </div>
    );
  }

  return <ProductGrid products={products} discounts={discounts} locale={locale} dict={dict} />;
}
