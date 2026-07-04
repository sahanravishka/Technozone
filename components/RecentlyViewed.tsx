'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Locale } from '@/lib/i18n/config';
import { formatLKR } from '@/lib/site';

// Everything lives in localStorage — zero server load, works offline (PWA),
// and no personal data leaves the device.
const KEY = 'tzl:recent';
const MAX = 12;

type Recent = { slug: string; name: string; image: string | null; price: number; ts: number };

function read(): Recent[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { return []; }
}

/** Drop this on the product page: records the visit, renders nothing. */
export function RecentlyViewedTracker({ slug, name, image, price }:
  { slug: string; name: string; image: string | null; price: number }) {
  useEffect(() => {
    try {
      const list = read().filter(r => r.slug !== slug);
      list.unshift({ slug, name, image, price, ts: Date.now() });
      localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
    } catch { /* storage full / private mode — non-critical */ }
  }, [slug, name, image, price]);
  return null;
}

/** Horizontal strip of recently viewed products. Hides itself when empty. */
export default function RecentlyViewed({ locale, title, excludeSlug }:
  { locale: Locale; title: string; excludeSlug?: string }) {
  const [items, setItems] = useState<Recent[]>([]);

  useEffect(() => {
    setItems(read().filter(r => r.slug !== excludeSlug).slice(0, 8));
  }, [excludeSlug]);

  if (items.length === 0) return null;

  return (
    <section className="mt-12" aria-label={title}>
      <h2 className="text-lg font-extrabold tracking-[-0.01em]">{title}</h2>
      <div className="rail mt-4 flex gap-3 overflow-x-auto pb-2">
        {items.map(it => (
          <Link key={it.slug} href={`/${locale}/product/${it.slug}`}
            className="pressable w-36 shrink-0 rounded-2xl border border-line bg-card p-2.5 transition-shadow hover:shadow-md">
            {it.image
              ? <Image src={it.image} alt={it.name} width={144} height={144}
                  className="aspect-square w-full rounded-xl object-cover" />
              : <span className="block aspect-square w-full rounded-xl bg-paper" aria-hidden />}
            <span className="mt-2 block truncate text-[12px] font-semibold">{it.name}</span>
            <span className="block text-[12px] font-bold text-volt">{formatLKR(it.price)}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
