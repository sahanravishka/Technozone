'use server';

import { getAdminSupabase } from '@/lib/supabase-clients/admin';
import { rateLimitByIp } from '@/lib/rate-limit';

export async function trackRepair(jobNumber: string, last4: string) {
  const admin = getAdminSupabase();
  if (!admin) return null;
  // throttle: the 4-digit phone last-4 is otherwise brute-forceable
  if (!(await rateLimitByIp('track', 15, 60))) return null;
  const { data } = await admin.rpc('track_service', {
    p_job: jobNumber.trim(), p_phone_last4: last4.trim()
  });
  return data?.[0] ?? null;
}
