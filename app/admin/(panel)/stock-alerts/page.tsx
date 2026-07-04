import { getServerSupabase } from '@/lib/supabase-clients/server';
import PageHeader from '@/components/admin/PageHeader';
import StockAlertGroup from '@/components/admin/StockAlertGroup';

export const dynamic = 'force-dynamic';

export default async function AdminStockAlerts() {
  const supabase = (await getServerSupabase())!;
  const { data: requests } = await supabase.from('stock_notify_requests')
    .select('id, product_id, product_name, phone, created_at')
    .eq('notified', false)
    .order('created_at', { ascending: false })
    .limit(500);

  type AlertReq = { id: string; phone: string; created_at: string };
  const groups = new Map<string, { productName: string; requests: AlertReq[] }>();
  for (const r of requests ?? []) {
    const g = groups.get(r.product_id) ?? { productName: r.product_name as string, requests: [] as AlertReq[] };
    g.requests.push({ id: r.id, phone: r.phone, created_at: r.created_at });
    groups.set(r.product_id, g);
  }

  return (
    <div className="max-w-3xl space-y-4">
      <PageHeader title="Stock alerts" subtitle="Customers waiting to be notified when a sold-out item is back" />
      {groups.size ? [...groups.entries()].map(([productId, g]) => (
        <StockAlertGroup key={productId} productName={g.productName} requests={g.requests} />
      )) : (
        <div className="admin-card p-8 text-center text-[13px] text-muted">
          No pending back-in-stock requests.
        </div>
      )}
    </div>
  );
}
