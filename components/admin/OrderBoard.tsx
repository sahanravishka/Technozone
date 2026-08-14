'use client';

import { useState } from 'react';
import OrderCard, { type AdminOrder } from './OrderCard';
import PackModal from './PackModal';
import OrderDetailModal from './OrderDetailModal';
import OrderJourneyModal from './OrderJourneyModal';
import PageHeader from './PageHeader';

const STATUS_TABS = [
  { key: 'all',        label: 'All Active', dot: '' },
  { key: 'pending',    label: 'Pending',    dot: '#B06A0A' },
  { key: 'paid',       label: 'Confirmed',  dot: '#1B6FD8' },
  { key: 'packed',     label: 'Packed',     dot: '#0284C7' },
  { key: 'cancelled',  label: 'Cancelled',  dot: '#9CA3AF' },
] as const;

export default function OrderBoard({
  orders, waLinks,
}: { orders: AdminOrder[]; waLinks: Record<string, string> }) {
  const [filter, setFilter]   = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<'all' | 'web' | 'facebook'>('all');
  const [exportFrom, setExportFrom] = useState('');
  const [exportTo, setExportTo] = useState('');
  const [sel, setSel]         = useState<Set<string>>(new Set());
  const [packing, setPacking] = useState<AdminOrder | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [journeyId, setJourneyId] = useState<string | null>(null);

  const onSelect = (id: string, on: boolean) =>
    setSel(prev => { const n = new Set(prev); on ? n.add(id) : n.delete(id); return n; });

  const channelOrders = channelFilter === 'all' ? orders : orders.filter(o => (o.channel ?? 'web') === channelFilter);
  const shown = filter === 'all' ? channelOrders : channelOrders.filter(o => o.status === filter);

  const webCount = orders.filter(o => (o.channel ?? 'web') === 'web').length;
  const fbCount = orders.filter(o => o.channel === 'facebook').length;
  const fbTotal = orders.filter(o => o.channel === 'facebook' && o.status !== 'cancelled').reduce((n, o) => n + o.total, 0);
  const fbActiveCount = orders.filter(o => o.channel === 'facebook' && o.status !== 'cancelled').length;

  const urgent = channelOrders.filter(o => o.status === 'pending' || o.status === 'paid').length;
  const activeOrders = channelOrders.filter(o => o.status !== 'cancelled');

  const exportHref = (() => {
    const p = new URLSearchParams();
    if (channelFilter !== 'all') p.set('channel', channelFilter);
    if (exportFrom) p.set('from', exportFrom);
    if (exportTo) p.set('to', exportTo);
    return `/admin/orders/export?${p.toString()}`;
  })();

  return (
    <div>
      <PageHeader
        title="Orders"
        subtitle={urgent > 0 ? `${urgent} order${urgent !== 1 ? 's' : ''} need attention` : `${activeOrders.length} active orders`}
      >
        {sel.size > 0 && (
          <a href={`/admin/print?ids=${[...sel].join(',')}`} target="_blank"
            className="pressable rounded-xl bg-ink px-4 py-2.5 text-[13px] font-bold text-white hover:bg-[#1a2540]">
            🖨 Print {sel.size} slip{sel.size > 1 ? 's' : ''}
          </a>
        )}
      </PageHeader>

      {/* ── Channel filter: Website vs Facebook orders ── */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {([
          { key: 'all' as const,      label: 'All Orders' },
          { key: 'web' as const,      label: 'Website Orders' },
          { key: 'facebook' as const, label: 'Facebook Orders' },
        ]).map(({ key, label }) => {
          const count = key === 'all' ? orders.length : key === 'web' ? webCount : fbCount;
          return (
            <button key={key} onClick={() => { setChannelFilter(key); setFilter('all'); }}
              className={`pressable inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors ${
                channelFilter === key
                  ? key === 'facebook' ? 'bg-[#1877F2] text-white shadow-sm' : 'bg-ink text-white shadow-sm'
                  : 'border border-line bg-card text-muted hover:bg-paper'
              }`}>
              {key === 'facebook' && '📘 '}{label}
              <span className={`min-w-[18px] rounded-full px-1.5 py-0.5 text-center text-[11px] font-bold ${
                channelFilter === key ? 'bg-white/20 text-white' : 'bg-paper text-muted'
              }`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* ── Facebook orders report + CSV export ── */}
      {channelFilter === 'facebook' && (
        <div className="admin-card mb-4 flex flex-wrap items-end gap-4 p-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Active Facebook orders</p>
            <p className="text-[20px] font-extrabold">{fbActiveCount}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Total value</p>
            <p className="text-[20px] font-extrabold">Rs {fbTotal.toLocaleString('en-LK')}</p>
          </div>
          <div className="ml-auto flex flex-wrap items-end gap-2">
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-muted">From</label>
              <input type="date" value={exportFrom} onChange={e => setExportFrom(e.target.value)}
                className="rounded-lg border border-line bg-card px-2.5 py-1.5 text-[12.5px]" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-muted">To</label>
              <input type="date" value={exportTo} onChange={e => setExportTo(e.target.value)}
                className="rounded-lg border border-line bg-card px-2.5 py-1.5 text-[12.5px]" />
            </div>
            <a href={exportHref}
              className="pressable rounded-lg bg-[#1877F2] px-4 py-2 text-[12.5px] font-bold text-white hover:bg-[#1666d8]">
              ⬇ Export CSV
            </a>
          </div>
        </div>
      )}

      {/* ── Status filter tabs ── */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {STATUS_TABS.map(({ key, label, dot }) => {
          const count = key === 'all' ? channelOrders.length : channelOrders.filter(o => o.status === key).length;
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
            onViewDetails={setDetailsId}
            onViewJourney={setJourneyId}
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
      {detailsId && <OrderDetailModal orderId={detailsId} onClose={() => setDetailsId(null)} />}
      {journeyId && <OrderJourneyModal orderId={journeyId} onClose={() => setJourneyId(null)} />}
    </div>
  );
}
