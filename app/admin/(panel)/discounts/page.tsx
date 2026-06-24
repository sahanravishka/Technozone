import { getServerSupabase } from '@/lib/supabase-clients/server';
import { createDiscount, toggleDiscount, createCoupon, toggleCoupon } from '@/app/admin/actions';
import PageHeader from '@/components/admin/PageHeader';

export const dynamic = 'force-dynamic';

const inp = 'h-11 w-full rounded-xl bg-paper px-3.5 text-[13px] font-medium outline-none focus:ring-2 focus:ring-volt';
const lbl = 'mb-1.5 block text-[11.5px] font-bold uppercase tracking-[0.05em] text-muted';

export default async function AdminDiscounts() {
  const supabase = (await getServerSupabase())!;
  const [{ data: discounts }, { data: coupons }, { data: products }, { data: categories }] =
    await Promise.all([
      supabase.from('discounts').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('coupons').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('products').select('id, name').order('name').limit(500),
      supabase.from('categories').select('id, name').order('sort_order'),
    ]);

  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader title="Discounts &amp; Coupons" subtitle="Sales that apply automatically, or codes customers type in" />

      {/* ── Section 1: Auto discounts ── */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-[15px] font-bold">
          <span className="grid h-6 w-6 place-items-center rounded-lg bg-volt text-[11px] font-black text-white">%</span>
          Automatic sales
        </h2>

        <div className="admin-card overflow-hidden">
          {/* Create form */}
          <form action={createDiscount} className="border-b border-line p-5">
            <p className="mb-4 text-[12.5px] text-muted">Set a discount that applies automatically to matching products — no code needed.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={lbl}>Sale name</label>
                <input name="name" required placeholder="e.g. Avurudu sale" className={inp} />
              </div>
              <div>
                <label className={lbl}>What to discount</label>
                <select name="scope" className={inp}>
                  <option value="all">Everything in the store</option>
                  <option value="category">Specific category</option>
                  <option value="product">Specific product</option>
                </select>
              </div>
              <div>
                <label className={lbl}>Category (if applicable)</label>
                <select name="category_id" className={inp}>
                  <option value="">— Not applicable —</option>
                  {(categories ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Product (if applicable)</label>
                <select name="product_id" className={inp}>
                  <option value="">— Not applicable —</option>
                  {(products ?? []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Discount type</label>
                <select name="type" className={inp}>
                  <option value="percentage">Percentage (% off)</option>
                  <option value="fixed">Fixed amount (Rs off)</option>
                </select>
              </div>
              <div>
                <label className={lbl}>Discount amount</label>
                <input name="value" type="number" step="0.01" required placeholder="e.g. 10  or  500" className={inp} />
              </div>
              <div>
                <label className={lbl}>Ends on (optional)</label>
                <input name="ends_at" type="date" className={inp} />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button className="pressable h-10 rounded-xl bg-volt px-6 text-[13px] font-semibold text-white hover:bg-volt-deep">
                Create sale
              </button>
            </div>
          </form>

          {/* Existing discounts list */}
          {discounts?.length ? (
            <div className="divide-y divide-line">
              {discounts.map(d => (
                <div key={d.id} className="flex items-center gap-3 px-5 py-3.5 text-[13px]">
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold">{d.name}</span>
                    <span className="ml-2 text-muted capitalize">{d.scope}</span>
                    <span className="ml-2 text-muted">·</span>
                    <span className="ml-2 font-semibold text-volt">
                      {d.type === 'percentage' ? `${d.value}% off` : `Rs ${d.value} off`}
                    </span>
                    {d.ends_at && (
                      <span className="ml-2 text-[12px] text-muted">
                        until {new Date(d.ends_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                  <form action={toggleDiscount.bind(null, d.id, !d.is_active)}>
                    <button className={`pressable rounded-lg px-3 py-1.5 text-[11.5px] font-semibold ${d.is_active ? 'bg-[#E8F7EE] text-ok' : 'bg-paper text-muted'}`}>
                      {d.is_active ? 'Active' : 'Off'}
                    </button>
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <p className="p-6 text-center text-[13px] text-muted">No automatic sales yet.</p>
          )}
        </div>
      </section>

      {/* ── Section 2: Coupon codes ── */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-[15px] font-bold">
          <span className="grid h-6 w-6 place-items-center rounded-lg bg-[#E8F7EE] text-[11px] font-black text-ok">🎁</span>
          Coupon codes
        </h2>

        <div className="admin-card overflow-hidden">
          {/* Create form */}
          <form action={createCoupon} className="border-b border-line p-5">
            <p className="mb-4 text-[12.5px] text-muted">Create a code that customers enter at checkout to get a discount.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={lbl}>Coupon code</label>
                <input name="code" required placeholder="e.g. WELCOME10" className={`${inp} uppercase`} />
              </div>
              <div>
                <label className={lbl}>Discount type</label>
                <select name="type" className={inp}>
                  <option value="percentage">Percentage (% off)</option>
                  <option value="fixed">Fixed amount (Rs off)</option>
                </select>
              </div>
              <div>
                <label className={lbl}>Discount amount</label>
                <input name="value" type="number" step="0.01" required placeholder="e.g. 10  or  500" className={inp} />
              </div>
              <div>
                <label className={lbl}>Min. order value (Rs)</label>
                <input name="min" type="number" defaultValue={0} className={inp} />
              </div>
              <div>
                <label className={lbl}>Max. uses (leave blank = unlimited)</label>
                <input name="max" type="number" placeholder="e.g. 100" className={inp} />
              </div>
              <div>
                <label className={lbl}>Expiry date (optional)</label>
                <input name="ends_at" type="date" className={inp} />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button className="pressable h-10 rounded-xl bg-volt px-6 text-[13px] font-semibold text-white hover:bg-volt-deep">
                Create coupon
              </button>
            </div>
          </form>

          {/* Existing coupons list */}
          {coupons?.length ? (
            <div className="divide-y divide-line">
              {coupons.map(c => (
                <div key={c.id} className="flex items-center gap-3 px-5 py-3.5 text-[13px]">
                  <div className="flex-1 min-w-0">
                    <span className="font-mono font-bold tracking-wider">{c.code}</span>
                    <span className="ml-2 font-semibold text-volt">
                      {c.type === 'percentage' ? `${c.value}% off` : `Rs ${c.value} off`}
                    </span>
                    <span className="ml-2 text-[12px] text-muted">
                      used {c.used_count}{c.max_uses ? `/${c.max_uses}` : ''} times
                    </span>
                    {c.ends_at && (
                      <span className="ml-2 text-[12px] text-muted">
                        · expires {new Date(c.ends_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                  <form action={toggleCoupon.bind(null, c.id, !c.is_active)}>
                    <button className={`pressable rounded-lg px-3 py-1.5 text-[11.5px] font-semibold ${c.is_active ? 'bg-[#E8F7EE] text-ok' : 'bg-paper text-muted'}`}>
                      {c.is_active ? 'Active' : 'Off'}
                    </button>
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <p className="p-6 text-center text-[13px] text-muted">No coupon codes yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
