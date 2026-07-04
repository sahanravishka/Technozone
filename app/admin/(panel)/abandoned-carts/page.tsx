import { getServerSupabase } from '@/lib/supabase-clients/server';
import PageHeader from '@/components/admin/PageHeader';
import AbandonedCartRow from '@/components/admin/AbandonedCartRow';

export const dynamic = 'force-dynamic';

export default async function AdminAbandonedCarts() {
  const supabase = (await getServerSupabase())!;
  const { data: rows } = await supabase.from('abandoned_checkouts')
    .select('id, name, phone, email, items, subtotal, updated_at')
    .eq('converted', false).eq('dismissed', false)
    .order('updated_at', { ascending: false })
    .limit(200);

  return (
    <div className="max-w-3xl">
      <PageHeader title="Abandoned carts" subtitle="Checkouts started but not completed — a phone number was entered before they left" />
      <div className="admin-card overflow-hidden">
        {(rows ?? []).length ? rows!.map(r => <AbandonedCartRow key={r.id} row={r} />) : (
          <p className="p-8 text-center text-[13px] text-muted">No abandoned checkouts right now.</p>
        )}
      </div>
    </div>
  );
}
