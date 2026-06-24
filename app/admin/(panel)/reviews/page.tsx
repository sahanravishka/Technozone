import { getServerSupabase } from '@/lib/supabase-clients/server';
import { moderateReview, deleteReview, addStaffReview } from '@/app/admin/actions';
import ReviewModActions from '@/components/admin/ReviewModActions';
import PageHeader from '@/components/admin/PageHeader';

export const dynamic = 'force-dynamic';

const inp = 'h-11 w-full rounded-xl bg-paper px-3.5 text-[13px] font-medium outline-none focus:ring-2 focus:ring-volt';
const lbl = 'mb-1.5 block text-[11.5px] font-bold uppercase tracking-[0.05em] text-muted';

const Stars = ({ n }: { n: number }) => (
  <span className="text-[14px] tracking-wide text-warn" aria-label={`${n} stars`}>
    {'★'.repeat(n)}<span className="text-line">{'★'.repeat(5 - n)}</span>
  </span>
);

export default async function AdminReviews() {
  const supabase = (await getServerSupabase())!;
  const [{ data: pending }, { data: published }, { data: products }] = await Promise.all([
    supabase
      .from('reviews')
      .select('id, product_id, author_name, rating, title, body, is_verified, by_staff, created_at, products(name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
    supabase
      .from('reviews')
      .select('id, product_id, author_name, rating, title, body, is_verified, by_staff, created_at, products(name)')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.from('products').select('id, name').eq('is_active', true).order('name'),
  ]);

  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader title="Reviews" subtitle="Approve customer reviews and post on their behalf" />

      {/* ── Pending queue ── */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-[15px] font-bold">
          Awaiting approval
          {(pending?.length ?? 0) > 0 && (
            <span className="rounded-full bg-warn-soft px-2.5 py-0.5 text-[12px] font-bold text-warn">
              {pending!.length}
            </span>
          )}
        </h2>
        <div className="space-y-2.5">
          {(pending ?? []).map(r => (
            <div key={r.id} className="admin-card overflow-hidden">
              <div className="px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[14px] font-bold">{r.author_name}</p>
                    <p className="text-[12px] text-muted">{(r.products as { name?: string })?.name}</p>
                    <div className="mt-1"><Stars n={r.rating} /></div>
                  </div>
                  <ReviewModActions id={r.id} />
                </div>
                {r.title && <p className="mt-2 text-[13.5px] font-semibold">{r.title}</p>}
                {r.body  && <p className="mt-1 text-[13px] text-muted leading-relaxed">{r.body}</p>}
              </div>
            </div>
          ))}
          {!pending?.length && (
            <div className="admin-card p-8 text-center text-[13px] text-muted">
              ✓ No reviews waiting for approval
            </div>
          )}
        </div>
      </section>

      {/* ── Post a review on behalf of customer ── */}
      <section>
        <h2 className="mb-3 text-[15px] font-bold">Add a review for a customer</h2>
        <div className="admin-card overflow-hidden">
          <div className="border-b border-line bg-paper/60 px-5 py-3.5">
            <p className="text-[12.5px] text-muted">Use this when a customer gives feedback in person or by WhatsApp — post it on their behalf.</p>
          </div>
          <form action={addStaffReview} className="p-5 space-y-3">
            <div>
              <label className={lbl}>Product</label>
              <select name="product_id" required className={inp}>
                <option value="">— Choose a product —</option>
                {(products ?? []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={lbl}>Customer name</label>
                <input name="author_name" required placeholder="e.g. Kamal Perera" className={inp} />
              </div>
              <div>
                <label className={lbl}>Star rating</label>
                <select name="rating" className={inp}>
                  <option value="5">★★★★★ Excellent (5 stars)</option>
                  <option value="4">★★★★☆ Good (4 stars)</option>
                  <option value="3">★★★☆☆ Average (3 stars)</option>
                  <option value="2">★★☆☆☆ Poor (2 stars)</option>
                  <option value="1">★☆☆☆☆ Terrible (1 star)</option>
                </select>
              </div>
            </div>
            <div>
              <label className={lbl}>Review title (optional)</label>
              <input name="title" placeholder="e.g. Great phone, fast delivery" className={inp} />
            </div>
            <div>
              <label className={lbl}>Review text (optional)</label>
              <textarea name="body" rows={3} placeholder="What did the customer say?"
                className="w-full resize-y rounded-xl bg-paper p-3.5 text-[13px] font-medium outline-none focus:ring-2 focus:ring-volt" />
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] font-semibold">
              <input type="checkbox" name="verified" className="h-4 w-4 accent-volt" />
              Mark as verified purchase
            </label>
            <div className="flex justify-end border-t border-line pt-3">
              <button className="pressable h-10 rounded-xl bg-volt px-6 text-[13px] font-semibold text-white hover:bg-volt-deep">
                Publish review
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* ── Published ── */}
      {(published?.length ?? 0) > 0 && (
        <section>
          <h2 className="mb-3 text-[15px] font-bold">Published ({published!.length})</h2>
          <div className="space-y-2.5">
            {published!.map(r => (
              <div key={r.id} className="admin-card overflow-hidden">
                <div className="px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[14px] font-bold">{r.author_name}</p>
                        {r.is_verified && (
                          <span className="rounded-md bg-[#E8F7EE] px-2 py-0.5 text-[10.5px] font-semibold text-ok">✓ Verified</span>
                        )}
                        {r.by_staff && (
                          <span className="rounded-md bg-volt-soft px-2 py-0.5 text-[10.5px] font-semibold text-volt">Shop</span>
                        )}
                      </div>
                      <p className="text-[12px] text-muted">{(r.products as { name?: string })?.name}</p>
                      <div className="mt-1"><Stars n={r.rating} /></div>
                    </div>
                    <ReviewModActions id={r.id} published />
                  </div>
                  {r.body && <p className="mt-2 text-[13px] text-muted">{r.body}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
