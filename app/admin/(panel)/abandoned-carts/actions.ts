'use server';

import { revalidatePath } from 'next/cache';
import { getServerSupabase } from '@/lib/supabase-clients/server';
import { getStaff } from '@/lib/admin-auth';

async function requireStaff() {
  const staff = await getStaff();
  if (!staff) throw new Error('forbidden');
  return staff;
}

export async function dismissAbandonedCart(id: string) {
  await requireStaff();
  const supabase = (await getServerSupabase())!;
  await supabase.from('abandoned_checkouts').update({ dismissed: true }).eq('id', id);
  revalidatePath('/admin/abandoned-carts');
}
