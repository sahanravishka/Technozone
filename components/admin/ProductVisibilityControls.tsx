'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setProductActive, softDeleteProduct } from '@/app/admin/actions';

/**
 * ProductVisibilityControls
 * Publish/Hide toggle + Delete-to-Trash, shown on the product editor.
 * Owner/Manager only (server actions enforce the role too).
 */
export default function ProductVisibilityControls({
  productId,
  isActive,
}: {
  productId: string;
  isActive: boolean;
}) {
  const [active, setActive] = useState(isActive);
  const [confirmDel, setConfirmDel] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState('');
  const router = useRouter();

  if (isActive !== active && !pending) {
    setActive(isActive);
  }

  const toggle = () =>
    start(async () => {
      setErr('');
      try {
        await setProductActive(productId, !active);
        setActive(!active);
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Failed');
      }
    });

  const del = () =>
    start(async () => {
      setErr('');
      try {
        await softDeleteProduct(productId);
        router.push('/admin/products');
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Failed');
      }
    });

  return (
    <div className="admin-card mt-5 p-4 sm:p-5">
      <h3 className="text-[13px] font-bold uppercase tracking-[0.05em] text-muted">
        Visibility
      </h3>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {/* Publish / Hide toggle */}
        <button
          type="button"
          onClick={toggle}
          disabled={pending}
          className={`pressable flex items-center gap-2.5 rounded-xl border px-4 py-2.5 text-[13px] font-semibold transition disabled:opacity-50 ${
            active
              ? 'border-ok/40 bg-ok/10 text-ok'
              : 'border-line bg-paper text-muted'
          }`}
        >
          <span className={`h-2.5 w-2.5 rounded-full ${active ? 'bg-ok' : 'bg-line'}`} />
          {active ? 'Live on website' : 'Hidden from website'}
          <span className="text-[11px] font-normal opacity-70">
            · tap to {active ? 'hide' : 'publish'}
          </span>
        </button>

        {/* Delete to trash */}
        {!confirmDel ? (
          <button
            type="button"
            onClick={() => setConfirmDel(true)}
            disabled={pending}
            className="pressable ml-auto rounded-xl border border-sale/40 bg-sale/5 px-4 py-2.5 text-[13px] font-semibold text-sale transition hover:bg-sale/10 disabled:opacity-50"
          >
            Delete product
          </button>
        ) : (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[12.5px] text-muted">Move to Trash?</span>
            <button
              type="button"
              onClick={del}
              disabled={pending}
              className="pressable rounded-xl bg-sale px-3.5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50"
            >
              {pending ? 'Deleting…' : 'Yes, delete'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDel(false)}
              disabled={pending}
              className="pressable rounded-xl border border-line bg-paper px-3.5 py-2.5 text-[13px] font-semibold text-muted"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      <p className="mt-2 text-[12px] text-muted">
        Hiding keeps everything and removes it from the website. Deleting moves it to Trash —
        order history and warranties stay intact, and you can restore it later.
      </p>

      {err && <p className="mt-2 text-[12.5px] font-semibold text-sale">{err}</p>}
    </div>
  );
}
