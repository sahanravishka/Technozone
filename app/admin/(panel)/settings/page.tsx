import { getServerSupabase } from '@/lib/supabase-clients/server';
import { updateShipping, updateBusinessProfile } from './actions';
import CodSettings from '@/components/admin/CodSettings';
import PageHeader from '@/components/admin/PageHeader';
import TestNotifications from '@/components/admin/TestNotifications';
import { formatLKR } from '@/lib/site';

export const dynamic = 'force-dynamic';

const inp = 'h-11 w-full rounded-xl bg-paper px-3.5 text-[13px] font-medium outline-none focus:ring-2 focus:ring-volt';
const lbl = 'mb-1.5 block text-[11.5px] font-bold uppercase tracking-[0.05em] text-muted';

export default async function AdminSettings() {
  const supabase = (await getServerSupabase())!;
  const [{ data: flag }, { data: blocks }, { data: shipping }, { data: bizProfile }] = await Promise.all([
    supabase.from('feature_flags').select('payload').eq('key', 'cod').maybeSingle(),
    supabase.from('cod_blocklist').select('phone_norm, reason, created_at').order('created_at', { ascending: false }),
    supabase.from('site_settings').select('value').eq('key', 'shipping').maybeSingle(),
    supabase.from('site_settings').select('value').eq('key', 'business_profile').maybeSingle(),
  ]);
  const maxValue = Number((flag?.payload as { max_value?: number })?.max_value ?? 150000);
  const freeOver = Number((shipping?.value as { free_over?: number })?.free_over ?? 0);
  const biz = (bizProfile?.value ?? {}) as {
    street?: string; locality?: string; region?: string; phone?: string;
    ratingValue?: number; reviewCount?: number;
  };

  return (
    <div className="max-w-2xl space-y-8">
      <PageHeader title="Settings" subtitle="Store-wide configuration" />

      <section>
        <h2 className="mb-3 text-[15px] font-bold">Shipping</h2>
        <form action={updateShipping} className="admin-card p-5">
          <label className={lbl} htmlFor="free-over">Free delivery over (Rs) — 0 disables it</label>
          <div className="flex flex-wrap items-center gap-2">
            <input id="free-over" name="free_over" type="number" min={0} step="1" defaultValue={freeOver} className={`${inp} max-w-[200px]`} />
            <button className="pressable h-11 rounded-xl bg-volt px-6 text-[13px] font-semibold text-white hover:bg-volt-deep">
              Save
            </button>
          </div>
          <p className="mt-2 text-[12px] text-muted">
            {freeOver > 0
              ? `Orders of ${formatLKR(freeOver)} or more skip the delivery fee (pickup orders are always free).`
              : 'Delivery fee always applies based on the customer’s zone.'}
          </p>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-[15px] font-bold">Business profile</h2>
        <p className="mb-3 text-[12px] text-muted">
          Used in your site's LocalBusiness structured data (helps local/Google Maps search). Keep this matching your actual Google Business Profile — update the rating and review count here whenever they change.
        </p>
        <form action={updateBusinessProfile} className="admin-card grid gap-3 p-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={lbl} htmlFor="street">Street address</label>
            <input id="street" name="street" defaultValue={biz.street ?? ''} className={inp} />
          </div>
          <div>
            <label className={lbl} htmlFor="locality">City / area</label>
            <input id="locality" name="locality" defaultValue={biz.locality ?? 'Nugegoda'} className={inp} />
          </div>
          <div>
            <label className={lbl} htmlFor="region">Province</label>
            <input id="region" name="region" defaultValue={biz.region ?? 'Western Province'} className={inp} />
          </div>
          <div>
            <label className={lbl} htmlFor="phone">Phone (with +94)</label>
            <input id="phone" name="phone" defaultValue={biz.phone ?? ''} placeholder="+94702561110" className={inp} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={lbl} htmlFor="rating_value">Google rating</label>
              <input id="rating_value" name="rating_value" type="number" step="0.1" min={0} max={5} defaultValue={biz.ratingValue ?? ''} className={inp} />
            </div>
            <div>
              <label className={lbl} htmlFor="review_count">Review count</label>
              <input id="review_count" name="review_count" type="number" min={0} defaultValue={biz.reviewCount ?? ''} className={inp} />
            </div>
          </div>
          <div className="sm:col-span-2">
            <button className="pressable h-11 rounded-xl bg-volt px-6 text-[13px] font-semibold text-white hover:bg-volt-deep">
              Save
            </button>
          </div>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-[15px] font-bold">Cash on delivery</h2>
        <CodSettings maxValue={maxValue} blocks={blocks ?? []} />
      </section>

      <section>
        <h2 className="mb-3 text-[15px] font-bold">New-order notifications</h2>
        <TestNotifications />
      </section>
    </div>
  );
}
