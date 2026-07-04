'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { imageUrl } from '@/lib/supabase';
import { upsertBanner, toggleBannerActive, moveBanner, deleteBanner } from '@/app/admin/(panel)/banners/actions';

type Banner = {
  id: string; title: string; subtitle: string | null; badge_text: string | null;
  link_url: string | null; image_path: string | null; is_active: boolean;
};

const inp = 'h-10 w-full rounded-lg bg-paper px-3 text-[12.5px] font-medium outline-none focus:ring-2 focus:ring-volt';
const lbl = 'mb-1 block text-[10.5px] font-bold uppercase tracking-[0.05em] text-muted';

export default function BannerRow({
  banner, isFirst, isLast,
}: { banner: Banner; isFirst: boolean; isLast: boolean }) {
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
          form.set('id', banner.id);
          try { await upsertBanner(form); router.refresh(); setEditing(false); }
          catch (e) { setErr(e instanceof Error ? e.message : 'Failed'); }
        }}
        className="border-t border-line/70 bg-paper/60 p-4"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={lbl} htmlFor={`ban-title-${banner.id}`}>Title</label>
            <input id={`ban-title-${banner.id}`} name="title" defaultValue={banner.title} required className={inp} />
          </div>
          <div>
            <label className={lbl} htmlFor={`ban-badge-${banner.id}`}>Badge (small tag, optional)</label>
            <input id={`ban-badge-${banner.id}`} name="badge_text" defaultValue={banner.badge_text ?? ''} className={inp} />
          </div>
          <div className="sm:col-span-2">
            <label className={lbl} htmlFor={`ban-subtitle-${banner.id}`}>Subtitle</label>
            <input id={`ban-subtitle-${banner.id}`} name="subtitle" defaultValue={banner.subtitle ?? ''} className={inp} />
          </div>
          <div>
            <label className={lbl} htmlFor={`ban-link-${banner.id}`}>Link URL (optional)</label>
            <input id={`ban-link-${banner.id}`} name="link_url" defaultValue={banner.link_url ?? ''} placeholder="/en/category/..." className={inp} />
          </div>
          <div>
            <label className={lbl} htmlFor={`ban-image-${banner.id}`}>Image</label>
            <input id={`ban-image-${banner.id}`} name="image" type="file" accept="image/*" className={`${inp} pt-1.5`} />
          </div>
        </div>
        <label className="mt-3 flex items-center gap-2 text-[12.5px] font-medium">
          <input type="checkbox" name="is_active" defaultChecked={banner.is_active} className="h-4 w-4 rounded accent-volt" />
          Visible on the homepage
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
      <span className="relative h-11 w-16 shrink-0 overflow-hidden rounded-lg bg-[#F0F3F8]">
        {banner.image_path && <Image src={imageUrl(banner.image_path)} alt="" fill sizes="64px" className="object-cover" />}
      </span>
      <div className="min-w-0 flex-1">
        <b className="block truncate font-semibold">{banner.title}</b>
        <span className="truncate text-[11.5px] text-muted">{banner.subtitle || banner.link_url || '—'}</span>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button onClick={() => run(() => moveBanner(banner.id, 'up'))} disabled={isFirst || pending}
          title="Move up" aria-label={`Move ${banner.title} up`} className="pressable grid h-8 w-8 place-items-center rounded-lg bg-paper text-muted hover:bg-line disabled:opacity-30">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 15 12 9 6 15" /></svg>
        </button>
        <button onClick={() => run(() => moveBanner(banner.id, 'down'))} disabled={isLast || pending}
          title="Move down" aria-label={`Move ${banner.title} down`} className="pressable grid h-8 w-8 place-items-center rounded-lg bg-paper text-muted hover:bg-line disabled:opacity-30">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="m6 9 6 6 6-6" /></svg>
        </button>
      </div>

      <button onClick={() => run(() => toggleBannerActive(banner.id, !banner.is_active))} disabled={pending}
        className={`pressable rounded-lg px-3 py-1.5 text-[11.5px] font-semibold ${banner.is_active ? 'bg-[#E8F7EE] text-ok' : 'bg-paper text-muted'}`}>
        {banner.is_active ? 'Visible' : 'Hidden'}
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
          <button onClick={() => run(() => deleteBanner(banner.id))} disabled={pending}
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
