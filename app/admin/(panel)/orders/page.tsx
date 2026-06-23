import { getServerSupabase } from '@/lib/supabase-clients/server';
import { notifyLink } from '@/lib/whatsapp';
import OrderBoard from '@/components/admin/OrderBoard';
import type { AdminOrder } from '@/components/admin/OrderCard';

export const dynamic = 'force-dynamic';

export default async function AdminOrders() {
  const supabase = (await getServerSupabase())!;
  const { data } = await supabase.from('orders')
    .select('id, order_number, status, payment_status, payment_method, fulfillment, total, customer_phone, created_at, shipping_address, order_items(qty)')
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false }).limit(200);

  const orders = (data ?? []) as unknown as AdminOrder[];
  // wa.me links pre-built server-side; swapping to Cloud API later only touches lib/whatsapp.ts
  const waLinks = Object.fromEntries(orders.map(o => [
    o.id, notifyLink(o, o.status === 'pending' ? 'paid' : o.status)
  ]));

  return <OrderBoard orders={orders} waLinks={waLinks} />;
}
