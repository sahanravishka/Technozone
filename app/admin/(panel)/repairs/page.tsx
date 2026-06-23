import { getServerSupabase } from '@/lib/supabase-clients/server';
import RepairBoard from '@/components/admin/RepairBoard';
import NewJobForm from '@/components/admin/NewJobForm';
import PageHeader from '@/components/admin/PageHeader';
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
      <PageHeader title="Repairs" subtitle="Active service jobs on the bench">
        <NewJobForm types={(types ?? []).map(t => t.name)} />
      </PageHeader>
      <RepairBoard jobs={(jobs ?? []) as ServiceJob[]} />
    </div>
  );
}
