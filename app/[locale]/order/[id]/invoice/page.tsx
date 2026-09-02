import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import type { Locale } from '@/lib/i18n/config';
import { getServerSupabase } from '@/lib/supabase-clients/server';
import { getAdminSupabase } from '@/lib/supabase-clients/admin';
import { formatLKR, SITE } from '@/lib/site';
import PrintInvoiceButton from '@/components/PrintInvoiceButton';

export const metadata: Metadata = { title: 'Invoice', robots: { index: false } };
export const dynamic = 'force-dynamic';

const PAY_LABEL: Record<string, string> = {
  cod: 'Cash on delivery', whatsapp: 'WhatsApp order', payhere: 'Online payment (card)',
};

export default async function InvoicePage({ params }:
  { params: Promise<{ locale: Locale; id: string }> }) {
  const { locale, id } = await params;
  const supabase = await getServerSupabase();
  if (!supabase) notFound();
  const admin = getAdminSupabase();
  if (!admin) notFound();

  const { data: { user } } = await supabase.auth.getUser();
  const cookieStore = await cookies();
  const guestToken = cookieStore.get('guest_order_id')?.value;

  // Fetch using admin so guest orders (no user) can be retrieved securely
  const { data: order } = await admin.from('orders')
    .select(`id, customer_id, order_number, status, payment_status, payment_method, subtotal, discount_total,
      delivery_fee, total, created_at, shipping_address, customer_phone,
      order_items(id, product_name, variant_name, sku, unit_price, qty, line_total)`)
    .or(`order_number.eq.${id},id.eq.${id}`).maybeSingle();
  if (!order) notFound();

  // If this order belongs to a registered customer, enforce authentication
  if (order.customer_id) {
    if (!user || user.id !== order.customer_id) {
      redirect(`/${locale}/login?next=/${locale}/order/${id}/invoice`);
    }
  } else {
    // Guest order: require the guest token cookie
    if (guestToken !== order.id) {
      redirect(`/${locale}/login?next=/${locale}/order/${id}/invoice`);
    }
  }

  const addr = order.shipping_address as {
    name?: string; phone?: string; line1?: string; city?: string; postal_code?: string;
  } | null;
  const date = new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-12">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <h1 className="text-xl font-bold">Invoice</h1>
        <PrintInvoiceButton />
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 14mm; }
          body { background: #fff !important; }
          header, footer, .print\\:hidden { display: none !important; }
          main { margin: 0 !important; padding: 0 !important; }
        }
      `}</style>

      <div className="rounded-3xl bg-card p-7 md:p-10" style={{ fontFamily: 'Arial, sans-serif' }}>
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpg" alt={SITE.name} className="h-12 w-12 rounded-lg object-cover" />
            <p className="mt-2 text-[13px] font-black uppercase tracking-wide">{SITE.name}</p>
            <p className="text-[11.5px] text-muted">Sri Soratha Mawatha, Gangodawila, Nugegoda</p>
          </div>
          <div className="text-right">
            <p className="text-[18px] font-black tracking-tight">INVOICE</p>
            <p className="mt-1 text-[13px] font-semibold">{order.order_number}</p>
            <p className="text-[11.5px] text-muted">{date}</p>
          </div>
        </div>

        {/* Bill to + status */}
        <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Billed to</p>
            <p className="mt-1 text-[14px] font-semibold">{addr?.name ?? '—'}</p>
            <p className="text-[12.5px] text-muted">{addr?.phone ?? order.customer_phone}</p>
            {addr?.line1 && <p className="text-[12.5px] text-muted">{addr.line1}</p>}
            {(addr?.city || addr?.postal_code) && (
              <p className="text-[12.5px] text-muted">{[addr?.city, addr?.postal_code].filter(Boolean).join(' ')}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Payment</p>
            <p className="mt-1 text-[13px] font-semibold">{PAY_LABEL[order.payment_method ?? ''] ?? order.payment_method ?? '—'}</p>
            <p className={`text-[12.5px] font-semibold capitalize ${order.payment_status === 'paid' ? 'text-ok' : 'text-warn'}`}>
              {order.payment_status}
            </p>
          </div>
        </div>

        {/* Line items */}
        <table className="mt-7 w-full text-[13px]">
          <thead>
            <tr className="border-b border-line text-left text-[11px] font-bold uppercase tracking-wide text-muted">
              <th className="pb-2 font-bold">Item</th>
              <th className="pb-2 text-right font-bold">Unit price</th>
              <th className="pb-2 text-right font-bold">Qty</th>
              <th className="pb-2 text-right font-bold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.order_items.map(i => (
              <tr key={i.id} className="border-b border-line/50">
                <td className="py-2.5">
                  {i.product_name}
                  {i.variant_name && i.variant_name !== 'Default' ? <span className="text-muted"> · {i.variant_name}</span> : ''}
                  <span className="ml-1.5 text-[11px] text-muted">({i.sku})</span>
                </td>
                <td className="py-2.5 text-right">{formatLKR(i.unit_price)}</td>
                <td className="py-2.5 text-right">{i.qty}</td>
                <td className="py-2.5 text-right font-semibold">{formatLKR(i.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="mt-4 flex justify-end">
          <dl className="w-full max-w-[260px] space-y-1.5 text-[13.5px]">
            <div className="flex justify-between text-muted"><dt>Subtotal</dt><dd>{formatLKR(order.subtotal)}</dd></div>
            {order.discount_total > 0 && (
              <div className="flex justify-between text-ok"><dt>Discount</dt><dd>− {formatLKR(order.discount_total)}</dd></div>
            )}
            <div className="flex justify-between text-muted"><dt>Delivery</dt><dd>{formatLKR(order.delivery_fee)}</dd></div>
            <div className="flex justify-between border-t border-line pt-2 text-[16px] font-bold"><dt>Total</dt><dd>{formatLKR(order.total)}</dd></div>
          </dl>
        </div>

        <p className="mt-8 border-t border-line pt-4 text-center text-[11.5px] text-muted">
          Thank you for shopping with {SITE.name}. This is a computer-generated invoice.
        </p>
      </div>
    </div>
  );
}
