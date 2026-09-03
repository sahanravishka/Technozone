import { getServerSupabase } from '@/lib/supabase-clients/server';
import { formatLKR } from '@/lib/site';
import { loyaltyTier, TIER_META, suggestedDiscount } from '@/lib/loyalty';
import CustomerActions from '@/components/admin/CustomerActions';
import PageHeader from '@/components/admin/PageHeader';

export const dynamic = 'force-dynamic';

export default async function AdminCustomers({
  searchParams,
}: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const supabase = (await getServerSupabase())!;

  let query = supabase
    .from('contacts')
    .select('id, full_name, phone_display, phone_norm, email, city, orders_count, lifetime_value, last_order_at')
    .order('lifetime_value', { ascending: false })
    .limit(100);

  if (q?.trim()) {
    // Whitelist to letters/numbers/space/hyphen/@ — same fix as
    // searchProducts() in lib/data.ts: an unfiltered term can inject
    // PostgREST .or() syntax (commas, parens, dots, colons, asterisks).
    // '.' stays excluded like the rest of the codebase's or()-filter inputs,
    // so a full email search loses only the dots (still substring-matches).
    const term = q.trim().replace(/[^\p{L}\p{N}\s@-]/gu, '').slice(0, 60).trim();
    const digits = term.replace(/\D/g, '');
    if (term) {
      const ors = [`full_name.ilike.%${term}%`, `email.ilike.%${term}%`, `city.ilike.%${term}%`];
      if (digits) ors.push(`phone_norm.ilike.%${digits}%`);
      query = query.or(ors.join(','));
    }
  }
  const { data: contacts } = await query;

  return (
    <div>
      <PageHeader title="Customers" subtitle="Ranked by lifetime value">
        <form>
          <input
            name="q" defaultValue={q ?? ''}
            placeholder="🔍  Search by name, phone, city…"
            className="admin-card h-11 w-full rounded-xl px-4 text-[13.5px] outline-none focus:ring-2 focus:ring-volt sm:w-80"
          />
        </form>
      </PageHeader>

      {/* Customer cards */}
      <div className="space-y-2.5">
        {(contacts ?? []).map(c => {
          const tier = loyaltyTier(c.orders_count, Number(c.lifetime_value));
          const meta = TIER_META[tier];
          const initials = (c.full_name ?? '?').split(/\s+/).map((s: string) => s[0]).slice(0, 2).join('').toUpperCase();
          return (
            <div key={c.id} className="admin-card overflow-hidden">
              <div className="flex flex-wrap items-start gap-3 px-4 py-4">
                {/* Avatar */}
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-volt to-accent text-[13px] font-bold text-white select-none">
                  {initials}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[15px] font-bold">{c.full_name ?? '—'}</span>
                    <span className={`rounded-lg px-2.5 py-0.5 text-[11.5px] font-bold ${meta.cls}`}>
                      {meta.emoji} {meta.label}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[12.5px] text-muted">
                    <span>{c.phone_display ?? c.phone_norm}</span>
                    {c.city && <span>{c.city}</span>}
                    {c.email && <span className="truncate">{c.email}</span>}
                  </div>
                </div>

                {/* Stats */}
                <div className="shrink-0 text-right">
                  <p className="text-[17px] font-extrabold">{formatLKR(Number(c.lifetime_value))}</p>
                  <p className="text-[11.5px] text-muted">{c.orders_count} order{c.orders_count !== 1 ? 's' : ''}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="border-t border-line bg-paper/60 px-4 py-2.5">
                <CustomerActions contactId={c.id} suggestedPct={suggestedDiscount(tier)} />
              </div>
            </div>
          );
        })}

        {!contacts?.length && (
          <div className="admin-card p-12 text-center">
            <p className="text-[15px] font-semibold text-muted">
              {q ? 'No customers match that search.' : 'Customers appear here after their first paid order.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
