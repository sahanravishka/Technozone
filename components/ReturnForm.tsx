'use client';
import { useState } from 'react';
import type { Dict } from '@/lib/i18n/dictionaries';
import type { Locale } from '@/lib/i18n/config';
import { requestReturn } from '@/app/[locale]/returns/actions';

export default function ReturnForm({ dict, locale }: { dict: Dict; locale: Locale }) {
  const [f, setF] = useState({ order: '', phone: '', reason: '' });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  const inputCls = 'h-12 w-full rounded-btn bg-card px-3.5 text-[14px] font-medium outline-none focus:ring-2 focus:ring-volt';

  const go = async () => {
    setBusy(true); setErr(false);
    const r = await requestReturn(f.order, f.phone, f.reason);
    setBusy(false);
    if (r.ok && r.rma) setDone(r.rma); else setErr(true);
  };

  if (done) {
    return (
      <div className="rounded-3xl bg-card p-8 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-[#E8F7EE] text-2xl">✓</div>
        <p className="text-[16px] font-bold">{dict.returns.done}</p>
        <p className="mx-auto mt-2 max-w-xs text-[13.5px] text-muted">{dict.returns.doneSub}</p>
        <p className="mt-4 inline-block rounded-xl bg-volt-soft px-5 py-2.5 text-[16px] font-bold text-volt">{done}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <input className={inputCls} placeholder={dict.returns.orderNo} value={f.order} onChange={e => setF({ ...f, order: e.target.value.toUpperCase() })} />
      <input className={inputCls} placeholder={dict.returns.phone} value={f.phone} inputMode="tel" onChange={e => setF({ ...f, phone: e.target.value })} />
      <textarea rows={3} className="w-full rounded-btn bg-card p-3.5 text-[14px] outline-none focus:ring-2 focus:ring-volt"
        placeholder={dict.returns.reason} value={f.reason} onChange={e => setF({ ...f, reason: e.target.value })} />
      {err && <p className="rounded-xl bg-sale/10 p-3 text-center text-[13px] font-medium text-sale">{dict.returns.notFound}</p>}
      <button onClick={go} disabled={busy || !f.order || !f.phone}
        className="pressable flex h-12 w-full items-center justify-center rounded-btn bg-volt font-semibold text-white hover:bg-volt-deep disabled:bg-line disabled:text-muted">
        {dict.returns.submit}
      </button>
    </div>
  );
}
