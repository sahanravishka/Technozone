import { getServerSupabase } from '@/lib/supabase-clients/server';
import { registerWarranty } from '@/app/admin/actions';
import WarrantyRow from '@/components/admin/WarrantyRow';
import PageHeader from '@/components/admin/PageHeader';

export const dynamic = 'force-dynamic';

const inp = 'h-11 w-full rounded-xl bg-paper px-3.5 text-[13px] font-medium outline-none focus:ring-2 focus:ring-volt';
const lbl = 'mb-1.5 block text-[11.5px] font-bold uppercase tracking-[0.05em] text-muted';

export default async function AdminWarranties({
  searchParams,
}: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const supabase = (await getServerSupabase())!;

  let query = supabase
    .from('warranties')
    .select('id, product_name, serial_no, customer_name, customer_phone, purchase_date, expires_at, status')
    .order('created_at', { ascending: false })
    .limit(100);
  if (q?.trim()) {
    const safe = q.trim();
    query = query.or(
      `serial_no.ilike.%${safe.replace(/[^\w\s-]/g, '')}%,customer_phone.ilike.%${safe.replace(/\D/g, '')}%`
    );
  }
  const { data: rows } = await query;

  const active  = (rows ?? []).filter(w => w.status === 'active' && new Date(w.expires_at) >= new Date()).length;
  const expired = (rows ?? []).filter(w => w.status !== 'void' && new Date(w.expires_at) < new Date()).length;

  return (
    <div className="max-w-3xl">
      <PageHeader title="Warranties" subtitle="Register and look up product warranties" />

      {/* ── Register form ── */}
      <div className="admin-card overflow-hidden mb-6">
        <div className="border-b border-line bg-paper/60 px-5 py-3.5">
          <h3 className="text-[13.5px] font-bold">Register a warranty</h3>
          <p className="mt-0.5 text-[12px] text-muted">Fill in the details from the box/receipt and click Register.</p>
        </div>
        <form action={registerWarranty} className="p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={lbl}>Product name</label>
              <input name="product_name" required placeholder="Nokia C300" className={inp} />
            </div>
            <div>
              <label className={lbl}>Serial / IMEI number</label>
              <input name="serial_no" required placeholder="35XXXXXXXXXXXX" className={inp} />
            </div>
            <div>
              <label className={lbl}>Customer phone</label>
              <input name="customer_phone" required placeholder="07X XXX XXXX" inputMode="tel" className={inp} />
            </div>
            <div>
              <label className={lbl}>Customer name (optional)</label>
              <input name="customer_name" placeholder="Full name" className={inp} />
            </div>
            <div>
              <label className={lbl}>Warranty period (months)</label>
              <input name="period_months" type="number" defaultValue={12} className={inp} />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button className="pressable h-10 rounded-xl bg-volt px-6 text-[13px] font-semibold text-white hover:bg-volt-deep">
              Register warranty
            </button>
          </div>
        </form>
      </div>

      {/* ── Search + summary ── */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form className="flex-1">
          <input name="q" defaultValue={q ?? ''} placeholder="🔍  Search by serial or phone…"
            className="admin-card h-11 w-full rounded-xl px-4 text-[13.5px] outline-none focus:ring-2 focus:ring-volt" />
        </form>
        <div className="flex gap-2 shrink-0">
          <span className="rounded-full bg-[#E8F7EE] px-3 py-1.5 text-[12px] font-semibold text-ok">{active} active</span>
          {expired > 0 && <span className="rounded-full bg-paper px-3 py-1.5 text-[12px] font-semibold text-muted">{expired} expired</span>}
        </div>
      </div>

      {/* ── Warranty cards ── */}
      <div className="space-y-2.5">
        {(rows ?? []).map(w => <WarrantyRow key={w.id} w={w} />)}
        {!rows?.length && (
          <div className="admin-card p-10 text-center text-[13px] text-muted">
            {q ? 'No warranties match that search.' : 'No warranties registered yet.'}
          </div>
        )}
      </div>
    </div>
  );
}
