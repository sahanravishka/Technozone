'use client';

import { useState } from 'react';
import OrderCard, { type AdminOrder } from './OrderCard';
import OrderRow from './OrderRow';
import PackModal from './PackModal';
import PageHeader from './PageHeader';

const COLS: { key: 'pending' | 'paid' | 'packed' | 'shipped' | 'delivered'; accent: string }[] = [
  { key: 'pending', accent: '#B06A0A' },
  { key: 'paid', accent: '#1B6FD8' },
  { key: 'packed', accent: '#53B7E8' },
  { key: 'shipped', accent: '#7C5CFC' },
  { key: 'delivered', accent: '#0F8A55' }
];

const FILTERS = ['all', 'pending', 'paid', 'packed', 'shipped', 'delivered'] as const;

export default function OrderBoard({ orders, waLinks }:
  { orders: AdminOrder[]; waLinks: Record<string, string> }) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [view, setView] = useState<'table' | 'board'>('table');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');
  const [packing, setPacking] = useState<AdminOrder | null>(null);
  const onSelect = (id: string, on: boolean) =>
    setSel(prev => { const n = new Set(prev); if (on) n.add(id); else n.delete(id); return n; });

  const shown = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  return (
    <div>
      <PageHeader title="Orders" subtitle={`${orders.length} active order${orders.length === 1 ? '' : 's'}`}>
        {sel.size > 0 && (
          <>
            <span className="rounded-full bg-volt-soft px-2.5 py-1 text-[11.5px] font-semibold text-volt">{sel.size} selected</span>
            <a href={`/admin/print?ids=${[...sel].join(',')}`} target="_blank"
              className="pressable admin-card px-4 py-2 text-[12.5px] font-semibold hover:bg-paper">🖨 Print packing slips</a>
          </>
        )}
        <div className="inline-flex rounded-lg bg-paper p-0.5">
          {(['table', 'board'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`rounded-md px-3 py-1.5 text-[12px] font-semibold transition-colors ${view === v ? 'bg-white text-ink shadow-sm' : 'text-muted'}`}>
              {v === 'table' ? '☰ List' : '▦ Board'}
            </button>
          ))}
        </div>
      </PageHeader>

      {view === 'board' ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {COLS.map(({ key, accent }) => {
            const list = orders.filter(o => o.status === key);
            return (
              <div key={key}>
                <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">
                  <span className="h-2 w-2 rounded-full" style={{ background: accent }} />
                  {key}
                  <span className="ml-auto rounded-full bg-paper px-1.5 py-0.5 text-[10.5px] text-muted">{list.length}</span>
                </p>
                <div className="space-y-2.5">
                  {list.map(o => (
                    <OrderCard key={o.id} order={o} waHref={waLinks[o.id]} selected={sel.has(o.id)} onSelect={onSelect} onPack={setPacking} />
                  ))}
                  {!list.length && <div className="rounded-2xl border border-dashed border-line p-4 text-center text-[11.5px] text-muted">—</div>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {FILTERS.map(f => {
              const count = f === 'all' ? orders.length : orders.filter(o => o.status === f).length;
              return (
                <button key={f} onClick={() => setFilter(f)}
                  className={`rounded-full px-3 py-1.5 text-[12px] font-semibold capitalize ${filter === f ? 'bg-ink text-white' : 'admin-card text-muted hover:bg-paper'}`}>
                  {f} <span className="opacity-70">{count}</span>
                </button>
              );
            })}
          </div>
          <div className="admin-card overflow-x-auto">
            <table className="w-full min-w-[820px] text-[13px]">
              <thead>
                <tr className="border-b border-[#EEF1F6] text-left text-[11px] font-bold uppercase tracking-wide text-muted">
                  <th className="w-8 px-3 py-2.5"></th>
                  <th className="px-3 py-2.5">Order</th>
                  <th className="px-3 py-2.5">Customer</th>
                  <th className="px-3 py-2.5 text-center">Items</th>
                  <th className="px-3 py-2.5">Total</th>
                  <th className="px-3 py-2.5">Payment</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Date</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {shown.map(o => (
                  <OrderRow key={o.id} order={o} waHref={waLinks[o.id]} selected={sel.has(o.id)} onSelect={onSelect} onPack={setPacking} />
                ))}
                {!shown.length && <tr><td colSpan={9} className="px-3 py-10 text-center text-muted">No orders.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {packing && <PackModal order={packing} onClose={() => setPacking(null)} />}
    </div>
  );
}
