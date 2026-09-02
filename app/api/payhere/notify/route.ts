import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-clients/admin';
import { verifyNotifySignature } from '@/lib/payhere';
import { rateLimitByIp } from '@/lib/rate-limit';

// PayHere server-to-server notification (form-encoded POST).
// Browser redirects are cosmetic; THIS is the source of truth.
export async function POST(req: NextRequest) {
  // Same flood guard as the Koko webhook — every hit costs a payment_events
  // insert below, even an unsigned one, so cap the rate before doing work.
  if (!(await rateLimitByIp('payhere-webhook', 60, 60))) {
    return new NextResponse('rate limited', { status: 429 });
  }

  const admin = getAdminSupabase();
  if (!admin) return new NextResponse('not configured', { status: 503 });

  const form = await req.formData();
  const p: Record<string, string> = {};
  form.forEach((v, k) => { p[k] = String(v); });

  const valid = verifyNotifySignature(p);

  // Log raw event first — reconciliation + dispute evidence
  await admin.from('payment_events').insert({
    provider: 'payhere',
    order_id: p.order_id ?? null,
    event_type: `status_${p.status_code}`,
    payload: p,
    signature_valid: valid
  });

  if (!valid) return new NextResponse('bad signature', { status: 400 });

  // status_code: 2 success · 0 pending · -1 cancelled · -2 failed · -3 chargeback
  if (p.status_code === '2') {
    const { error } = await admin.rpc('confirm_order_paid', {
      p_order_id: p.order_id,
      p_payhere_payment_id: p.payment_id ?? '',
      p_payhere_method: p.method ?? null
    });
    if (error) return new NextResponse('rpc error', { status: 500 });
  } else if (p.status_code === '-1' || p.status_code === '-2') {
    await admin.rpc('release_order_reservations', { p_order_id: p.order_id });
    await admin.from('orders')
      .update({ payment_status: 'failed' })
      .eq('id', p.order_id).eq('status', 'pending');
  }
  return new NextResponse('ok');
}
