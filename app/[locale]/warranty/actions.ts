'use server';
import { getAdminSupabase } from '@/lib/supabase-clients/admin';
import { rateLimitByIp } from '@/lib/rate-limit';

export async function checkWarranty(serial: string, last4: string) {
  const admin = getAdminSupabase();
  if (!admin) return [];
  // throttle: the 4-digit phone last-4 is otherwise brute-forceable
  if (!(await rateLimitByIp('warranty', 15, 60))) return [];
  const { data } = await admin.rpc('lookup_warranty', {
    p_serial: serial.trim() || null, p_phone_last4: last4.trim() || null
  });
  return data ?? [];
}
