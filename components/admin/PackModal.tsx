'use client';

import { useRef, useState, useTransition } from 'react';
import { advanceOrder, dispatchScanSerial, type DispatchScanResult } from '@/app/admin/actions';
import type { AdminOrder } from './OrderCard';
import BarcodeScanner from './BarcodeScanner';

// Pack step: register each warranty device's IMEI/serial (auto-creates the
// warranty + loyalty), then mark the order packed. Packing is blocked until
// every warranty-eligible unit has a scanned serial.
export default function PackModal({ order, onClose }: { order: AdminOrder; onClose: () => void }) {
  const warrantyItems = (order.order_items ?? []).filter(i => (i.warranty_months ?? 0) > 0);
  const required = order.requiredSerials ?? 0;
  const [done, setDone] = useState(order.scannedSerials ?? 0);
  const [variantId, setVariantId] = useState(warrantyItems[0]?.variant_id ?? '');
  const [serial, setSerial] = useState('');
  const [log, setLog] = useState<string[]>([]);
  const [err, setErr] = useState('');
  const [scanning, setScanning] = useState(false);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLInputElement>(null);
  const remaining = Math.max(required - done, 0);

  const submitSerial = (s: string) => {
    s = s.trim();
    if (!s) return;
    setErr(''); setScanning(false);
    start(async () => {
      try {
        const r: DispatchScanResult = await dispatchScanSerial(order.id, s, variantId || null);
        setDone(d => d + 1);
        setLog(l => [`${r.product_name} · ${r.serial_no} → warranty to ${r.warranty_expires_at}${r.coupon_code ? ` · loyalty ${r.discount_pct}% (${r.coupon_code})` : ''}`, ...l]);
        setSerial('');
        ref.current?.focus();
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'scan failed');
      }
    });
  };

  const scan = (e: React.FormEvent) => {
    e.preventDefault();
    submitSerial(serial);
  };

  const pack = () => {
    setErr('');
    start(async () => {
      try { await advanceOrder(order.id, 'packed'); onClose(); }
      catch (e) { setErr(e instanceof Error ? e.message : 'could not pack'); }
    });
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-card p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <b className="text-[15px]">Pack {order.order_number}</b>
          <button onClick={onClose} className="px-1 text-[18px] leading-none text-muted hover:text-ink" aria-label="Close">✕</button>
        </div>

        {required === 0 ? (
          <p className="mt-3 text-[13px] text-muted">No warranty devices in this order — no serial scan needed.</p>
        ) : (
          <>
            <p className="mt-2 text-[12.5px] text-muted">
              Scan each warranty device&apos;s IMEI/serial. <b className="text-ink">{done}/{required}</b> scanned.
            </p>
            <ul className="mt-2 space-y-1 text-[12px]">
              {warrantyItems.map((i, n) => (
                <li key={n} className="flex justify-between">
                  <span>{i.product_name} ×{i.qty}</span>
                  <span className="text-muted">{i.warranty_months} mo warranty</span>
                </li>
              ))}
            </ul>
            {/* Camera scanner overlay */}
            {scanning && (
              <div className="mt-3">
                <BarcodeScanner
                  onScan={submitSerial}
                  onClose={() => setScanning(false)}
                />
              </div>
            )}

            <form onSubmit={scan} className="mt-3 flex flex-wrap items-center gap-2">
              {warrantyItems.length > 1 && (
                <select value={variantId} onChange={e => setVariantId(e.target.value)}
                  className="h-9 rounded-lg bg-paper px-2.5 text-[12.5px] outline-none">
                  {warrantyItems.map((i, n) => <option key={n} value={i.variant_id ?? ''}>{i.product_name}</option>)}
                </select>
              )}
              <input ref={ref} value={serial} onChange={e => setSerial(e.target.value)} autoFocus autoComplete="off"
                placeholder="Type IMEI / serial" className="h-9 w-44 rounded-lg bg-paper px-2.5 text-[12.5px] outline-none focus:ring-2 focus:ring-volt" />
              <button disabled={pending || !serial.trim()}
                className="pressable rounded-lg bg-volt px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50">
                Confirm
              </button>
              {/* Camera scan button */}
              <button type="button" onClick={() => setScanning(s => !s)}
                className={`pressable rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors ${scanning ? 'bg-volt text-white' : 'bg-paper text-muted hover:bg-line'}`}>
                📷 Camera
              </button>
            </form>
            {log.map((l, n) => <p key={n} className="mt-2 rounded-lg bg-[#E8F7EE] px-3 py-1.5 text-[11.5px] text-ok">{l}</p>)}
          </>
        )}

        {err && <p className="mt-3 rounded-lg bg-sale/10 px-3 py-2 text-[12px] font-medium text-sale">{err}</p>}

        <button onClick={pack} disabled={pending || remaining > 0}
          className="pressable mt-4 flex h-11 w-full items-center justify-center rounded-btn bg-ink font-semibold text-white disabled:bg-line disabled:text-muted">
          {remaining > 0 ? `Scan ${remaining} more to pack` : 'Mark packed'}
        </button>
      </div>
    </div>
  );
}
