import { getServerSupabase } from '@/lib/supabase-clients/server';
import { notifyLink } from '@/lib/whatsapp';
import InvoiceBoard from '@/components/admin/InvoiceBoard';
import type { AdminOrder } from '@/components/admin/OrderCard';

export const dynamic = 'force-dynamic';

type Row = {
  id: string;
  order_items: { qty: number; product_id: string | null; variant_id: string | null; product_name: string }[];
};

export default async function AdminInvoicesPage() {
  const supabase = (await getServerSupabase())!;

  // Dispatched orders = Generated Invoices
  const { data } = await supabase.from('orders')
    .select('id, order_number, status, payment_status, payment_method, fulfillment, total, customer_phone, created_at, shipping_address, order_items(qty, product_id, variant_id, product_name)')
    .eq('status', 'dispatched')
    .order('created_at', { ascending: false }).limit(300);

  const rows = (data ?? []) as unknown as Row[];

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

  const invoices = rows.map(o => {
    const order_items = o.order_items.map(i => ({ ...i, warranty_months: i.product_id ? (months.get(i.product_id) ?? 0) : 0 }));
    const requiredSerials = order_items.reduce((n, i) => n + ((i.warranty_months ?? 0) > 0 ? i.qty : 0), 0);
    return { ...o, order_items, requiredSerials, scannedSerials: scanned.get(o.id) ?? 0 };
  }) as unknown as AdminOrder[];

  const waLinks = Object.fromEntries(invoices.map(o => [
    o.id, notifyLink(o, 'dispatched')
  ]));

  return <InvoiceBoard invoices={invoices} waLinks={waLinks} />;
}
