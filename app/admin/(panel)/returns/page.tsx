import { getServerSupabase } from '@/lib/supabase-clients/server';
import ReturnCard from '@/components/admin/ReturnCard';
import PageHeader from '@/components/admin/PageHeader';

export const dynamic = 'force-dynamic';

const COLS = [
  { key: 'requested', label: 'Requested', accent: '#9AA2AE' },
  { key: 'approved', label: 'Approved', accent: '#B06A0A' },
  { key: 'received', label: 'Received', accent: '#1B6FD8' },
  { key: 'refunded', label: 'Refunded', accent: '#0F8A55' }
];

export default async function AdminReturns() {
  const supabase = (await getServerSupabase())!;
  const { data: rows } = await supabase.from('returns')
    .select('id, rma_number, order_id, customer_name, customer_phone, reason, status, refund_amount, restock, orders(order_number, total), return_items(product_name, qty)')
    .neq('status', 'rejected').order('created_at', { ascending: false }).limit(200);

  return (
    <div>
      <PageHeader title="Returns (RMA)" subtitle="Track return requests through to refund" />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {COLS.map(col => {
          const list = (rows ?? []).filter(r => r.status === col.key);
          return (
            <div key={col.key}>
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">
                <span className="h-2 w-2 rounded-full" style={{ background: col.accent }} />{col.label} · {list.length}
              </p>
              <div className="space-y-2.5">
                {list.map(r => <ReturnCard key={r.id} r={r as never} accent={col.accent} />)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
