import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-clients/admin';
import { verifyKokoResponsePayload } from '@/lib/koko';

// Koko server-to-server notification (form-encoded POST). Like PayHere's
// notify webhook, this — not the browser redirect — is the source of
// truth for whether payment actually succeeded.
export async function POST(req: NextRequest) {
  const admin = getAdminSupabase();
  if (!admin) return new NextResponse('not configured', { status: 503 });

  const form = await req.formData();
  const p: Record<string, string> = {};
  form.forEach((v, k) => { p[k] = String(v); });

  const valid = verifyKokoResponsePayload({
    orderId: p.orderId ?? '', trnId: p.trnId ?? '',
    status: p.status ?? '', desc: p.desc ?? '', signature: p.signature ?? ''
  });

  // Koko's orderId is our custom string (see newKokoOrderId), not our own
  // order uuid — resolve it so the audit log links properly.
  const { data: matchedOrder } = p.orderId
    ? await admin.from('orders').select('id').eq('koko_order_id', p.orderId).maybeSingle()
    : { data: null };

  // Log raw event first — reconciliation + dispute evidence, regardless
  // of validity, same pattern as the PayHere notify handler.
  await admin.from('payment_events').insert({
    provider: 'koko',
    order_id: matchedOrder?.id ?? null,
    event_type: `status_${p.status ?? 'unknown'}`,
    payload: p,
    signature_valid: valid
  });

  if (!valid) return new NextResponse('bad signature', { status: 400 });

  if (p.status === 'SUCCESS') {
    const { error } = await admin.rpc('confirm_order_paid_koko', {
      p_koko_order_id: p.orderId,
      p_koko_txn_id: p.trnId
    });
    if (error) return new NextResponse('rpc error', { status: 500 });
  } else if (p.status === 'FAILED' || p.status === 'CANCELED') {
    if (matchedOrder) {
      await admin.rpc('release_order_reservations', { p_order_id: matchedOrder.id });
      await admin.from('orders')
        .update({ payment_status: 'failed' })
        .eq('id', matchedOrder.id).eq('status', 'pending');
    }
  }
  return new NextResponse('ok');
}
