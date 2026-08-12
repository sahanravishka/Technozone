'use client';

import { useState, useTransition } from 'react';
import { advanceOrder, markOrderCollected, recallOrder } from '@/app/admin/actions';
import { formatLKR } from '@/lib/site';

/* ── Types ── */
export type AdminOrderItem = {
  qty: number; variant_id?: string | null; product_id?: string | null;
  product_name?: string; warranty_months?: number;
};
export type AdminOrder = {
  id: string; order_number: string; status: string; total: number;
  payment_status?: string; payment_method?: string; fulfillment?: string;
  customer_phone: string; created_at: string;
  shipping_address: { name?: string; city?: string };
  order_items: AdminOrderItem[];
  requiredSerials?: number; scannedSerials?: number;
};

/* ── Style maps ── */
const STATUS_PILL: Record<string, { label: string; bg: string; color: string }> = {
  pending:    { label: 'Pending',      bg: '#FEF3C7', color: '#92400E' },
  paid:       { label: 'Paid ✓',       bg: '#DBEAFE', color: '#1E40AF' },
  packed:     { label: 'Packed',       bg: '#E0F2FE', color: '#075985' },
  dispatched: { label: 'Dispatched ✓', bg: '#D1FAE5', color: '#065F46' },
  cancelled:  { label: 'Cancelled',    bg: '#F3F4F6', color: '#6B7280' },
};
const PAY_LABEL: Record<string, string> = {
  cod: 'Cash on delivery', whatsapp: 'WhatsApp pay', payhere: 'Online payment',
};
// pending -> paid needs a real payment/COD confirmation, not a plain "next" click,
// so it's handled separately below (confirmPending / needsPayConfirm).
const NEXT: Record<string, string> = { paid: 'packed', packed: 'dispatched' };
const NEXT_BTN: Record<string, string> = {
  paid: '✓ Pack order', packed: '✓ Mark dispatched',
};

export default function OrderCard({
  order, waHref, selected, onSelect, onPack, onViewDetails,
}: {
  order: AdminOrder; waHref: string; selected: boolean;
  onSelect: (id: string, on: boolean) => void;
  onPack:   (o: AdminOrder) => void;
  onViewDetails: (id: string) => void;
}) {
  const [pending, start]       = useTransition();
  const [cancelStep, setCancelStep] = useState(0); // 0=idle 1=warn 2=confirm
  const [recallStep, setRecallStep] = useState(0); // 0=idle 1=confirm
  const [recallErr, setRecallErr]   = useState('');

  const next     = NEXT[order.status];
  const pill     = STATUS_PILL[order.status];
  const needScan = (order.requiredSerials ?? 0) > 0;
  const paid     = order.payment_status === 'paid';
  // COD and WhatsApp orders sit at 'pending' until staff confirm the order/
  // payment; only PayHere auto-advances (via webhook). Previously this only
  // checked 'whatsapp', so COD orders — the common case — had no way off
  // Pending at all except Cancel.
  const needsPayConfirm = (order.payment_method === 'whatsapp' || order.payment_method === 'cod') && !paid;
  const isCancelled     = order.status === 'cancelled';

  const totalQty  = order.order_items.reduce((n, i) => n + i.qty, 0);
  const itemsText = order.order_items
    .slice(0, 3).map(i => `${i.qty}× ${i.product_name ?? 'item'}`).join(', ')
    + (order.order_items.length > 3 ? ` +${order.order_items.length - 3} more` : '');
  const date = new Date(order.created_at)
    .toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  const doCancel = () => {
    setCancelStep(0);
    start(() => advanceOrder(order.id, 'cancelled'));
  };
  const doRecall = () => {
    setRecallErr('');
    start(async () => {
      try { await recallOrder(order.id); setRecallStep(0); }
      catch (e) { setRecallErr(e instanceof Error ? e.message : 'Failed'); setRecallStep(0); }
    });
  };

  return (
    <div className={`admin-card overflow-hidden ${isCancelled ? 'opacity-70' : ''}`}>

      {/* ── Header: order #, status, total ── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
        {!isCancelled && (
          <input type="checkbox" checked={selected}
            onChange={e => onSelect(order.id, e.target.checked)}
            className="h-4 w-4 shrink-0 accent-volt" aria-label={`Select ${order.order_number}`} />
        )}
        <span className="text-[15px] font-extrabold tracking-tight">{order.order_number}</span>
        <button onClick={() => onViewDetails(order.id)}
          className="pressable rounded-lg px-2 py-1 text-[11.5px] font-semibold text-muted hover:bg-paper hover:text-ink">
          👁 Details
        </button>
        {pill && (
          <span className="rounded-lg px-2.5 py-1 text-[11.5px] font-bold"
            style={{ background: pill.bg, color: pill.color }}>{pill.label}</span>
        )}
        <span className="rounded-lg bg-paper px-2.5 py-1 text-[11.5px] font-semibold text-muted">
          {PAY_LABEL[order.payment_method ?? ''] ?? 'Unknown payment'}
        </span>
        {needsPayConfirm && (
          <span className="rounded-lg bg-[#FEE2E2] px-2.5 py-1 text-[11.5px] font-bold text-sale">
            ⚠ Payment not received
          </span>
        )}
        {order.fulfillment === 'pickup' && (
          <span className="rounded-lg bg-paper px-2.5 py-1 text-[11.5px] font-semibold text-muted">🏬 Pickup</span>
        )}
        <span className="ml-auto text-[17px] font-extrabold">{formatLKR(order.total)}</span>
      </div>

      {/* ── Body: customer + items ── */}
      <div className="px-4 py-3">
        <p className="text-[15px] font-bold">{order.shipping_address?.name ?? 'Customer'}</p>
        <p className="mt-0.5 text-[12.5px] text-muted">
          {[order.shipping_address?.city, date].filter(Boolean).join(' · ')}
          {totalQty > 0 && ` · ${totalQty} item${totalQty !== 1 ? 's' : ''}`}
        </p>
        {itemsText && <p className="mt-1 truncate text-[12.5px] text-muted">{itemsText}</p>}
      </div>

      {/* ── Action bar ── */}
      <div className="flex flex-wrap items-center gap-2 border-t border-line bg-paper/60 px-4 py-3">

        {/* ── Active order actions ── */}
        {!isCancelled && (
          <>
            {/* Primary: advance status */}
            {next && (order.status === 'paid'
              ? (
                <button onClick={() => onPack(order)} disabled={pending}
                  className="pressable rounded-xl bg-volt px-5 py-2.5 text-[13px] font-bold text-white hover:bg-volt-deep disabled:opacity-50">
                  {needScan ? '📷 Pack & scan IMEI' : '✓ Pack order'}
                </button>
              ) : (
                <button onClick={() => start(() => advanceOrder(order.id, next))} disabled={pending}
                  className="pressable rounded-xl bg-volt px-5 py-2.5 text-[13px] font-bold text-white hover:bg-volt-deep disabled:opacity-50">
                  {NEXT_BTN[order.status]}
                </button>
              )
            )}

            {/* Confirm order (COD: cash arranged/collected · WhatsApp: payment received) */}
            {needsPayConfirm && (
              <button onClick={() => start(() => markOrderCollected(order.id))} disabled={pending}
                className="pressable rounded-xl bg-[#E8F7EE] px-5 py-2.5 text-[13px] font-bold text-ok hover:bg-[#d5f0e2] disabled:opacity-50">
                {order.payment_method === 'cod' ? '✓ Confirm order' : '💵 Confirm payment'}
              </button>
            )}

            {/* WhatsApp */}
            <a href={waHref} target="_blank" rel="noopener noreferrer"
              className="pressable rounded-xl border border-line bg-card px-5 py-2.5 text-[13px] font-bold text-muted hover:bg-paper">
              💬 WhatsApp
            </a>

            {/* Cancel — pending only, two-step with warning */}
            {order.status === 'pending' && (
              <div className="ml-auto flex items-center gap-2">
                {cancelStep === 0 && (
                  <button onClick={() => setCancelStep(1)} disabled={pending}
                    className="pressable rounded-xl px-4 py-2.5 text-[13px] font-semibold text-muted hover:bg-paper disabled:opacity-50">
                    Cancel order
                  </button>
                )}
                {cancelStep === 1 && (
                  <div className="flex items-center gap-2 rounded-xl bg-[#FEF2F2] px-3 py-2">
                    <span className="text-[12.5px] font-semibold text-sale">Cancel this order?</span>
                    <button onClick={doCancel} disabled={pending}
                      className="pressable rounded-lg bg-sale px-3 py-1.5 text-[12px] font-bold text-white disabled:opacity-50">
                      Yes, cancel
                    </button>
                    <button onClick={() => setCancelStep(0)}
                      className="pressable rounded-lg bg-white px-3 py-1.5 text-[12px] font-semibold text-muted">
                      Keep it
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── Cancelled order: recall option (owner only on server) ── */}
        {isCancelled && (
          <div className="flex w-full flex-wrap items-center gap-2">
            {recallStep === 0 && (
              <button onClick={() => setRecallStep(1)} disabled={pending}
                className="pressable rounded-xl bg-paper px-5 py-2.5 text-[13px] font-semibold text-muted hover:bg-line disabled:opacity-50">
                ↩ Recall order
              </button>
            )}
            {recallStep === 1 && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl bg-volt-soft px-3 py-2">
                <span className="text-[12.5px] font-semibold text-volt">Recall and reopen as Pending?</span>
                <button onClick={doRecall} disabled={pending}
                  className="pressable rounded-lg bg-volt px-3 py-1.5 text-[12px] font-bold text-white disabled:opacity-50">
                  Yes, recall
                </button>
                <button onClick={() => setRecallStep(0)}
                  className="pressable rounded-lg bg-white px-3 py-1.5 text-[12px] font-semibold text-muted">
                  No
                </button>
              </div>
            )}
            {recallErr && <p className="text-[11.5px] font-semibold text-sale">{recallErr}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
