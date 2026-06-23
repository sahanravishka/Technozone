'use server';
import { getAdminSupabase } from '@/lib/supabase-clients/admin';
import { rateLimitByIp } from '@/lib/rate-limit';

export async function requestReturn(orderNumber: string, phone: string, reason: string):
  Promise<{ ok: boolean; rma?: string }> {
  const admin = getAdminSupabase();
  if (!admin) return { ok: false };
  if (!orderNumber.trim() || !phone.trim()) return { ok: false };
  // throttle order-number + phone guessing
  if (!(await rateLimitByIp('return', 10, 60))) return { ok: false };
  const { data, error } = await admin.rpc('request_return', {
    p_order_number: orderNumber.trim(), p_phone: phone.trim(), p_reason: reason.trim() || null
  });
  if (error || !data) return { ok: false };
  return { ok: true, rma: data as string };
}
