'use client';

import { useTransition } from 'react';
import { advanceOrder, markOrderCollected } from '@/app/admin/actions';
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
  pending:   { label: 'Pending',     bg: '#FEF3C7', color: '#92400E' },
  paid:      { label: 'Paid ✓',      bg: '#DBEAFE', color: '#1E40AF' },
  packed:    { label: 'Packed',      bg: '#E0F2FE', color: '#075985' },
  shipped:   { label: 'Shipped',     bg: '#EDE9FE', color: '#5B21B6' },
  delivered: { label: 'Delivered ✓', bg: '#D1FAE5', color: '#065F46' },
};
const PAY_LABEL: Record<string, string> = {
  cod: 'Cash on delivery', whatsapp: 'WhatsApp pay', payhere: 'Online payment',
};
const NEXT: Record<string, string> = { paid: 'packed', packed: 'shipped', shipped: 'delivered' };
const NEXT_BTN: Record<string, string> = {
  paid: '✓ Pack order', packed: '✓ Mark shipped', shipped: '✓ Mark delivered',
};

export default function OrderCard({
  order, waHref, selected, onSelect, onPack,
}: {
  order: AdminOrder; waHref: string; selected: boolean;
  onSelect: (id: string, on: boolean) => void;
  onPack:   (o: AdminOrder) => void;
}) {
  const [pending, start] = useTransition();
  const next      = NEXT[order.status];
  const pill      = STATUS_PILL[order.status];
  const needScan  = (order.requiredSerials ?? 0) > 0;
  const paid      = order.payment_status === 'paid';
  // COD customers pay at the door — no payment warning needed.
  // Only WhatsApp orders need payment confirmed before packing/shipping.
  const needsPayConfirm = order.payment_method === 'whatsapp' && !paid;
  const totalQty  = order.order_items.reduce((n, i) => n + i.qty, 0);
  const itemsText = order.order_items
    .slice(0, 3).map(i => `${i.qty}× ${i.product_name ?? 'item'}`).join(', ')
    + (order.order_items.length > 3 ? ` +${order.order_items.length - 3} more` : '');
  const date = new Date(order.created_at)
    .toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  return (
    <div className="admin-card overflow-hidden">

      {/* ── Header: order #, status, total ── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
        <input type="checkbox" checked={selected}
          onChange={e => onSelect(order.id, e.target.checked)}
          className="h-4 w-4 shrink-0 accent-volt" aria-label={`Select ${order.order_number}`} />
        <span className="text-[15px] font-extrabold tracking-tight">{order.order_number}</span>
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

        {/* Confirm WhatsApp payment (not needed for COD — paid at delivery) */}
        {needsPayConfirm && (
          <button onClick={() => start(() => markOrderCollected(order.id))} disabled={pending}
            className="pressable rounded-xl bg-[#E8F7EE] px-5 py-2.5 text-[13px] font-bold text-ok hover:bg-[#d5f0e2] disabled:opacity-50">
            💵 Confirm payment
          </button>
        )}

        {/* WhatsApp */}
        <a href={waHref} target="_blank" rel="noopener noreferrer"
          className="pressable rounded-xl border border-line bg-card px-5 py-2.5 text-[13px] font-bold text-muted hover:bg-paper">
          💬 WhatsApp
        </a>

        {/* Cancel — only visible on pending */}
        {order.status === 'pending' && (
          <button onClick={() => start(() => advanceOrder(order.id, 'cancelled'))} disabled={pending}
            className="pressable ml-auto rounded-xl px-4 py-2.5 text-[13px] font-semibold text-sale hover:bg-[#FEF2F2] disabled:opacity-50">
            Cancel order
          </button>
        )}
      </div>
    </div>
  );
}
