import { getServerSupabase } from '@/lib/supabase-clients/server';
import { registerWarranty } from '@/app/admin/actions';
import WarrantyRow from '@/components/admin/WarrantyRow';
import PageHeader from '@/components/admin/PageHeader';

export const dynamic = 'force-dynamic';

export default async function AdminWarranties({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const supabase = (await getServerSupabase())!;
  let query = supabase.from('warranties')
    .select('id, product_name, serial_no, customer_name, customer_phone, purchase_date, expires_at, status')
    .order('created_at', { ascending: false }).limit(100);
  if (q?.trim()) query = query.or(`serial_no.ilike.%${q.replace(/[^\w\s-]/g, '')}%,customer_phone.ilike.%${q.replace(/\D/g, '')}%`);
  const { data: rows } = await query;
  const inp = 'h-11 rounded-btn bg-paper px-3 text-[13.5px] outline-none focus:ring-2 focus:ring-volt';

  return (
    <div>
      <PageHeader title="Warranties" subtitle="Register and look up product warranties" />
      <form action={registerWarranty} className="admin-card mb-5 grid gap-3 p-4 sm:grid-cols-3">
        <input name="product_name" placeholder="Product" required className={inp} />
        <input name="serial_no" placeholder="Serial / IMEI" required className={inp} />
        <input name="customer_phone" placeholder="Customer phone" required className={inp} />
        <input name="customer_name" placeholder="Customer name" className={inp} />
        <input name="period_months" type="number" defaultValue={12} placeholder="Months" className={inp} />
        <button className="pressable h-11 rounded-btn bg-volt px-5 text-[13.5px] font-semibold text-white hover:bg-volt-deep">Register warranty</button>
      </form>

      <form className="mb-3"><input name="q" defaultValue={q ?? ''} placeholder="Search serial / phone…"
        className="admin-card h-11 w-full max-w-sm px-4 text-[14px] outline-none focus:ring-2 focus:ring-volt" /></form>

      <div className="admin-card overflow-x-auto">
        <table className="w-full min-w-[640px] text-[13px]">
          <thead><tr className="border-b border-[#EEF1F6] text-left text-[11px] font-bold uppercase tracking-wide text-muted">
            <th className="px-4 py-3">Product</th><th className="px-4 py-3">Serial</th><th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Expires</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"></th>
          </tr></thead>
          <tbody>
            {(rows ?? []).map(w => <WarrantyRow key={w.id} w={w} />)}
            {!rows?.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">No warranties yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
