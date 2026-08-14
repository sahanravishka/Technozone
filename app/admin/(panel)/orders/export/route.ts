import { getStaff } from '@/lib/admin-auth';
import { getServerSupabase } from '@/lib/supabase-clients/server';

// Orders CSV export — filterable by channel (web/facebook/all) and a date
// range. Used by the "Export CSV" control on the Facebook Orders tab, but
// works generically for any channel via query params. Staff-gated.
export const dynamic = 'force-dynamic';

const csvCell = (v: unknown) => {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET(req: Request) {
  const staff = await getStaff();
  if (!staff) return new Response('forbidden', { status: 403 });

  const url = new URL(req.url);
  const channel = url.searchParams.get('channel'); // 'web' | 'facebook' | null (= all)
  const from = url.searchParams.get('from');        // YYYY-MM-DD
  const to = url.searchParams.get('to');             // YYYY-MM-DD

  const supabase = (await getServerSupabase())!;
  let q = supabase.from('orders')
    .select(`id, order_number, channel, status, payment_status, payment_method, fulfillment,
             subtotal, discount_total, delivery_fee, total, customer_phone, shipping_address,
             notes, created_at,
             order_items ( qty, product_name, variant_name, sku, unit_price, line_total )`)
    .order('created_at', { ascending: false });

  if (channel) q = q.eq('channel', channel);
  if (from) q = q.gte('created_at', `${from}T00:00:00`);
  if (to) q = q.lte('created_at', `${to}T23:59:59`);

  const { data: orders, error } = await q;
  if (error) return new Response(`query failed: ${error.message}`, { status: 500 });

  const header = [
    'Order Number', 'Channel', 'Status', 'Payment Status', 'Payment Method', 'Fulfillment',
    'Customer Name', 'Phone', 'Phone 2', 'City', 'Address', 'Note',
    'Items', 'Subtotal (LKR)', 'Discount (LKR)', 'Delivery Fee (LKR)', 'Total (LKR)', 'Placed At'
  ];
  const rows: string[] = [header.join(',')];

  for (const o of orders ?? []) {
    const addr = (o.shipping_address ?? {}) as { name?: string; phone2?: string; city?: string; line1?: string };
    const items = (o.order_items ?? []) as { qty: number; product_name: string; variant_name?: string }[];
    const itemsText = items.map(i => `${i.qty}x ${i.product_name}${i.variant_name && i.variant_name !== 'Default' ? ` (${i.variant_name})` : ''}`).join('; ');

    rows.push([
      o.order_number, o.channel ?? 'web', o.status, o.payment_status, o.payment_method, o.fulfillment,
      addr.name ?? '', o.customer_phone, addr.phone2 ?? '', addr.city ?? '', addr.line1 ?? '', o.notes ?? '',
      itemsText, o.subtotal, o.discount_total, o.delivery_fee, o.total,
      new Date(o.created_at).toLocaleString('en-LK')
    ].map(csvCell).join(','));
  }

  const label = channel ? `${channel}-orders` : 'all-orders';
  const range = from || to ? `_${from ?? 'start'}_to_${to ?? 'now'}` : '';
  const filename = `${label}${range}.csv`;

  return new Response(rows.join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
