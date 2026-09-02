import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-clients/admin';
import { verifyKokoResponsePayload } from '@/lib/koko';
import { rateLimitByIp } from '@/lib/rate-limit';
import { sendNewOrderTelegram } from '@/lib/telegram';

// Koko server-to-server notification (form-encoded POST). Like PayHere's
// notify webhook, this — not the browser redirect — is the source of
// truth for whether payment actually succeeded.
export async function POST(req: NextRequest) {
  // Best-effort flood guard: every hit here (even a garbage/unsigned one)
  // costs a payment_events insert below, so cap the rate before doing any
  // work. Generous limit — Koko only ever calls this once per real
  // transaction, so legitimate traffic never gets near it.
  if (!(await rateLimitByIp('koko-webhook', 60, 60))) {
    return new NextResponse('rate limited', { status: 429 });
  }

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

  // Belt-and-braces: a SUCCESS with no transaction id isn't a payment Koko
  // could have actually sent us (their own signature would never have
  // matched this dataString without one) — refuse to confirm on it rather
  // than trust an empty string into the paid record.
  if (p.status === 'SUCCESS' && !p.trnId) {
    return new NextResponse('missing trnId', { status: 400 });
  }

  if (p.status === 'SUCCESS') {
    const { error } = await admin.rpc('confirm_order_paid_koko', {
      p_koko_order_id: p.orderId,
      p_koko_txn_id: p.trnId
    });
    if (error) return new NextResponse('rpc error', { status: 500 });

    // Notify staff on Telegram now that payment is genuinely confirmed —
    // mirrors the COD/WhatsApp notify-at-creation flow in checkout/actions.ts,
    // just fired from the webhook instead since online payments only notify
    // once the money has actually landed, not at order creation.
    if (matchedOrder) {
      after(async () => {
        const { data: full } = await admin.from('orders')
          .select('order_number, total, payment_method, fulfillment, customer_phone, shipping_address, order_items(product_name, qty, line_total)')
          .eq('id', matchedOrder.id).maybeSingle();
        if (!full) return;
        const addr = full.shipping_address as { name?: string; city?: string } | null;
        await sendNewOrderTelegram({
          orderNumber: full.order_number, total: full.total,
          paymentMethod: full.payment_method, fulfillment: full.fulfillment,
          customerName: addr?.name ?? 'Customer', customerPhone: full.customer_phone,
          city: addr?.city,
          items: full.order_items.map(i => ({ name: i.product_name, qty: i.qty, line: i.line_total }))
        });
      });
    }
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
