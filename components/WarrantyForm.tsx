'use client';
import { useState } from 'react';
import type { Dict } from '@/lib/i18n/dictionaries';
import type { Warranty } from '@/lib/types';
import { checkWarranty } from '@/app/[locale]/warranty/actions';

export default function WarrantyForm({ dict }: { dict: Dict }) {
  const [serial, setSerial] = useState('');
  const [last4, setLast4] = useState('');
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<'idle' | Warranty[]>('idle');
  const inputCls = 'h-12 w-full rounded-btn bg-card px-3.5 text-[14px] font-medium outline-none focus:ring-2 focus:ring-volt';

  const go = async () => {
    setBusy(true);
    const r = await checkWarranty(serial, last4);
    setBusy(false); setRes(r as Warranty[]);
  };

  return (
    <div className="space-y-3">
      <input className={inputCls} placeholder={dict.warranty.serial} value={serial} onChange={e => setSerial(e.target.value)} />
      <p className="text-center text-[12px] text-muted">— or —</p>
      <input className={inputCls} placeholder={dict.warranty.last4} value={last4} inputMode="numeric" maxLength={4}
        onChange={e => setLast4(e.target.value.replace(/\D/g, '').slice(0, 4))} />
      <button onClick={go} disabled={busy || (!serial && last4.length !== 4)}
        className="pressable flex h-12 w-full items-center justify-center rounded-btn bg-volt font-semibold text-white hover:bg-volt-deep disabled:bg-line disabled:text-muted">
        {dict.warranty.check}
      </button>

      {res !== 'idle' && (res.length === 0 ? (
        <p className="rounded-2xl bg-sale/10 p-4 text-center text-[13.5px] font-medium text-sale">{dict.warranty.none}</p>
      ) : (
        <ul className="space-y-2">
          {res.map((w, i) => (
            <li key={i} className="rounded-2xl bg-card p-4">
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-bold">{w.product_name}</span>
                <span className={`rounded-lg px-2.5 py-1 text-[11.5px] font-semibold ${w.active ? 'bg-[#E8F7EE] text-ok' : 'bg-sale/10 text-sale'}`}>
                  {w.active ? dict.warranty.active : dict.warranty.expired}
                </span>
              </div>
              <p className="mt-1 text-[12.5px] text-muted">{w.serial_no}</p>
              <p className="mt-1 text-[13px]">{dict.warranty.expires}: <b>{w.expires_at}</b></p>
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}
