import { getServerSupabase } from '@/lib/supabase-clients/server';
import { updateShipping } from './actions';
import CodSettings from '@/components/admin/CodSettings';
import PageHeader from '@/components/admin/PageHeader';
import TestNotifications from '@/components/admin/TestNotifications';
import { formatLKR } from '@/lib/site';

export const dynamic = 'force-dynamic';

const inp = 'h-11 w-full rounded-xl bg-paper px-3.5 text-[13px] font-medium outline-none focus:ring-2 focus:ring-volt';
const lbl = 'mb-1.5 block text-[11.5px] font-bold uppercase tracking-[0.05em] text-muted';

export default async function AdminSettings() {
  const supabase = (await getServerSupabase())!;
  const [{ data: flag }, { data: blocks }, { data: shipping }] = await Promise.all([
    supabase.from('feature_flags').select('payload').eq('key', 'cod').maybeSingle(),
    supabase.from('cod_blocklist').select('phone_norm, reason, created_at').order('created_at', { ascending: false }),
    supabase.from('site_settings').select('value').eq('key', 'shipping').maybeSingle(),
  ]);
  const maxValue = Number((flag?.payload as { max_value?: number })?.max_value ?? 150000);
  const freeOver = Number((shipping?.value as { free_over?: number })?.free_over ?? 0);

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
