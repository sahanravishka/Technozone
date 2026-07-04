'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { formatLKR } from '@/lib/site';
import { abandonedCartLink } from '@/lib/whatsapp';
import { dismissAbandonedCart } from '@/app/admin/(panel)/abandoned-carts/actions';

type Row = {
  id: string; name: string | null; phone: string; email: string | null;
  items: { name: string; qty: number; price: number }[]; subtotal: number; updated_at: string;
};

function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function AbandonedCartRow({ row }: { row: Row }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <div className="flex items-start gap-3 border-t border-line/70 px-4 py-3.5 text-[13px] first:border-t-0">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <b className="font-semibold">{row.name || 'Unnamed'}</b>
          <span className="text-muted">{row.phone}</span>
          <span className="text-[11.5px] text-muted">· {timeAgo(row.updated_at)}</span>
        </div>
        <p className="mt-1 truncate text-[12.5px] text-muted">
          {row.items.map(i => `${i.name} ×${i.qty}`).join(', ')}
        </p>
      </div>
      <span className="shrink-0 pt-0.5 font-bold">{formatLKR(row.subtotal)}</span>
      <div className="flex shrink-0 items-center gap-2">
        <a href={abandonedCartLink(row.phone, row.name, row.items)} target="_blank" rel="noopener noreferrer"
          className="pressable rounded-lg bg-[#25D366]/10 px-3 py-1.5 text-[12px] font-semibold text-[#1FAF5E] hover:bg-[#25D366]/20">
          WhatsApp
        </a>
        <button disabled={pending}
          onClick={() => start(async () => { await dismissAbandonedCart(row.id); router.refresh(); })}
          className="pressable rounded-lg border border-line bg-card px-3 py-1.5 text-[12px] font-semibold text-muted hover:bg-paper">
          Dismiss
        </button>
      </div>
    </div>
  );
}
