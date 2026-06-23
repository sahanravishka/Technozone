'use client';

import { useState } from 'react';
import OrderCard, { type AdminOrder } from './OrderCard';

const COLS = ['pending', 'paid', 'packed', 'shipped', 'delivered'] as const;

export default function OrderBoard({ orders, waLinks }:
  { orders: AdminOrder[]; waLinks: Record<string, string> }) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const onSelect = (id: string, on: boolean) =>
    setSel(prev => { const n = new Set(prev); if (on) n.add(id); else n.delete(id); return n; });

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-xl font-bold">Orders</h1>
        {sel.size > 0 && (
          <>
            <span className="rounded-lg bg-volt-soft px-2.5 py-1 text-[11.5px] font-semibold text-volt">
              {sel.size} selected
            </span>
            <a href={`/admin/print?ids=${[...sel].join(',')}`} target="_blank"
              className="pressable ml-auto rounded-btn bg-card px-4 py-2.5 text-[12.5px] font-semibold hover:bg-line/50">
              🖨 Print packing slips
            </a>
          </>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {COLS.map(col => {
          const list = orders.filter(o => o.status === col);
          return (
            <div key={col}>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">
                {col} · {list.length}
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
