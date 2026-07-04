'use server';

import { revalidatePath } from 'next/cache';
import { getServerSupabase } from '@/lib/supabase-clients/server';
import { getStaff } from '@/lib/admin-auth';

async function requireStaff(roles?: string[]) {
  const staff = await getStaff();
  if (!staff) throw new Error('forbidden');
  if (roles && !roles.includes(staff.role)) throw new Error('forbidden');
  return staff;
}

async function setSetting(key: string, value: Record<string, unknown>) {
  const supabase = (await getServerSupabase())!;
  const { error } = await supabase.from('site_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

export async function updateShipping(form: FormData) {
  await requireStaff(['owner', 'manager']);
  await setSetting('shipping', {
    free_over: Math.max(0, Number(form.get('free_over') || 0)),
  });
  revalidatePath('/admin/settings');
}

