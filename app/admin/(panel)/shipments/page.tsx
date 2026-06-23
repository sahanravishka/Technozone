import { getServerSupabase } from '@/lib/supabase-clients/server';
import { getCouriers } from '@/lib/data';
import ShipmentRow from '@/components/admin/ShipmentRow';
import PageHeader from '@/components/admin/PageHeader';
import type { Courier } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AdminShipments({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const supabase = (await getServerSupabase())!;
  const couriers = await getCouriers();

  // Scan-to-order: a scanned packing-slip QR pastes a URL (…?focus=<uuid>);
  // a typed/scanned code is an order number (ORD-001234). Resolve either.
  const focus = q?.match(/focus=([0-9a-f-]{36})/i)?.[1] ?? null;
  const orderNo = q?.match(/ORD-\d+/i)?.[0]?.toUpperCase() ?? (q?.trim() ? q.trim() : null);

  let query = supabase.from('orders')
    .select('id, order_number, status, customer_phone, shipping_address, fulfillment, shipments(id, courier_code, tracking_number, status), order_items(variant_id, product_name, variant_name)')
    .order('created_at', { ascending: false }).limit(100);

  if (focus) {
    query = query.eq('id', focus);                       // exact order from a scanned slip
  } else if (orderNo) {
    query = query.ilike('order_number', `%${orderNo}%`); // typed / scanned order number
  } else {
    // default board: orders that need dispatch or are in transit
    query = query.in('status', ['paid', 'packed', 'shipped']).eq('fulfillment', 'delivery');
  }
  const { data: orders } = await query;

  return (
    <div>
      <PageHeader title="Shipments" subtitle="Assign a courier & tracking number, then update status — customers can be notified on WhatsApp" />
      <form className="mb-3 flex items-center gap-2">
        <input name="q" defaultValue={q ?? ''} autoFocus placeholder="Scan packing-slip QR or type order # (ORD-…)…"
          className="admin-card h-11 w-full max-w-md px-4 text-[14px] outline-none focus:ring-2 focus:ring-volt" />
        {q && <a href="/admin/shipments" className="pressable admin-card px-3.5 py-2.5 text-[12.5px] font-semibold text-muted hover:bg-paper">Clear</a>}
      </form>
      <div className="space-y-2.5">
        {(orders ?? []).map(o => (
          <ShipmentRow key={o.id} order={o as never} couriers={couriers as Courier[]} />
        ))}
        {!orders?.length && <p className="admin-card p-8 text-center text-[13px] text-muted">{q ? `No order matched “${q}”.` : 'No orders awaiting dispatch.'}</p>}
      </div>
    </div>
  );
}
