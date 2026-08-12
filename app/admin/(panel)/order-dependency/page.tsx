import { getOrderDependencyReport } from '@/app/admin/actions';
import OrderDependencyBoard from '@/components/admin/OrderDependencyBoard';

export const dynamic = 'force-dynamic';

export default async function AdminOrderDependencyPage() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const initialRows = await getOrderDependencyReport(thirtyDaysAgo);

  return <OrderDependencyBoard initialRows={initialRows} />;
}
