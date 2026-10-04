import Image from 'next/image';
import Link from 'next/link';
import { imageUrl } from '@/lib/supabase';
import { formatLKR } from '@/lib/site';
import { priceProduct } from '@/lib/pricing';
import type { Product, Discount } from '@/lib/types';

const NEW_WINDOW_MS = 21 * 86_400_000;

/** Slow auto-scrolling strip of the newest products. Data-driven, so it changes
 *  on its own whenever stock is added — nothing to maintain. Pauses on hover. */
export default function NewInTicker({ products, discounts, locale, title, newTag }:
  { products: Product[]; discounts: Discount[]; locale: string; title: string; newTag: string }) {
  const now = Date.now();
  const items = products.filter(p => p.product_images?.[0]).slice(0, 10);
  if (items.length < 4) return null;

  const row = (hidden: boolean) => items.map(p => {
    const pr = priceProduct(p, discounts);
    const isNew = !!p.created_at && now - new Date(p.created_at).getTime() < NEW_WINDOW_MS;
    return (
      <Link key={(hidden ? 'b' : 'a') + p.id} href={`/${locale}/product/${p.slug}`}
        tabIndex={hidden ? -1 : undefined}
        className="pressable group flex w-[240px] shrink-0 items-center gap-3 rounded-2xl border border-line bg-card p-2.5 pr-4 shadow-soft transition-transform hover:-translate-y-0.5">
        <span className="relative h-[52px] w-[52px] shrink-0 overflow-hidden rounded-xl bg-white">
          <Image src={imageUrl(p.product_images[0].storage_path)} alt="" fill sizes="52px" className="object-contain" />
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[13.5px] font-bold">{p.name}</span>
            {isNew && <span className="shrink-0 rounded-full bg-volt px-1.5 py-0.5 text-[9.5px] font-extrabold tracking-wide text-white">{newTag}</span>}
          </span>
          <span className="block text-[13px] font-semibold text-volt">{formatLKR(pr.price)}</span>
        </span>
      </Link>
    );
  });

  return (
    <section className="pt-6 md:pt-8" aria-label={title}>
      <p className="mb-3 flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.06em] text-muted">
        <span className="relative flex h-2 w-2" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-volt opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-volt" />
        </span>
        {title}
      </p>
      <div className="marquee">
        <div className="marquee-track" style={{ animationDuration: `${Math.max(items.length * 5, 30)}s` }}>
          {row(false)}
          <span className="contents" aria-hidden>{row(true)}</span>
        </div>
      </div>
    </section>
  );
}
