import { getServerSupabase } from '@/lib/supabase-clients/server';
import RepairBoard from '@/components/admin/RepairBoard';
import NewJobForm from '@/components/admin/NewJobForm';
import type { ServiceJob } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AdminRepairs() {
  const supabase = (await getServerSupabase())!;
  const [{ data: jobs }, { data: types }] = await Promise.all([
    supabase.from('service_jobs')
      .select('id, job_number, customer_name, customer_phone, device_brand, device_model, service_category, issue, status, estimate, final_price, created_at, updated_at')
      .not('status', 'in', '(collected,cancelled)')
      .order('created_at', { ascending: false }),
    supabase.from('service_types').select('name').eq('is_active', true).order('sort_order')
  ]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Repairs</h1>
        <NewJobForm types={(types ?? []).map(t => t.name)} />
      </div>
      <RepairBoard jobs={(jobs ?? []) as ServiceJob[]} />
    </div>
  );
}
