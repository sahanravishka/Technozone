'use client';

import { useState } from 'react';
import type { Dict } from '@/lib/i18n/dictionaries';
import type { ServiceType } from '@/lib/types';
import type { Locale } from '@/lib/i18n/config';
import { SITE, waLink } from '@/lib/site';
import { requestRepair } from '@/app/[locale]/services/actions';

const inputCls = 'h-12 w-full rounded-btn bg-card px-3.5 text-[14px] font-medium outline-none focus:ring-2 focus:ring-volt';
const label = 'mb-1.5 block text-[13px] font-semibold text-muted';

export default function RepairForm({ dict, types, locale }:
  { dict: Dict; types: ServiceType[]; locale: Locale }) {
  const [f, setF] = useState({ name: '', phone: '', brand: '', model: '', typeId: types[0]?.id ?? '', issue: '' });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const typeName = types.find(t => t.id === f.typeId)?.name ?? '';

  const submit = async () => {
    setBusy(true);
    const res = await requestRepair({
      name: f.name, phone: f.phone, brand: f.brand, model: f.model,
      serviceTypeId: f.typeId.startsWith('s') ? undefined : f.typeId,
      serviceCategory: typeName, issue: f.issue
    });
    setBusy(false);
    if (res.ok && res.jobNumber) {
      setDone(res.jobNumber);
    } else {
      // demo mode / not configured: WhatsApp handoff so no lead is lost
      const msg = `Hi ${SITE.name}! I'd like to book a repair.\nName: ${f.name}\nPhone: ${f.phone}\nDevice: ${f.brand} ${f.model}\nService: ${typeName}\nIssue: ${f.issue}`;
      window.open(waLink(msg), '_blank');
      setDone('WHATSAPP');
    }
  };

  if (done) {
    return (
      <div className="rounded-3xl bg-card p-8 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-[#E8F7EE] text-2xl">✓</div>
        <p className="text-[16px] font-bold">{dict.services.submitted}</p>
        <p className="mx-auto mt-2 max-w-sm text-[13.5px] text-muted">{dict.services.submittedSub}</p>
        {done !== 'WHATSAPP' && (
          <p className="mt-4 inline-block rounded-xl bg-volt-soft px-5 py-2.5 text-[16px] font-bold text-volt">{done}</p>
        )}
        <div className="mt-6">
          <a href={`/${locale}/track`} className="text-[13px] font-semibold text-volt hover:underline">{dict.services.trackCta} →</a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-3xl bg-paper p-1">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><span className={label}>{dict.form.name}</span>
          <input className={inputCls} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></div>
        <div><span className={label}>{dict.form.phone}</span>
          <input className={inputCls} value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} inputMode="tel" placeholder="07X XXX XXXX" /></div>
      </div>
      <div><span className={label}>{dict.services.device}</span>
        <div className="grid grid-cols-2 gap-3">
          <input className={inputCls} value={f.brand} onChange={e => setF({ ...f, brand: e.target.value })} placeholder="Samsung" />
          <input className={inputCls} value={f.model} onChange={e => setF({ ...f, model: e.target.value })} placeholder="Galaxy A34" />
        </div>
      </div>
      <div><span className={label}>{dict.services.type}</span>
        <select className={inputCls} value={f.typeId} onChange={e => setF({ ...f, typeId: e.target.value })}>
          {types.map(t => <option key={t.id} value={t.id}>{t.name}{t.est_days ? ` · ~${t.est_days}d` : ''}</option>)}
        </select></div>
      <div><span className={label}>{dict.services.issue}</span>
        <textarea rows={3} className="w-full rounded-btn bg-card p-3.5 text-[14px] outline-none focus:ring-2 focus:ring-volt"
          value={f.issue} onChange={e => setF({ ...f, issue: e.target.value })} /></div>
      <button onClick={submit} disabled={busy || !f.name.trim() || !f.phone.trim()}
        className="pressable flex h-12 w-full items-center justify-center rounded-btn bg-volt font-semibold text-white hover:bg-volt-deep disabled:bg-line disabled:text-muted">
        {busy ? dict.form.placing : dict.services.submit}
      </button>
    </div>
  );
}
