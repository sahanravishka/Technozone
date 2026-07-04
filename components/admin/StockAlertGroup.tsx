'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { stockNotifyLink } from '@/lib/whatsapp';
import { markNotified, deleteStockRequest } from '@/app/admin/(panel)/stock-alerts/actions';

type Req = { id: string; phone: string; created_at: string };

export default function StockAlertGroup({ productName, requests }: { productName: string; requests: Req[] }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  const run = (fn: () => Promise<void>) => start(async () => { await fn(); router.refresh(); });

  return (
    <div className="admin-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-line bg-paper/60 px-4 py-3">
        <div>
          <b className="text-[13.5px] font-bold">{productName}</b>
          <span className="ml-2 text-[12px] text-muted">{requests.length} waiting</span>
        </div>
        <button disabled={pending}
          onClick={() => run(() => markNotified(requests.map(r => r.id)))}
          className="pressable rounded-lg bg-[#E8F7EE] px-3 py-1.5 text-[12px] font-semibold text-ok disabled:opacity-50">
          Mark all notified
        </button>
      </div>
      <div className="divide-y divide-line/70">
        {requests.map(r => (
          <div key={r.id} className="flex items-center gap-3 px-4 py-3 text-[13px]">
            <span className="flex-1 font-medium">{r.phone}</span>
            <span className="text-[11.5px] text-muted">{new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
            <a href={stockNotifyLink(r.phone, productName)} target="_blank" rel="noopener noreferrer"
              onClick={() => run(() => markNotified([r.id]))}
              className="pressable rounded-lg bg-[#25D366]/10 px-3 py-1.5 text-[12px] font-semibold text-[#1FAF5E] hover:bg-[#25D366]/20">
              WhatsApp
            </a>
            <button disabled={pending} onClick={() => run(() => deleteStockRequest(r.id))}
              className="pressable rounded-lg border border-line bg-card px-3 py-1.5 text-[12px] font-semibold text-muted hover:bg-paper">
              Dismiss
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
