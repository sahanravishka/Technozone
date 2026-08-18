'use client';

import { useState, useTransition } from 'react';
import { lookupOrderForReturn, createManualReturn, type ReturnLookupResult } from '@/app/admin/actions';

export default function NewReturnModal({ onClose, onCreated }: { onClose: () => void; onCreated: (rma: string) => void }) {
  const [orderNumber, setOrderNumber] = useState('');
  const [order, setOrder] = useState<ReturnLookupResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [qtys, setQtys] = useState<Record<string, number>>({});
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [pending, start] = useTransition();

  function lookup() {
    if (!orderNumber.trim()) return;
    setError(''); setNotFound(false); setOrder(null);
    start(async () => {
      const res = await lookupOrderForReturn(orderNumber.trim());
      if (!res) { setNotFound(true); return; }
      setOrder(res);
      const initial: Record<string, number> = {};
      res.items.forEach(i => { initial[i.order_item_id] = 0; });
      setQtys(initial);
    });
  }

  function submit() {
    if (!order) return;
    const items = order.items
      .filter(i => (qtys[i.order_item_id] ?? 0) > 0)
      .map(i => ({
        order_item_id: i.order_item_id, variant_id: i.variant_id, product_name: i.product_name,
        qty: qtys[i.order_item_id],
      }));
    if (!items.length) { setError('Select a quantity for at least one item.'); return; }
    setError('');
    start(async () => {
      try {
        const rma = await createManualReturn({
          orderId: order.order_id, customerName: order.customer_name, customerPhone: order.customer_phone,
          reason, items,
        });
        onCreated(rma);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to create return');
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-3xl bg-card p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <b className="text-[16px]">New Return</b>
          <button onClick={onClose} className="px-1 text-[18px] leading-none text-muted hover:text-ink" aria-label="Close">✕</button>
        </div>

        <div className="mt-4">
          <label className="mb-1.5 block text-[12px] font-bold text-muted">Order Number</label>
          <div className="flex gap-2">
            <input value={orderNumber} onChange={e => setOrderNumber(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && lookup()}
              placeholder="e.g. ORD-001013"
              className="h-11 flex-1 rounded-xl border border-line bg-paper px-3.5 text-[14px] outline-none focus:ring-2 focus:ring-volt" />
            <button onClick={lookup} disabled={pending || !orderNumber.trim()}
              className="pressable rounded-xl bg-ink px-4 text-[13px] font-bold text-white disabled:opacity-50">
              Find
            </button>
          </div>
          {notFound && <p className="mt-1.5 text-[12.5px] font-semibold text-sale">No order found with that number.</p>}
        </div>

        {order && (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl bg-paper px-3.5 py-2.5 text-[13px]">
              <p className="font-bold">{order.customer_name}</p>
              <p className="text-muted">{order.customer_phone} · {order.order_number}</p>
            </div>

            <div>
              <label className="mb-1.5 block text-[12px] font-bold text-muted">Which items are being returned?</label>
              <ul className="space-y-2">
                {order.items.map(i => {
                  const available = i.qty - i.already_returned;
                  return (
                    <li key={i.order_item_id} className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold">{i.product_name}</p>
                        <p className="text-[11.5px] text-muted">
                          Ordered {i.qty}{i.already_returned > 0 ? ` · ${i.already_returned} already returned` : ''}
                        </p>
                      </div>
                      {available > 0 ? (
                        <input type="number" min={0} max={available}
                          value={qtys[i.order_item_id] ?? 0}
                          onChange={e => setQtys(prev => ({ ...prev, [i.order_item_id]: Math.max(0, Math.min(available, Number(e.target.value) || 0)) }))}
                          className="h-9 w-16 shrink-0 rounded-lg border border-line bg-paper text-center text-[13px] outline-none" />
                      ) : (
                        <span className="shrink-0 text-[11.5px] font-semibold text-muted">Fully returned</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            <div>
              <label className="mb-1.5 block text-[12px] font-bold text-muted">Reason (optional)</label>
              <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
                placeholder="e.g. Wrong item delivered, customer changed mind…"
                className="w-full resize-none rounded-xl border border-line bg-paper px-3.5 py-2.5 text-[13.5px] outline-none focus:ring-2 focus:ring-volt" />
            </div>

            {error && <p className="text-[12.5px] font-semibold text-sale">{error}</p>}

            <button onClick={submit} disabled={pending}
              className="pressable w-full rounded-xl bg-volt py-3 text-[14px] font-bold text-white hover:bg-volt-deep disabled:opacity-50">
              {pending ? 'Creating…' : 'Create Return'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
