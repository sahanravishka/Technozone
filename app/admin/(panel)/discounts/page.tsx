import { getServerSupabase } from '@/lib/supabase-clients/server';
import { createDiscount, toggleDiscount, createCoupon, toggleCoupon } from '@/app/admin/actions';
import PageHeader from '@/components/admin/PageHeader';

export const dynamic = 'force-dynamic';

const input = 'h-11 rounded-xl bg-paper px-3.5 text-[13px] font-medium outline-none focus:ring-2 focus:ring-volt';
const label = 'mb-1 block text-[12px] font-semibold text-[#3D4A60]';

export default async function AdminDiscounts() {
  const supabase = (await getServerSupabase())!;
  const [{ data: discounts }, { data: coupons }, { data: products }, { data: categories }] =
    await Promise.all([
      supabase.from('discounts').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('coupons').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('products').select('id, name').order('name').limit(500),
      supabase.from('categories').select('id, name').order('sort_order')
    ]);

  return (
    <div className="max-w-4xl space-y-8">
      <section>
        <PageHeader title="Discounts" subtitle="Automatic sales applied at the storefront" />
        <form action={createDiscount} className="admin-card mb-4 grid items-end gap-2.5 p-4 sm:grid-cols-[1fr_120px_110px_90px_1fr_auto]">
          <div><span className={label}>Name</span><input name="name" className={`${input} w-full`} placeholder="Avurudu sale" required /></div>
          <div><span className={label}>Scope</span>
            <select name="scope" className={`${input} w-full`}>
              <option value="all">Everything</option><option value="category">Category</option><option value="product">Product</option>
            </select></div>
          <div><span className={label}>Type</span>
            <select name="type" className={`${input} w-full`}>
              <option value="percentage">% off</option><option value="fixed">Rs off</option>
            </select></div>
          <div><span className={label}>Value</span><input name="value" type="number" step="0.01" className={`${input} w-full`} required /></div>
          <div><span className={label}>Target / ends</span>
            <div className="flex gap-2">
              <select name="product_id" className={`${input} flex-1`}>
                <option value="">product…</option>
                {(products ?? []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select name="category_id" className={`${input} flex-1`}>
                <option value="">category…</option>
                {(categories ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input name="ends_at" type="date" className={input} />
            </div></div>
          <button className="pressable h-11 rounded-btn bg-volt px-5 text-[13px] font-semibold text-white hover:bg-volt-deep">Add</button>
        </form>
        <div className="admin-card overflow-hidden">
          {(discounts ?? []).map((d, i) => (
            <div key={d.id} className={`flex items-center gap-3 px-4 py-3.5 text-[13px] ${i ? 'border-t border-line/70' : ''}`}>
              <b>{d.name}</b>
              <span className="text-muted">{d.scope} · {d.type === 'percentage' ? `${d.value}%` : `Rs ${d.value}`} off</span>
              {d.ends_at && <span className="text-muted">until {new Date(d.ends_at).toLocaleDateString('en-GB')}</span>}
              <form action={toggleDiscount.bind(null, d.id, !d.is_active)} className="ml-auto">
                <button className={`pressable rounded-lg px-3 py-1.5 text-[11.5px] font-semibold ${d.is_active ? 'bg-[#E8F7EE] text-ok' : 'bg-paper text-muted'}`}>
                  {d.is_active ? 'Active' : 'Off'}
                </button>
              </form>
            </div>
          ))}
          {!discounts?.length && <p className="p-6 text-center text-[13px] text-muted">No discounts yet.</p>}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-[17px] font-bold tracking-tight">Coupon codes</h2>
        <form action={createCoupon} className="admin-card mb-4 grid items-end gap-2.5 p-4 sm:grid-cols-[140px_110px_90px_110px_90px_130px_auto]">
          <div><span className={label}>Code</span><input name="code" className={`${input} w-full uppercase`} placeholder="WELCOME10" required /></div>
          <div><span className={label}>Type</span>
            <select name="type" className={`${input} w-full`}>
              <option value="percentage">% off</option><option value="fixed">Rs off</option>
            </select></div>
          <div><span className={label}>Value</span><input name="value" type="number" step="0.01" className={`${input} w-full`} required /></div>
          <div><span className={label}>Min order</span><input name="min" type="number" defaultValue={0} className={`${input} w-full`} /></div>
          <div><span className={label}>Max uses</span><input name="max" type="number" className={`${input} w-full`} placeholder="∞" /></div>
          <div><span className={label}>Ends</span><input name="ends_at" type="date" className={`${input} w-full`} /></div>
          <button className="pressable h-11 rounded-btn bg-volt px-5 text-[13px] font-semibold text-white hover:bg-volt-deep">Add</button>
        </form>
        <div className="admin-card overflow-hidden">
          {(coupons ?? []).map((c, i) => (
            <div key={c.id} className={`flex items-center gap-3 px-4 py-3.5 text-[13px] ${i ? 'border-t border-line/70' : ''}`}>
              <b className="font-mono">{c.code}</b>
              <span className="text-muted">{c.type === 'percentage' ? `${c.value}%` : `Rs ${c.value}`} off · used {c.used_count}{c.max_uses ? `/${c.max_uses}` : ''}</span>
              <form action={toggleCoupon.bind(null, c.id, !c.is_active)} className="ml-auto">
                <button className={`pressable rounded-lg px-3 py-1.5 text-[11.5px] font-semibold ${c.is_active ? 'bg-[#E8F7EE] text-ok' : 'bg-paper text-muted'}`}>
                  {c.is_active ? 'Active' : 'Off'}
                </button>
              </form>
            </div>
          ))}
          {!coupons?.length && <p className="p-6 text-center text-[13px] text-muted">No coupons yet.</p>}
        </div>
      </section>
    </div>
  );
}
