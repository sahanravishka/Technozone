'use client';
import { useTransition } from 'react';
import { moderateReview, deleteReview } from '@/app/admin/actions';

export default function ReviewModActions({ id, published }: { id: string; published?: boolean }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex shrink-0 gap-1.5">
      {!published && (
        <button onClick={() => start(() => moderateReview(id, 'published'))} disabled={pending}
          className="pressable rounded-lg bg-[#E8F7EE] px-3 py-1.5 text-[12px] font-semibold text-ok disabled:opacity-50">Approve</button>
      )}
      {published && (
        <button onClick={() => start(() => moderateReview(id, 'hidden'))} disabled={pending}
          className="pressable rounded-lg bg-paper px-3 py-1.5 text-[12px] font-semibold disabled:opacity-50">Hide</button>
      )}
      <button onClick={() => { if (confirm('Delete this review?')) start(() => deleteReview(id)); }} disabled={pending}
        className="pressable rounded-lg bg-sale/10 px-3 py-1.5 text-[12px] font-semibold text-sale disabled:opacity-50">Delete</button>
    </div>
  );
}
