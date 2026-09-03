'use server';

import { after } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-clients/server';
import { getAdminSupabase } from '@/lib/supabase-clients/admin';
import { buildCheckoutFields, payhereConfigured, payhereGateway } from '@/lib/payhere';
import { buildKokoOrderFields, kokoConfigured, kokoBaseUrl, newKokoOrderId } from '@/lib/koko';
import { priceVariant } from '@/lib/pricing';
import { rateLimitByIp } from '@/lib/rate-limit';
import { sendNewOrderEmail } from '@/lib/email';
import { sendNewOrderTelegram } from '@/lib/telegram';
import type { Discount, Product } from '@/lib/types';

type CartLine = { variantId: string; qty: number };
type PaymentMethod = 'payhere' | 'cod' | 'whatsapp' | 'koko';

type Result =
  | { ok: true; method: 'payhere' | 'koko'; gateway: string; fields: Record<string, string> }
  | { ok: true; method: 'cod' | 'whatsapp'; orderNumber: string; total: number;
      items: { name: string; qty: number; line: number }[] }
  | { ok: false; error: 'auth' | 'stock' | 'config' | 'invalid' | 'cod_blocked' | 'cod_limit' | 'rate'
      | 'catalog_unavailable' | 'item_unavailable' }
  | { ok: false; error: 'koko_error'; detail: string }
  | { ok: false; error: 'server_error'; detail: string };

export async function createOrder(input: {
  lines: CartLine[]; locale: string;
  name: string; phone: string; address: string; city: string; postalCode?: string;
  email?: string;
  zoneId: string; couponCode?: string;
  paymentMethod?: PaymentMethod;       // defaults to payhere
  fulfillment?: 'delivery' | 'pickup'; // defaults to delivery
}): Promise<Result> {
  try {
  const method: PaymentMethod = input.paymentMethod ?? 'payhere';
  // throttle order creation per IP (prevents stock-reservation spam / abuse)
  if (!(await rateLimitByIp('checkout', 10, 60))) return { ok: false, error: 'rate' };
  const supabase = await getServerSupabase();
  const admin = getAdminSupabase();
  if (!supabase || !admin) return { ok: false, error: 'config' };
  // Online card payment needs PayHere; Koko needs its own credentials; COD & WhatsApp need neither.
  if (method === 'payhere' && !payhereConfigured()) return { ok: false, error: 'config' };
  if (method === 'koko' && !kokoConfigured()) return { ok: false, error: 'config' };

  const { data: { user } } = await supabase.auth.getUser();
  let buyerEmail = user?.email ?? input.email?.trim();
  if ((method === 'payhere' || method === 'koko') && !buyerEmail) {
    buyerEmail = 'guest@technozonelanka.com';
  }
  const isPickup = input.fulfillment === 'pickup';
  if (!input.lines.length || !input.name || !input.phone) return { ok: false, error: 'invalid' };
  if (!isPickup && (!input.address || !input.city)) return { ok: false, error: 'invalid' };


  // ---- 1. Re-price server-side ----
  const variantIds = input.lines.map(l => l.variantId);

  // The POS integration (lib/pos/*) is catalog-read-only: it serves products
  // whose variant ids are Mongo ObjectIds ("68b1..." / "<id>-default"), while
  // every write path below — this re-price query, reserve_stock(), and
  // order_items.variant_id — is Supabase-uuid-typed. Handing a POS id to the
  // query below raises Postgres 22P02 (invalid input syntax for type uuid),
  // which used to surface to the customer as a bare "Server error: ...".
  // Fail explicitly and loudly instead: a browsable-but-unbuyable storefront
  // is a configuration problem the shop needs told about, not a mystery.
  // (Also catches plain garbage ids from a hand-crafted request, which used
  // to surface the raw Postgres message to the customer.)
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (variantIds.some(id => !UUID_RE.test(id))) {
    console.error('[checkout] cart holds non-uuid variant ids — if the POS catalog ' +
      '(NEXT_PUBLIC_POS_API_URL) is enabled, this is it: POS serves Mongo ids and ' +
      'the POS purchase path is not implemented, so checkout cannot complete. ' +
      'Variant ids:', variantIds);
    return { ok: false, error: 'catalog_unavailable' };
  }

  // is_active was being selected but never enforced, and the products query
  // filtered neither is_active nor deleted_at — so a variant the shop had
  // deactivated, or a product it had hidden or moved to trash, was still
  // orderable by anyone holding it in their cart (carts live in localStorage
  // indefinitely). The storefront reads in lib/data.ts filter both; this
  // write path has to agree with them or staff get orders for stock they
  // deliberately withdrew from sale.
  const { data: variants, error: vErr } = await admin.from('product_variants')
    .select('id, sku, name, price, product_id, is_active')
    .in('id', variantIds).eq('is_active', true);
  if (vErr) {
    const msg = `variant lookup: ${vErr.message}`;
    console.error('[checkout]', msg);
    return { ok: false, error: 'server_error', detail: msg };
  }
  if (!variants || variants.length !== variantIds.length) {
    // A normal, expected case (item withdrawn while it sat in a cart) — not a
    // server fault, and it must not leak the internal count mismatch to the
    // customer the way the old `server_error` detail string did.
    console.warn('[checkout] cart holds unavailable variants:',
      variantIds.filter(id => !(variants ?? []).some(v => v.id === id)));
    return { ok: false, error: 'item_unavailable' };
  }

  const productIds = [...new Set(variants.map(v => v.product_id))];
  const { data: products, error: pErr } = await admin.from('products')
    .select('id, name, category_id, base_price, slug')
    .in('id', productIds).eq('is_active', true).is('deleted_at', null);
  if (pErr || !products) {
    const msg = `product lookup: ${pErr?.message ?? 'null'}`;
    console.error('[checkout]', msg);
    return { ok: false, error: 'server_error', detail: msg };
  }
  if (products.length !== productIds.length) {
    console.warn('[checkout] cart holds variants of hidden/deleted products:',
      productIds.filter(id => !products.some(p => p.id === id)));
    return { ok: false, error: 'item_unavailable' };
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

    // Free delivery over the admin-configured threshold (Settings -> Shipping).
    const { data: shippingSetting } = await admin.from('site_settings')
      .select('value').eq('key', 'shipping').maybeSingle();
    const freeOver = Number((shippingSetting?.value as { free_over?: number })?.free_over ?? 0);
    if (freeOver > 0 && subtotal >= freeOver) zoneFee = 0;
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
  const preKokoTotal = subtotal - couponDiscount + zoneFee;
  // Koko (BNPL) service fee — 12% on the real order total, computed here
  // server-side only, never trusted from the client. Koko's own consumer
  // marketing is "always interest-free" — this fee is Techno Zone Lanka's
  // own merchant-service surcharge being passed through, not interest, so
  // it must never be labelled "interest" anywhere in the UI or messaging.
  const kokoFee = method === 'koko' ? Math.round(preKokoTotal * 0.12) : 0;
  let total = preKokoTotal + kokoFee;

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
    delivery_fee: zoneFee, koko_fee: kokoFee, total,
    fulfillment: isPickup ? 'pickup' : 'delivery',
    coupon_id: coupon?.id ?? null, coupon_code: coupon?.code ?? null,
    delivery_zone_id: zoneId, delivery_zone_name: zoneName,
    shipping_address: { name: input.name, phone: input.phone, line1: input.address ?? '', city: input.city ?? '', postal_code: input.postalCode ?? '' },
    customer_phone: input.phone
  }).select('id, order_number').single();
  if (oErr || !order) {
    const msg = `order insert: ${oErr?.message ?? 'null'}`;
    console.error('[checkout]', msg);
    return { ok: false, error: 'server_error', detail: msg };
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
    if (method === 'cod' || method === 'whatsapp') {
      // These are final immediately — there's no later payment-confirm
      // webhook to increment used_count from, unlike PayHere/Koko. Redeem
      // atomically now (locks the coupon row, same pattern as reserve_stock)
      // so max_uses/per_customer_limit actually apply to COD/WhatsApp
      // orders instead of never counting against the coupon at all.
      const { data: redeemed } = await admin.rpc('redeem_coupon_immediate', {
        p_coupon_id: coupon.id, p_order_id: order.id,
        p_customer_id: user?.id ?? null, p_phone: input.phone
      });
      if (!redeemed) {
        // Lost a race, or the coupon was exhausted between validation and
        // now — the order already exists with the discount baked in, so
        // correct it rather than fail a checkout that's otherwise valid.
        total -= couponDiscount;
        await admin.from('orders').update({
          discount_total: 0, total, coupon_id: null, coupon_code: null
        }).eq('id', order.id);
        couponDiscount = 0;
        coupon = null;
      }
    } else {
      // PayHere/Koko: audit row now, used_count only increments on
      // confirmed payment (inside confirm_order_paid / confirm_order_paid_koko)
      // so an abandoned gateway session never consumes a real "use".
      await admin.from('coupon_redemptions').insert({
        coupon_id: coupon.id, customer_id: user?.id ?? null, order_id: order.id,
        phone_norm: input.phone.replace(/\D/g, '').replace(/^0/, '94')
      });
    }
  }

  // Order placed — this phone's in-progress checkout (if any) is no longer abandoned.
  await clearAbandonedCart(input.phone);

  // Build notification payload once — used below for COD/WhatsApp only.
  // For PayHere/Koko, notifications should fire AFTER payment is confirmed
  // via the webhook (confirm_order_paid / confirm_order_paid_koko), not
  // at order creation — otherwise a signing failure or abandoned gateway
  // session sends a ghost notification for an order that never paid.
  const notifyPayload = {
    orderNumber: order.order_number, total, paymentMethod: method,
    fulfillment: isPickup ? 'pickup' : 'delivery',
    customerName: input.name, customerPhone: input.phone, city: input.city,
    items: items.map(i => ({ name: i.product_name, qty: i.qty, line: i.line_total }))
  };

  // ---- 4. Branch by payment method ----

  if (!user) {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    cookieStore.set('guest_order_id', order.id, {
      httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, path: '/'
    });
  }

  if (method === 'payhere') {
    const [firstName, ...rest] = input.name.trim().split(/\s+/);
    const fields = buildCheckoutFields({
      orderId: order.id, orderNumber: order.order_number, amount: total,
      firstName, lastName: rest.join(' '),
      email: buyerEmail || 'guest@technozonelanka.com', phone: input.phone,
      address: input.address, city: input.city,
      items: items.map(i => i.product_name).join(', '),
      locale: input.locale
    });
    return { ok: true, method, gateway: payhereGateway(), fields };
  }

  if (method === 'koko') {
    try {
      const [firstName, ...rest] = input.name.trim().split(/\s+/);
      const kokoOrderId = newKokoOrderId(order.order_number);
      // Store before returning — the response webhook only gets this custom
      // id back from Koko, not our own order uuid, so it must be saved now.
      await admin.from('orders').update({ koko_order_id: kokoOrderId }).eq('id', order.id);
      const fields = buildKokoOrderFields({
        kokoOrderId, amount: total,
        firstName: firstName || 'Customer', 
        lastName: rest.join(' ') || '-',
        email: buyerEmail && buyerEmail.includes('@') ? buyerEmail : 'guest@technozonelanka.com',
        phone: input.phone,
        description: items.map(i => i.product_name).join(', '),
        reference: order.order_number,
        locale: input.locale
      });
      return { ok: true, method, gateway: `${kokoBaseUrl()}/api/merchants/orderCreate`, fields };
    } catch (err) {
      // Signing/field-building failed — clean up the order so it doesn't
      // sit as an orphaned pending record with reserved stock.
      await admin.rpc('release_order_reservations', { p_order_id: order.id });
      await admin.from('orders').update({ status: 'cancelled', payment_status: 'failed' }).eq('id', order.id);
      const detail = err instanceof Error ? err.message : 'Unknown error building the Koko request';
      console.error('[koko] order-create failed, order cancelled:', detail);
      return { ok: false, error: 'koko_error', detail };
    }
  }

  // COD or WhatsApp: order is final — notify shop owner now.
  after(() => sendNewOrderEmail(notifyPayload));
  after(() => sendNewOrderTelegram(notifyPayload));

  return {
    ok: true, method, orderNumber: order.order_number, total,
    items: items.map(i => ({ name: i.product_name, qty: i.qty, line: i.line_total }))
  };
  } catch (uncaught) {
    const msg = uncaught instanceof Error ? uncaught.message : String(uncaught);
    console.error('[checkout] uncaught exception:', msg);
    return { ok: false, error: 'server_error', detail: msg };
  }
}

const normPhone = (phone: string) => phone.replace(/\D/g, '').replace(/^0/, '94');

/**
 * Snapshots an in-progress checkout so staff can follow up if it never
 * converts to an order. Called from the checkout form once the phone number
 * looks real; upserted by normalized phone so repeated calls just refresh it.
 */
export async function saveAbandonedCart(input: {
  name: string; phone: string; email?: string;
  items: { name: string; qty: number; price: number }[];
  subtotal: number; locale: string;
}) {
  // Unauthenticated and keyed purely by a client-supplied phone number — cap
  // the hit rate so it can't be used to flood arbitrary numbers with fake
  // drafts (staff follow up on these over WhatsApp) or bloat the table.
  if (!(await rateLimitByIp('abandoned-cart', 20, 60))) return;
  const admin = getAdminSupabase();
  const phoneNorm = normPhone(input.phone);
  if (!admin || phoneNorm.length < 9 || !input.items.length) return;
  const items = input.items.slice(0, 50).map(i => ({
    name: String(i.name ?? '').slice(0, 160),
    qty: Number.isFinite(i.qty) ? Math.max(0, Math.min(i.qty, 9999)) : 0,
    price: Number.isFinite(i.price) ? Math.max(0, Math.min(i.price, 100_000_000)) : 0,
  }));
  await admin.from('abandoned_checkouts').upsert({
    phone_norm: phoneNorm,
    name: input.name.trim().slice(0, 120) || null,
    phone: input.phone.trim().slice(0, 20),
    email: input.email?.trim().slice(0, 160) || null,
    items,
    subtotal: Number.isFinite(input.subtotal) ? Math.max(0, Math.min(input.subtotal, 100_000_000)) : 0,
    locale: input.locale,
    converted: false,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'phone_norm' });
}

/** Marks a phone's in-progress checkout as converted once a real order is placed. */
export async function clearAbandonedCart(phone: string) {
  if (!(await rateLimitByIp('abandoned-cart', 20, 60))) return;
  const admin = getAdminSupabase();
  const phoneNorm = normPhone(phone);
  if (!admin || phoneNorm.length < 9) return;
  await admin.from('abandoned_checkouts').update({ converted: true }).eq('phone_norm', phoneNorm);
}
