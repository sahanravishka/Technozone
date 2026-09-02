import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import type { Locale } from '@/lib/i18n/config';
import { getDict } from '@/lib/i18n/dictionaries';
import { getServerSupabase } from '@/lib/supabase-clients/server';
import { getAdminSupabase } from '@/lib/supabase-clients/admin';
import { getCouriers } from '@/lib/data';
import { SHIPMENT_LABEL, trackUrl } from '@/lib/courier';
import { formatLKR, SITE, waLink, KOKO_ENABLED } from '@/lib/site';
import { kokoConfigured } from '@/lib/koko';
import StatusTimeline from '@/components/StatusTimeline';
import ClearCart from '@/components/ClearCart';
import { KokoBadge } from '@/components/KokoBadge';
import { BrandMark, Wordmark } from '@/components/Header';
import { reconcileKokoOrder } from '@/lib/koko-reconcile';

const ORDER_SELECT = `id, customer_id, order_number, status, payment_status, payment_method, subtotal,
      discount_total, delivery_fee, koko_fee, total, created_at, koko_order_id,
      order_items(id, product_name, variant_name, qty, line_total)`;

export const metadata: Metadata = { title: 'Order', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function OrderPage({ params, searchParams }:
  { params: Promise<{ locale: Locale; id: string }>; searchParams: Promise<{ status?: string }> }) {
  const { locale, id } = await params;
  const { status: gatewayStatus } = await searchParams;
  const dict = getDict(locale);
  const supabase = await getServerSupabase();
  if (!supabase) notFound();

  const { data: { user } } = await supabase.auth.getUser();

  const admin = getAdminSupabase();
  if (!admin) notFound();

  const cookieStore = await cookies();
  const guestToken = cookieStore.get('guest_order_id')?.value;

  // Fetch using admin so guest orders (no user) can be retrieved securely
  let { data: order } = await admin.from('orders')
    .select(ORDER_SELECT).eq('order_number', id).maybeSingle();
  if (!order) notFound();

  // If this order belongs to a registered customer, enforce authentication
  if (order.customer_id) {
    if (!user || user.id !== order.customer_id) {
      redirect(`/${locale}/login?next=/${locale}/order/${id}`);
    }
  } else {
    // Guest order: require the guest token cookie
    if (guestToken !== order.id) {
      redirect(`/${locale}/login?next=/${locale}/order/${id}`);
    }
  }

  // Self-healing fallback: Koko's response webhook is the normal source of
  // truth, but if it never arrives (a brief outage on either side, a
  // misrouted DNS blip — anything), an order would otherwise sit
  // "confirming" forever with no way out except a customer support ticket.
  // This page is exactly where a customer waiting on a Koko payment IS —
  // the 5s auto-refresh below means they'll hit this. A 15s grace period
  // gives the real webhook a fair chance to land first, so this only ever
  // fires as a fallback, not a race against it.
  if (order.payment_method === 'koko' && order.koko_order_id &&
      order.status === 'pending' && order.payment_status === 'unpaid' &&
      Date.now() - new Date(order.created_at).getTime() > 15_000) {
    const outcome = await reconcileKokoOrder(admin, order.id, order.koko_order_id);
    if (outcome === 'paid' || outcome === 'failed') {
      const { data: refreshed } = await admin.from('orders')
        .select(ORDER_SELECT).eq('id', order.id).maybeSingle();
      if (refreshed) order = refreshed;
    }
  }

  // Koko (and PayHere) always bounce the browser back through THIS SAME
  // _returnUrl on both success and failure — that initial bounce-back is
  // entirely their server's call, nothing here can suppress or skip it.
  // What we control is what happens the instant we get the browser back:
  // only a genuinely paid order gets to show the order/"thank you"
  // experience. A gateway-reported failure sends the customer straight
  // back into checkout to retry instead — the query param alone is never
  // trusted for anything security-relevant (payment_status, above, is the
  // only thing that ever does that), only to skip an unnecessary few
  // seconds on the "confirming" spinner when Koko already told us outright.
  if (gatewayStatus && gatewayStatus.toUpperCase() !== 'SUCCESS' && order.payment_status !== 'paid') {
    redirect(`/${locale}/checkout?cancelled=1`);
  }

  // ownership enforced; fetch tracking via admin
  let shipment: { courier_code: string | null; tracking_number: string | null; status: string } | null = null;
  let track: string | null = null;
  const { data: sh } = await admin.from('shipments')
    .select('courier_code, tracking_number, status').eq('order_id', order.id).maybeSingle();
  shipment = sh;
  if (sh?.tracking_number) {
    const couriers = await getCouriers();
    track = trackUrl(couriers.find(c => c.code === sh.courier_code), sh.tracking_number);
  }

  // Koko/PayHere bounce back through this SAME page whether the payment
  // succeeded or failed. payment_status only ever flips via a genuinely
  // signed source — their response webhook (the normal path) or the
  // reconciliation fallback above, which itself only trusts a signed
  // response from Koko's own Order View API — never anything client-
  // supplied or inferred from this page load itself. So three real states,
  // not two: still waiting for confirmation, confirmed paid, or confirmed
  // failed/cancelled. Showing "Order received!" for a failed payment would
  // tell a customer they were charged when they weren't.
  const isKoko = order.payment_method === 'koko';
  const isGateway = order.payment_method === 'koko' || order.payment_method === 'payhere';
  const paid = order.payment_status === 'paid';
  const failed = isGateway && order.payment_status === 'failed';
  const confirming = isGateway && !paid && !failed;
  // Cross-sell Koko to a customer who paid another way — only once the
  // order is genuinely settled (paid, or a final non-gateway method), never
  // while still confirming/failed, so it never competes with the "try
  // again" retry flow above.
  const showKokoCrossSell = !isKoko && (paid || !isGateway) && KOKO_ENABLED && kokoConfigured();

  const heroBg = paid
    ? 'bg-gradient-to-b from-tint-mint via-tint-mint/40 to-paper'
    : failed
      ? 'bg-gradient-to-b from-[#FDEBEC] via-[#FDEBEC]/40 to-paper'
      : 'bg-gradient-to-b from-tint-sky via-tint-sky/40 to-paper';

  return (
    <div className="page-enter">
      {/* Cart clears only once the order is genuinely confirmed paid — never
          on a still-confirming or failed gateway bounce-back. */}
      <ClearCart when={paid} />

      {/* ---------- full-bleed hero ---------- */}
      <div className={`relative overflow-hidden px-4 py-14 md:py-20 ${heroBg}`}>
        {/* brand accent — the same volt→accent gradient used on primary buttons site-wide */}
        <div className="absolute inset-x-0 top-0 h-1.5"
          style={{ background: 'linear-gradient(135deg, var(--volt), var(--accent))' }} aria-hidden />

        <div className="mx-auto max-w-xl text-center">
          <Link href={`/${locale}`} className="inline-flex flex-col items-center gap-1.5">
            <span className="inline-flex items-center gap-2.5">
              <BrandMark className="h-9 w-9 rounded-[11px] shadow-sm" />
              <Wordmark className="text-[15px]" />
            </span>
            <span className="text-[11.5px] font-medium text-muted">{SITE.tagline}</span>
          </Link>

          <div className={`mx-auto mt-7 grid h-20 w-20 place-items-center rounded-full text-[34px] shadow-soft
            ${paid ? 'bg-ok text-white animate-pulse-glow' : failed ? 'bg-sale text-white' : 'bg-card text-volt'}`}>
            {paid ? '✓' : failed ? '✕' : (
              <span className="block h-8 w-8 animate-spin rounded-full border-[3px] border-line border-t-volt" />
            )}
          </div>

          <h1 className="mt-5 text-[26px] font-black tracking-tight md:text-[32px]">
            {paid ? dict.order.thanks : failed ? 'Payment didn\'t go through' : dict.order.confirming}
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-[14px] text-muted">
            {paid
              ? (isKoko ? 'Paid with Koko — approved and confirmed.' : 'Your payment has been confirmed.')
              : failed
                ? 'No charge was made. Your cart is still saved, so you can try again or pick another payment method.'
                : 'This usually takes a few seconds while we confirm the payment with the gateway. This page updates itself automatically.'}
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center rounded-full bg-card px-4 py-2 text-[14px] font-bold shadow-sm">
              {dict.order.number} {order.order_number}
            </span>
            {paid && isKoko && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#6D28D9]/[0.1] px-3.5 py-2 text-[13px] font-bold text-[#6D28D9]">
                Paid via <KokoBadge size="sm" /> · 3 installments
              </span>
            )}
          </div>

          {confirming && <meta httpEquiv="refresh" content="5" />}

          {failed && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
              <Link href={`/${locale}/checkout`}
                className="pressable rounded-btn bg-volt px-5 py-2.5 text-[13.5px] font-bold text-white hover:bg-volt-deep">
                Try payment again →
              </Link>
              <a href={waLink(`Hi ${SITE.name}! My payment for order ${order.order_number} didn't go through — can you help?`)}
                target="_blank" rel="noopener noreferrer"
                className="pressable rounded-btn bg-card px-5 py-2.5 text-[13.5px] font-bold hover:bg-line/60">
                Ask on WhatsApp
              </a>
            </div>
          )}
        </div>
      </div>

      {/* ---------- body: full-width content ---------- */}
      <div className="mx-auto max-w-6xl px-4 pb-14 md:px-6 md:pb-20">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
          {/* left column */}
          <div className="space-y-6">
            <div className="rounded-3xl bg-card p-6 md:p-8">
              <p className="mb-4 text-[13px] font-semibold text-muted">{dict.order.timeline}</p>
              <StatusTimeline status={order.status} dict={dict} />
            </div>

            <div className="rounded-3xl bg-card p-6 md:p-8">
              <p className="mb-3 text-[13px] font-semibold text-muted">{dict.order.items}</p>
              <ul className="divide-y divide-[#EEF1F6]">
                {order.order_items.map(i => (
                  <li key={i.id} className="flex justify-between gap-3 py-2.5 text-[13.5px]">
                    <span className="text-muted">
                      {i.product_name}{i.variant_name && i.variant_name !== 'Default' ? ` · ${i.variant_name}` : ''} ×{i.qty}
                    </span>
                    <span className="shrink-0 font-medium">{formatLKR(i.line_total)}</span>
                  </li>
                ))}
              </ul>
            </div>

            {shipment && (
              <div className="rounded-3xl bg-volt-soft p-6">
                <p className="text-[13.5px] font-semibold text-volt">
                  {shipment.courier_code ? `${shipment.courier_code.toUpperCase()} · ` : ''}
                  {SHIPMENT_LABEL[shipment.status as keyof typeof SHIPMENT_LABEL] ?? shipment.status}
                </p>
                {shipment.tracking_number && (
                  <p className="mt-1 text-[12.5px] text-volt">
                    Tracking: <b>{shipment.tracking_number}</b>
                    {track && <> · <a href={track} target="_blank" rel="noopener" className="font-semibold underline">Track parcel ↗</a></>}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* right column — sticky summary */}
          <div className="lg:sticky lg:top-24">
            <div className="rounded-3xl bg-card p-6 md:p-8">
              <dl className="space-y-1.5 text-[13.5px]">
                <div className="flex justify-between text-muted"><dt>{dict.cart.subtotal}</dt><dd>{formatLKR(order.subtotal)}</dd></div>
                {order.discount_total > 0 && (
                  <div className="flex justify-between text-ok"><dt>{dict.form.coupon}</dt><dd>− {formatLKR(order.discount_total)}</dd></div>
                )}
                <div className="flex justify-between text-muted"><dt>{dict.cart.delivery}</dt><dd>{formatLKR(order.delivery_fee)}</dd></div>
                {order.koko_fee > 0 && (
                  <div className="flex justify-between text-muted"><dt>Koko service fee (12%)</dt><dd>{formatLKR(order.koko_fee)}</dd></div>
                )}
                <div className="flex justify-between border-t border-[#EEF1F6] pt-2.5 text-[16px] font-bold"><dt>{dict.order.total}</dt><dd>{formatLKR(order.total)}</dd></div>
              </dl>

              <div className="mt-6 grid gap-2.5">
                <Link href={`/${locale}/order/${order.order_number}/invoice`}
                  className="pressable block rounded-2xl bg-paper p-3.5 text-center text-[13px] font-semibold hover:bg-line/60">
                  🧾 Download invoice
                </Link>
                <a href={waLink(`Hi ${SITE.name}! About my order ${order.order_number}:`)}
                  target="_blank" rel="noopener noreferrer"
                  className="pressable block rounded-2xl bg-tint-mint p-3.5 text-center text-[13px] font-semibold text-ok hover:brightness-95">
                  {dict.order.help}
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* ---------- reassurance strip — same visual language as the homepage's value strip ---------- */}
        <div className="mt-10 grid gap-4 border-t border-line pt-8 sm:grid-cols-3">
          {[
            { t: dict.trust.warranty, s: dict.trust.warrantysub, i: <><path d="M12 2 4 5v6c0 5 3.5 8 8 11 4.5-3 8-6 8-11V5z" /><path d="m9 12 2 2 4-4" /></> },
            { t: dict.trust.courier, s: dict.trust.couriersub, i: <><rect x="1" y="6" width="14" height="11" rx="2" /><path d="M15 9h4l3 3v5h-7" /><circle cx="6" cy="18" r="1.6" /><circle cx="17" cy="18" r="1.6" /></> },
            { t: dict.trust.whatsapp, s: dict.trust.whatsappsub, i: <><path d="M3 12a9 9 0 0 1 18 0" /><path d="M21 12v4a3 3 0 0 1-3 3h-3" /><rect x="3" y="11" width="3" height="6" rx="1.5" /><rect x="18" y="11" width="3" height="6" rx="1.5" /></> }
          ].map((v, i) => (
            <div key={i} className="card-glass flex items-start gap-3.5 p-4" style={{ borderRadius: '18px' }}>
              <span className="grid h-11 w-11 shrink-0 place-items-center bg-gradient-to-br from-volt/10 to-accent/10 text-volt" style={{ borderRadius: '14px' }}>
                <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{v.i}</svg>
              </span>
              <div>
                <h4 className="text-[14.5px] font-bold">{v.t}</h4>
                <p className="mt-0.5 text-[13px] text-muted">{v.s}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ---------- Koko cross-sell — only for a customer who paid another way ---------- */}
        {showKokoCrossSell && (
          <Link href={`/${locale}/checkout`}
            className="pressable group mt-6 block overflow-hidden shadow-soft transition-transform hover:-translate-y-0.5"
            style={{ borderRadius: '22px' }}>
            <Image src="/banners/koko-promo-wide.jpg" alt="Next time, pay in 3 easy installments with Koko"
              width={2062} height={496} className="h-auto w-full object-cover" />
          </Link>
        )}
      </div>
    </div>
  );
}
