'use server';

import { after } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-clients/admin';
import { rateLimitByIp } from '@/lib/rate-limit';
import { sendNewOrderEmail } from '@/lib/email';
import { sendNewOrderTelegram } from '@/lib/telegram';

export type LeadLine = { variantId: string; qty: number };

export type SubmitResult =
  | { ok: true; orderNumber: string }
  | { ok: false; error: string };

export async function submitFacebookOrder(input: {
  lines: LeadLine[];
  name: string;
  address: string;
  city: string;
  phone1: string;
  phone2?: string;
  note?: string;
}): Promise<SubmitResult> {
  if (!(await rateLimitByIp('order-form', 10, 60))) {
    return { ok: false, error: 'Too many submissions — please try again in a minute.' };
  }

  const admin = getAdminSupabase();
  if (!admin) return { ok: false, error: 'Server not configured.' };

  const name = input.name.trim();
  const address = input.address.trim();
  const city = input.city.trim();
  const phone1 = input.phone1.trim();
  const phone2 = input.phone2?.trim();

  if (!input.lines.length) return { ok: false, error: 'Select at least one item.' };
  if (!name || !address || !city || !phone1) return { ok: false, error: 'Please fill in all required fields.' };
  if (!/^0\d{9}$/.test(phone1.replace(/\s/g, ''))) return { ok: false, error: 'Enter a valid mobile number (e.g. 0771234567).' };
  if (phone2 && !/^0\d{9}$/.test(phone2.replace(/\s/g, ''))) return { ok: false, error: 'Second mobile number looks invalid.' };

  // ---- Re-price server-side from the current catalog ----
  const variantIds = input.lines.map(l => l.variantId);
  // Match the storefront reads (and checkout): never let a deactivated
  // variant, or a hidden/trashed product, be ordered through this form.
  const { data: variants, error: vErr } = await admin.from('product_variants')
    .select('id, sku, name, price, product_id')
    .in('id', variantIds).eq('is_active', true);
  if (vErr || !variants || variants.length !== variantIds.length) {
    return { ok: false, error: 'One or more selected items are no longer available.' };
  }
  const productIds = [...new Set(variants.map(v => v.product_id))];
  const { data: products, error: pErr } = await admin.from('products')
    .select('id, name').in('id', productIds).eq('is_active', true).is('deleted_at', null);
  if (pErr || !products) return { ok: false, error: 'Could not load product details.' };
  if (products.length !== productIds.length) {
    return { ok: false, error: 'One or more selected items are no longer available.' };
  }

  // Bound the order the same way checkout does — this endpoint is public
  // (the page is only noindex'd, which is not access control), so it needs
  // its own limits rather than relying on the Facebook link staying private.
  if (input.lines.length > 20) {
    return { ok: false, error: 'Too many items for one order — please contact us on WhatsApp.' };
  }

  const items = input.lines.map(l => {
    const v = variants.find(x => x.id === l.variantId)!;
    const p = products.find(x => x.id === v.product_id)!;
    const qty = Math.max(1, Math.min(l.qty, 99));
    const unit_price = Number(v.price);
    return {
      product_id: p.id, variant_id: v.id, product_name: p.name,
      variant_name: v.name, sku: v.sku,
      unit_price, discount_each: 0, qty, line_total: unit_price * qty
    };
  });
  const subtotal = items.reduce((n, i) => n + i.line_total, 0);

  // These are cash-on-delivery orders, and this path skipped the COD gate the
  // main checkout enforces — so a number the shop had blocked for repeatedly
  // not collecting could simply order here instead, straight past the only
  // control the shop has against that. Same fail-closed handling as checkout.
  const { data: cod, error: codErr } = await admin.rpc('cod_allowed',
    { p_phone: phone1, p_total: subtotal });
  const codRow = cod?.[0];
  if (codErr || !codRow) {
    console.error('[order-form] cod_allowed check failed — refusing rather than ' +
      'bypassing the blocklist:', codErr?.message ?? 'no row returned');
    return { ok: false, error: 'We could not verify this order. Please contact us on WhatsApp.' };
  }
  if (!codRow.allowed) {
    return {
      ok: false,
      error: codRow.reason === 'blocked'
        ? 'We can\'t take a cash-on-delivery order for this number. Please contact us on WhatsApp.'
        : 'This order is above our cash-on-delivery limit. Please contact us on WhatsApp.',
    };
  }

  // ---- Create the order as a Facebook lead — no stock reservation.
  // Staff confirm details by phone, then process it normally from /admin/orders
  // (mark paid, pack, dispatch) same as any other order. ----
  const { data: order, error: oErr } = await admin.from('orders').insert({
    channel: 'facebook',
    payment_method: 'cod',
    fulfillment: 'delivery',
    subtotal, discount_total: 0, delivery_fee: 0, total: subtotal,
    shipping_address: { name, phone: phone1, phone2: phone2 || null, line1: address, city },
    customer_phone: phone1,
    notes: input.note?.trim() || null,
  }).select('id, order_number').single();

  if (oErr || !order) {
    console.error('[order-form] order insert failed', oErr?.message);
    return { ok: false, error: 'Something went wrong — please try again or contact us directly.' };
  }

  const { error: oiErr } = await admin.from('order_items')
    .insert(items.map(i => ({ ...i, order_id: order.id })));
  if (oiErr) console.error('[order-form] order_items insert failed', oiErr.message);

  const notifyPayload = {
    orderNumber: order.order_number, total: subtotal, paymentMethod: 'cod', fulfillment: 'delivery',
    customerName: name, customerPhone: phone1, city,
    items: items.map(i => ({ name: i.product_name, qty: i.qty, line: i.line_total }))
  };
  after(() => sendNewOrderEmail(notifyPayload));
  after(() => sendNewOrderTelegram(notifyPayload));

  return { ok: true, orderNumber: order.order_number };
}
