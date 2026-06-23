import Link from 'next/link';
import { getServerSupabase } from '@/lib/supabase-clients/server';
import { formatLKR } from '@/lib/site';

export default async function AdminDashboard() {
  const supabase = (await getServerSupabase())!;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [{ count: todayOrders }, { data: monthPaid }, { data: lowStock }, { data: recent }] =
    await Promise.all([
      supabase.from('orders').select('id', { count: 'exact', head: true })
        .gte('created_at', today.toISOString()),
      supabase.from('orders').select('total')
        .gte('created_at', monthStart.toISOString())
        .in('status', ['paid', 'packed', 'shipped', 'delivered']),
      supabase.from('product_variants').select('id, sku, stock_qty, low_stock_threshold')
        .eq('is_active', true).order('stock_qty').limit(50),
      supabase.from('orders').select('id, order_number, status, total, created_at')
        .order('created_at', { ascending: false }).limit(8)
    ]);

  const revenue = (monthPaid ?? []).reduce((n, o) => n + Number(o.total), 0);
  const low = (lowStock ?? []).filter(v => v.stock_qty <= v.low_stock_threshold);

  return (
    <div>
      <h1 className="text-xl font-bold">Dashboard</h1>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          ['Orders today', String(todayOrders ?? 0)],
          ['Revenue this month', formatLKR(revenue)],
          ['Low-stock items', String(low.length)]
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl bg-card p-5">
            <p className="text-[12px] font-semibold text-muted">{k}</p>
            <p className="mt-1 text-2xl font-bold">{v}</p>
          </div>
        ))}
      </div>

      {low.length > 0 && (
        <div className="mt-5 rounded-2xl bg-warn-soft p-4 text-[13px]">
          <b className="text-warn">Low stock:</b>{' '}
          <span className="text-[#6b4a10]">{low.slice(0, 8).map(v => `${v.sku} (${v.stock_qty})`).join(' · ')}</span>
        </div>
      )}

      <h2 className="mb-3 mt-8 text-[15px] font-bold">Recent orders</h2>
      <div className="overflow-hidden rounded-2xl bg-card">
        {(recent ?? []).map((o, i) => (
          <Link key={o.id} href="/admin/orders"
            className={`flex items-center gap-4 px-4 py-3 text-[13.5px] hover:bg-paper ${i ? 'border-t border-[#EEF1F6]' : ''}`}>
            <b>{o.order_number}</b>
            <span className="capitalize text-muted">{o.status}</span>
            <span className="ml-auto font-bold">{formatLKR(o.total)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
