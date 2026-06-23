import { getServerSupabase } from '@/lib/supabase-clients/server';
import { moderateReview, deleteReview, addStaffReview } from '@/app/admin/actions';
import ReviewModActions from '@/components/admin/ReviewModActions';

export const dynamic = 'force-dynamic';

export default async function AdminReviews() {
  const supabase = (await getServerSupabase())!;
  const [{ data: pending }, { data: published }, { data: products }] = await Promise.all([
    supabase.from('reviews').select('id, product_id, author_name, rating, title, body, is_verified, by_staff, created_at, products(name)')
      .eq('status', 'pending').order('created_at', { ascending: false }),
    supabase.from('reviews').select('id, product_id, author_name, rating, title, body, is_verified, by_staff, created_at, products(name)')
      .eq('status', 'published').order('created_at', { ascending: false }).limit(50),
    supabase.from('products').select('id, name').eq('is_active', true).order('name')
  ]);

  const Stars = ({ n }: { n: number }) => <span className="stars text-[13px]">{'★★★★★'.slice(0, n)}<span className="text-line">{'★★★★★'.slice(n)}</span></span>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-1 text-xl font-bold">Reviews</h1>
        <p className="text-[13px] text-muted">Approve customer submissions, or post a review on a customer&apos;s behalf.</p>
      </div>

      {/* pending queue */}
      <section>
        <h2 className="mb-3 text-[14px] font-bold">Pending approval {pending?.length ? <span className="ml-1 rounded-full bg-warn-soft px-2 py-0.5 text-[11px] text-warn">{pending.length}</span> : null}</h2>
        <div className="space-y-2">
          {(pending ?? []).map(r => (
            <div key={r.id} className="flex flex-wrap items-start justify-between gap-3 rounded-2xl bg-card p-4">
              <div className="min-w-0">
                <p className="text-[13px]"><b>{r.author_name}</b> · <span className="text-muted">{(r.products as { name?: string })?.name}</span></p>
                <Stars n={r.rating} />
                {r.title && <p className="mt-1 text-[13.5px] font-semibold">{r.title}</p>}
                {r.body && <p className="text-[13px] text-muted">{r.body}</p>}
              </div>
              <ReviewModActions id={r.id} />
            </div>
          ))}
          {!pending?.length && <p className="rounded-2xl bg-card p-6 text-center text-[13px] text-muted">Nothing waiting for approval.</p>}
        </div>
      </section>

      {/* post on behalf */}
      <section>
        <h2 className="mb-3 text-[14px] font-bold">Add a review on behalf of a customer</h2>
        <form action={addStaffReview} className="grid gap-3 rounded-2xl bg-card p-4 sm:grid-cols-2">
          <select name="product_id" required className="h-11 rounded-btn bg-paper px-3 text-[13.5px] outline-none sm:col-span-2">
            {(products ?? []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input name="author_name" placeholder="Customer name" required className="h-11 rounded-btn bg-paper px-3 text-[13.5px] outline-none" />
          <select name="rating" className="h-11 rounded-btn bg-paper px-3 text-[13.5px] outline-none">
            {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} stars</option>)}
          </select>
          <input name="title" placeholder="Title (optional)" className="h-11 rounded-btn bg-paper px-3 text-[13.5px] outline-none sm:col-span-2" />
          <textarea name="body" placeholder="Review text" rows={2} className="rounded-btn bg-paper p-3 text-[13.5px] outline-none sm:col-span-2" />
          <label className="flex items-center gap-2 text-[12.5px] text-muted"><input type="checkbox" name="verified" /> Mark as verified purchase</label>
          <button className="pressable h-11 rounded-btn bg-volt px-5 text-[13.5px] font-semibold text-white hover:bg-volt-deep sm:col-span-2">Publish review</button>
        </form>
      </section>

      {/* published */}
      <section>
        <h2 className="mb-3 text-[14px] font-bold">Published</h2>
        <div className="space-y-2">
          {(published ?? []).map(r => (
            <div key={r.id} className="flex flex-wrap items-start justify-between gap-3 rounded-2xl bg-card p-4">
              <div className="min-w-0">
                <p className="text-[13px]"><b>{r.author_name}</b> · <span className="text-muted">{(r.products as { name?: string })?.name}</span>
                  {r.is_verified && <span className="ml-1.5 rounded bg-[#E8F7EE] px-1.5 py-0.5 text-[10px] font-semibold text-ok">Verified</span>}
                  {r.by_staff && <span className="ml-1.5 rounded bg-volt-soft px-1.5 py-0.5 text-[10px] font-semibold text-volt">Shop</span>}
                </p>
                <Stars n={r.rating} />
                {r.body && <p className="text-[13px] text-muted">{r.body}</p>}
              </div>
              <ReviewModActions id={r.id} published />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
