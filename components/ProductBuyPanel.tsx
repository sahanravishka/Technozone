'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import type { Discount, Product } from '@/lib/types';
import type { Dict } from '@/lib/i18n/dictionaries';
import { priceVariant } from '@/lib/pricing';
import { imageUrl } from '@/lib/supabase';
import { useCart } from '@/lib/cart-store';
import { SITE, formatLKR, waLink } from '@/lib/site';
import PriceTag from './PriceTag';
import StockBadge from './StockBadge';
import { WhatsAppIcon } from './WhatsAppButton';

export default function ProductBuyPanel({ product, discounts, dict, productUrl }:
  { product: Product; discounts: Discount[]; dict: Dict; productUrl: string }) {
  const { add } = useCart();
  const variants = product.product_variants.filter(v => v.is_active);
  const [variantId, setVariantId] = useState(
    (variants.find(v => v.is_default) ?? variants[0])?.id
  );
  const [qty, setQty] = useState(1);
  const [imgIdx, setImgIdx] = useState(0);
  const [justAdded, setJustAdded] = useState(false);

  const variant = variants.find(v => v.id === variantId) ?? variants[0];
  const stock = Math.max(variant.stock_qty - variant.reserved_qty, 0);
  const { price, compareAt } = useMemo(
    () => priceVariant(product, variant.price, discounts), [product, variant, discounts]
  );

  const images = [...(product.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const img = images[Math.min(imgIdx, images.length - 1)];
  const savePct = compareAt ? Math.round(((compareAt - price) / compareAt) * 100) : 0;

  const addToCart = () => {
    if (stock <= 0) return;
    add({
      productId: product.id, variantId: variant.id, slug: product.slug,
      name: product.name, variantName: variant.name, sku: variant.sku,
      price, image: img ? imageUrl(img.storage_path) : '', qty, stock
    });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1800);
  };

  const waText = `Hi ${SITE.name}! I'm interested in: ${product.name}` +
    (variants.length > 1 ? ` (${variant.name})` : '') +
    ` — ${formatLKR(price)}\n${productUrl}`;

  const AddButton = ({ className = '' }: { className?: string }) => (
    <button onClick={addToCart} disabled={stock <= 0}
      className={`pressable btn-pill inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap px-4 text-[14.5px] font-semibold text-white transition-all disabled:cursor-not-allowed disabled:bg-line disabled:text-muted ${justAdded ? 'bg-ok pulse-ok' : 'bg-gradient-to-r from-volt to-volt-deep hover:shadow-[0_12px_28px_-8px_rgba(27,111,216,.5)] hover:-translate-y-0.5'} ${className}`}>
      {stock > 0 && !justAdded && (
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M6 8h12l1 12a1.6 1.6 0 0 1-1.6 1.7H6.6A1.6 1.6 0 0 1 5 20L6 8Z"/><path d="M9 10V7a3 3 0 0 1 6 0v3"/>
        </svg>
      )}
      {stock <= 0 ? dict.product.outOfStock : justAdded ? dict.product.added : dict.product.addToCart}
    </button>
  );

  return (
    <div className="grid gap-7 md:grid-cols-2 md:gap-12">
      {/* ---------- gallery ---------- */}
      <div>
        <div className="img-zoom-scroll relative mx-auto aspect-square w-full max-w-[420px] overflow-hidden bg-card md:max-w-none" style={{ borderRadius: '28px' }}>
          {img && (
            <Image key={img.id} src={imageUrl(img.storage_path)} alt={img.alt ?? product.name}
              fill priority fetchPriority="high" sizes="(max-width: 768px) 100vw, 50vw"
              quality={90}
              className="page-enter object-cover" />
          )}
          {savePct > 0 && (
            <span className="badge-hex absolute left-3.5 top-3.5 z-10 flex h-12 w-16 items-center justify-center bg-gradient-to-br from-volt to-accent text-[11.5px] font-bold text-white shadow-lg">
              {dict.product.save} {savePct}%
            </span>
          )}
        </div>
        {images.length > 1 && (
          <div className="rail mt-3 flex gap-2 overflow-x-auto">
            {images.map((im, i) => (
              <button key={im.id} onClick={() => setImgIdx(i)} aria-label={`Image ${i + 1}`}
                className={`relative h-16 w-16 shrink-0 overflow-hidden transition-all ${i === imgIdx ? 'ring-2 ring-volt' : 'opacity-65 hover:opacity-100'}`}
                style={{ borderRadius: '14px' }}>
                <Image src={imageUrl(im.storage_path)} alt="" fill sizes="64px" quality={60} className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ---------- buy panel ---------- */}
      <div className="flex flex-col gap-5">
        <div>
          <p className="text-[12.5px] font-medium text-muted">
            {product.brand ?? SITE.name}
            {product.specs?.Warranty ? ` · ${product.specs.Warranty}` : ''}
          </p>
          <h1 className="mt-1.5 text-[1.45rem] font-bold leading-tight tracking-tight md:text-[1.8rem]">
            {product.name}
          </h1>
          {!!product.rating_count && (
            <p className="mt-1.5 text-[12.5px]">
              <span className="stars" style={{ fontSize: 13 }}>{'★★★★★'.slice(0, Math.round(product.rating_avg ?? 0))}</span>
              <span className="ml-1 font-semibold">{(product.rating_avg ?? 0).toFixed(1)}</span>
              <span className="ml-1 text-muted">({product.rating_count} reviews)</span>
            </p>
          )}
          <div className="mt-3 flex items-baseline justify-between gap-3">
            <PriceTag price={price} compareAt={compareAt} size="lg" />
            <StockBadge stock={stock} dict={dict} />
          </div>
        </div>

        {variants.length > 1 && (
          <div>
            <p className="mb-2 text-[13px] font-semibold text-muted">{dict.product.chooseVariant}</p>
            <div className="flex flex-wrap gap-2">
              {variants.map(v => (
                <button key={v.id} onClick={() => { setVariantId(v.id); setQty(1); }}
                  className={`pressable border px-4 py-2.5 text-[13px] font-medium transition-all ${v.id === variantId ? 'btn-pill border-transparent bg-gradient-to-r from-volt to-volt-deep text-white shadow-md' : 'border-line bg-card text-muted hover:bg-paper'}`}
                  style={{ borderRadius: v.id === variantId ? '999px' : '14px' }}>
                  {v.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* qty + add — with unique shapes */}
        <div className="flex items-center gap-2">
          <div className="flex h-12 shrink-0 items-center bg-card" style={{ borderRadius: '16px' }}>
            <button onClick={() => setQty(q => Math.max(1, q - 1))} aria-label="Decrease"
              className="pressable h-full w-10 text-lg text-muted hover:text-ink">−</button>
            <span className="w-6 text-center text-[14.5px] font-semibold">{qty}</span>
            <button onClick={() => setQty(q => Math.min(stock || 1, q + 1))} aria-label="Increase"
              className="pressable h-full w-10 text-lg text-muted hover:text-ink">+</button>
          </div>
          <AddButton className="min-w-0 flex-1 px-3" />
          <a href={waLink(waText)} target="_blank" rel="noopener noreferrer"
            aria-label={dict.product.askProduct}
            className="pressable btn-diamond grid h-12 w-12 shrink-0 place-items-center bg-card transition-colors hover:bg-[#EAF7EF]">
            <WhatsAppIcon className="h-[21px] w-[21px] text-[#1FAF5E]" />
          </a>
        </div>

        {/* Notify me when out of stock */}
        {stock <= 0 && (
          <a href={waLink(`Hi! Please notify me when "${product.name}" is back in stock.\n${productUrl}`)}
            target="_blank" rel="noopener noreferrer"
            className="btn-notify flex h-11 items-center justify-center gap-2 px-6 text-[14px]">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            Notify me when available
          </a>
        )}

        {/* specs — glassmorphism card */}
        {Object.keys(product.specs ?? {}).length > 0 && (
          <div className="card-glass px-4 py-1" style={{ borderRadius: '20px' }}>
            {Object.entries(product.specs).map(([k, v], i) => (
              <div key={k} className={`flex items-baseline justify-between gap-4 py-3 text-[13px] ${i ? 'border-t border-line/50' : ''}`}>
                <dt className="shrink-0 text-muted">{k}</dt>
                <dd className="text-right font-medium">{String(v)}</dd>
              </div>
            ))}
          </div>
        )}

        {product.description && (
          <p className="text-[14px] leading-relaxed text-muted">{product.description}</p>
        )}
      </div>

      {/* ---------- sticky mobile CTA ---------- */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md md:hidden">
        <div className="flex items-center gap-3">
          <div className="shrink-0 pl-1">
            <PriceTag price={price} compareAt={compareAt} />
          </div>
          <AddButton className="min-w-0 flex-1" />
        </div>
      </div>
      <div className="h-24 md:hidden" aria-hidden />
    </div>
  );
}
