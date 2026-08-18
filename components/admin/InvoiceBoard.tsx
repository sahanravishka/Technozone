'use client';

import { useMemo, useState } from 'react';
import PageHeader from './PageHeader';
import OrderDetailModal from './OrderDetailModal';
import OrderJourneyModal from './OrderJourneyModal';
import PackModal from './PackModal';
import type { AdminOrder } from './OrderCard';
import { formatLKR } from '@/lib/site';

export default function InvoiceBoard({
  invoices, waLinks,
}: { invoices: AdminOrder[]; waLinks: Record<string, string> }) {
  const [search, setSearch] = useState('');
  const [dayFilter, setDayFilter] = useState<'all' | 'today' | 'yesterday' | 'week' | 'custom'>('all');
  const [customDay, setCustomDay] = useState('');
  const [exportFrom, setExportFrom] = useState('');
  const [exportTo, setExportTo] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [journeyId, setJourneyId] = useState<string | null>(null);
  const [packing, setPacking] = useState<AdminOrder | null>(null);

  const dateFiltered = useMemo(() => {
    if (dayFilter === 'all') return invoices;
    const now = new Date();
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (dayFilter === 'today') {
      const start = startOfDay(now);
      return invoices.filter(i => new Date(i.created_at) >= start);
    }
    if (dayFilter === 'yesterday') {
      const start = startOfDay(new Date(now.getTime() - 86400000));
      const end = startOfDay(now);
      return invoices.filter(i => { const d = new Date(i.created_at); return d >= start && d < end; });
    }
    if (dayFilter === 'week') {
      const start = startOfDay(new Date(now.getTime() - 6 * 86400000));
      return invoices.filter(i => new Date(i.created_at) >= start);
    }
    if (dayFilter === 'custom' && customDay) {
      const start = new Date(customDay + 'T00:00:00');
      const end = new Date(start.getTime() + 86400000);
      return invoices.filter(i => { const d = new Date(i.created_at); return d >= start && d < end; });
    }
    return invoices;
  }, [invoices, dayFilter, customDay]);

  const filtered = dateFiltered.filter(i => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    const addr = i.shipping_address as { name?: string; city?: string } | null;
    return (
      i.order_number.toLowerCase().includes(q) ||
      (addr?.name ?? '').toLowerCase().includes(q) ||
      (addr?.city ?? '').toLowerCase().includes(q) ||
      i.customer_phone.includes(q)
    );
  });

  const totalRev = filtered.reduce((sum, i) => sum + i.total, 0);

  const exportHref = (() => {
    const p = new URLSearchParams({ status: 'dispatched' });
    if (exportFrom) p.set('from', exportFrom);
    if (exportTo) p.set('to', exportTo);
    return `/admin/orders/export?${p.toString()}`;
  })();

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle={`${filtered.length} invoice${filtered.length !== 1 ? 's' : ''} (Dispatched orders)`}
      >
        <div className="flex items-center gap-2 rounded-2xl bg-card border border-line px-3 py-2 text-[13px] font-bold">
          <span>Total:</span>
          <span className="text-volt-deep font-extrabold">{formatLKR(totalRev)}</span>
        </div>
      </PageHeader>

      {/* ── Day filter ── */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {([
          { key: 'all' as const,       label: 'All Days' },
          { key: 'today' as const,     label: 'Today' },
          { key: 'yesterday' as const, label: 'Yesterday' },
          { key: 'week' as const,      label: 'Last 7 Days' },
        ]).map(({ key, label }) => (
          <button key={key} onClick={() => setDayFilter(key)}
            className={`pressable rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors ${
              dayFilter === key ? 'bg-ink text-white' : 'border border-line bg-card text-muted hover:bg-paper'
            }`}>
            {label}
          </button>
        ))}
        <input type="date" value={customDay}
          onChange={e => { setCustomDay(e.target.value); setDayFilter(e.target.value ? 'custom' : 'all'); }}
          className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold outline-none ${
            dayFilter === 'custom' ? 'border-ink bg-ink text-white' : 'border-line bg-card text-muted'
          }`} />
      </div>

      {/* ── Search + Export ── */}
      <div className="admin-card mb-4 flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-[11px] font-semibold text-muted">Search</label>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Order #, customer name, phone, city…"
            className="h-10 w-full rounded-xl border border-line bg-card px-3.5 text-[13px] outline-none focus:ring-2 focus:ring-volt"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-muted">Export from</label>
          <input type="date" value={exportFrom} onChange={e => setExportFrom(e.target.value)}
            className="rounded-lg border border-line bg-card px-2.5 py-2 text-[12.5px]" />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-muted">To</label>
          <input type="date" value={exportTo} onChange={e => setExportTo(e.target.value)}
            className="rounded-lg border border-line bg-card px-2.5 py-2 text-[12.5px]" />
        </div>
        <a href={exportHref}
          className="pressable rounded-lg bg-volt px-4 py-2.5 text-[12.5px] font-bold text-white hover:bg-volt-deep">
          ⬇ Export CSV
        </a>
      </div>

      {/* ── Compact invoice rows ── */}
      <div className="space-y-2">
        {filtered.map(inv => {
          const open = openId === inv.id;
          const date = new Date(inv.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
          const isCod = inv.payment_method === 'cod';
          const itemsText = inv.order_items.map(item => `${item.qty}× ${item.product_name ?? 'item'}`).join(', ');
          const totalQty = inv.order_items.reduce((n, i) => n + i.qty, 0);

          return (
            <div key={inv.id} className="admin-card flex overflow-hidden">
              <div className="w-1 shrink-0 bg-[#10B981]" />
              <div className="min-w-0 flex-1">
                <button type="button" onClick={() => setOpenId(open ? null : inv.id)}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[13.5px] font-extrabold tracking-tight">{inv.order_number}</span>
                      <span className="rounded-md bg-[#D1FAE5] px-1.5 py-0.5 text-[10px] font-bold text-[#065F46]">Dispatched</span>
                    </div>
                    <p className="mt-0.5 truncate text-[12px] text-muted">
                      {inv.shipping_address?.name ?? 'Customer'}
                      {inv.shipping_address?.city ? ` · ${inv.shipping_address.city}` : ''} · {date}
                      {totalQty > 0 ? ` · ${totalQty} item${totalQty !== 1 ? 's' : ''}` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 text-[14.5px] font-extrabold">{formatLKR(inv.total)}</span>
                  <span className={`shrink-0 text-[10px] text-muted transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
                </button>

                {open && (
                  <div className="border-t border-line">
                    <div className="px-3 py-2.5">
                      <span className="rounded-lg bg-paper px-2.5 py-1 text-[11.5px] font-semibold capitalize text-muted">
                        {isCod ? 'Cash on Delivery' : inv.payment_method}
                      </span>
                      {itemsText && <p className="mt-2 text-[12.5px] text-muted">{itemsText}</p>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 border-t border-line bg-paper/60 px-3 py-2.5">
                      <a href={`/admin/orders/${inv.id}/invoice`} target="_blank" rel="noopener noreferrer"
                        className="pressable rounded-xl bg-volt px-4 py-2 text-[12.5px] font-bold text-white hover:bg-volt-deep">
                        🧾 View / Print
                      </a>
                      <button onClick={() => setJourneyId(inv.id)}
                        className="pressable rounded-xl border border-line bg-card px-4 py-2 text-[12.5px] font-bold text-ink hover:bg-paper">
                        🗺️ Journey
                      </button>
                      <button onClick={() => setDetailsId(inv.id)}
                        className="pressable rounded-xl border border-line bg-card px-4 py-2 text-[12.5px] font-bold text-muted hover:bg-paper hover:text-ink">
                        👁 Details
                      </button>
                      {(inv.requiredSerials ?? 0) > 0 && (
                        <button onClick={() => setPacking(inv)}
                          className="pressable rounded-xl border border-line bg-card px-4 py-2 text-[12.5px] font-bold text-muted hover:bg-paper hover:text-ink">
                          📷 Scan IMEI ({inv.scannedSerials ?? 0}/{inv.requiredSerials})
                        </button>
                      )}
                      <a href={waLinks[inv.id]} target="_blank" rel="noopener noreferrer"
                        className="pressable rounded-xl border border-line bg-card px-4 py-2 text-[12.5px] font-bold text-muted hover:bg-paper">
                        💬 WhatsApp
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {!filtered.length && (
          <div className="admin-card p-14 text-center">
            <p className="text-[16px] font-semibold text-muted">No invoices found</p>
            <p className="mt-1 text-[13px] text-muted">When orders are marked dispatched, they will appear here as invoices.</p>
          </div>
        )}
      </div>

      {detailsId && <OrderDetailModal orderId={detailsId} onClose={() => setDetailsId(null)} />}
      {journeyId && <OrderJourneyModal orderId={journeyId} onClose={() => setJourneyId(null)} />}
      {packing && <PackModal order={packing} onClose={() => setPacking(null)} />}
    </div>
  );
}
