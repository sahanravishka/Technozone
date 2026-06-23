'use client';

import Link from 'next/link';
import { useCart } from '@/lib/cart-store';
import type { Dict } from '@/lib/i18n/dictionaries';
import type { Locale } from '@/lib/i18n/config';
import { SITE, formatLKR, waLink } from '@/lib/site';
import WhatsAppButton from './WhatsAppButton';

/** Stage 3 replaces this with the PayHere checkout flow.
 *  Until then the cart converts via WhatsApp, so the shop loses zero orders. */
export default function CheckoutStub({ dict, locale }: { dict: Dict; locale: Locale }) {
  const { items, subtotal } = useCart();
  const lines = items.map(i =>
    `• ${i.name}${i.variantName !== 'Default' ? ` (${i.variantName})` : ''} ×${i.qty} — ${formatLKR(i.price * i.qty)}`);
  const text = `Hi ${SITE.name}! I'd like to order:\n${lines.join('\n')}\n${dict.cart.subtotal}: ${formatLKR(subtotal)}`;

  return (
    <div className="mx-auto max-w-lg rounded-3xl bg-card p-8 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-volt-soft">
        <svg viewBox="0 0 24 24" className="h-7 w-7 text-volt" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a9 9 0 1 1-9-9"/><path d="M12 7v5l3 3"/>
        </svg>
      </div>
      <h2 className="mt-4 text-lg font-bold">{dict.checkout.soon}</h2>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">{dict.checkout.meanwhile}</p>
      <div className="mt-6 flex flex-col gap-3">
        {items.length > 0 && <WhatsAppButton text={text} label={dict.checkout.sendWhatsApp} variant="solid" />}
        <Link href={`/${locale}/cart`} className="text-[13px] font-semibold text-volt hover:underline">{dict.checkout.back}</Link>
      </div>
    </div>
  );
}
