'use client';

import { useState, useTransition } from 'react';
import { issueLoyaltyCoupon } from '@/app/admin/actions';

export default function CustomerActions({ contactId, suggestedPct }:
  { contactId: string; suggestedPct: number }) {
  const [pending, start] = useTransition();
  const [code, setCode] = useState<string | null>(null);
  const [pct, setPct] = useState(suggestedPct || 5);

  const issue = () => start(async () => {
    const c = await issueLoyaltyCoupon(contactId, 'percentage', pct, 30);
    setCode(c);
  });

  if (code) {
    return <span className="rounded-lg bg-[#E8F7EE] px-2.5 py-1 text-[11.5px] font-bold text-ok">🎁 {code} ({pct}% off)</span>;
  }
  return (
    <div className="inline-flex items-center gap-1.5">
      <select value={pct} onChange={e => setPct(Number(e.target.value))}
        className="h-8 rounded-lg bg-paper px-2 text-[11.5px] font-semibold outline-none">
        {[5, 7, 10, 15].map(v => <option key={v} value={v}>{v}%</option>)}
      </select>
      <button onClick={issue} disabled={pending}
        className="pressable rounded-lg bg-volt-soft px-2.5 py-1.5 text-[11.5px] font-semibold text-volt disabled:opacity-50">
        🎁 Issue coupon
      </button>
    </div>
  );
}
