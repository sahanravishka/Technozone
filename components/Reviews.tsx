'use client';

import { useState } from 'react';
import type { Review } from '@/lib/types';
import type { Dict } from '@/lib/i18n/dictionaries';
import { submitReview } from '@/app/[locale]/product/actions';

function Stars({ n, size = 13 }: { n: number; size?: number }) {
  return (
    <span className="stars" style={{ fontSize: size }} aria-label={`${n} out of 5`}>
      {'★★★★★'.slice(0, n)}<span className="text-line">{'★★★★★'.slice(n)}</span>
    </span>
  );
}

export default function Reviews({ productId, reviews, dict, ratingAvg, ratingCount }:
  { productId: string; reviews: Review[]; dict: Dict; ratingAvg: number; ratingCount: number }) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState(reviews);
  const [form, setForm] = useState({ name: '', rating: 5, title: '', body: '' });
  const [done, setDone] = useState<null | { verified?: boolean }>(null);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setBusy(true);
    const res = await submitReview({
      productId, authorName: form.name, rating: form.rating, title: form.title, body: form.body
    });
    setBusy(false);
    if (res.ok) {
      setDone({ verified: res.verified });
      if (res.verified) {
        setList([{
          id: 'tmp', product_id: productId, author_name: form.name, rating: form.rating,
          title: form.title || null, body: form.body || null, is_verified: true, by_staff: false,
          status: 'published', created_at: new Date().toISOString()
        }, ...list]);
      }
    }
  };

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold md:text-xl">{dict.sections.reviews}</h2>
        <button onClick={() => setOpen(o => !o)}
          className="pressable rounded-full bg-card px-4 py-2 text-[13px] font-semibold hover:bg-line/60">
          {dict.sections.writeReview}
        </button>
      </div>

      {ratingCount > 0 && (
        <div className="mb-5 flex items-center gap-3 rounded-2xl bg-card p-4">
          <span className="text-3xl font-extrabold">{ratingAvg.toFixed(1)}</span>
          <div>
            <Stars n={Math.round(ratingAvg)} size={15} />
            <p className="mt-0.5 text-[12px] text-muted">{ratingCount} review{ratingCount === 1 ? '' : 's'}</p>
          </div>
        </div>
      )}

      {open && (
        <div className="mb-5 rounded-2xl bg-card p-5">
          {done ? (
            <p className="text-[14px] font-semibold text-ok">
              {done.verified ? 'Thanks! Your review is live. ✓' : 'Thanks! Your review will appear once approved.'}
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => setForm({ ...form, rating: n })} aria-label={`${n} stars`}
                    className="text-2xl" style={{ color: n <= form.rating ? 'var(--warn)' : 'var(--line)' }}>★</button>
                ))}
              </div>
              <input placeholder="Your name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="h-11 w-full rounded-xl bg-paper px-3.5 text-[14px] outline-none focus:ring-2 focus:ring-volt" />
              <input placeholder="Title (optional)" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                className="h-11 w-full rounded-xl bg-paper px-3.5 text-[14px] outline-none focus:ring-2 focus:ring-volt" />
              <textarea placeholder="Share your experience…" rows={3} value={form.body} onChange={e => setForm({ ...form, body: e.target.value })}
                className="w-full rounded-xl bg-paper p-3.5 text-[14px] outline-none focus:ring-2 focus:ring-volt" />
              <button onClick={send} disabled={busy || !form.name.trim()}
                className="pressable h-11 rounded-btn bg-volt px-6 text-[14px] font-semibold text-white hover:bg-volt-deep disabled:bg-line disabled:text-muted">
                {dict.sections.writeReview}
              </button>
            </div>
          )}
        </div>
      )}

      {list.length === 0 ? (
        <p className="rounded-2xl bg-card p-6 text-center text-[13.5px] text-muted">No reviews yet — be the first!</p>
      ) : (
        <ul className="space-y-3">
          {list.map(r => (
            <li key={r.id} className="rounded-2xl bg-card p-4">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-semibold">{r.author_name}</span>
                {r.is_verified && (
                  <span className="rounded-md bg-[#E8F7EE] px-2 py-0.5 text-[10.5px] font-semibold text-ok">Verified purchase</span>
                )}
                {r.by_staff && (
                  <span className="rounded-md bg-volt-soft px-2 py-0.5 text-[10.5px] font-semibold text-volt">Shop</span>
                )}
              </div>
              <div className="mt-1"><Stars n={r.rating} /></div>
              {r.title && <p className="mt-1.5 text-[14px] font-semibold">{r.title}</p>}
              {r.body && <p className="mt-0.5 text-[13.5px] leading-relaxed text-muted">{r.body}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
