import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-clients/admin';
import { verifyNotifySignature } from '@/lib/payhere';
import { rateLimitByIp } from '@/lib/rate-limit';
import { sendNewOrderEmail } from '@/lib/email';
import { sendNewOrderTelegram } from '@/lib/telegram';

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
    const { data: transitioned, error } = await admin.rpc('confirm_order_paid', {
      p_order_id: p.order_id,
      p_payhere_payment_id: p.payment_id ?? '',
      p_payhere_method: p.method ?? null
    });
    if (error) return new NextResponse('rpc error', { status: 500 });

    // Unlike COD/WhatsApp (notified at creation) and Koko (already notified
    // from its own webhook), a paid PayHere order never told staff it
    // existed — nothing here ever called sendNewOrderTelegram/Email. Only
    // alert on the call that actually flipped the order to paid, not on a
    // webhook retry replaying an already-confirmed one.
    if (transitioned) {
      after(async () => {
        const { data: full, error: fetchErr } = await admin.from('orders')
          .select('order_number, total, payment_method, fulfillment, customer_phone, shipping_address, order_items(product_name, qty, line_total)')
          .eq('id', p.order_id).maybeSingle();
        if (!full) {
          console.error('[payhere] order paid but could not re-fetch it for the alert', p.order_id, fetchErr?.message);
          return;
        }
        const addr = full.shipping_address as { name?: string; city?: string } | null;
        const payload = {
          orderNumber: full.order_number, total: full.total,
          paymentMethod: full.payment_method, fulfillment: full.fulfillment,
          customerName: addr?.name ?? 'Customer', customerPhone: full.customer_phone,
          city: addr?.city,
          items: full.order_items.map(i => ({ name: i.product_name, qty: i.qty, line: i.line_total }))
        };
        await sendNewOrderEmail(payload);
        await sendNewOrderTelegram(payload);
      });
    }
  } else if (p.status_code === '-1' || p.status_code === '-2') {
    await admin.rpc('release_order_reservations', { p_order_id: p.order_id });
    await admin.from('orders')
      .update({ payment_status: 'failed' })
      .eq('id', p.order_id).eq('status', 'pending');
  }
  return new NextResponse('ok');
}
