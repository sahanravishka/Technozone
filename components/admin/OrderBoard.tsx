'use client';

import { useState } from 'react';
import OrderCard, { type AdminOrder } from './OrderCard';
import PackModal from './PackModal';
import PageHeader from './PageHeader';

const STATUS_TABS = [
  { key: 'all',       label: 'All',       dot: '' },
  { key: 'pending',   label: 'Pending',   dot: '#B06A0A' },
  { key: 'paid',      label: 'Paid',      dot: '#1B6FD8' },
  { key: 'packed',    label: 'Packed',    dot: '#0284C7' },
  { key: 'shipped',   label: 'Shipped',   dot: '#7C3AED' },
  { key: 'delivered', label: 'Delivered', dot: '#059669' },
] as const;

export default function OrderBoard({
  orders, waLinks,
}: { orders: AdminOrder[]; waLinks: Record<string, string> }) {
  const [filter, setFilter]   = useState<string>('all');
  const [sel, setSel]         = useState<Set<string>>(new Set());
  const [packing, setPacking] = useState<AdminOrder | null>(null);

  const onSelect = (id: string, on: boolean) =>
    setSel(prev => { const n = new Set(prev); on ? n.add(id) : n.delete(id); return n; });

  const shown = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  // Count pending + paid for urgent attention badge
  const urgent = orders.filter(o => o.status === 'pending' || o.status === 'paid').length;

  return (
    <div>
      <PageHeader
        title="Orders"
        subtitle={urgent > 0 ? `${urgent} order${urgent !== 1 ? 's' : ''} need attention` : `${orders.length} active orders`}
      >
        {sel.size > 0 && (
          <a href={`/admin/print?ids=${[...sel].join(',')}`} target="_blank"
            className="pressable rounded-xl bg-ink px-4 py-2.5 text-[13px] font-bold text-white hover:bg-[#1a2540]">
            🖨 Print {sel.size} slip{sel.size > 1 ? 's' : ''}
          </a>
        )}
      </PageHeader>

      {/* ── Status filter tabs ── */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {STATUS_TABS.map(({ key, label, dot }) => {
          const count = key === 'all' ? orders.length : orders.filter(o => o.status === key).length;
          if (key !== 'all' && count === 0) return null;
          return (
            <button key={key} onClick={() => setFilter(key)}
              className={`pressable inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors ${
                filter === key
                  ? 'bg-ink text-white shadow-sm'
                  : 'border border-line bg-card text-muted hover:bg-paper'
              }`}>
              {dot && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: dot }} />}
              {label}
              <span className={`min-w-[18px] rounded-full px-1.5 py-0.5 text-center text-[11px] font-bold ${
                filter === key ? 'bg-white/20 text-white' : 'bg-paper text-muted'
              }`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* ── Order card list ── */}
      <div className="space-y-2.5">
        {shown.map(o => (
          <OrderCard
            key={o.id}
            order={o}
            waHref={waLinks[o.id]}
            selected={sel.has(o.id)}
            onSelect={onSelect}
            onPack={setPacking}
          />
        ))}
        {!shown.length && (
          <div className="admin-card p-14 text-center">
            <p className="text-[16px] font-semibold text-muted">
              {filter === 'all' ? 'No active orders' : `No ${filter} orders`}
            </p>
            <p className="mt-1 text-[13px] text-muted">All caught up!</p>
          </div>
        )}
      </div>

      {packing && <PackModal order={packing} onClose={() => setPacking(null)} />}
    </div>
  );
}
