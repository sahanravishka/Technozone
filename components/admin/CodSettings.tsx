'use client';
import { useState, useTransition } from 'react';
import { setCodMaxValue, addCodBlock, removeCodBlock } from '@/app/admin/actions';
import { formatLKR } from '@/lib/site';

type Block = { phone_norm: string; reason: string | null };

export default function CodSettings({ maxValue, blocks }: { maxValue: number; blocks: Block[] }) {
  const [pending, start] = useTransition();
  const [max, setMax] = useState(maxValue);
  const [phone, setPhone] = useState('');
  const [reason, setReason] = useState('');
  const inp = 'h-11 rounded-btn bg-paper px-3 text-[13.5px] outline-none focus:ring-2 focus:ring-volt';

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-card p-5">
        <p className="text-[14px] font-bold">COD order limit</p>
        <p className="mb-3 text-[12.5px] text-muted">Orders above this total can’t use Cash on delivery (current: {formatLKR(maxValue)}).</p>
        <div className="flex items-center gap-2">
          <input value={max} onChange={e => setMax(Number(e.target.value))} inputMode="numeric" aria-label="COD order limit in Rupees" className={`${inp} w-40`} />
          <button onClick={() => start(() => setCodMaxValue(Number(max)))} disabled={pending}
            className="pressable rounded-btn bg-volt px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-volt-deep disabled:opacity-50">Save</button>
        </div>
      </section>

      <section className="rounded-2xl bg-card p-5">
        <p className="text-[14px] font-bold">COD blocklist</p>
        <p className="mb-3 text-[12.5px] text-muted">Phone numbers blocked from Cash on delivery (e.g. repeat fake/abandoned orders).</p>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="07X XXX XXXX" aria-label="Phone number to block" className={`${inp} w-44`} inputMode="tel" />
          <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason (optional)" aria-label="Reason for blocking" className={`${inp} flex-1`} />
          <button onClick={() => start(async () => { await addCodBlock(phone, reason); setPhone(''); setReason(''); })}
            disabled={pending || !phone} className="pressable rounded-btn bg-ink px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50">Block</button>
        </div>
        <ul className="divide-y divide-[#F2F5F9]">
          {blocks.map(b => (
            <li key={b.phone_norm} className="flex items-center justify-between py-2.5 text-[13px]">
              <span><b>{b.phone_norm}</b>{b.reason && <span className="ml-2 text-muted">{b.reason}</span>}</span>
              <button onClick={() => start(() => removeCodBlock(b.phone_norm))} disabled={pending}
                className="pressable rounded-lg bg-paper px-3 py-1.5 text-[12px] font-semibold text-muted disabled:opacity-50">Remove</button>
            </li>
          ))}
          {!blocks.length && <li className="py-3 text-[13px] text-muted">No blocked numbers.</li>}
        </ul>
      </section>
    </div>
  );
}
