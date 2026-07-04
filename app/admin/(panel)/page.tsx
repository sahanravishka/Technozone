import Link from 'next/link';
import { getServerSupabase } from '@/lib/supabase-clients/server';
import { formatLKR } from '@/lib/site';
import PageHeader from '@/components/admin/PageHeader';
import RevenueChart from '@/components/admin/RevenueChart';
import DashboardExport from '@/components/admin/DashboardExport';

export const dynamic = 'force-dynamic';

const STATUS_CLS: Record<string, string> = {
  pending: 'bg-warn-soft text-warn',
  paid: 'bg-volt-soft text-volt',
  packed: 'bg-volt-soft text-volt',
  shipped: 'bg-volt-soft text-volt',
  delivered: 'bg-[#E8F7EE] text-ok',
  cancelled: 'bg-paper text-muted'
};

const PAID_STATUSES = ['paid', 'packed', 'shipped', 'delivered'];
const OPEN_REPAIR = ['received', 'diagnosing', 'awaiting_approval', 'repairing', 'ready'];
const RANGES = [7, 30, 90] as const;

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const sp = await searchParams;
  const range = RANGES.includes(Number(sp.range) as (typeof RANGES)[number]) ? Number(sp.range) : 30;

  const supabase = (await getServerSupabase())!;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const rangeStart = new Date(today); rangeStart.setDate(rangeStart.getDate() - (range - 1));
  const prevStart = new Date(rangeStart); prevStart.setDate(prevStart.getDate() - range);

  const [
    { count: todayOrders }, { data: monthPaid }, { data: lowStock }, { data: recent },
    { data: rangeOrders }, { data: rangeItems }, { data: prevOrders },
    { count: pendingOrders }, { count: pendingReturns }, { count: pendingReviews },
    { count: openRepairs }, { count: newCustomers }
  ] = await Promise.all([
    supabase.from('orders').select('id', { count: 'exact', head: true })
      .gte('created_at', today.toISOString()),
    supabase.from('orders').select('total')
      .gte('created_at', monthStart.toISOString())
      .in('status', PAID_STATUSES),
    supabase.from('product_variants').select('id, sku, stock_qty, low_stock_threshold')
      .eq('is_active', true).order('stock_qty').limit(50),
    supabase.from('orders').select('id, order_number, status, total, created_at')
      .order('created_at', { ascending: false }).limit(8),
    supabase.from('orders').select('id, order_number, status, total, created_at, customer_phone, shipping_address')
      .gte('created_at', rangeStart.toISOString()).order('created_at', { ascending: true }).limit(2000),
    supabase.from('order_items').select('product_name, qty, line_total, order_id, orders!inner(created_at, status)')
      .gte('orders.created_at', rangeStart.toISOString()).in('orders.status', PAID_STATUSES).limit(5000),
    supabase.from('orders').select('total, status')
      .gte('created_at', prevStart.toISOString()).lt('created_at', rangeStart.toISOString())
      .in('status', PAID_STATUSES).limit(2000),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('returns').select('id', { count: 'exact', head: true }).eq('status', 'requested'),
    supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('service_jobs').select('id', { count: 'exact', head: true }).in('status', OPEN_REPAIR),
    supabase.from('customers').select('id', { count: 'exact', head: true }).gte('created_at', monthStart.toISOString())
  ]);

  const revenue = (monthPaid ?? []).reduce((n, o) => n + Number(o.total), 0);
  const low = (lowStock ?? []).filter(v => v.stock_qty <= v.low_stock_threshold);

  // Daily revenue series for the selected range (paid+ orders only)
  const byDay = new Map<string, number>();
  for (let i = 0; i < range; i++) {
    const d = new Date(rangeStart); d.setDate(d.getDate() + i);
    byDay.set(d.toISOString().slice(0, 10), 0);
  }
  let paidCount = 0;
  for (const o of rangeOrders ?? []) {
    if (!PAID_STATUSES.includes(o.status)) continue;
    paidCount++;
    const key = o.created_at.slice(0, 10);
    if (byDay.has(key)) byDay.set(key, (byDay.get(key) ?? 0) + Number(o.total));
  }
  const chartData = [...byDay.entries()].map(([date, value]) => ({
    label: new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), value
  }));
  const rangeRevenue = chartData.reduce((n, d) => n + d.value, 0);

  // vs. previous window of the same length -> honest growth signal
  const prevRevenue = (prevOrders ?? []).reduce((n, o) => n + Number(o.total), 0);
  const growth = prevRevenue > 0 ? ((rangeRevenue - prevRevenue) / prevRevenue) * 100 : null;
  const aov = paidCount > 0 ? rangeRevenue / paidCount : 0;

  // Best sellers within the range
  const bestMap = new Map<string, { qty: number; revenue: number }>();
  for (const it of rangeItems ?? []) {
    const cur = bestMap.get(it.product_name) ?? { qty: 0, revenue: 0 };
    cur.qty += it.qty;
    cur.revenue += Number(it.line_total);
    bestMap.set(it.product_name, cur);
  }
  const bestSellers = [...bestMap.entries()]
    .sort((a, b) => b[1].qty - a[1].qty)
    .slice(0, 5);

  // Top customers within the range (by paid revenue, keyed on phone)
  const custMap = new Map<string, { name: string; orders: number; revenue: number }>();
  for (const o of rangeOrders ?? []) {
    if (!PAID_STATUSES.includes(o.status)) continue;
    const phone = o.customer_phone ?? '—';
    const addr = o.shipping_address as { name?: string; full_name?: string } | null;
    const cur = custMap.get(phone) ?? { name: addr?.name || addr?.full_name || phone, orders: 0, revenue: 0 };
    cur.orders += 1;
    cur.revenue += Number(o.total);
    custMap.set(phone, cur);
  }
  const topCustomers = [...custMap.entries()]
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5);

  // The "what needs me right now" inbox — the heart of a no-developer admin
  const inbox = [
    { count: pendingOrders ?? 0, label: 'orders waiting to be confirmed', href: '/admin/orders', cta: 'Process' },
    { count: pendingReturns ?? 0, label: 'return requests to review', href: '/admin/returns', cta: 'Review' },
    { count: pendingReviews ?? 0, label: 'reviews waiting for approval', href: '/admin/reviews', cta: 'Moderate' },
    { count: openRepairs ?? 0, label: 'repair jobs in progress', href: '/admin/repairs', cta: 'View' },
    { count: low.length, label: 'products low on stock', href: '/admin/products', cta: 'Restock' }
  ].filter(t => t.count > 0);

  const stats: { label: string; value: string; sub?: string; accent: string; icon: React.ReactNode }[] = [
    {
      label: 'Orders today', value: String(todayOrders ?? 0), accent: 'text-volt',
      icon: <path d="M6 2 4 6v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6l-2-4zM4 6h16M9 10a3 3 0 0 0 6 0" />
    },
    {
      label: 'Revenue this month', value: formatLKR(revenue), accent: 'text-ok',
      icon: <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    },
    {
      label: `Avg. order · ${range}d`, value: formatLKR(Math.round(aov)),
      sub: `${paidCount} paid orders`, accent: 'text-accent',
      icon: <path d="M3 3v18h18M7 15l4-4 3 3 5-6" />
    },
    {
      label: 'New customers · month', value: String(newCustomers ?? 0), accent: 'text-volt',
      icon: <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    }
  ];

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Today at a glance" />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(s => (
          <div key={s.label} className="admin-card flex items-center gap-4 p-5">
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-paper ${s.accent}`}>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                {s.icon}
              </svg>
            </span>
            <span className="min-w-0">
              <span className="block text-[12px] font-semibold text-muted">{s.label}</span>
              <span className="mt-0.5 block truncate text-xl font-bold tracking-tight lg:text-2xl">{s.value}</span>
              {s.sub && <span className="block text-[11px] text-muted">{s.sub}</span>}
            </span>
          </div>
        ))}
      </div>

      {/* Action inbox — everything that needs a human, one click away */}
      <div className="admin-card mt-4 p-5">
        <h2 className="text-[15px] font-bold">Needs your attention</h2>
        {inbox.length === 0 ? (
          <p className="mt-2 text-[13px] text-muted">All caught up — nothing is waiting on you. 🎉</p>
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {inbox.map(t => (
              <li key={t.href + t.label}>
                <Link href={t.href}
                  className="pressable flex items-center gap-3 rounded-xl bg-paper px-4 py-3 text-[13px] transition-colors hover:bg-line/60">
                  <b className="grid h-7 min-w-7 place-items-center rounded-full bg-warn-soft px-2 text-[12px] font-bold text-warn">{t.count}</b>
                  <span className="min-w-0 flex-1 truncate font-semibold">{t.label}</span>
                  <span className="shrink-0 text-[12px] font-bold text-volt">{t.cta} →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Revenue trend */}
      <div className="admin-card mt-8 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-bold">Revenue trend</h2>
            <p className="mt-0.5 text-[12.5px] text-muted">
              {formatLKR(rangeRevenue)} over the last {range} days
              {growth !== null && (
                <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-bold ${growth >= 0 ? 'bg-[#E8F7EE] text-ok' : 'bg-warn-soft text-warn'}`}>
                  {growth >= 0 ? '▲' : '▼'} {Math.abs(growth).toFixed(1)}% vs previous {range}d
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {RANGES.map(r => (
              <Link key={r} href={`/admin?range=${r}`}
                className={`pressable rounded-lg px-3 py-1.5 text-[12px] font-semibold ${r === range ? 'bg-volt text-white' : 'bg-paper text-muted hover:bg-line'}`}>
                {r}d
              </Link>
            ))}
            <DashboardExport orders={rangeOrders ?? []} rangeLabel={`${range}d`} />
          </div>
        </div>
        <RevenueChart data={chartData} />
      </div>

      {/* Best sellers + recent orders */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-[15px] font-bold">Best sellers <span className="font-normal text-muted">· last {range} days</span></h2>
          <div className="admin-card overflow-hidden">
            {bestSellers.length ? bestSellers.map(([name, s], i) => (
              <div key={name} className={`flex items-center gap-3 px-4 py-3 text-[13px] ${i ? 'border-t border-line/70' : ''}`}>
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-paper text-[11px] font-bold text-muted">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate font-semibold">{name}</span>
                <span className="text-[12px] text-muted">{s.qty} sold</span>
                <span className="w-24 text-right font-bold">{formatLKR(s.revenue)}</span>
              </div>
            )) : (
              <p className="p-8 text-center text-[13px] text-muted">No sales in this range yet.</p>
            )}
          </div>

          <h2 className="mb-3 mt-6 text-[15px] font-bold">Top customers <span className="font-normal text-muted">· last {range} days</span></h2>
          <div className="admin-card overflow-hidden">
            {topCustomers.length ? topCustomers.map(([phone, c], i) => (
              <div key={phone} className={`flex items-center gap-3 px-4 py-3 text-[13px] ${i ? 'border-t border-line/70' : ''}`}>
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-paper text-[11px] font-bold text-muted">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{c.name}</span>
                  <span className="block text-[11px] text-muted">{phone}</span>
                </span>
                <span className="text-[12px] text-muted">{c.orders} order{c.orders > 1 ? 's' : ''}</span>
                <span className="w-24 text-right font-bold">{formatLKR(c.revenue)}</span>
              </div>
            )) : (
              <p className="p-8 text-center text-[13px] text-muted">No paid orders in this range yet.</p>
            )}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-bold">Recent orders</h2>
            <Link href="/admin/orders" className="text-[12.5px] font-semibold text-volt hover:underline">View all →</Link>
          </div>
          <div className="admin-card overflow-hidden">
            {(recent ?? []).map((o, i) => (
              <Link key={o.id} href="/admin/orders"
                className={`flex items-center gap-3 px-4 py-3.5 text-[13.5px] transition-colors hover:bg-paper ${i ? 'border-t border-line/70' : ''}`}>
                <b className="font-semibold">{o.order_number}</b>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS_CLS[o.status] ?? 'bg-paper text-muted'}`}>{o.status}</span>
                <span className="ml-auto font-bold">{formatLKR(o.total)}</span>
              </Link>
            ))}
            {!recent?.length && <p className="p-8 text-center text-[13px] text-muted">No orders yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
