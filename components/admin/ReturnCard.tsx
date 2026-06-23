'use client';
import { useState, useTransition } from 'react';
import { advanceReturn } from '@/app/admin/actions';
import { returnMessage } from '@/lib/whatsapp';
import { formatLKR } from '@/lib/site';

const NEXT: Record<string, string> = { requested: 'approved', approved: 'received', received: 'refunded' };
const NEXT_LABEL: Record<string, string> = { requested: 'Approve', approved: 'Mark received', received: 'Mark refunded' };

type R = { id: string; rma_number: string; customer_name: string | null; customer_phone: string;
  reason: string | null; status: string; refund_amount: number | null; restock: boolean;
  orders: { order_number: string; total: number } | null; return_items: { product_name: string; qty: number }[] };

export default function ReturnCard({ r, accent }: { r: R; accent: string }) {
  const [pending, start] = useTransition();
  const [refund, setRefund] = useState(r.refund_amount ?? r.orders?.total ?? '');
  const next = NEXT[r.status];
  const wa = `https://wa.me/${r.customer_phone.replace(/\D/g, '').replace(/^0/, '94')}?text=${encodeURIComponent(returnMessage(r.rma_number, r.status))}`;

  return (
    <div className="rounded-2xl bg-card p-3.5" style={{ borderLeft: `3px solid ${accent}` }}>
      <div className="flex items-center justify-between">
        <b className="text-[13px]">{r.rma_number}</b>
        <span className="text-[11.5px] text-muted">{r.orders?.order_number}</span>
      </div>
      <p className="mt-1 text-[12px] text-muted">{r.customer_name} · {r.customer_phone}</p>
      <ul className="mt-1 text-[12px]">
        {r.return_items?.map((it, i) => <li key={i}>{it.product_name} ×{it.qty}</li>)}
      </ul>
      {r.reason && <p className="mt-1 text-[12px] text-muted">“{r.reason}”</p>}

      {r.status === 'received' && (
        <div className="mt-2 flex items-center gap-1.5">
          <input value={refund} onChange={e => setRefund(e.target.value)} inputMode="numeric" placeholder="Refund Rs"
            className="h-8 w-full rounded-lg bg-paper px-2 text-[12px] outline-none" />
        </div>
      )}
      <p className="mt-1.5 text-[11px] text-muted">{r.restock ? '↩ Restocks on receive' : 'No restock'}</p>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {next && (
          <button onClick={() => start(async () => { await advanceReturn(r.id, next, next === 'refunded' ? Number(refund) : undefined); })}
            disabled={pending} className="pressable rounded-lg bg-ink px-2.5 py-1.5 text-[11.5px] font-semibold text-white disabled:opacity-50">
            {NEXT_LABEL[r.status]}
          </button>
        )}
        <a href={wa} target="_blank" rel="noopener" className="pressable rounded-lg bg-[#E8F7EE] px-2.5 py-1.5 text-[11.5px] font-semibold text-ok">WhatsApp</a>
        {r.status !== 'refunded' && (
          <button onClick={() => { if (confirm('Reject this return?')) start(async () => { await advanceReturn(r.id, 'rejected'); }); }}
            disabled={pending} className="pressable rounded-lg bg-paper px-2 py-1.5 text-[11.5px] font-semibold text-muted disabled:opacity-50">Reject</button>
        )}
      </div>
    </div>
  );
}
