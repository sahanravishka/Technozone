'use client';

import { useState } from 'react';
import { waLink } from '@/lib/site';
import { requestStockNotify } from '@/app/[locale]/product/actions';

export default function NotifyMeForm({ productId, variantId, productName }:
  { productId: string; variantId: string | null; productName: string }) {
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.trim().length < 7) return;
    setBusy(true);
    const res = await requestStockNotify({ productId, variantId, productName, phone });
    setBusy(false);
    if (res.ok) setDone(true);
  };

  if (done) {
    return (
      <div className="btn-notify flex h-11 items-center justify-center gap-2 px-6 text-[14px]">
        ✓ We&apos;ll text you the moment it&apos;s back.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <form onSubmit={submit} className="flex gap-2">
        <input value={phone} onChange={e => setPhone(e.target.value)} inputMode="tel"
          placeholder="07X XXX XXXX" required aria-label="Phone number"
          className="h-11 min-w-0 flex-1 rounded-xl bg-card px-3.5 text-[14px] font-medium outline-none focus:ring-2 focus:ring-volt" />
        <button type="submit" disabled={busy}
          className="btn-notify flex h-11 shrink-0 items-center justify-center gap-2 px-5 text-[14px] disabled:opacity-60">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {busy ? 'Saving…' : 'Notify me'}
        </button>
      </form>
      <a href={waLink(`Hi! Please notify me when "${productName}" is back in stock.`)}
        target="_blank" rel="noopener noreferrer"
        className="block text-center text-[12.5px] font-semibold text-volt hover:underline">
        or ask us on WhatsApp
      </a>
    </div>
  );
}
