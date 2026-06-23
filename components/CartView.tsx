'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useCart } from '@/lib/cart-store';
import type { Dict } from '@/lib/i18n/dictionaries';
import type { DeliveryZone } from '@/lib/types';
import type { Locale } from '@/lib/i18n/config';
import { formatLKR } from '@/lib/site';

export default function CartView({ dict, zones, locale }:
  { dict: Dict; zones: DeliveryZone[]; locale: Locale }) {
  const { items, subtotal, setQty, remove, hydrated } = useCart();
  const [zoneId, setZoneId] = useState(zones[0]?.id);
  const zone = zones.find(z => z.id === zoneId) ?? zones[0];
  const delivery = items.length ? (zone?.fee ?? 0) : 0;

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
      {/* items */}
      <ul className="min-w-0 space-y-3">
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
