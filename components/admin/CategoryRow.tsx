'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { imageUrl } from '@/lib/supabase';
import { upsertCategory, toggleCategoryActive, moveCategory, deleteCategory } from '@/app/admin/(panel)/categories/actions';

type Category = {
  id: string; name: string; slug: string; parent_id: string | null;
  sort_order: number; is_active: boolean; image_path: string | null;
};

const inp = 'h-10 w-full rounded-lg bg-paper px-3 text-[12.5px] font-medium outline-none focus:ring-2 focus:ring-volt';
const lbl = 'mb-1 block text-[10.5px] font-bold uppercase tracking-[0.05em] text-muted';

export default function CategoryRow({
  category, categories, isFirst, isLast, productCount,
}: {
  category: Category;
  categories: Category[];
  isFirst: boolean;
  isLast: boolean;
  productCount: number;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState('');
  const router = useRouter();

  const run = (fn: () => Promise<void>) =>
    start(async () => {
      setErr('');
      try { await fn(); router.refresh(); }
      catch (e) { setErr(e instanceof Error ? e.message : 'Failed'); }
    });

  if (editing) {
    return (
      <form
        action={async (form) => {
          setErr('');
          form.set('id', category.id);
          try { await upsertCategory(form); router.refresh(); setEditing(false); }
          catch (e) { setErr(e instanceof Error ? e.message : 'Failed'); }
        }}
        className="border-t border-line/70 bg-paper/60 p-4"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={lbl} htmlFor={`cat-name-${category.id}`}>Name</label>
            <input id={`cat-name-${category.id}`} name="name" defaultValue={category.name} required className={inp} />
          </div>
          <div>
            <label className={lbl} htmlFor={`cat-slug-${category.id}`}>URL slug</label>
            <input id={`cat-slug-${category.id}`} name="slug" defaultValue={category.slug} className={inp} />
          </div>
          <div>
            <label className={lbl} htmlFor={`cat-parent-${category.id}`}>Parent category</label>
            <select id={`cat-parent-${category.id}`} name="parent_id" defaultValue={category.parent_id ?? ''} className={inp}>
              <option value="">— None (top level) —</option>
              {categories.filter(c => c.id !== category.id).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={lbl} htmlFor={`cat-image-${category.id}`}>Tile / banner image</label>
            <input id={`cat-image-${category.id}`} name="image" type="file" accept="image/*" className={`${inp} pt-1.5`} />
          </div>
        </div>
        <label className="mt-3 flex items-center gap-2 text-[12.5px] font-medium">
          <input type="checkbox" name="is_active" defaultChecked={category.is_active} className="h-4 w-4 rounded accent-volt" />
          Visible on the storefront
        </label>
        {err && <p className="mt-2 text-[12px] font-semibold text-sale">{err}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={() => setEditing(false)}
            className="pressable rounded-lg border border-line bg-card px-4 py-2 text-[12.5px] font-semibold text-muted">
            Cancel
          </button>
          <button className="pressable rounded-lg bg-volt px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-volt-deep">
            Save
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-3 border-t border-line/70 px-4 py-3 text-[13px]">
      <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[#F0F3F8]">
        {category.image_path && <Image src={imageUrl(category.image_path)} alt="" fill sizes="40px" className="object-cover" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {category.parent_id && <span className="text-muted">↳</span>}
          <b className="truncate font-semibold">{category.name}</b>
          <span className="shrink-0 text-[11.5px] text-muted">/{category.slug}</span>
        </div>
        <span className="text-[11.5px] text-muted">{productCount} product{productCount === 1 ? '' : 's'}</span>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button onClick={() => run(() => moveCategory(category.id, 'up'))} disabled={isFirst || pending}
          title="Move up" aria-label={`Move ${category.name} up`} className="pressable grid h-8 w-8 place-items-center rounded-lg bg-paper text-muted hover:bg-line disabled:opacity-30">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 15 12 9 6 15" /></svg>
        </button>
        <button onClick={() => run(() => moveCategory(category.id, 'down'))} disabled={isLast || pending}
          title="Move down" aria-label={`Move ${category.name} down`} className="pressable grid h-8 w-8 place-items-center rounded-lg bg-paper text-muted hover:bg-line disabled:opacity-30">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="m6 9 6 6 6-6" /></svg>
        </button>
      </div>

      <button onClick={() => run(() => toggleCategoryActive(category.id, !category.is_active))} disabled={pending}
        className={`pressable rounded-lg px-3 py-1.5 text-[11.5px] font-semibold ${category.is_active ? 'bg-[#E8F7EE] text-ok' : 'bg-paper text-muted'}`}>
        {category.is_active ? 'Visible' : 'Hidden'}
      </button>

      <button onClick={() => setEditing(true)}
        className="pressable rounded-lg border border-line bg-card px-3 py-1.5 text-[11.5px] font-semibold hover:bg-paper">
        Edit
      </button>

      {!confirmDelete ? (
        <button onClick={() => setConfirmDelete(true)} disabled={pending}
          className="pressable rounded-lg border border-sale/40 bg-sale/5 px-3 py-1.5 text-[11.5px] font-semibold text-sale">
          Delete
        </button>
      ) : (
        <>
          <button onClick={() => run(() => deleteCategory(category.id))} disabled={pending}
            className="pressable rounded-lg bg-sale px-3 py-1.5 text-[11.5px] font-semibold text-white">
            {pending ? '…' : 'Confirm'}
          </button>
          <button onClick={() => setConfirmDelete(false)} disabled={pending}
            className="pressable rounded-lg border border-line bg-paper px-3 py-1.5 text-[11.5px] font-semibold text-muted">
            Cancel
          </button>
        </>
      )}
      {err && <span className="max-w-[200px] text-[11px] font-semibold text-sale">{err}</span>}
    </div>
  );
}
