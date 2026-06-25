'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { restoreProduct, purgeProduct } from '@/app/admin/actions';

/** Restore / permanently-delete buttons for a trashed product row. */
export default function TrashRowActions({
  productId,
  canPurge,
}: {
  productId: string;
  canPurge: boolean;
}) {
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const [err, setErr] = useState('');
  const router = useRouter();

  const run = (fn: () => Promise<void>) =>
    start(async () => {
      setErr('');
      try {
        await fn();
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Failed');
      }
    });

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <button
          onClick={() => run(() => restoreProduct(productId))}
          disabled={pending}
          className="pressable rounded-lg border border-ok/40 bg-ok/10 px-3 py-1.5 text-[12px] font-semibold text-ok disabled:opacity-50"
        >
          Restore
        </button>

        {canPurge &&
          (!confirm ? (
            <button
              onClick={() => setConfirm(true)}
              disabled={pending}
              className="pressable rounded-lg border border-sale/40 bg-sale/5 px-3 py-1.5 text-[12px] font-semibold text-sale disabled:opacity-50"
            >
              Delete forever
            </button>
          ) : (
            <>
              <button
                onClick={() => run(() => purgeProduct(productId))}
                disabled={pending}
                className="pressable rounded-lg bg-sale px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50"
              >
                {pending ? 'Deleting…' : 'Confirm'}
              </button>
              <button
                onClick={() => setConfirm(false)}
                disabled={pending}
                className="pressable rounded-lg border border-line bg-paper px-3 py-1.5 text-[12px] font-semibold text-muted"
              >
                Cancel
              </button>
            </>
          ))}
      </div>
      {err && <span className="max-w-[260px] text-right text-[11px] font-semibold text-sale">{err}</span>}
    </div>
  );
}
