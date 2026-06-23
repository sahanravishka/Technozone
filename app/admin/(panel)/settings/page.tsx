import { getServerSupabase } from '@/lib/supabase-clients/server';
import CodSettings from '@/components/admin/CodSettings';
import PageHeader from '@/components/admin/PageHeader';

export const dynamic = 'force-dynamic';

export default async function AdminSettings() {
  const supabase = (await getServerSupabase())!;
  const [{ data: flag }, { data: blocks }] = await Promise.all([
    supabase.from('feature_flags').select('payload').eq('key', 'cod').maybeSingle(),
    supabase.from('cod_blocklist').select('phone_norm, reason, created_at').order('created_at', { ascending: false })
  ]);
  const maxValue = Number((flag?.payload as { max_value?: number })?.max_value ?? 150000);
  return (
    <div className="max-w-2xl">
      <PageHeader title="Settings" subtitle="Cash-on-delivery fraud controls" />
      <CodSettings maxValue={maxValue} blocks={blocks ?? []} />
    </div>
  );
}
