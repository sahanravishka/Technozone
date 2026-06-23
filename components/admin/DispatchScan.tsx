'use client';
import { useRef, useState, useTransition } from 'react';
import { dispatchScanSerial, type DispatchScanResult } from '@/app/admin/actions';

type Item = { variant_id: string | null; product_name: string; variant_name: string | null };

const inp = 'h-9 rounded-lg bg-paper px-2.5 text-[12.5px] outline-none focus:ring-2 focus:ring-volt';

// Dispatch desk: pick the line being packed, scan/key its serial, submit.
// A hardware barcode scanner just types the serial then Enter -> submits.
export default function DispatchScan({ orderId, items }: { orderId: string; items: Item[] }) {
  const [pending, start] = useTransition();
  const [variantId, setVariantId] = useState(items[0]?.variant_id ?? '');
  const [serial, setSerial] = useState('');
  const [done, setDone] = useState<DispatchScanResult[]>([]);
  const [err, setErr] = useState('');
  const serialRef = useRef<HTMLInputElement>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const s = serial.trim();
    if (!s) return;
    setErr('');
    start(async () => {
      try {
        const res = await dispatchScanSerial(orderId, s, variantId || null);
        setDone(d => [res, ...d]);
        setSerial('');
        serialRef.current?.focus();   // ready for the next scan
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'scan failed');
      }
    });
  };

  return (
    <div className="mt-3 border-t border-line pt-3">
      <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
        <span className="text-[11.5px] font-semibold text-muted">Scan serial →</span>
        {items.length > 1 && (
          <select value={variantId} onChange={e => setVariantId(e.target.value)} className={inp}>
            {items.map((it, i) => (
              <option key={i} value={it.variant_id ?? ''}>
                {it.product_name}{it.variant_name && it.variant_name !== 'Default' ? ` (${it.variant_name})` : ''}
              </option>
            ))}
          </select>
        )}
        <input ref={serialRef} value={serial} onChange={e => setSerial(e.target.value)} autoComplete="off"
          placeholder="Serial / IMEI" className={`${inp} w-44`} />
        <button disabled={pending || !serial.trim()}
          className="pressable rounded-lg bg-volt px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50">
          {pending ? 'Registering…' : 'Register'}
        </button>
      </form>

      {err && <p className="mt-2 text-[11.5px] font-semibold text-sale">{err}</p>}

      {done.map((r, i) => (
        <div key={i} className="mt-2 rounded-lg bg-[#E8F7EE] px-3 py-2 text-[11.5px] text-ok">
          <b>{r.product_name}</b> · {r.serial_no} — warranty until <b>{r.warranty_expires_at}</b> ({r.period_months} mo)
          {r.coupon_code
            ? <> · loyalty discount <b>{r.discount_pct}%</b> activated → code <b>{r.coupon_code}</b></>
            : <> · no loyalty discount (new customer)</>}
        </div>
      ))}
    </div>
  );
}
