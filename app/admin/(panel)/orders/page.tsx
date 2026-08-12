import { getServerSupabase } from '@/lib/supabase-clients/server';
import { notifyLink } from '@/lib/whatsapp';
import OrderBoard from '@/components/admin/OrderBoard';
import type { AdminOrder } from '@/components/admin/OrderCard';

export const dynamic = 'force-dynamic';

type Row = {
  id: string;
  order_items: { qty: number; product_id: string | null; variant_id: string | null; product_name: string }[];
};

export default async function AdminOrders() {
  const supabase = (await getServerSupabase())!;
  // Active orders + recent cancelled (so owners can recall mistakes)
  const [{ data: activeData }, { data: cancelledData }] = await Promise.all([
    supabase.from('orders')
      .select('id, order_number, status, payment_status, payment_method, fulfillment, total, customer_phone, created_at, shipping_address, order_items(qty, product_id, variant_id, product_name)')
      .not('status', 'in', '(cancelled,dispatched)')
      .order('created_at', { ascending: false }).limit(200),
    supabase.from('orders')
      .select('id, order_number, status, payment_status, payment_method, fulfillment, total, customer_phone, created_at, shipping_address, order_items(qty, product_id, variant_id, product_name)')
      .eq('status', 'cancelled')
      .order('created_at', { ascending: false }).limit(30),
  ]);
  const data = [...(activeData ?? []), ...(cancelledData ?? [])];

  const rows = (data ?? []) as unknown as Row[];

  // Warranty period per product + serials already scanned. Both depend on
  // migration 0009 — if it isn't applied, these queries just return errors and
  // we fall back to "no warranty / no scan required" so the page still works.
  const productIds = [...new Set(rows.flatMap(o => o.order_items.map(i => i.product_id).filter(Boolean)))] as string[];
  const orderIds = rows.map(o => o.id);

  const { data: warr } = productIds.length
    ? await supabase.from('products').select('id, warranty_months').in('id', productIds)
    : { data: [] as { id: string; warranty_months: number }[] };
  const months = new Map((warr ?? []).map(p => [p.id, p.warranty_months ?? 0]));

  const { data: serials } = orderIds.length
    ? await supabase.from('order_item_serials').select('order_id').in('order_id', orderIds)
    : { data: [] as { order_id: string }[] };
  const scanned = new Map<string, number>();
  (serials ?? []).forEach(s => scanned.set(s.order_id, (scanned.get(s.order_id) ?? 0) + 1));

  const orders = rows.map(o => {
    const order_items = o.order_items.map(i => ({ ...i, warranty_months: i.product_id ? (months.get(i.product_id) ?? 0) : 0 }));
    const requiredSerials = order_items.reduce((n, i) => n + ((i.warranty_months ?? 0) > 0 ? i.qty : 0), 0);
    return { ...o, order_items, requiredSerials, scannedSerials: scanned.get(o.id) ?? 0 };
  }) as unknown as AdminOrder[];

  // wa.me links pre-built server-side; swapping to Cloud API later only touches lib/whatsapp.ts
  const waLinks = Object.fromEntries(orders.map(o => [
    o.id, notifyLink(o, o.status === 'pending' ? 'paid' : o.status)
  ]));

  return <OrderBoard orders={orders} waLinks={waLinks} />;
}
