'use server';

import { getAdminSupabase } from '@/lib/supabase-clients/admin';
import { rateLimitByIp } from '@/lib/rate-limit';

export async function requestRepair(input: {
  name: string; phone: string; brand: string; model: string;
  serviceTypeId?: string; serviceCategory: string; issue: string;
}): Promise<{ ok: boolean; jobNumber?: string }> {
  const admin = getAdminSupabase();
  if (!admin) {
    // demo mode: no DB — hand off via WhatsApp on the client instead
    return { ok: false };
  }
  if (!input.name.trim() || !input.phone.trim()) return { ok: false };
  // Unauthenticated public intake with no prior throttle — cap the hit rate
  // and bound every free-text field so it can't flood the repairs queue or
  // bloat the table.
  if (!(await rateLimitByIp('repair-request', 10, 60))) return { ok: false };

  const { data, error } = await admin.from('service_jobs').insert({
    customer_name: input.name.trim().slice(0, 120),
    customer_phone: input.phone.trim().slice(0, 20),
    device_brand: input.brand.trim().slice(0, 80) || null,
    device_model: input.model.trim().slice(0, 80) || null,
    service_type_id: input.serviceTypeId || null,
    service_category: input.serviceCategory?.trim().slice(0, 80) || null,
    issue: input.issue.trim().slice(0, 2000) || null
  }).select('job_number').single();

  if (error || !data) return { ok: false };
  return { ok: true, jobNumber: data.job_number };
}
