'use client';

import { useTransition } from 'react';
import { advanceOrder, confirmPendingOrder, markOrderCollected } from '@/app/admin/actions';
import { formatLKR } from '@/lib/site';
import type { AdminOrder } from './OrderCard';

const NEXT: Record<string, string> = { paid: 'packed', packed: 'dispatched' };

const STATUS_CLS: Record<string, string> = {
  pending: 'bg-[#F3EAD8] text-[#9A6B12]', paid: 'bg-volt-soft text-volt',
  packed: 'bg-[#E6F4FB] text-[#155CB8]', dispatched: 'bg-[#E8F7EE] text-ok',
  cancelled: 'bg-sale/10 text-sale'
};

const PAY_BADGE: Record<string, { label: string; cls: string }> = {
  cod: { label: '💵 COD', cls: 'bg-[#FBF0DC] text-[#9A6B12]' },
  whatsapp: { label: '🟢 WhatsApp', cls: 'bg-[#E8F7EE] text-ok' },
  payhere: { label: '💳 Online', cls: 'bg-volt-soft text-volt' }
};

const btn = 'pressable rounded-lg px-2.5 py-1.5 text-[11px] font-semibold disabled:opacity-50';

export default function OrderRow({ order, waHref, selected, onSelect, onPack }:
  { order: AdminOrder; waHref: string; selected: boolean;
    onSelect: (id: string, on: boolean) => void; onPack: (order: AdminOrder) => void }) {
  const [pending, start] = useTransition();
  const next = NEXT[order.status];
  const isOffline = order.payment_method === 'cod' || order.payment_method === 'whatsapp';
  const paid = order.payment_status === 'paid';
  const items = order.order_items.reduce((n, i) => n + i.qty, 0);
  const needScan = (order.requiredSerials ?? 0) > 0;

  return (
    <tr className="border-b border-[#EEF1F6] align-middle last:border-0">
      <td className="px-3 py-2.5">
        <input type="checkbox" checked={selected} onChange={e => onSelect(order.id, e.target.checked)}
          className="h-4 w-4 accent-[#1B6FD8]" aria-label={`Select ${order.order_number}`} />
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 font-semibold">
        {order.order_number}
        {order.fulfillment === 'pickup' && <span className="ml-1.5 rounded-md bg-[#EEF0F3] px-1.5 py-0.5 text-[10px] font-semibold text-[#3D4A60]">🏬</span>}
      </td>
      <td className="px-3 py-2.5 text-muted">
        <span className="block max-w-[180px] truncate">{order.shipping_address?.name ?? '—'}</span>
        <span className="block text-[11px]">{order.shipping_address?.city ?? '—'}</span>
      </td>
      <td className="px-3 py-2.5 text-center">{items}</td>
      <td className="whitespace-nowrap px-3 py-2.5 font-bold">{formatLKR(order.total)}</td>
      <td className="whitespace-nowrap px-3 py-2.5">
        {order.payment_method && PAY_BADGE[order.payment_method] && (
          <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${PAY_BADGE[order.payment_method].cls}`}>
            {PAY_BADGE[order.payment_method].label}
          </span>
        )}
        <span className={`ml-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${paid ? 'bg-[#E8F7EE] text-ok' : 'bg-sale/10 text-sale'}`}>
          {paid ? 'Paid' : 'Unpaid'}
        </span>
      </td>
      <td className="px-3 py-2.5">
        <span className={`rounded-md px-2 py-0.5 text-[10.5px] font-semibold capitalize ${STATUS_CLS[order.status] ?? 'bg-paper text-muted'}`}>
          {order.status}
        </span>
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-muted">{new Date(order.created_at).toLocaleDateString('en-GB')}</td>
      <td className="px-3 py-2.5">
        <div className="flex flex-wrap justify-end gap-1.5">
          {next && (order.status === 'paid'
            ? <button disabled={pending} onClick={() => onPack(order)} className={`${btn} bg-ink text-white`}>→ Pack</button>
            : <button disabled={pending} onClick={() => start(() => advanceOrder(order.id, next))} className={`${btn} bg-ink text-white`}>→ {next.charAt(0).toUpperCase() + next.slice(1)}</button>
          )}
          {isOffline && order.status === 'pending' && (
            <button disabled={pending} onClick={() => start(() => confirmPendingOrder(order.id))}
              className={`${btn} bg-volt text-white`}>{order.payment_method === 'cod' ? '✓ Confirm' : 'Mark paid'}</button>
          )}
          <a href={`/admin/orders/${order.id}/invoice`} target="_blank" rel="noopener noreferrer" className={`${btn} bg-paper text-ink border border-line`}>🧾 Invoice</a>
          <a href={waHref} target="_blank" rel="noopener noreferrer" className={`${btn} bg-[#E8F7EE] text-[#0F8A55]`}>WhatsApp</a>
          {order.status === 'pending' && (
            <button disabled={pending} onClick={() => start(() => advanceOrder(order.id, 'cancelled'))}
              className={`${btn} bg-sale/10 text-sale`}>Cancel</button>
          )}
        </div>
      </td>
    </tr>
  );
}
