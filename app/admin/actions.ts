'use server';

import { revalidatePath } from 'next/cache';
import { getServerSupabase } from '@/lib/supabase-clients/server';
import { getAdminSupabase } from '@/lib/supabase-clients/admin';
import { getStaff } from '@/lib/admin-auth';

async function requireStaff(roles?: string[]) {
  const staff = await getStaff();
  if (!staff) throw new Error('forbidden');
  if (roles && !roles.includes(staff.role)) throw new Error('forbidden');
  return staff;
}

// ---------------- Orders ----------------
const FLOW = ['pending', 'paid', 'packed', 'shipped', 'delivered'];

export async function advanceOrder(orderId: string, to: string) {
  await requireStaff();                       // packers included
  if (![...FLOW, 'cancelled'].includes(to)) throw new Error('bad status');
  const supabase = (await getServerSupabase())!;
  // RLS: staff update policy applies; status log written by trigger with auth.uid()
  const { error } = await supabase.from('orders').update({ status: to }).eq('id', orderId);
  if (error) throw new Error(error.message);
  if (to === 'cancelled') {
    const admin = getAdminSupabase()!;
    await admin.rpc('release_order_reservations', { p_order_id: orderId });
  }
  revalidatePath('/admin/orders');
}

// ---------------- Products ----------------
export async function upsertProduct(form: FormData) {
  await requireStaff(['owner', 'manager']);
  const supabase = (await getServerSupabase())!;
  const id = String(form.get('id') || '');
  const specs: Record<string, string> = {};
  String(form.get('specs') || '').split('\n').forEach(line => {
    const m = line.match(/^([^:]+):(.+)$/);
    if (m) specs[m[1].trim()] = m[2].trim();
  });
  const row = {
    name: String(form.get('name') || '').trim(),
    slug: String(form.get('slug') || '').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-'),
    brand: String(form.get('brand') || '').trim() || null,
    category_id: String(form.get('category_id') || '') || null,
    description: String(form.get('description') || '').trim() || null,
    base_price: Number(form.get('base_price') || 0),
    is_active: form.get('is_active') === 'on',
    specs
  };
  if (!row.name || !row.slug) throw new Error('name and slug required');

  let productId = id;
  if (id) {
    const { error } = await supabase.from('products').update(row).eq('id', id);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await supabase.from('products').insert(row).select('id').single();
    if (error) throw new Error(error.message);
    productId = data.id;
    // every product gets a default variant (stock/orders always reference variants)
    await supabase.from('product_variants').insert({
      product_id: productId, sku: row.slug.toUpperCase().slice(0, 24),
      name: 'Default', price: row.base_price, stock_qty: 0, is_default: true
    });
  }

  // image upload (optional) — storage write needs service role
  const file = form.get('image') as File | null;
  const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
  const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
  if (file && file.size > 0) {
    if (!ALLOWED.includes(file.type)) throw new Error('image must be JPEG, PNG, WebP, AVIF or GIF');
    if (file.size > MAX_BYTES) throw new Error('image must be 5 MB or smaller');
    const admin = getAdminSupabase()!;
    const path = `${productId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const { error: upErr } = await admin.storage.from('product-images')
      .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type });
    if (!upErr) {
      await supabase.from('product_images').insert({
        product_id: productId, storage_path: path, alt: row.name, sort_order: 99
      });
    }
  }

  // suggestions (related products multi-select)
  const suggested = form.getAll('suggested').map(String).filter(Boolean);
  await supabase.from('product_suggestions').delete().eq('product_id', productId);
  if (suggested.length) {
    await supabase.from('product_suggestions').insert(
      suggested.filter(s => s !== productId)
        .map((s, i) => ({ product_id: productId, suggested_product_id: s, type: 'related', sort_order: i }))
    );
  }

  revalidatePath('/admin/products');
  return productId;
}

export async function saveVariant(form: FormData) {
  await requireStaff(['owner', 'manager']);
  const supabase = (await getServerSupabase())!;
  const id = String(form.get('vid') || '');
  const productId = String(form.get('product_id') || '');
  const row = {
    sku: String(form.get('sku') || '').trim(),
    name: String(form.get('vname') || 'Default').trim(),
    price: Number(form.get('price') || 0),
    stock_qty: Math.max(0, Number(form.get('stock') || 0)),
    is_active: form.get('vactive') === 'on'
  };
  if (id) {
    const { error } = await supabase.from('product_variants').update(row).eq('id', id);
    if (error) throw new Error(error.message);
    // manual stock movements are logged for the audit trail
    await supabase.from('stock_movements').insert({
      variant_id: id, type: 'adjustment', qty_change: 0, note: `admin set stock=${row.stock_qty}`
    });
  } else {
    const { error } = await supabase.from('product_variants')
      .insert({ ...row, product_id: productId });
    if (error) throw new Error(error.message);
  }
  revalidatePath(`/admin/products/${productId}`);
}

// ---------------- Discounts & coupons ----------------
export async function createDiscount(form: FormData) {
  await requireStaff(['owner', 'manager']);
  const supabase = (await getServerSupabase())!;
  const scope = String(form.get('scope'));
  const { error } = await supabase.from('discounts').insert({
    name: String(form.get('name') || 'Discount'),
    scope,
    product_id: scope === 'product' ? String(form.get('product_id')) : null,
    category_id: scope === 'category' ? String(form.get('category_id')) : null,
    type: String(form.get('type')),
    value: Number(form.get('value') || 0),
    ends_at: form.get('ends_at') ? new Date(String(form.get('ends_at'))).toISOString() : null
  });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/discounts');
}

export async function toggleDiscount(id: string, active: boolean) {
  await requireStaff(['owner', 'manager']);
  const supabase = (await getServerSupabase())!;
  await supabase.from('discounts').update({ is_active: active }).eq('id', id);
  revalidatePath('/admin/discounts');
}

export async function createCoupon(form: FormData) {
  await requireStaff(['owner', 'manager']);
  const supabase = (await getServerSupabase())!;
  const { error } = await supabase.from('coupons').insert({
    code: String(form.get('code') || '').trim().toUpperCase(),
    type: String(form.get('type')),
    value: Number(form.get('value') || 0),
    min_order_total: Number(form.get('min') || 0),
    max_uses: form.get('max') ? Number(form.get('max')) : null,
    ends_at: form.get('ends_at') ? new Date(String(form.get('ends_at'))).toISOString() : null
  });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/discounts');
}

export async function toggleCoupon(id: string, active: boolean) {
  await requireStaff(['owner', 'manager']);
  const supabase = (await getServerSupabase())!;
  await supabase.from('coupons').update({ is_active: active }).eq('id', id);
  revalidatePath('/admin/discounts');
}

// ---------------- Staff (owner only) ----------------
export async function addStaff(form: FormData) {
  await requireStaff(['owner']);
  const admin = getAdminSupabase()!;
  const email = String(form.get('email') || '').trim().toLowerCase();
  const roleName = String(form.get('role') || 'packer');
  // the person must have signed up once so an auth user exists
  const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const user = users?.users.find(u => u.email?.toLowerCase() === email);
  if (!user) throw new Error('No account with that email — ask them to sign up on the store first.');
  const { data: role } = await admin.from('roles').select('id').eq('name', roleName).single();
  const { error } = await admin.from('staff').upsert({
    user_id: user.id, role_id: role!.id,
    full_name: String(form.get('full_name') || email), is_active: true
  });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/staff');
}

export async function toggleStaff(userId: string, active: boolean) {
  const me = await requireStaff(['owner']);
  if (me.user_id === userId) throw new Error('cannot deactivate yourself');
  const supabase = (await getServerSupabase())!;
  await supabase.from('staff').update({ is_active: active }).eq('user_id', userId);
  revalidatePath('/admin/staff');
}

// ============================================================================
// CRM · Reviews · Repairs (added in CRM/services build)
// ============================================================================

// ---------------- Loyalty / personalized coupons ----------------
export async function issueLoyaltyCoupon(contactId: string, type: string, value: number, days = 30) {
  await requireStaff(['owner', 'manager']);
  const supabase = (await getServerSupabase())!;
  const { data, error } = await supabase.rpc('issue_loyalty_coupon', {
    p_contact_id: contactId, p_type: type, p_value: value, p_days: days
  });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/customers');
  return data as string;   // the generated coupon code
}

// ---------------- Reviews moderation ----------------
export async function moderateReview(id: string, status: 'published' | 'hidden') {
  await requireStaff();
  const supabase = (await getServerSupabase())!;
  const { error } = await supabase.from('reviews').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/reviews');
}

export async function deleteReview(id: string) {
  await requireStaff(['owner', 'manager']);
  const supabase = (await getServerSupabase())!;
  await supabase.from('reviews').delete().eq('id', id);
  revalidatePath('/admin/reviews');
}

// staff posts a review on a customer's behalf (e.g. collected in-store)
export async function addStaffReview(form: FormData) {
  await requireStaff();
  const supabase = (await getServerSupabase())!;
  const { error } = await supabase.from('reviews').insert({
    product_id: String(form.get('product_id')),
    author_name: String(form.get('author_name') || 'Customer'),
    rating: Math.max(1, Math.min(5, Number(form.get('rating') || 5))),
    title: String(form.get('title') || '') || null,
    body: String(form.get('body') || '') || null,
    is_verified: form.get('verified') === 'on',
    by_staff: true,
    status: 'published'
  });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/reviews');
}

// ---------------- Repairs / services ----------------
const SERVICE_FLOW = ['received', 'diagnosing', 'awaiting_approval', 'repairing', 'ready', 'collected'];

export async function createServiceJob(form: FormData) {
  await requireStaff();
  const supabase = (await getServerSupabase())!;
  const { data, error } = await supabase.from('service_jobs').insert({
    customer_name: String(form.get('customer_name') || '').trim(),
    customer_phone: String(form.get('customer_phone') || '').trim(),
    device_brand: String(form.get('device_brand') || '').trim() || null,
    device_model: String(form.get('device_model') || '').trim() || null,
    service_category: String(form.get('service_category') || '').trim() || null,
    issue: String(form.get('issue') || '').trim() || null,
    estimate: form.get('estimate') ? Number(form.get('estimate')) : null,
    intake_notes: String(form.get('intake_notes') || '').trim() || null
  }).select('id').single();
  if (error) throw new Error(error.message);
  revalidatePath('/admin/repairs');
  return data.id;
}

export async function advanceService(jobId: string, to: string) {
  await requireStaff();
  if (![...SERVICE_FLOW, 'cancelled'].includes(to)) throw new Error('bad status');
  const supabase = (await getServerSupabase())!;
  const { error } = await supabase.from('service_jobs').update({ status: to, updated_at: new Date().toISOString() }).eq('id', jobId);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/repairs');
}

export async function setServiceEstimate(jobId: string, estimate: number, finalPrice?: number) {
  await requireStaff();
  const supabase = (await getServerSupabase())!;
  await supabase.from('service_jobs').update({
    estimate, final_price: finalPrice ?? null, updated_at: new Date().toISOString()
  }).eq('id', jobId);
  revalidatePath('/admin/repairs');
}

// ---------------- Cash on Delivery / WhatsApp order collection ----------------
export async function markOrderCollected(orderId: string) {
  await requireStaff();
  const supabase = (await getServerSupabase())!;
  const { error } = await supabase.rpc('mark_order_collected', { p_order_id: orderId });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/orders');
}

// ============================================================================
// Warranties · Shipments · Returns · COD controls (0008)
// ============================================================================

export async function registerWarranty(form: FormData) {
  await requireStaff();
  const supabase = (await getServerSupabase())!;
  const { error } = await supabase.from('warranties').insert({
    product_name: String(form.get('product_name') || '').trim(),
    serial_no: String(form.get('serial_no') || '').trim(),
    customer_name: String(form.get('customer_name') || '').trim() || null,
    customer_phone: String(form.get('customer_phone') || '').trim(),
    period_months: Number(form.get('period_months') || 12),
    order_id: String(form.get('order_id') || '') || null
  });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/warranties');
}

export async function voidWarranty(id: string) {
  await requireStaff(['owner', 'manager']);
  const supabase = (await getServerSupabase())!;
  await supabase.from('warranties').update({ status: 'void' }).eq('id', id);
  revalidatePath('/admin/warranties');
}

// ---- Shipments ----
export async function assignShipment(orderId: string, courierCode: string, tracking: string) {
  await requireStaff();
  const supabase = (await getServerSupabase())!;
  const { data: existing } = await supabase.from('shipments').select('id').eq('order_id', orderId).maybeSingle();
  if (existing) {
    await supabase.from('shipments').update({ courier_code: courierCode, tracking_number: tracking, updated_at: new Date().toISOString() }).eq('id', existing.id);
  } else {
    await supabase.from('shipments').insert({ order_id: orderId, courier_code: courierCode, tracking_number: tracking });
  }
  // move the order to 'shipped' so the board stays in sync
  await supabase.from('orders').update({ status: 'shipped' }).eq('id', orderId).in('status', ['paid', 'packed']);
  revalidatePath('/admin/shipments');
}

export async function advanceShipment(shipmentId: string, status: string) {
  await requireStaff();
  const supabase = (await getServerSupabase())!;
  await supabase.from('shipments').update({ status, updated_at: new Date().toISOString() }).eq('id', shipmentId);
  revalidatePath('/admin/shipments');
}

// ---- Returns / RMA ----
export async function advanceReturn(id: string, status: string, refundAmount?: number) {
  await requireStaff();
  const supabase = (await getServerSupabase())!;
  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (refundAmount != null) patch.refund_amount = refundAmount;
  const { error } = await supabase.from('returns').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/returns');
}

// ---- COD controls ----
export async function setCodMaxValue(value: number) {
  await requireStaff(['owner', 'manager']);
  const supabase = (await getServerSupabase())!;
  await supabase.from('feature_flags').update({ payload: { max_value: value }, updated_at: new Date().toISOString() }).eq('key', 'cod');
  revalidatePath('/admin/settings');
}

export async function addCodBlock(phone: string, reason: string) {
  await requireStaff(['owner', 'manager']);
  const supabase = (await getServerSupabase())!;
  const norm = phone.replace(/\D/g, '').replace(/^0/, '94');
  await supabase.from('cod_blocklist').upsert({ phone_norm: norm, reason: reason || null });
  revalidatePath('/admin/settings');
}

export async function removeCodBlock(phoneNorm: string) {
  await requireStaff(['owner', 'manager']);
  const supabase = (await getServerSupabase())!;
  await supabase.from('cod_blocklist').delete().eq('phone_norm', phoneNorm);
  revalidatePath('/admin/settings');
}
