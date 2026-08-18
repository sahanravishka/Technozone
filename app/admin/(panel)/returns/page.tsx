import { getServerSupabase } from '@/lib/supabase-clients/server';
import ReturnsBoard from '@/components/admin/ReturnsBoard';

export const dynamic = 'force-dynamic';

export default async function AdminReturns() {
  const supabase = (await getServerSupabase())!;
  const { data: rows } = await supabase.from('returns')
    .select('id, rma_number, order_id, customer_name, customer_phone, reason, status, refund_amount, restock, orders(order_number, total), return_items(product_name, qty)')
    .neq('status', 'rejected').order('created_at', { ascending: false }).limit(200);

  return <ReturnsBoard rows={(rows ?? []) as never} />;
}
