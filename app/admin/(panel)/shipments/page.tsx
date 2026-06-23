import { getServerSupabase } from '@/lib/supabase-clients/server';
import { getCouriers } from '@/lib/data';
import ShipmentRow from '@/components/admin/ShipmentRow';
import PageHeader from '@/components/admin/PageHeader';
import type { Courier } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AdminShipments() {
  const supabase = (await getServerSupabase())!;
  const couriers = await getCouriers();
  // orders that are paid/packed/shipped (i.e. need dispatch or are in transit), with any shipment
  const { data: orders } = await supabase.from('orders')
    .select('id, order_number, status, customer_phone, shipping_address, fulfillment, shipments(id, courier_code, tracking_number, status)')
    .in('status', ['paid', 'packed', 'shipped']).eq('fulfillment', 'delivery')
    .order('created_at', { ascending: false }).limit(100);

  return (
    <div>
      <PageHeader title="Shipments" subtitle="Assign a courier & tracking number, then update status — customers can be notified on WhatsApp" />
      <div className="space-y-2.5">
        {(orders ?? []).map(o => (
          <ShipmentRow key={o.id} order={o as never} couriers={couriers as Courier[]} />
        ))}
        {!orders?.length && <p className="admin-card p-8 text-center text-[13px] text-muted">No orders awaiting dispatch.</p>}
      </div>
    </div>
  );
}
