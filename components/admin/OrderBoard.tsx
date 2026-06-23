'use client';

import { useState } from 'react';
import OrderCard, { type AdminOrder } from './OrderCard';
import PageHeader from './PageHeader';

const COLS: { key: 'pending' | 'paid' | 'packed' | 'shipped' | 'delivered'; accent: string }[] = [
  { key: 'pending', accent: '#B06A0A' },
  { key: 'paid', accent: '#1B6FD8' },
  { key: 'packed', accent: '#53B7E8' },
  { key: 'shipped', accent: '#7C5CFC' },
  { key: 'delivered', accent: '#0F8A55' }
];

export default function OrderBoard({ orders, waLinks }:
  { orders: AdminOrder[]; waLinks: Record<string, string> }) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const onSelect = (id: string, on: boolean) =>
    setSel(prev => { const n = new Set(prev); if (on) n.add(id); else n.delete(id); return n; });

  return (
    <div>
      <PageHeader title="Orders" subtitle={`${orders.length} active order${orders.length === 1 ? '' : 's'}`}>
        {sel.size > 0 && (
          <>
            <span className="rounded-full bg-volt-soft px-2.5 py-1 text-[11.5px] font-semibold text-volt">
              {sel.size} selected
            </span>
            <a href={`/admin/print?ids=${[...sel].join(',')}`} target="_blank"
              className="pressable admin-card px-4 py-2 text-[12.5px] font-semibold hover:bg-paper">
              🖨 Print packing slips
            </a>
          </>
        )}
      </PageHeader>
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
                  <OrderCard key={o.id} order={o} waHref={waLinks[o.id]}
                    selected={sel.has(o.id)} onSelect={onSelect} />
                ))}
                {!list.length && <div className="rounded-2xl border border-dashed border-line p-4 text-center text-[11.5px] text-muted">—</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
