'use client';

import { useState } from 'react';
import type { Dict } from '@/lib/i18n/dictionaries';
import { trackRepair } from '@/app/[locale]/track/actions';
import { formatLKR } from '@/lib/site';

const STEPS = ['received', 'diagnosing', 'awaiting_approval', 'repairing', 'ready', 'collected'];
const LABEL: Record<string, string> = {
  received: 'Received', diagnosing: 'Diagnosing', awaiting_approval: 'Awaiting approval',
  repairing: 'Repairing', ready: 'Ready for pickup', collected: 'Collected', cancelled: 'Cancelled'
};

export default function TrackForm({ dict }: { dict: Dict }) {
  const [job, setJob] = useState('');
  const [last4, setLast4] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<'idle' | 'none' | Record<string, unknown>>('idle');

  const go = async () => {
    setBusy(true);
    const r = await trackRepair(job, last4);
    setBusy(false);
    setResult(r ?? 'none');
  };

  const inputCls = 'h-12 w-full rounded-btn bg-card px-3.5 text-[14px] font-medium outline-none focus:ring-2 focus:ring-volt';

  return (
    <div className="space-y-3">
      <input className={inputCls} placeholder={dict.services.jobNo} value={job}
        onChange={e => setJob(e.target.value.toUpperCase())} />
      <input className={inputCls} placeholder={dict.services.last4} value={last4} inputMode="numeric" maxLength={4}
        onChange={e => setLast4(e.target.value.replace(/\D/g, '').slice(0, 4))} />
      <button onClick={go} disabled={busy || !job || last4.length !== 4}
        className="pressable flex h-12 w-full items-center justify-center rounded-btn bg-volt font-semibold text-white hover:bg-volt-deep disabled:bg-line disabled:text-muted">
        {dict.services.track}
      </button>

      {result === 'none' && (
        <p className="rounded-2xl bg-sale/10 p-4 text-center text-[13.5px] font-medium text-sale">{dict.services.notFound}</p>
      )}

      {typeof result === 'object' && (
        <div className="rounded-3xl bg-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-[15px] font-bold">{String(result.job_number)}</span>
            <span className="rounded-lg bg-volt-soft px-2.5 py-1 text-[12px] font-semibold text-volt">{LABEL[String(result.status)]}</span>
          </div>
          <p className="mt-1 text-[13px] text-muted">{String(result.device)} · {String(result.service_category ?? '')}</p>
          {result.estimate != null && <p className="mt-1 text-[13.5px] font-semibold">Estimate: {formatLKR(Number(result.estimate))}</p>}

          {String(result.status) !== 'cancelled' && (
            <ol className="mt-5 space-y-0">
              {STEPS.map((s, i) => {
                const idx = STEPS.indexOf(String(result.status));
                const done = idx >= i;
                return (
                  <li key={s} className="relative flex gap-3 pb-4 last:pb-0">
                    {i < STEPS.length - 1 && <span className={`absolute left-[9px] top-5 h-full w-0.5 ${idx > i ? 'bg-volt' : 'bg-line'}`} />}
                    <span className={`relative z-10 mt-0.5 grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold ${done ? 'bg-volt text-white' : 'bg-line text-muted'}`}>{done ? '✓' : i + 1}</span>
                    <span className={`text-[13.5px] ${idx === i ? 'font-bold' : done ? 'font-semibold' : 'text-muted'}`}>{LABEL[s]}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
