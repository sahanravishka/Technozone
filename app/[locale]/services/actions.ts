'use server';

import { getAdminSupabase } from '@/lib/supabase-clients/admin';

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

  const { data, error } = await admin.from('service_jobs').insert({
    customer_name: input.name.trim(),
    customer_phone: input.phone.trim(),
    device_brand: input.brand.trim() || null,
    device_model: input.model.trim() || null,
    service_type_id: input.serviceTypeId || null,
    service_category: input.serviceCategory || null,
    issue: input.issue.trim() || null
  }).select('job_number').single();

  if (error || !data) return { ok: false };
  return { ok: true, jobNumber: data.job_number };
}
