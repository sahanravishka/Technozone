'use client';

import { useState, useTransition } from 'react';
import { voidWarranty } from '@/app/admin/actions';

type W = {
  id: string; product_name: string; serial_no: string;
  customer_name: string | null; customer_phone: string;
  expires_at: string; status: string;
};

export default function WarrantyRow({ w }: { w: W }) {
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const isActive = w.status === 'active' && new Date(w.expires_at) >= new Date();
  const isVoid   = w.status === 'void';
  const isExpired = !isVoid && !isActive;

  const statusBadge = isVoid
    ? { label: 'Void',    bg: '#F3F4F6', color: '#6B7280' }
    : isActive
    ? { label: 'Active ✓', bg: '#D1FAE5', color: '#065F46' }
    : { label: 'Expired',  bg: '#FEF3C7', color: '#92400E' };

  const expiryDate = new Date(w.expires_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <div className="admin-card overflow-hidden">
      <div className="flex flex-wrap items-start gap-3 px-4 py-4">
        {/* Icon */}
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-paper text-muted">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2 4 5v6c0 5 3.4 8.5 8 11 4.6-2.5 8-6 8-11V5z" />
          </svg>
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14.5px] font-bold">{w.product_name}</span>
            <span className="rounded-lg px-2.5 py-0.5 text-[11.5px] font-bold"
              style={{ background: statusBadge.bg, color: statusBadge.color }}>
              {statusBadge.label}
            </span>
          </div>
          <p className="mt-0.5 font-mono text-[12.5px] text-muted">{w.serial_no}</p>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[12.5px] text-muted">
            <span>{w.customer_name ?? '—'}</span>
            <span>{w.customer_phone}</span>
            <span>{isExpired ? 'Expired' : 'Expires'}: <b className={isActive ? 'text-ok' : 'text-ink'}>{expiryDate}</b></span>
          </div>
        </div>

        {/* Void button */}
        {w.status === 'active' && (
          <button
            onClick={async () => {
              if (!confirm) { setConfirm(true); return; }
              start(() => voidWarranty(w.id));
            }}
            onBlur={() => setConfirm(false)}
            disabled={pending}
            className={`pressable shrink-0 rounded-lg px-3 py-1.5 text-[11.5px] font-semibold transition-colors disabled:opacity-40 ${
              confirm ? 'bg-[#FEE2E2] text-sale' : 'bg-paper text-muted hover:bg-line'
            }`}
          >
            {confirm ? 'Confirm void?' : 'Void'}
          </button>
        )}
      </div>
    </div>
  );
}
