'use server';

import { revalidatePath } from 'next/cache';
import { getServerSupabase } from '@/lib/supabase-clients/server';
import { getStaff } from '@/lib/admin-auth';

async function requireStaff() {
  const staff = await getStaff();
  if (!staff) throw new Error('forbidden');
  return staff;
}

export async function markNotified(ids: string[]) {
  await requireStaff();
  if (!ids.length) return;
  const supabase = (await getServerSupabase())!;
  const { error } = await supabase.from('stock_notify_requests')
    .update({ notified: true, notified_at: new Date().toISOString() }).in('id', ids);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/stock-alerts');
}

export async function deleteStockRequest(id: string) {
  await requireStaff();
  const supabase = (await getServerSupabase())!;
  await supabase.from('stock_notify_requests').delete().eq('id', id);
  revalidatePath('/admin/stock-alerts');
}
