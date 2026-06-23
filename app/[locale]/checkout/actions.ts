'use server';

import { getServerSupabase } from '@/lib/supabase-clients/server';
import { getAdminSupabase } from '@/lib/supabase-clients/admin';
import { buildCheckoutFields, payhereConfigured, payhereGateway } from '@/lib/payhere';
import { priceVariant } from '@/lib/pricing';
import { rateLimitByIp } from '@/lib/rate-limit';
import type { Discount, Product } from '@/lib/types';

type CartLine = { variantId: string; qty: number };
type PaymentMethod = 'payhere' | 'cod' | 'whatsapp';

type Result =
  | { ok: true; method: 'payhere'; gateway: string; fields: Record<string, string> }
  | { ok: true; method: 'cod' | 'whatsapp'; orderNumber: string; total: number;
      items: { name: string; qty: number; line: number }[] }
  | { ok: false; error: 'auth' | 'stock' | 'config' | 'invalid' | 'cod_blocked' | 'cod_limit' | 'rate' };

export async function createOrder(input: {
  lines: CartLine[]; locale: string;
  name: string; phone: string; address: string; city: string;
  email?: string;
  zoneId: string; couponCode?: string;
  paymentMethod?: PaymentMethod;       // defaults to payhere
  fulfillment?: 'delivery' | 'pickup'; // defaults to delivery
}): Promise<Result> {
  const method: PaymentMethod = input.paymentMethod ?? 'payhere';
  // throttle order creation per IP (prevents stock-reservation spam / abuse)
  if (!(await rateLimitByIp('checkout', 10, 60))) return { ok: false, error: 'rate' };
  const supabase = await getServerSupabase();
  const admin = getAdminSupabase();
  if (!supabase || !admin) return { ok: false, error: 'config' };
  // Online card payment needs PayHere; COD & WhatsApp do not.
  if (method === 'payhere' && !payhereConfigured()) return { ok: false, error: 'config' };

  const { data: { user } } = await supabase.auth.getUser();
  const buyerEmail = user?.email ?? input.email?.trim();
  // email is required for online (receipt) but optional for COD/WhatsApp
  if (method === 'payhere' && !buyerEmail) return { ok: false, error: 'auth' };
  const isPickup = input.fulfillment === 'pickup';
  if (!input.lines.length || !input.name || !input.phone) return { ok: false, error: 'invalid' };
  if (!isPickup && (!input.address || !input.city)) return { ok: false, error: 'invalid' };


  // ---- 1. Re-price server-side ----
  const variantIds = input.lines.map(l => l.variantId);
  const { data: variants, error: vErr } = await admin.from('product_variants')
    .select('id, sku, name, price, product_id, is_active').in('id', variantIds);
  if (vErr || !variants || variants.length !== variantIds.length) {
    console.error('[checkout] variant lookup failed', { error: vErr?.message, want: variantIds.length, got: variants?.length });
    return { ok: false, error: 'invalid' };
  }

  const productIds = [...new Set(variants.map(v => v.product_id))];
  const { data: products, error: pErr } = await admin.from('products')
    .select('id, name, category_id, base_price, slug').in('id', productIds);
  if (pErr || !products) {
    console.error('[checkout] product lookup failed', pErr?.message);
    return { ok: false, error: 'invalid' };
  }
  const { data: discounts } = await admin.from('discounts')
    .select('id, scope, product_id, category_id, type, value')
    .eq('is_active', true).lte('starts_at', new Date().toISOString())
    .or('ends_at.is.null,ends_at.gt.' + new Date().toISOString());

  const items = input.lines.map(l => {
    const v = variants.find(x => x.id === l.variantId)!;
    const p = products!.find(x => x.id === v.product_id)! as unknown as Product;
    const { price } = priceVariant(p, v.price, (discounts ?? []) as Discount[]);
    const qty = Math.max(1, Math.min(l.qty, 99));
    return {
      product_id: p.id, variant_id: v.id, product_name: p.name,
      variant_name: v.name, sku: v.sku,
      unit_price: price, discount_each: v.price - price,
      qty, line_total: price * qty
    };
  });
  const subtotal = items.reduce((n, i) => n + i.line_total, 0);

  // ---- 2. Zone (skipped for pickup) + coupon ----
  let zoneId: string | null = null, zoneName = 'In-store pickup', zoneFee = 0;
  if (!isPickup) {
    const { data: zone } = await admin.from('delivery_zones')
      .select('id, name, fee').eq('id', input.zoneId).eq('is_active', true).single();
    if (!zone) return { ok: false, error: 'invalid' };
    zoneId = zone.id; zoneName = zone.name; zoneFee = Number(zone.fee);
  }

  let couponDiscount = 0, coupon: { id: string; code: string } | null = null;
  if (input.couponCode?.trim()) {
    // pass the phone so personalized (contact-bound) coupons validate correctly
    const { data: c } = await supabase.rpc('validate_coupon',
      { p_code: input.couponCode.trim(), p_subtotal: subtotal, p_phone: input.phone });
    if (c?.[0]) {
      coupon = { id: c[0].coupon_id, code: c[0].code };
      couponDiscount = c[0].type === 'percentage'
        ? Math.round(subtotal * Number(c[0].value) / 100)
        : Math.min(Number(c[0].value), subtotal);
    }
  }
  const total = subtotal - couponDiscount + zoneFee;

  // COD gate now that the true total is known
  if (method === 'cod') {
    const { data: cod } = await supabase.rpc('cod_allowed', { p_phone: input.phone, p_total: total });
    const row = cod?.[0];
    if (row && !row.allowed) return { ok: false, error: row.reason === 'blocked' ? 'cod_blocked' : 'cod_limit' };
  }

  // ---- 3. Create order + items, reserve stock ----
  const { data: order, error: oErr } = await admin.from('orders').insert({
    customer_id: user?.id ?? null,
    guest_email: user ? null : (buyerEmail ?? null),
    channel: 'web',
    payment_method: method,
    subtotal, discount_total: couponDiscount,
    delivery_fee: zoneFee, total,
    fulfillment: isPickup ? 'pickup' : 'delivery',
    coupon_id: coupon?.id ?? null, coupon_code: coupon?.code ?? null,
    delivery_zone_id: zoneId, delivery_zone_name: zoneName,
    shipping_address: { name: input.name, phone: input.phone, line1: input.address ?? '', city: input.city ?? '' },
    customer_phone: input.phone
  }).select('id, order_number').single();
  if (oErr || !order) {
    console.error('[checkout] order insert failed', oErr?.message);
    return { ok: false, error: 'invalid' };
  }

  const { error: oiErr } = await admin.from('order_items').insert(items.map(i => ({ ...i, order_id: order.id })));
  if (oiErr) console.error('[checkout] order_items insert failed', oiErr.message);

  for (const i of items) {
    const { error } = await admin.rpc('reserve_stock', {
      p_order_id: order.id, p_variant_id: i.variant_id, p_qty: i.qty
    });
    if (error) {
      await admin.rpc('release_order_reservations', { p_order_id: order.id });
      await admin.from('orders').update({ status: 'cancelled' }).eq('id', order.id);
      return { ok: false, error: 'stock' };
    }
  }
  if (coupon) {
    await admin.from('coupon_redemptions').insert({
      coupon_id: coupon.id, customer_id: user?.id ?? null, order_id: order.id
    });
  }

  // ---- 4. Branch by payment method ----
  if (method === 'payhere') {
    const [firstName, ...rest] = input.name.trim().split(/\s+/);
    const fields = buildCheckoutFields({
      orderId: order.id, amount: total,
      firstName, lastName: rest.join(' '),
      email: buyerEmail!, phone: input.phone,
      address: input.address, city: input.city,
      items: items.map(i => i.product_name).join(', '),
      locale: input.locale
    });
    return { ok: true, method, gateway: payhereGateway(), fields };
  }

  // COD or WhatsApp: order sits pending/unpaid until staff confirm collection.
  return {
    ok: true, method, orderNumber: order.order_number, total,
    items: items.map(i => ({ name: i.product_name, qty: i.qty, line: i.line_total }))
  };
}
