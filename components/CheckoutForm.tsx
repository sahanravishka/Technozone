'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useCart } from '@/lib/cart-store';
import type { Dict } from '@/lib/i18n/dictionaries';
import type { DeliveryZone, Discount, Product } from '@/lib/types';
import type { Locale } from '@/lib/i18n/config';
import { formatLKR, SITE, waLink, KOKO_ENABLED } from '@/lib/site';
import { priceProduct } from '@/lib/pricing';
import { imageUrl } from '@/lib/supabase';
import { createOrder, saveAbandonedCart } from '@/app/[locale]/checkout/actions';
import { KokoBadge } from './KokoBadge';

const inputCls = 'h-12 w-full rounded-btn bg-card px-3.5 text-[14px] font-medium outline-none focus:ring-2 focus:ring-volt';
const label = 'mb-1.5 block text-[13px] font-semibold text-muted';

function Field({ text, children }: { text: string; children: React.ReactNode }) {
  return <label className="block"><span className={label}>{text}</span>{children}</label>;
}

export default function CheckoutForm({ dict, zones, locale, signedIn, suggestions, discounts, payhereOn, kokoOn }:
  { dict: Dict; zones: DeliveryZone[]; locale: Locale; signedIn: boolean;
    suggestions: Product[]; discounts: Discount[]; payhereOn: boolean; kokoOn: boolean }) {
  const { items, subtotal, clear, add } = useCart();
  const router = useRouter();
  const [mode, setMode] = useState<'guest' | 'signin'>(signedIn ? 'signin' : 'guest');
  const [f, setF] = useState({ name: '', phone: '', email: '', address: '', city: '', postalCode: '', zoneId: zones[0]?.id ?? '', coupon: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [pay, setPay] = useState<'payhere' | 'cod' | 'whatsapp' | 'koko'>(payhereOn ? 'payhere' : 'cod');
  const [placed, setPlaced] = useState<string | null>(null);
  const [fulfillment, setFulfillment] = useState<'delivery' | 'pickup'>('delivery');
  const [redirecting, setRedirecting] = useState<{ url: string; fields: Record<string, string> } | null>(null);

  useEffect(() => {
    if (redirecting) {
      const f = document.getElementById('payment-redirect-form') as HTMLFormElement;
      if (f) f.submit();
    }
  }, [redirecting]);

  const zone = zones.find(z => z.id === f.zoneId) ?? zones[0];
  const delivery = (items.length && fulfillment === 'delivery') ? Number(zone?.fee ?? 0) : 0;
  const kokoFee = pay === 'koko' ? Math.round((subtotal + delivery) * 0.12) : 0;
  const grandTotal = subtotal + delivery + kokoFee;
  const kokoInstallment = Math.ceil(grandTotal / 3);
  const inCartIds = useMemo(() => new Set(items.map(i => i.productId)), [items]);
  const suggList = suggestions.filter(s => !inCartIds.has(s.id)).slice(0, 6);

  if (redirecting) {
    return (
      <div className="mx-auto max-w-md rounded-3xl bg-card p-8 text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-line border-t-volt"></div>
        <p className="text-[17px] font-bold">Redirecting to secure payment...</p>
        <p className="mt-2 text-[13.5px] text-muted">Please do not close this window.</p>
        <form id="payment-redirect-form" method="POST" action={redirecting.url} className="hidden">
          {Object.entries(redirecting.fields).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
        </form>
      </div>
    );
  }

  if (placed) {
    return (
      <div className="mx-auto max-w-md rounded-3xl bg-card p-8 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-[#E8F7EE] text-2xl">✓</div>
        <p className="text-[17px] font-bold">{dict.pay.placed}</p>
        <p className="mx-auto mt-2 max-w-xs text-[13.5px] text-muted">{dict.pay.placedSub}</p>
        <p className="mt-4 inline-block rounded-xl bg-volt-soft px-5 py-2.5 text-[16px] font-bold text-volt">{placed}</p>
        <div className="mt-6">
          <Link href={`/${locale}`} className="text-[13px] font-semibold text-volt hover:underline">{dict.cart.emptyCta} →</Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md rounded-3xl bg-card p-8 text-center">
        <p className="text-[15px] font-semibold">{dict.cart.empty}</p>
        <Link href={`/${locale}`} className="pressable mt-5 inline-flex h-12 items-center rounded-btn bg-volt px-6 font-semibold text-white hover:bg-volt-deep">
          {dict.cart.emptyCta}
        </Link>
      </div>
    );
  }

  const addSuggestion = (p: Product) => {
    const pr = priceProduct(p, discounts);
    const img = p.product_images?.[0];
    add({
      productId: p.id, variantId: pr.variantId, slug: p.slug, name: p.name,
      variantName: 'Default', sku: pr.sku, price: pr.price,
      image: img ? imageUrl(img.storage_path) : '', qty: 1, stock: pr.stock
    });
  };

  const submit = async () => {
    setBusy(true); setErr('');
    const res = await createOrder({
      lines: items.map(i => ({ variantId: i.variantId, qty: i.qty })),
      locale, name: f.name, phone: f.phone, address: f.address, city: f.city, postalCode: f.postalCode,
      email: mode === 'guest' ? f.email : undefined,
      zoneId: f.zoneId, couponCode: f.coupon || undefined,
      paymentMethod: pay, fulfillment
    });
    if (!res.ok) {
      setBusy(false);
      if (res.error === 'auth') router.push(`/${locale}/login?next=/${locale}/checkout`);
      else if (res.error === 'stock') setErr(dict.form.stockErr);
      else if (res.error === 'config') setErr('Online payment is not set up yet — try Cash on delivery or WhatsApp.');
      else if (res.error === 'cod_blocked') setErr('Cash on delivery is not available for this number. Please pay online or order on WhatsApp.');
      else if (res.error === 'cod_limit') setErr('This order is above the Cash-on-delivery limit. Please pay online or order on WhatsApp.');
      else if (res.error === 'rate') setErr('Too many attempts — please wait a minute and try again.');
      else if (res.error === 'koko_error') setErr(`Koko error: ${res.detail}`);
      else if (res.error === 'server_error') setErr(`Server error: ${res.detail}`);
      else setErr('Something went wrong. Please check your details.');
      return;
    }

    // Online: Render the form and auto-submit it so browsers don't block the redirect.
    // We intentionally DO NOT clear the cart here — we only clear it on the success page,
    // so if the user cancels the payment and comes back, their cart is still intact.
    if (res.method === 'payhere' || res.method === 'koko') {
      setRedirecting({ url: res.gateway!, fields: res.fields! });
      return;
    }

    // WhatsApp: open chat pre-filled with the order; COD: just confirm.
    if (res.method === 'cod' || res.method === 'whatsapp') {
      if (res.method === 'whatsapp') {
        const lines = res.items.map(it => `• ${it.name} ×${it.qty} — ${formatLKR(it.line)}`).join('\n');
        const fline = fulfillment === 'pickup' ? `\n${dict.pay.pickup}` : `\nAddress: ${f.address}, ${f.city}`;
        const msg = `${dict.pay.waMsgIntro}\n${lines}\n\nTotal: ${formatLKR(res.total)}\nName: ${f.name}\nPhone: ${f.phone}${fline}\nRef: ${res.orderNumber}`;
        window.open(waLink(msg), '_blank');
      }
      clear();
      setBusy(false);
      setPlaced(res.orderNumber);
    }
  };

    // We automatically fallback to guest@technozonelanka.com on the server
    // if the email is missing, so we do not need to enforce it on the frontend.
    const emailOk = true;
  const addrOk = fulfillment === 'pickup' || (f.address && f.city);
  const canPay = !!(f.name && f.phone && addrOk && emailOk);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-4">
        {/* guest / sign-in toggle */}
        {!signedIn && (
          <div className="flex rounded-full bg-card p-1">
            {(['guest', 'signin'] as const).map(m => (
              <button key={m} onClick={() => m === 'signin' ? router.push(`/${locale}/login?next=/${locale}/checkout`) : setMode(m)}
                className={`flex-1 rounded-full py-2.5 text-[13px] font-semibold transition-colors ${mode === m ? 'bg-volt text-white' : 'text-muted'}`}>
                {m === 'guest' ? 'Guest checkout' : dict.account.signIn}
              </button>
            ))}
          </div>
        )}

        {/* fulfillment: deliver vs in-store pickup */}
        <div>
          <p className="mb-1.5 text-[13px] font-semibold text-muted">{dict.pay.fulfil}</p>
          <div className="grid grid-cols-2 gap-2">
            {([['delivery', dict.pay.deliver, dict.pay.deliverSub, '🚚'],
               ['pickup', dict.pay.pickup, dict.pay.pickupSub, '🏬']] as const).map(([m, label, sub, icon]) => (
              <button key={m} onClick={() => setFulfillment(m)}
                className={`rounded-2xl border-2 p-3 text-left transition-colors ${fulfillment === m ? 'border-volt bg-volt-soft' : 'border-transparent bg-card'}`}>
                <span className="text-[14px] font-semibold">{icon} {label}</span>
                <span className="mt-0.5 block text-[11.5px] text-muted">{sub}</span>
              </button>
            ))}
          </div>
        </div>

        <Field text={dict.form.name}>
          <input className={inputCls} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} autoComplete="name" />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field text={dict.form.phone}>
            <input className={inputCls} value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })}
              onBlur={() => {
                if (f.phone.replace(/\D/g, '').length < 9 || items.length === 0) return;
                saveAbandonedCart({
                  name: f.name, phone: f.phone, email: f.email || undefined,
                  items: items.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
                  subtotal, locale
                }).catch(() => {});
              }}
              inputMode="tel" placeholder="07X XXX XXXX" />
          </Field>
          {mode === 'guest' && (pay === 'payhere' || pay === 'koko') && (
            <Field text={`${dict.account.email} *`}>
              <input className={inputCls} value={f.email} onChange={e => setF({ ...f, email: e.target.value })} inputMode="email" type="email" placeholder="your@email.com" />
            </Field>
          )}
        </div>
        {fulfillment === 'delivery' ? (
          <>
            <Field text={dict.form.address}>
              <input className={inputCls} value={f.address} onChange={e => setF({ ...f, address: e.target.value })} autoComplete="street-address" />
            </Field>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field text={dict.form.city}>
                <input className={inputCls} value={f.city} onChange={e => setF({ ...f, city: e.target.value })} />
              </Field>
              <Field text="Postal code">
                <input className={inputCls} value={f.postalCode} onChange={e => setF({ ...f, postalCode: e.target.value })} inputMode="numeric" placeholder="e.g. 10250" maxLength={10} autoComplete="postal-code" />
              </Field>
              <Field text={dict.cart.deliveryZone}>
                <select className={inputCls} value={f.zoneId} onChange={e => setF({ ...f, zoneId: e.target.value })}>
                  {zones.map(z => <option key={z.id} value={z.id}>{z.name} — {formatLKR(z.fee)}</option>)}
                </select>
              </Field>
            </div>
          </>
        ) : (
          <div className="rounded-2xl bg-volt-soft p-4 text-[13px] font-medium text-volt">
            🏬 {dict.pay.pickupSub}
          </div>
        )}
        <Field text={dict.form.coupon}>
          <input className={inputCls} value={f.coupon} onChange={e => setF({ ...f, coupon: e.target.value.toUpperCase() })} placeholder="WELCOME10" />
        </Field>

        {/* GOES WELL WITH YOUR CART */}
        {suggList.length > 0 && (
          <div className="pt-2">
            <p className="mb-3 text-[15px] font-bold">{dict.sections.goesWith}</p>
            <div className="rail flex gap-3 overflow-x-auto pb-1">
              {suggList.map(p => {
                const pr = priceProduct(p, discounts);
                const img = p.product_images?.[0];
                return (
                  <div key={p.id} className="w-[130px] shrink-0">
                    <div className="relative aspect-square overflow-hidden rounded-2xl bg-card">
                      {img && <Image src={imageUrl(img.storage_path)} alt={p.name} fill sizes="130px" className="object-cover" />}
                    </div>
                    <p className="mt-1.5 line-clamp-1 text-[12px] font-semibold">{p.name}</p>
                    <button onClick={() => addSuggestion(p)}
                      className="pressable mt-0.5 text-[12px] font-bold text-volt hover:underline">
                      + Add · {formatLKR(pr.price)}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* summary */}
      <aside className="h-fit rounded-3xl bg-card p-5 lg:sticky lg:top-24">
        <ul className="space-y-2 text-[13.5px]">
          {items.map(i => (
            <li key={i.variantId} className="flex justify-between gap-3 text-muted">
              <span className="min-w-0 truncate">{i.name} ×{i.qty}</span>
              <span className="shrink-0">{formatLKR(i.price * i.qty)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-2 border-t border-[#EEF1F6] pt-3 text-[14px]">
          <div className="flex justify-between text-muted"><dt>{dict.cart.subtotal}</dt><dd>{formatLKR(subtotal)}</dd></div>
          <div className="flex justify-between text-muted"><dt>{dict.cart.delivery}</dt><dd>{formatLKR(delivery)}</dd></div>
          {pay === 'koko' && (
            <div className="flex justify-between text-muted">
              <dt className="flex items-center gap-1.5">Koko service fee (12%)</dt>
              <dd>{formatLKR(kokoFee)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-[#EEF1F6] pt-3 text-[17px] font-bold">
            <dt>{dict.cart.total}</dt><dd>{formatLKR(grandTotal)}</dd>
          </div>
          {pay === 'koko' && (
            <div className="rounded-xl bg-[#6D28D9]/[0.06] p-3 text-[12.5px] text-[#6D28D9]">
              <p className="font-bold">3 installments of {formatLKR(kokoInstallment)}</p>
              <p className="mt-0.5 text-[11.5px] opacity-80">Pay 1/3 today, the rest over the next 2 months via Koko.</p>
            </div>
          )}
        </dl>
        {/* payment method */}
        <p className="mb-2 mt-5 text-[12.5px] font-bold text-muted">{dict.pay.method}</p>
        <div className="space-y-2">
          {([
            payhereOn ? ['payhere', dict.pay.online, dict.pay.onlineSub, '💳'] : null,
            ['cod', fulfillment === 'pickup' ? dict.pay.payAtStore : dict.pay.cod, fulfillment === 'pickup' ? dict.pay.pickupSub : dict.pay.codSub, '💵'],
            ['whatsapp', dict.pay.whatsapp, dict.pay.whatsappSub, '🟢'],
            (KOKO_ENABLED && kokoOn) ? ['koko', 'Koko', `3 x ${formatLKR(Math.ceil((subtotal + delivery) * 1.12 / 3))} — pay later`, '🟣'] : null
          ].filter(Boolean) as [string, string, string, string][]).map(([m, label, sub, icon]) => (
            <button key={m} onClick={() => setPay(m as typeof pay)}
              className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left transition-colors ${pay === m ? 'border-volt bg-volt-soft' : 'border-transparent bg-paper'}`}>
              {m === 'koko' ? <KokoBadge /> : <span className="text-lg">{icon}</span>}
              <span className="flex-1">
                <span className="block text-[13.5px] font-semibold">{label}</span>
                <span className="block text-[11.5px] text-muted">{sub}</span>
              </span>
              <span className={`grid h-5 w-5 place-items-center rounded-full border-2 ${pay === m ? 'border-volt' : 'border-line'}`}>
                {pay === m && <span className="h-2.5 w-2.5 rounded-full bg-volt" />}
              </span>
            </button>
          ))}
        </div>

        {err && <p className="mt-3 rounded-xl bg-sale/10 p-3 text-[12.5px] font-medium text-sale">{err}</p>}
        <button onClick={submit} disabled={busy || !canPay}
          className="pressable mt-4 flex h-12 w-full items-center justify-center rounded-btn bg-volt font-semibold text-white transition-colors hover:bg-volt-deep disabled:bg-line disabled:text-muted">
          {busy ? dict.form.placing
            : pay === 'payhere' ? dict.form.pay
            : pay === 'whatsapp' ? dict.pay.sendWhatsApp
            : dict.pay.placeOrder}
        </button>
        <p className="mt-3 text-center text-[11.5px] text-muted">
          {pay === 'payhere' ? `🔒 ${dict.form.secure}`
            : pay === 'cod' ? `💵 ${dict.pay.codSub}`
            : pay === 'koko' ? `🟣 Pay ${formatLKR(kokoInstallment)} now, rest over 2 months`
            : `🟢 ${dict.pay.whatsappSub}`}
        </p>
      </aside>
    </div>
  );
}
