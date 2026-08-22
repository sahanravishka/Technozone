'use client';

import { useState, useTransition } from 'react';
import { advanceOrder, confirmPendingOrder, recallOrder } from '@/app/admin/actions';
import { formatLKR } from '@/lib/site';

/* ── Types ── */
export type AdminOrderItem = {
  qty: number; variant_id?: string | null; product_id?: string | null;
  product_name?: string; warranty_months?: number;
};
export type AdminOrder = {
  id: string; order_number: string; status: string; total: number;
  payment_status?: string; payment_method?: string; fulfillment?: string; channel?: string;
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
// Solid colour for the left identity bar — a bit more saturated than the
// pill background so it reads at a glance without needing to open the card.
const STATUS_BAR: Record<string, string> = {
  pending: '#F59E0B', paid: '#3B82F6', packed: '#0EA5E9', dispatched: '#10B981', cancelled: '#9CA3AF',
};
const PAY_LABEL: Record<string, string> = {
  cod: 'Cash on delivery', whatsapp: 'WhatsApp pay', payhere: 'Online payment',
};

export default function OrderCard({
  order, waHref, selected, onSelect, onPack, onViewDetails, onViewJourney
}: {
  order: AdminOrder; waHref: string; selected: boolean;
  onSelect: (id: string, on: boolean) => void;
  onPack:   (o: AdminOrder) => void;
  onViewDetails: (id: string) => void;
  onViewJourney?: (id: string) => void;
}) {
  const [pending, start]       = useTransition();
  const [open, setOpen]        = useState(false);
  const [cancelStep, setCancelStep] = useState(0); // 0=idle 1=warn 2=confirm
  const [recallStep, setRecallStep] = useState(0); // 0=idle 1=confirm
  const [recallErr, setRecallErr]   = useState('');

  const isCod    = order.payment_method === 'cod';
  const rawPill  = STATUS_PILL[order.status];
  const pill     = isCod
    ? {
        pending:    { label: 'Pending COD', bg: '#FEF3C7', color: '#92400E' },
        paid:       { label: 'Confirmed',   bg: '#FEF3C7', color: '#92400E' },
        packed:     { label: 'Packed',      bg: '#E0F2FE', color: '#075985' },
        dispatched: { label: 'Dispatched',  bg: '#D1FAE5', color: '#065F46' },
        cancelled:  { label: 'Cancelled',   bg: '#F3F4F6', color: '#6B7280' },
      }[order.status] ?? rawPill
    : rawPill;
  const barColor = STATUS_BAR[order.status] ?? '#9CA3AF';

  const needScan = (order.requiredSerials ?? 0) > 0;
  const needsPayConfirm = (order.payment_method === 'whatsapp' || isCod) && order.status === 'pending';
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
    <div className={`admin-card flex overflow-hidden ${isCancelled ? 'opacity-60' : ''}`}>
      {/* Colour identity bar — glanceable status without opening the card */}
      <div className="w-1 shrink-0" style={{ background: barColor }} />

      <div className="min-w-0 flex-1">
        {/* Compact row — always visible */}
        <button type="button" onClick={() => setOpen(v => !v)}
          className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left">
          {!isCancelled && (
            <input type="checkbox" checked={selected}
              onClick={e => e.stopPropagation()}
              onChange={e => onSelect(order.id, e.target.checked)}
              className="h-4 w-4 shrink-0 accent-volt" aria-label={`Select ${order.order_number}`} />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[13.5px] font-extrabold tracking-tight">{order.order_number}</span>
              {pill && (
                <span className="rounded-md px-1.5 py-0.5 text-[10px] font-bold" style={{ background: pill.bg, color: pill.color }}>
                  {pill.label}
                </span>
              )}
              {order.channel === 'facebook' && (
                <span className="rounded-md bg-[#E7F0FF] px-1.5 py-0.5 text-[10px] font-bold text-[#1877F2]">FB</span>
              )}
              {needsPayConfirm && <span className="text-[10px] font-bold text-sale">⚠ Confirm</span>}
            </div>
            <p className="mt-0.5 truncate text-[12px] text-muted">
              {order.shipping_address?.name ?? 'Customer'}
              {order.shipping_address?.city ? ` · ${order.shipping_address.city}` : ''} · {date}
              {totalQty > 0 ? ` · ${totalQty} item${totalQty !== 1 ? 's' : ''}` : ''}
            </p>
          </div>
          <span className="shrink-0 text-[14.5px] font-extrabold">{formatLKR(order.total)}</span>
          <span className={`shrink-0 text-[10px] text-muted transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
        </button>

        {/* Expanded detail + actions */}
        {open && (
          <div className="border-t border-line">
            <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
              <button onClick={() => onViewDetails(order.id)}
                className="pressable rounded-lg px-2 py-1 text-[11.5px] font-semibold text-muted hover:bg-paper hover:text-ink">
                👁 Details
              </button>
              {onViewJourney && (
                <button onClick={() => onViewJourney(order.id)}
                  className="pressable rounded-lg bg-paper px-2 py-1 text-[11.5px] font-semibold text-muted hover:text-ink hover:bg-line">
                  🗺️ Journey
                </button>
              )}
              <a href={`/admin/orders/${order.id}/invoice`} target="_blank" rel="noopener noreferrer"
                className="pressable rounded-lg bg-volt/10 px-2 py-1 text-[11.5px] font-bold text-volt-deep hover:bg-volt/20">
                🧾 Invoice
              </a>
              <span className="rounded-lg bg-paper px-2.5 py-1 text-[11.5px] font-semibold text-muted">
                {PAY_LABEL[order.payment_method ?? ''] ?? 'Unknown payment'}
              </span>
              {order.fulfillment === 'pickup' && (
                <span className="rounded-lg bg-paper px-2.5 py-1 text-[11.5px] font-semibold text-muted">🏬 Pickup</span>
              )}
            </div>

            {itemsText && <p className="px-3 pb-2.5 text-[12.5px] text-muted">{itemsText}</p>}

            <div className="flex flex-wrap items-center gap-2 border-t border-line bg-paper/60 px-3 py-2.5">
              {!isCancelled && (
                <>
                  {order.status !== 'dispatched' && (
                    <button onClick={() => start(() => advanceOrder(order.id, 'dispatched'))} disabled={pending}
                      className="pressable rounded-xl bg-volt px-4 py-2 text-[12.5px] font-bold text-white hover:bg-volt-deep disabled:opacity-50">
                      🚀 Mark Dispatched
                    </button>
                  )}
                  {needScan && (
                    <button onClick={() => onPack(order)} disabled={pending}
                      className="pressable rounded-xl border border-line bg-paper px-4 py-2 text-[12.5px] font-bold text-ink hover:bg-line">
                      📷 Scan IMEI ({order.scannedSerials ?? 0}/{order.requiredSerials})
                    </button>
                  )}
                  {needsPayConfirm && (
                    <button onClick={() => start(() => confirmPendingOrder(order.id))} disabled={pending}
                      className="pressable rounded-xl bg-[#E8F7EE] px-4 py-2 text-[12.5px] font-bold text-ok hover:bg-[#d5f0e2] disabled:opacity-50">
                      {isCod ? '✓ Confirm order' : '💵 Confirm payment'}
                    </button>
                  )}
                  <a href={waHref} target="_blank" rel="noopener noreferrer"
                    className="pressable rounded-xl border border-line bg-card px-4 py-2 text-[12.5px] font-bold text-muted hover:bg-paper">
                    💬 WhatsApp
                  </a>
                  {(order.status === 'pending' || order.status === 'paid') && (
                    <div className="ml-auto flex items-center gap-2">
                      {cancelStep === 0 && (
                        <button onClick={() => setCancelStep(1)} disabled={pending}
                          className="pressable rounded-xl px-3 py-2 text-[12.5px] font-semibold text-muted hover:bg-paper disabled:opacity-50">
                          Cancel order
                        </button>
                      )}
                      {cancelStep === 1 && (
                        <div className="flex items-center gap-2 rounded-xl bg-[#FEF2F2] px-3 py-1.5">
                          <span className="text-[12px] font-semibold text-sale">Cancel this order?</span>
                          <button onClick={doCancel} disabled={pending}
                            className="pressable rounded-lg bg-sale px-2.5 py-1 text-[11.5px] font-bold text-white disabled:opacity-50">
                            Yes
                          </button>
                          <button onClick={() => setCancelStep(0)}
                            className="pressable rounded-lg bg-white px-2.5 py-1 text-[11.5px] font-semibold text-muted">
                            Keep
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {isCancelled && (
                <div className="flex w-full flex-wrap items-center gap-2">
                  {recallStep === 0 && (
                    <button onClick={() => setRecallStep(1)} disabled={pending}
                      className="pressable rounded-xl bg-paper px-4 py-2 text-[12.5px] font-semibold text-muted hover:bg-line disabled:opacity-50">
                      ↩ Recall order
                    </button>
                  )}
                  {recallStep === 1 && (
                    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-volt-soft px-3 py-1.5">
                      <span className="text-[12px] font-semibold text-volt">Recall and reopen as Pending?</span>
                      <button onClick={doRecall} disabled={pending}
                        className="pressable rounded-lg bg-volt px-2.5 py-1 text-[11.5px] font-bold text-white disabled:opacity-50">
                        Yes
                      </button>
                      <button onClick={() => setRecallStep(0)}
                        className="pressable rounded-lg bg-white px-2.5 py-1 text-[11.5px] font-semibold text-muted">
                        No
                      </button>
                    </div>
                  )}
                  {recallErr && <p className="text-[11.5px] font-semibold text-sale">{recallErr}</p>}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
