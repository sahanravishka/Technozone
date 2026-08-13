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
import WishlistButton from './WishlistButton';
import NotifyMeForm from './NotifyMeForm';
import FastChargeBadge from './FastChargeBadge';

export default function ProductBuyPanel({ product, discounts, dict, productUrl }:
  { product: Product; discounts: Discount[]; dict: Dict; productUrl: string }) {
  const { add } = useCart();
  const variants = product.product_variants.filter(v => v.is_active);

  // ── Variant attribute model ──
  // New variants carry attributes {ram, rom, color:'#hex'}. We derive colour
  // swatches and RAM/ROM options from them. Falls back to name-based picking
  // for legacy variants that have no attributes.
  const hasAttrVariants = variants.some(v => v.attributes && (v.attributes.color || v.attributes.ram));

  // Distinct colours (hex) in variant order, each mapped to its photo if any.
  const colorImages = (product.product_images ?? []).filter(im => im.color_hex);
  const colors = useMemo(() => {
    const seen = new Map<string, { hex: string; imageId?: string; storage?: string }>();
    for (const v of variants) {
      const hex = v.attributes?.color;
      if (hex && !seen.has(hex)) {
        const im = colorImages.find(ci => ci.color_hex?.toLowerCase() === hex.toLowerCase());
        seen.set(hex, { hex, imageId: im?.id, storage: im?.storage_path });
      }
    }
    return [...seen.values()];
  }, [variants, colorImages]);

  // Distinct RAM/ROM combos in variant order.
  const storages = useMemo(() => {
    const seen = new Map<string, { ram: string; rom: string }>();
    for (const v of variants) {
      const { ram, rom } = v.attributes ?? {};
      if (ram && rom && !seen.has(`${ram}/${rom}`)) seen.set(`${ram}/${rom}`, { ram, rom });
    }
    return [...seen.values()];
  }, [variants]);

  const defaultVariant = variants.find(v => v.is_default) ?? variants[0];
  const [selColor, setSelColor] = useState<string | null>(defaultVariant?.attributes?.color ?? colors[0]?.hex ?? null);
  const [selStorage, setSelStorage] = useState<string | null>(
    defaultVariant?.attributes?.ram && defaultVariant?.attributes?.rom
      ? `${defaultVariant.attributes.ram}/${defaultVariant.attributes.rom}`
      : (storages[0] ? `${storages[0].ram}/${storages[0].rom}` : null)
  );
  const [legacyVariantId, setLegacyVariantId] = useState(defaultVariant?.id);
  const [qty, setQty] = useState(1);
  const [imgIdx, setImgIdx] = useState(0);
  const [justAdded, setJustAdded] = useState(false);

  // Resolve the chosen colour + RAM/ROM to a single variant.
  const variant = useMemo(() => {
    if (!hasAttrVariants) return variants.find(v => v.id === legacyVariantId) ?? variants[0];
    return variants.find(v => {
      const a = v.attributes ?? {};
      const colorOk = colors.length === 0 || a.color === selColor;
      const storageOk = storages.length === 0 || `${a.ram}/${a.rom}` === selStorage;
      return colorOk && storageOk;
    }) ?? variants[0];
  }, [hasAttrVariants, variants, legacyVariantId, colors, storages, selColor, selStorage]);

  // Which RAM/ROM combos exist for the currently-selected colour (for greying out).
  const availableStorages = useMemo(() => {
    if (!selColor) return new Set(storages.map(s => `${s.ram}/${s.rom}`));
    return new Set(
      variants
        .filter(v => v.attributes?.color === selColor && v.attributes?.ram)
        .map(v => `${v.attributes.ram}/${v.attributes.rom}`)
    );
  }, [variants, selColor, storages]);

  const stock = Math.max(variant.stock_qty - variant.reserved_qty, 0);
  const { price, compareAt } = useMemo(
    () => priceVariant(product, variant.price, discounts), [product, variant, discounts]
  );

  const images = [...(product.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);

  // When a colour is chosen, jump the gallery to that colour's photo.
  const selColorImageId = colors.find(c => c.hex === selColor)?.imageId;
  const effectiveImgIdx = useMemo(() => {
    if (selColorImageId) {
      const i = images.findIndex(im => im.id === selColorImageId);
      if (i >= 0) return i;
    }
    return Math.min(imgIdx, images.length - 1);
  }, [selColorImageId, images, imgIdx]);
  const img = images[effectiveImgIdx];
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
          {img ? (
            <Image key={img.id} src={imageUrl(img.storage_path)} alt={img.alt ?? product.name}
              fill priority fetchPriority="high" sizes="(max-width: 768px) 100vw, 50vw"
              quality={90}
              className="page-enter object-cover" />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-muted/40">
              <svg viewBox="0 0 24 24" className="h-16 w-16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <circle cx="8.5" cy="10" r="1.5" fill="currentColor" stroke="none" />
                <path d="m3 16 5-4 4 3 3-2 6 5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
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
              <button key={im.id} onClick={() => { setImgIdx(i); if (im.color_hex) setSelColor(im.color_hex); }} aria-label={`Image ${i + 1}`}
                className={`relative h-16 w-16 shrink-0 overflow-hidden transition-all ${i === effectiveImgIdx ? 'ring-2 ring-volt' : 'opacity-65 hover:opacity-100'}`}
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
          {!!product.specs?.['Fast Charging'] && (
            <div className="mt-2"><FastChargeBadge size="md" /></div>
          )}
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

        {/* ── Colour circles ── */}
        {colors.length > 0 && (
          <div>
            <p className="mb-2 text-[13px] font-semibold text-muted">
              {dict.product.chooseVariant}
            </p>
            <div className="flex flex-wrap gap-2.5">
              {colors.map(c => {
                const active = c.hex === selColor;
                return (
                  <button
                    key={c.hex}
                    onClick={() => {
                      setSelColor(c.hex);
                      setQty(1);
                      // If current storage not available for this colour, pick first available.
                      const avail = variants.filter(v => v.attributes?.color === c.hex && v.attributes?.ram);
                      if (storages.length && avail.length) {
                        const cur = `${avail[0].attributes.ram}/${avail[0].attributes.rom}`;
                        const stillOk = avail.some(v => `${v.attributes.ram}/${v.attributes.rom}` === selStorage);
                        if (!stillOk) setSelStorage(cur);
                      }
                    }}
                    aria-label={`Colour ${c.hex}`}
                    aria-pressed={active}
                    className={`relative h-10 w-10 rounded-full transition-all ${active ? 'ring-2 ring-volt ring-offset-2 ring-offset-card scale-110' : 'ring-1 ring-line hover:scale-105'}`}
                    style={{ background: c.hex }}
                  >
                    {active && (
                      <svg viewBox="0 0 24 24" className="absolute inset-0 m-auto h-5 w-5 drop-shadow"
                        fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── RAM / ROM buttons ── */}
        {storages.length > 0 && (
          <div>
            <p className="mb-2 text-[13px] font-semibold text-muted">RAM / Storage</p>
            <div className="flex flex-wrap gap-2">
              {storages.map(s => {
                const key = `${s.ram}/${s.rom}`;
                const active = key === selStorage;
                const avail = availableStorages.has(key);
                return (
                  <button
                    key={key}
                    disabled={!avail}
                    onClick={() => { setSelStorage(key); setQty(1); }}
                    className={`pressable border px-4 py-2.5 text-[13px] font-medium transition-all ${active ? 'btn-pill border-transparent bg-gradient-to-r from-volt to-volt-deep text-white shadow-md' : avail ? 'border-line bg-card text-muted hover:bg-paper' : 'border-line bg-paper/50 text-line line-through cursor-not-allowed'}`}
                    style={{ borderRadius: active ? '999px' : '14px' }}
                  >
                    {s.ram}/{s.rom}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Legacy variants (no attributes) ── */}
        {!hasAttrVariants && variants.length > 1 && (
          <div>
            <p className="mb-2 text-[13px] font-semibold text-muted">{dict.product.chooseVariant}</p>
            <div className="flex flex-wrap gap-2">
              {variants.map(v => (
                <button key={v.id} onClick={() => { setLegacyVariantId(v.id); setQty(1); }}
                  className={`pressable border px-4 py-2.5 text-[13px] font-medium transition-all ${v.id === variant.id ? 'btn-pill border-transparent bg-gradient-to-r from-volt to-volt-deep text-white shadow-md' : 'border-line bg-card text-muted hover:bg-paper'}`}
                  style={{ borderRadius: v.id === variant.id ? '999px' : '14px' }}>
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
          <WishlistButton productId={product.id} variant="panel" />
          <a href={waLink(waText)} target="_blank" rel="noopener noreferrer"
            aria-label={dict.product.askProduct}
            className="pressable btn-diamond grid h-12 w-12 shrink-0 place-items-center bg-card transition-colors hover:bg-[#EAF7EF]">
            <WhatsAppIcon className="h-[21px] w-[21px] text-[#1FAF5E]" />
          </a>
        </div>

        {/* Notify me when out of stock */}
        {stock <= 0 && (
          <NotifyMeForm productId={product.id} variantId={variant.id} productName={product.name} />
        )}

        {/* specs — glassmorphism card */}
        {Object.keys(product.specs ?? {}).length > 0 && (
          <div className="card-glass px-4 py-1" style={{ borderRadius: '20px' }}>
            {Object.entries(product.specs).flatMap(([k, v]) => {
              const valStr = String(v);
              // Recover squished text pasted from single-line inputs (e.g. "mmWeight:" -> "mm\nWeight:")
              let recovered = valStr.replace(/([a-zA-Z0-9\)])([A-Z0-9][A-Za-z0-9\s]+:)/g, '$1\n$2');
              // Break lines on comma separated key-value patterns
              recovered = recovered.replace(/, (?=[A-Z0-9][A-Za-z0-9\s]+:)/g, '\n');
              
              const lines = recovered.split('\n').map(l => l.trim()).filter(Boolean);
              
              if (lines.length === 1 && !lines[0].includes(':')) {
                return [[k, lines[0]]];
              }
              
              const pairs: [string, string][] = [];
              let currentKey = k;
              let currentVal = '';
              
              for (const line of lines) {
                const colonIdx = line.indexOf(':');
                // Assume it's a new spec property if there's a colon near the start
                if (colonIdx > 0 && colonIdx < 35) {
                  if (currentVal) pairs.push([currentKey, currentVal]);
                  currentKey = line.substring(0, colonIdx).trim();
                  currentVal = line.substring(colonIdx + 1).trim();
                } else {
                  currentVal += (currentVal ? ', ' : '') + line;
                }
              }
              if (currentVal) pairs.push([currentKey, currentVal]);
              
              return pairs.length > 0 ? pairs : [[k, valStr]];
            }).map(([k, v], i) => (
              <div key={k + i} className={`flex flex-col gap-1 py-3 text-[13px] sm:flex-row sm:items-baseline sm:justify-between sm:gap-4 ${i ? 'border-t border-line/50' : ''}`}>
                <dt className="shrink-0 text-muted">{k}</dt>
                <dd className="min-w-0 break-words font-medium text-ink/90 whitespace-pre-wrap sm:text-right">{v}</dd>
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
