'use client';

import { useTransition } from 'react';
import { advanceOrder, markOrderCollected } from '@/app/admin/actions';
import { formatLKR } from '@/lib/site';

const NEXT: Record<string, string> = { paid: 'packed', packed: 'shipped', shipped: 'delivered' };
const EDGE: Record<string, string> = {
  pending: '#9AA2AE', paid: '#1B6FD8', packed: '#B06A0A', shipped: '#155CB8', delivered: '#0F8A55'
};

export type AdminOrderItem = {
  qty: number; variant_id?: string | null; product_id?: string | null;
  product_name?: string; warranty_months?: number;
};

export type AdminOrder = {
  id: string; order_number: string; status: string; total: number;
  payment_status?: string; payment_method?: string;
  fulfillment?: string;
  customer_phone: string; created_at: string;
  shipping_address: { name?: string; city?: string };
  order_items: AdminOrderItem[];
  requiredSerials?: number;   // warranty-eligible units needing a scanned serial
  scannedSerials?: number;    // serials already scanned for this order
};

const PAY_BADGE: Record<string, { label: string; cls: string }> = {
  cod: { label: '💵 COD', cls: 'bg-[#FBF0DC] text-[#9A6B12]' },
  whatsapp: { label: '🟢 WhatsApp', cls: 'bg-[#E8F7EE] text-ok' },
  payhere: { label: '💳 Online', cls: 'bg-volt-soft text-volt' }
};

export default function OrderCard({ order, waHref, selected, onSelect, onPack }:
  { order: AdminOrder; waHref: string; selected: boolean;
    onSelect: (id: string, on: boolean) => void; onPack: (order: AdminOrder) => void }) {
  const [pending, start] = useTransition();
  const next = NEXT[order.status];
  const needScan = (order.requiredSerials ?? 0) > 0;

  return (
    <div className="rounded-2xl bg-card p-3.5"
      style={{ borderLeft: `3px solid ${EDGE[order.status] ?? '#9AA2AE'}` }}>
      <div className="flex items-center gap-2.5">
        <input type="checkbox" checked={selected} onChange={e => onSelect(order.id, e.target.checked)}
          className="h-4 w-4 accent-[#1B6FD8]" aria-label={`Select ${order.order_number}`} />
        <b className="text-[13.5px]">{order.order_number}</b>
        {order.payment_method && PAY_BADGE[order.payment_method] && (
          <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${PAY_BADGE[order.payment_method].cls}`}>
            {PAY_BADGE[order.payment_method].label}
          </span>
        )}
        {order.fulfillment === 'pickup' && (
          <span className="rounded-md bg-[#EEF0F3] px-1.5 py-0.5 text-[10px] font-semibold text-[#3D4A60]">🏬 Pickup</span>
        )}
        <span className="ml-auto text-[13.5px] font-bold">{formatLKR(order.total)}</span>
      </div>
      <p className="mt-1.5 text-[12px] text-muted">
        {order.shipping_address?.name ?? '—'} · {order.shipping_address?.city ?? '—'} ·{' '}
        {order.order_items.reduce((n, i) => n + i.qty, 0)} items ·{' '}
        {new Date(order.created_at).toLocaleDateString('en-GB')}
      </p>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {next && (order.status === 'paid'
          ? (
            <button disabled={pending} onClick={() => onPack(order)}
              className="pressable rounded-lg bg-ink px-2.5 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50">
              {needScan ? '📷 Pack & scan' : '→ Pack'}
            </button>
          ) : (
            <button disabled={pending} onClick={() => start(() => advanceOrder(order.id, next))}
              className="pressable rounded-lg bg-ink px-2.5 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50">
              → {next.charAt(0).toUpperCase() + next.slice(1)}
            </button>
          ))}
        <a href={waHref} target="_blank" rel="noopener noreferrer"
          className="pressable rounded-lg bg-[#E8F7EE] px-2.5 py-1.5 text-[11px] font-semibold text-[#0F8A55]">
          WhatsApp
        </a>
        {(order.payment_method === 'cod' || order.payment_method === 'whatsapp') && order.payment_status !== 'paid' && (
          <button disabled={pending}
            onClick={() => start(() => markOrderCollected(order.id))}
            className="pressable rounded-lg bg-volt px-2.5 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50">
            Mark paid
          </button>
        )}
        {order.status === 'pending' && (
          <button disabled={pending}
            onClick={() => start(() => advanceOrder(order.id, 'cancelled'))}
            className="pressable rounded-lg bg-sale/10 px-2.5 py-1.5 text-[11px] font-semibold text-sale disabled:opacity-50">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
