import { getServerSupabase } from '@/lib/supabase-clients/server';
import { formatLKR } from '@/lib/site';
import { loyaltyTier, TIER_META, suggestedDiscount } from '@/lib/loyalty';
import CustomerActions from '@/components/admin/CustomerActions';
import PageHeader from '@/components/admin/PageHeader';

export const dynamic = 'force-dynamic';

export default async function AdminCustomers({ searchParams }:
  { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const supabase = (await getServerSupabase())!;

  let query = supabase.from('contacts')
    .select('id, full_name, phone_display, phone_norm, email, city, orders_count, lifetime_value, last_order_at')
    .order('lifetime_value', { ascending: false }).limit(100);

  if (q?.trim()) {
    const term = q.trim();
    const digits = term.replace(/\D/g, '');
    // search across name / email / city / phone
    const ors = [`full_name.ilike.%${term}%`, `email.ilike.%${term}%`, `city.ilike.%${term}%`];
    if (digits) ors.push(`phone_norm.ilike.%${digits}%`);
    query = query.or(ors.join(','));
  }
  const { data: contacts } = await query;

  return (
    <div>
      <PageHeader title="Customers" subtitle="Loyalty tiers ranked by lifetime value">
        <form>
          <input name="q" defaultValue={q ?? ''} placeholder="Search phone / email / name / city…"
            className="admin-card h-11 w-full px-4 text-[13.5px] outline-none focus:ring-2 focus:ring-volt sm:w-80" />
        </form>
      </PageHeader>

      <div className="admin-card overflow-x-auto">
        <table className="w-full min-w-[680px] text-[13px]">
          <thead>
            <tr className="border-b border-[#EEF1F6] text-left text-[11px] font-bold uppercase tracking-wide text-muted">
              <th className="px-4 py-3">Customer</th><th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">City</th><th className="px-4 py-3">Orders</th>
              <th className="px-4 py-3">Lifetime</th><th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {(contacts ?? []).map(c => {
              const tier = loyaltyTier(c.orders_count, Number(c.lifetime_value));
              const meta = TIER_META[tier];
              return (
                <tr key={c.id} className="border-b border-[#F2F5F9] last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <b>{c.full_name ?? '—'}</b>
                      <span className={`rounded-md px-2 py-0.5 text-[10.5px] font-semibold ${meta.cls}`}>{meta.emoji} {meta.label}</span>
                    </div>
                    {c.email && <span className="text-[11.5px] text-muted">{c.email}</span>}
                  </td>
                  <td className="px-4 py-3">{c.phone_display ?? c.phone_norm}</td>
                  <td className="px-4 py-3">{c.city ?? '—'}</td>
                  <td className="px-4 py-3">{c.orders_count}</td>
                  <td className="px-4 py-3 font-bold">{formatLKR(Number(c.lifetime_value))}</td>
                  <td className="px-4 py-3 text-right">
                    <CustomerActions contactId={c.id} suggestedPct={suggestedDiscount(tier)} />
                  </td>
                </tr>
              );
            })}
            {!contacts?.length && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">
                {q ? 'No customers match that search.' : 'Customers appear here automatically after their first paid order.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
