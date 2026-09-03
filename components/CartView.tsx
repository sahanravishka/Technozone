'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useCart } from '@/lib/cart-store';
import type { Dict } from '@/lib/i18n/dictionaries';
import type { DeliveryZone, Discount, Product } from '@/lib/types';
import type { Locale } from '@/lib/i18n/config';
import { formatLKR } from '@/lib/site';
import ProductCard from '@/components/ProductCard';
import { fetchCartSuggestions } from '@/app/[locale]/cart/actions';

const TRUST_ICONS = [
  <><path key="a" d="M12 2 4 5v6c0 5 3.5 8 8 11 4.5-3 8-6 8-11V5z" /><path key="b" d="m9 12 2 2 4-4" /></>,
  <><rect key="a" x="1" y="6" width="14" height="11" rx="2" /><path key="b" d="M15 9h4l3 3v5h-7" /><circle key="c" cx="6" cy="18" r="1.6" /><circle key="d" cx="17" cy="18" r="1.6" /></>,
  <><path key="a" d="M3 12a9 9 0 0 1 18 0" /><path key="b" d="M21 12v4a3 3 0 0 1-3 3h-3" /><rect key="c" x="3" y="11" width="3" height="6" rx="1.5" /><rect key="d" x="18" y="11" width="3" height="6" rx="1.5" /></>
];

export default function CartView({ dict, zones, locale, discounts }:
  { dict: Dict; zones: DeliveryZone[]; locale: Locale; discounts: Discount[] }) {
  const { items, subtotal, setQty, remove, hydrated } = useCart();
  const [zoneId, setZoneId] = useState(zones[0]?.id);
  const zone = zones.find(z => z.id === zoneId) ?? zones[0];
  const delivery = items.length ? (zone?.fee ?? 0) : 0;

  // Cross-sell. Keyed on a joined *string* of product ids, never the items
  // array itself — the array gets a fresh identity on every cart dispatch, so
  // depending on it here would refetch (and re-render) forever.
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const productKey = [...new Set(items.map(i => i.productId))].sort().join(',');
  useEffect(() => {
    if (!productKey) { setSuggestions([]); return; }
    let cancelled = false;
    fetchCartSuggestions(productKey.split(','))
      .then(found => { if (!cancelled) setSuggestions(found); })
      .catch(() => { if (!cancelled) setSuggestions([]); });
    return () => { cancelled = true; };
  }, [productKey]);

  const trust = [
    { t: dict.trust.warranty, s: dict.trust.warrantysub },
    { t: dict.trust.courier, s: dict.trust.couriersub },
    { t: dict.trust.whatsapp, s: dict.trust.whatsappsub }
  ];

  if (!hydrated) {
    return <div className="space-y-3">{[0, 1].map(i => <div key={i} className="skeleton h-24" style={{ borderRadius: '22px' }} />)}</div>;
  }

  if (items.length === 0) {
    return (
      <div className="card-glass px-6 py-16 text-center" style={{ borderRadius: '28px' }}>
        <p className="text-lg font-semibold">{dict.cart.empty}</p>
        <Link href={`/${locale}`}
          className="btn-pill pressable mt-5 inline-flex h-12 items-center bg-gradient-to-r from-volt to-volt-deep px-6 font-semibold text-white hover:shadow-lg">
          {dict.cart.emptyCta}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0">
      {/* items */}
      <ul className="space-y-3">
        {items.map(item => (
          <li key={item.variantId} className="card-soft flex gap-3.5 p-3.5" style={{ borderRadius: '22px' }}>
            <Link href={`/${locale}/product/${item.slug}`}
              className="relative h-20 w-20 shrink-0 overflow-hidden bg-[#F0F3F8]" style={{ borderRadius: '16px' }}>
              {item.image && <Image src={item.image} alt={item.name} fill sizes="80px" quality={60} className="object-cover" />}
            </Link>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link href={`/${locale}/product/${item.slug}`} className="line-clamp-1 text-[14.5px] font-semibold">
                    {item.name}
                  </Link>
                  {item.variantName !== 'Default' && (
                    <p className="mt-0.5 truncate text-[12px] text-muted">{item.variantName}</p>
                  )}
                </div>
                <button onClick={() => remove(item.variantId)} aria-label={dict.cart.remove}
                  className="pressable -mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted hover:bg-sale/10 hover:text-sale">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg>
                </button>
              </div>
              <div className="mt-auto flex items-center justify-between pt-2">
                {/* Quantity control — pill shape */}
                <div className="flex h-9 items-center rounded-full bg-paper text-sm">
                  <button onClick={() => setQty(item.variantId, item.qty - 1)} className="pressable h-full w-9 text-muted hover:text-ink" aria-label="−">−</button>
                  <span className="w-6 text-center font-semibold">{item.qty}</span>
                  <button onClick={() => setQty(item.variantId, item.qty + 1)} className="pressable h-full w-9 text-muted hover:text-ink" aria-label="+">+</button>
                </div>
                <span className="text-[14.5px] font-bold">{formatLKR(item.price * item.qty)}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Cross-sell — fills the dead space beside the summary on desktop, and
          it's the natural moment to add a charger/case to the order. */}
      {suggestions.length > 0 && (
        <section className="mt-7" aria-label={dict.sections.goesWith}>
          <h2 className="mb-3.5 text-[15.5px] font-bold">{dict.sections.goesWith}</h2>
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            {suggestions.map(p => (
              <ProductCard key={p.id} product={p} discounts={discounts} locale={locale} dict={dict} />
            ))}
          </div>
        </section>
      )}

      {/* Reassurance, right where people hesitate before paying. */}
      <ul className="mt-7 grid gap-3 sm:grid-cols-3">
        {trust.map((v, i) => (
          <li key={v.t} className="card-glass flex items-start gap-3 p-3.5" style={{ borderRadius: '16px' }}>
            <span className="grid h-9 w-9 shrink-0 place-items-center bg-gradient-to-br from-volt/10 to-accent/10 text-volt"
              style={{ borderRadius: '12px' }}>
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{TRUST_ICONS[i]}</svg>
            </span>
            <div className="min-w-0">
              <h3 className="text-[13px] font-bold leading-tight">{v.t}</h3>
              <p className="mt-0.5 text-[11.5px] leading-snug text-muted">{v.s}</p>
            </div>
          </li>
        ))}
      </ul>
      </div>

      {/* summary — glassmorphism */}
      <aside className="card-glass h-fit p-5 lg:sticky lg:top-24" style={{ borderRadius: '24px' }}>
        <label className="text-[13px] font-semibold text-muted" htmlFor="zone">
          {dict.cart.deliveryZone}
        </label>
        <select id="zone" value={zoneId} onChange={e => setZoneId(e.target.value)}
          className="mt-2 h-12 w-full bg-paper px-3.5 text-[14px] font-medium outline-none focus:ring-2 focus:ring-volt"
          style={{ borderRadius: '14px' }}>
          {zones.map(z => (
            <option key={z.id} value={z.id}>{z.name} — {formatLKR(z.fee)}</option>
          ))}
        </select>

        <dl className="mt-5 space-y-2.5 border-t border-line/50 pt-4 text-[14px]">
          <div className="flex justify-between text-muted">
            <dt>{dict.cart.subtotal}</dt><dd>{formatLKR(subtotal)}</dd>
          </div>
          <div className="flex justify-between text-muted">
            <dt>{dict.cart.delivery}</dt><dd>{formatLKR(delivery)}</dd>
          </div>
          <div className="flex justify-between border-t border-line/50 pt-3 text-[17px] font-bold">
            <dt>{dict.cart.total}</dt><dd>{formatLKR(subtotal + delivery)}</dd>
          </div>
        </dl>

        {/* Checkout — skewed button for emphasis */}
        <Link href={`/${locale}/checkout`}
          className="btn-skew pressable mt-5 flex h-12 w-full items-center justify-center bg-gradient-to-r from-volt to-volt-deep font-semibold text-white transition-all hover:shadow-[0_12px_28px_-8px_rgba(27,111,216,.5)]">
          <span>{dict.cart.checkout}</span>
        </Link>
        <p className="mt-3 text-center text-[11.5px] text-muted">{dict.cart.couponSoon}</p>
        <Link href={`/${locale}`} className="mt-1.5 block text-center text-[13px] font-semibold text-volt hover:underline">
          {dict.cart.continueShopping}
        </Link>
      </aside>
    </div>
  );
}
