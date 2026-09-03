import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { queryKokoOrderStatus } from './koko';
import { sendNewOrderTelegram } from './telegram';

/**
 * Actively reconciles one Koko order against Koko's Merchant Order View API
 * and applies the exact same state transition the response webhook applies
 * on SUCCESS/FAILED — used both as an admin "recheck now" action and as a
 * self-healing fallback on the customer's order page when the passive
 * webhook hasn't shown up yet (see order/[id]/page.tsx).
 *
 * A PENDING result, or no verifiable result at all (network error, bad
 * signature), is treated as "no news" — the order is left exactly as it
 * was. This never marks anything paid/failed on our own say-so; only a
 * genuinely Koko-signed SUCCESS/FAILED status does that, same trust
 * boundary as the webhook.
 */
export async function reconcileKokoOrder(
  admin: SupabaseClient, orderId: string, kokoOrderId: string
): Promise<'paid' | 'failed' | 'pending' | 'unknown'> {
  const result = await queryKokoOrderStatus(kokoOrderId);
  if (!result) return 'unknown';

  if (result.status === 'SUCCESS') {
    const { data: transitioned, error } = await admin.rpc('confirm_order_paid_koko', {
      p_koko_order_id: kokoOrderId, p_koko_txn_id: result.trnId
    });
    if (error) return 'unknown';
    // The RPC is idempotent and can be reached concurrently (a customer's
    // auto-refresh, the admin "Recheck with Koko" button, and the webhook
    // can all land near-simultaneously) — only alert staff on the call that
    // actually flipped the order to paid, never on one that found it
    // already confirmed.
    if (!transitioned) return 'paid';

    const { data: full, error: fetchErr } = await admin.from('orders')
      .select('order_number, total, payment_method, fulfillment, customer_phone, shipping_address, order_items(product_name, qty, line_total)')
      .eq('id', orderId).maybeSingle();
    if (full) {
      const addr = full.shipping_address as { name?: string; city?: string } | null;
      await sendNewOrderTelegram({
        orderNumber: full.order_number, total: full.total,
        paymentMethod: full.payment_method, fulfillment: full.fulfillment,
        customerName: addr?.name ?? 'Customer', customerPhone: full.customer_phone,
        city: addr?.city,
        items: full.order_items.map(i => ({ name: i.product_name, qty: i.qty, line: i.line_total }))
      });
    } else {
      // Payment was genuinely confirmed (the RPC above succeeded) — this
      // only skips the ALERT, never the confirmation itself. Worth a loud
      // log rather than silently dropping it: if this ever fires, staff
      // would otherwise have no idea a paid order came in.
      console.error('[koko-reconcile] order paid but could not re-fetch it for the Telegram alert', orderId, fetchErr?.message);
    }
    return 'paid';
  }

  if (result.status === 'FAILED') {
    await admin.rpc('release_order_reservations', { p_order_id: orderId });
    await admin.from('orders')
      .update({ payment_status: 'failed' })
      .eq('id', orderId).eq('status', 'pending');
    return 'failed';
  }

  return 'pending';
}
