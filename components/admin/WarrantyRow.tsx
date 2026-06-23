'use client';
import { useTransition } from 'react';
import { voidWarranty } from '@/app/admin/actions';

type W = { id: string; product_name: string; serial_no: string; customer_name: string | null;
  customer_phone: string; expires_at: string; status: string };

export default function WarrantyRow({ w }: { w: W }) {
  const [pending, start] = useTransition();
  const active = w.status === 'active' && new Date(w.expires_at) >= new Date();
  return (
    <tr className="border-b border-[#F2F5F9] last:border-0">
      <td className="px-4 py-3 font-medium">{w.product_name}</td>
      <td className="px-4 py-3">{w.serial_no}</td>
      <td className="px-4 py-3">{w.customer_name ?? '—'}<br /><span className="text-[11.5px] text-muted">{w.customer_phone}</span></td>
      <td className="px-4 py-3">{w.expires_at}</td>
      <td className="px-4 py-3">
        <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${active ? 'bg-[#E8F7EE] text-ok' : 'bg-paper text-muted'}`}>
          {w.status === 'void' ? 'Void' : active ? 'Active' : 'Expired'}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        {w.status === 'active' && (
          <button onClick={() => { if (confirm('Void this warranty?')) start(() => voidWarranty(w.id)); }}
            disabled={pending} className="pressable rounded-lg bg-sale/10 px-2.5 py-1.5 text-[11.5px] font-semibold text-sale disabled:opacity-50">Void</button>
        )}
      </td>
    </tr>
  );
}
