import Image from 'next/image';
import Link from 'next/link';
import type { Product, Discount } from '@/lib/types';
import type { Dict } from '@/lib/i18n/dictionaries';
import type { Locale } from '@/lib/i18n/config';
import { priceProduct } from '@/lib/pricing';
import { imageUrl } from '@/lib/supabase';
import { formatLKR } from '@/lib/site';
import WishlistButton from './WishlistButton';
import FastChargeBadge from './FastChargeBadge';
import WarrantyBadge from './WarrantyBadge';

export default function ProductCard({ product, discounts, locale, dict, priority = false }:
  { product: Product; discounts: Discount[]; locale: Locale; dict: Dict; priority?: boolean }) {
  const pricing = priceProduct(product, discounts);
  const img = product.product_images?.[0];
  const savePct = pricing.compareAt
    ? Math.round(((pricing.compareAt - pricing.price) / pricing.compareAt) * 100) : 0;
  const low = pricing.stock > 0 && pricing.stock <= 5;
  const oos = pricing.stock <= 0;

  return (
    <Link href={`/${locale}/product/${product.slug}`}
      className={`group card-soft shimmer-sweep flex h-full flex-col overflow-hidden border border-line transition-all duration-300 ${oos ? 'oos-overlay' : ''}`}
      style={{ borderRadius: '24px' }}>
      {/* --- Image area --- */}
      <div className="plate-img relative aspect-square overflow-hidden bg-gradient-to-b from-card to-tint-tone" style={{ borderRadius: '24px 24px 0 0' }}>
        {img ? (
          <Image src={imageUrl(img.storage_path)} alt={img.alt ?? product.name}
            fill sizes="(max-width: 768px) 50vw, 25vw" priority={priority}
            quality={75}
            className="object-cover" />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-muted/40">
            <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <circle cx="8.5" cy="10" r="1.5" fill="currentColor" stroke="none" />
              <path d="m3 16 5-4 4 3 3-2 6 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
        {/* badges with unique shapes */}
        {savePct > 0 ? (
          <span className="badge-float badge-hex absolute left-3 top-3 z-10 h-11 w-14 bg-gradient-to-br from-volt to-accent text-[10px] font-bold uppercase tracking-wide text-white shadow-lg">
            −{savePct}%
          </span>
        ) : oos ? (
          <span className="absolute left-3 top-3 z-10 rounded-full bg-deep/90 px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
            {dict.product.outOfStock}
          </span>
        ) : low ? (
          <span className="badge-float absolute left-3 top-3 z-10 rounded-full bg-warn-soft px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-wide text-warn">
            {pricing.stock} {dict.product.lowStock}
          </span>
        ) : null}
        {/charger|adapter/i.test(product.name) && (
          <span className="absolute right-3 top-3 z-10 rounded bg-white/90 px-1.5 py-1 text-[9.5px] font-extrabold uppercase tracking-widest text-deep shadow-sm backdrop-blur-md">
            🇬🇧 UK Plug
          </span>
        )}
        <WishlistButton productId={product.id} />
      </div>

      {/* --- Info area --- */}
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        {product.brand && (
          <span className="text-[11px] font-bold uppercase tracking-[0.05em] text-muted">{product.brand}</span>
        )}
        <h3 className="line-clamp-2 text-[15px] font-bold leading-snug tracking-[-0.01em]">{product.name}</h3>
        {(!!product.specs?.['Fast Charging'] || !!product.warranty_months) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {!!product.specs?.['Fast Charging'] && <FastChargeBadge />}
            <WarrantyBadge months={product.warranty_months} />
          </div>
        )}
        {!!product.rating_count && (
          <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-muted">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-warn" fill="currentColor" aria-hidden>
              <path d="m12 2 3 6.5 7 .6-5.3 4.6 1.6 6.9L12 17l-6.9 3.6 1.6-6.9L1.4 9.1l7-.6z" />
            </svg>
            {product.rating_avg?.toFixed(1)} · {product.rating_count}
          </span>
        )}
        <div className="mt-auto flex items-center justify-between pt-2.5">
          <div className="flex items-baseline gap-1.5">
            <span className={`text-[17px] font-extrabold tracking-[-0.02em] ${oos ? 'text-muted line-through' : ''}`}>{formatLKR(pricing.price)}</span>
            {pricing.compareAt && !oos && <s className="text-[12.5px] font-semibold text-muted">{formatLKR(pricing.compareAt)}</s>}
          </div>
          {/* Action button — organic shape */}
          {oos ? (
            <span className="btn-organic grid h-9 w-9 place-items-center bg-deep/10 text-muted" aria-hidden>
              <svg viewBox="0 0 24 24" className="h-[16px] w-[16px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </span>
          ) : (
            <span className="btn-organic grid h-9 w-9 place-items-center bg-deep text-white transition-all group-hover:scale-110 group-hover:bg-volt group-hover:shadow-lg" aria-hidden>
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
