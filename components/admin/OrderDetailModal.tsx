'use client';

import { useEffect, useState } from 'react';
import { getOrderDetail, recheckKokoPayment, type OrderDetail } from '@/app/admin/actions';
import OrderJourneyModal from './OrderJourneyModal';
import { formatLKR } from '@/lib/site';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending', paid: 'Paid', packed: 'Packed', dispatched: 'Dispatched', cancelled: 'Cancelled', refunded: 'Refunded',
};
const PAY_LABEL: Record<string, string> = {
  cod: 'Cash on delivery', whatsapp: 'WhatsApp pay', payhere: 'Online payment (PayHere)', koko: 'Koko (3 installments)',
};

export default function OrderDetailModal({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const [data, setData] = useState<OrderDetail | null>(null);
  const [err, setErr] = useState('');

  const load = () => getOrderDetail(orderId)
    .then(d => setData(d))
    .catch(e => setErr(e instanceof Error ? e.message : 'Could not load order'));

  useEffect(() => {
    let cancelled = false;
    getOrderDetail(orderId)
      .then(d => { if (!cancelled) setData(d); })
      .catch(e => { if (!cancelled) setErr(e instanceof Error ? e.message : 'Could not load order'); });
    return () => { cancelled = true; };
  }, [orderId]);

  const [journeyOpen, setJourneyOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkMsg, setCheckMsg] = useState('');

  const checkKokoStatus = async () => {
    setChecking(true); setCheckMsg('');
    try {
      const outcome = await recheckKokoPayment(orderId);
      if (outcome === 'paid') { setCheckMsg('✅ Koko confirms this order is paid.'); load(); }
      else if (outcome === 'failed') { setCheckMsg('❌ Koko confirms this payment failed/was cancelled.'); load(); }
      else if (outcome === 'pending') setCheckMsg('⏳ Still pending on Koko\'s side — nothing to update yet.');
      else setCheckMsg('⚠️ Could not reach Koko or verify the response — try again shortly.');
    } catch (e) {
      setCheckMsg(e instanceof Error ? e.message : 'Check failed');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-card p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <b className="text-[15px]">{data ? data.order_number : 'Order details'}</b>
            {data && (
              <>
                <a href={`/admin/orders/${data.id}/invoice`} target="_blank" rel="noopener noreferrer"
                  className="pressable rounded-lg bg-volt/10 px-2 py-0.5 text-[11px] font-bold text-volt-deep hover:bg-volt/20">
                  🧾 Invoice
                </a>
                <button onClick={() => setJourneyOpen(true)}
                  className="pressable rounded-lg bg-paper px-2 py-0.5 text-[11px] font-bold text-muted hover:text-ink">
                  🗺️ Journey
                </button>
              </>
            )}
          </div>
          <button onClick={onClose} className="px-1 text-[18px] leading-none text-muted hover:text-ink" aria-label="Close">✕</button>
        </div>

        {err && <p className="mt-3 rounded-lg bg-sale/10 px-3 py-2 text-[12px] font-medium text-sale">{err}</p>}
        {!data && !err && <p className="mt-4 text-[13px] text-muted">Loading…</p>}

        {data && (
          <div className="mt-3 space-y-4 text-[13px]">
            {/* Status + meta */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-paper px-2.5 py-1 text-[11.5px] font-bold">
                {data.payment_method === 'cod' && data.status === 'paid' ? 'Confirmed' : (STATUS_LABEL[data.status] ?? data.status)}
              </span>
              <span className="rounded-lg bg-paper px-2.5 py-1 text-[11.5px] text-muted">{PAY_LABEL[data.payment_method] ?? data.payment_method}</span>
              {data.payment_method !== 'cod' && (
                <span className="rounded-lg bg-paper px-2.5 py-1 text-[11.5px] text-muted">
                  {data.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                </span>
              )}
              <span className="rounded-lg bg-paper px-2.5 py-1 text-[11.5px] text-muted capitalize">{data.fulfillment}</span>
            </div>
            <p className="text-[11.5px] text-muted">
              Placed {new Date(data.created_at).toLocaleString('en-GB')}
              {data.updated_at !== data.created_at && ` · updated ${new Date(data.updated_at).toLocaleString('en-GB')}`}
            </p>

            {data.payment_method === 'koko' && data.payment_status !== 'paid' && (
              <div className="rounded-xl bg-paper px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11.5px] text-muted">
                    Not showing as paid yet? Ask Koko directly instead of only waiting on their webhook.
                  </p>
                  <button onClick={checkKokoStatus} disabled={checking}
                    className="pressable shrink-0 rounded-lg bg-volt px-2.5 py-1.5 text-[11.5px] font-bold text-white hover:bg-volt-deep disabled:opacity-60">
                    {checking ? 'Checking…' : '🟣 Check Koko status'}
                  </button>
                </div>
                {checkMsg && <p className="mt-1.5 text-[11.5px] font-medium">{checkMsg}</p>}
              </div>
            )}

            {/* Customer */}
            <div>
              <p className="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-muted">Customer</p>
              <p className="font-semibold">{data.shipping_address?.name ?? '—'}</p>
              <p className="text-muted">{data.customer_phone}</p>
              {data.guest_email && <p className="text-muted">{data.guest_email}</p>}
              {data.fulfillment !== 'pickup' && (
                <p className="mt-1 text-muted">
                  {[data.shipping_address?.line1, data.shipping_address?.city, data.shipping_address?.postal_code].filter(Boolean).join(', ') || '—'}
                  {data.delivery_zone_name && ` · Zone: ${data.delivery_zone_name}`}
                </p>
              )}
            </div>

            {/* Items */}
            <div>
              <p className="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-muted">Items</p>
              <ul className="divide-y divide-line rounded-xl border border-line">
                {data.order_items.map((i, n) => (
                  <li key={n} className="flex items-center justify-between gap-2 px-3 py-2">
                    <div>
                      <p className="font-semibold">{i.qty}× {i.product_name}{i.variant_name && i.variant_name !== 'Default' ? ` — ${i.variant_name}` : ''}</p>
                      {i.sku && <p className="text-[11px] text-muted">{i.sku}</p>}
                    </div>
                    <p className="shrink-0 font-semibold">{formatLKR(i.line_total)}</p>
                  </li>
                ))}
              </ul>
            </div>

            {/* Totals */}
            <div className="space-y-1 rounded-xl bg-paper px-3 py-2.5">
              <div className="flex justify-between text-muted"><span>Subtotal</span><span>{formatLKR(data.subtotal)}</span></div>
              {data.discount_total > 0 && (
                <div className="flex justify-between text-ok"><span>Discount{data.coupon_code ? ` (${data.coupon_code})` : ''}</span><span>-{formatLKR(data.discount_total)}</span></div>
              )}
              {data.delivery_fee > 0 && (
                <div className="flex justify-between text-muted"><span>Delivery</span><span>{formatLKR(data.delivery_fee)}</span></div>
              )}
              <div className="flex justify-between border-t border-line pt-1 text-[14px] font-extrabold"><span>Total</span><span>{formatLKR(data.total)}</span></div>
            </div>

            {(data.payhere_payment_id || data.notes) && (
              <div className="space-y-1 text-[11.5px] text-muted">
                {data.payhere_payment_id && <p>PayHere payment ID: {data.payhere_payment_id}{data.payhere_method ? ` · ${data.payhere_method}` : ''}</p>}
                {data.notes && <p>Note: {data.notes}</p>}
              </div>
            )}
          </div>
        )}
      </div>

      {journeyOpen && <OrderJourneyModal orderId={orderId} onClose={() => setJourneyOpen(false)} />}
    </div>
  );
}
