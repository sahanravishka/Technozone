import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import type { Locale } from '@/lib/i18n/config';
import { getDict } from '@/lib/i18n/dictionaries';
import { getServerSupabase } from '@/lib/supabase-clients/server';
import { getAdminSupabase } from '@/lib/supabase-clients/admin';
import { getCouriers } from '@/lib/data';
import { SHIPMENT_LABEL, trackUrl } from '@/lib/courier';
import { formatLKR, SITE, waLink } from '@/lib/site';
import StatusTimeline from '@/components/StatusTimeline';
import ClearCart from '@/components/ClearCart';

export const metadata: Metadata = { title: 'Order', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function OrderPage({ params }:
  { params: Promise<{ locale: Locale; id: string }> }) {
  const { locale, id } = await params;
  const dict = getDict(locale);
  const supabase = await getServerSupabase();
  if (!supabase) notFound();

  const { data: { user } } = await supabase.auth.getUser();

  const admin = getAdminSupabase();
  if (!admin) notFound();

  const cookieStore = await cookies();
  const guestToken = cookieStore.get('guest_order_id')?.value;

  // Fetch using admin so guest orders (no user) can be retrieved securely
  const { data: order } = await admin.from('orders')
    .select('id, customer_id, order_number, status, payment_status, subtotal, discount_total, delivery_fee, total, created_at, order_items(id, product_name, variant_name, qty, line_total)')
    .eq('order_number', id).maybeSingle();
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
  const confirming = order.status === 'pending' && order.payment_status === 'unpaid';

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-12">
      <ClearCart />
      <div className="rounded-3xl bg-card p-6 md:p-8">
        <p className="text-[13px] font-semibold text-muted">{dict.order.number} {order.order_number}</p>
        <h1 className="mt-1 text-2xl font-bold">
          {confirming ? dict.order.confirming : dict.order.thanks}
        </h1>
        {confirming && (
          <meta httpEquiv="refresh" content="5" />
        )}

        <div className="mt-7 grid gap-8 md:grid-cols-2">
          <div>
            <p className="mb-4 text-[13px] font-semibold text-muted">{dict.order.timeline}</p>
            <StatusTimeline status={order.status} dict={dict} />
          </div>
          <div>
            <p className="mb-3 text-[13px] font-semibold text-muted">{dict.order.items}</p>
            <ul className="space-y-2 text-[13.5px]">
              {order.order_items.map(i => (
                <li key={i.id} className="flex justify-between gap-3">
                  <span className="text-muted">
                    {i.product_name}{i.variant_name && i.variant_name !== 'Default' ? ` · ${i.variant_name}` : ''} ×{i.qty}
                  </span>
                  <span className="shrink-0 font-medium">{formatLKR(i.line_total)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1.5 border-t border-[#EEF1F6] pt-3 text-[13.5px]">
              <div className="flex justify-between text-muted"><dt>{dict.cart.subtotal}</dt><dd>{formatLKR(order.subtotal)}</dd></div>
              {order.discount_total > 0 && (
                <div className="flex justify-between text-ok"><dt>{dict.form.coupon}</dt><dd>− {formatLKR(order.discount_total)}</dd></div>
              )}
              <div className="flex justify-between text-muted"><dt>{dict.cart.delivery}</dt><dd>{formatLKR(order.delivery_fee)}</dd></div>
              <div className="flex justify-between pt-1 text-[16px] font-bold"><dt>{dict.order.total}</dt><dd>{formatLKR(order.total)}</dd></div>
            </dl>
          </div>
        </div>

        {shipment && (
          <div className="mt-6 rounded-2xl bg-volt-soft p-4">
            <p className="text-[13px] font-semibold text-volt">
              {shipment.courier_code ? `${shipment.courier_code.toUpperCase()} · ` : ''}{SHIPMENT_LABEL[shipment.status as keyof typeof SHIPMENT_LABEL] ?? shipment.status}
            </p>
            {shipment.tracking_number && (
              <p className="mt-1 text-[12.5px] text-volt">
                Tracking: <b>{shipment.tracking_number}</b>
                {track && <> · <a href={track} target="_blank" rel="noopener" className="font-semibold underline">Track parcel ↗</a></>}
              </p>
            )}
          </div>
        )}

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <Link href={`/${locale}/order/${order.id}/invoice`}
            className="block rounded-2xl bg-paper p-4 text-center text-[13px] font-semibold hover:bg-line/60">
            🧾 Download invoice
          </Link>
          <a href={waLink(`Hi ${SITE.name}! About my order ${order.order_number}:`)}
            target="_blank" rel="noopener noreferrer"
            className="block rounded-2xl bg-paper p-4 text-center text-[13px] font-semibold text-ok hover:bg-tint-mint">
            {dict.order.help}
          </a>
        </div>
      </div>
    </div>
  );
}
