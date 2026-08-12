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
const FLOW = ['pending', 'paid', 'packed', 'dispatched'];

export async function advanceOrder(orderId: string, to: string) {
  await requireStaff();                       // packers included
  if (![...FLOW, 'cancelled'].includes(to)) throw new Error('bad status');
  const supabase = (await getServerSupabase())!;

  // IMEI/serial scan is optional — staff can scan via the Pack modal to
  // register warranties, but it no longer blocks advancing to 'packed'.

  // RLS: staff update policy applies; status log written by trigger with auth.uid()
  const { error } = await supabase.from('orders').update({ status: to }).eq('id', orderId);
  if (error) throw new Error(error.message);
  if (to === 'cancelled') {
    const admin = getAdminSupabase()!;
    await admin.rpc('release_order_reservations', { p_order_id: orderId });
  }
  revalidatePath('/admin/orders');
}

export type OrderDetail = {
  id: string; order_number: string; status: string; payment_status: string;
  payment_method: string; fulfillment: string; channel: string;
  subtotal: number; discount_total: number; delivery_fee: number; total: number;
  coupon_code: string | null; delivery_zone_name: string | null;
  shipping_address: { name?: string; phone?: string; line1?: string; city?: string; postal_code?: string };
  customer_phone: string; guest_email: string | null; notes: string | null;
  payhere_payment_id: string | null; payhere_method: string | null;
  created_at: string; updated_at: string;
  order_items: { qty: number; product_name: string; variant_name?: string | null; sku?: string | null; unit_price: number; discount_each: number; line_total: number }[];
};

// Full order detail for the admin "View details" panel — separate from the
// list query so the orders board itself stays light.
export async function getOrderDetail(orderId: string): Promise<OrderDetail> {
  await requireStaff();
  const supabase = (await getServerSupabase())!;
  const { data, error } = await supabase.from('orders')
    .select(`
      id, order_number, status, payment_status, payment_method, fulfillment, channel,
      subtotal, discount_total, delivery_fee, total, coupon_code, delivery_zone_name,
      shipping_address, customer_phone, guest_email, notes,
      payhere_payment_id, payhere_method, created_at, updated_at,
      order_items(qty, product_name, variant_name, sku, unit_price, discount_each, line_total)
    `)
    .eq('id', orderId).single();
  if (error || !data) throw new Error(error?.message ?? 'Order not found');
  return data as unknown as OrderDetail;
}

export type OrderJourneyEvent = {
  type: 'created' | 'status_change' | 'serial_scanned';
  timestamp: string;
  title: string;
  description: string;
};

export type OrderJourneyData = {
  order_number: string;
  created_at: string;
  status: string;
  payment_status: string;
  payment_method: string;
  customer_name: string;
  customer_phone: string;
  city: string;
  total: number;
  events: OrderJourneyEvent[];
};

export async function getOrderJourney(orderId: string): Promise<OrderJourneyData> {
  await requireStaff();
  const supabase = (await getServerSupabase())!;

  const { data: order, error } = await supabase.from('orders')
    .select('id, order_number, status, payment_status, payment_method, total, created_at, customer_phone, shipping_address')
    .eq('id', orderId).single();
  if (error || !order) throw new Error('Order not found');

  const addr = order.shipping_address as { name?: string; city?: string } | null;

  const [{ data: statusLogs }, { data: serials }] = await Promise.all([
    supabase.from('order_status_log')
      .select('from_status, to_status, note, created_at')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true }),
    supabase.from('order_item_serials')
      .select('product_name, serial_no, created_at')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true })
  ]);

  const events: OrderJourneyEvent[] = [];

  // 1. Initial Order Placed Event
  events.push({
    type: 'created',
    timestamp: order.created_at,
    title: 'Order Placed',
    description: `Customer placed order ${order.order_number} via ${order.payment_method === 'cod' ? 'Cash on Delivery' : order.payment_method === 'whatsapp' ? 'WhatsApp Pay' : 'Online Payment'}.`
  });

  // 2. Status Log Events
  (statusLogs ?? []).forEach(log => {
    const fromLabel = log.from_status ? String(log.from_status).toUpperCase() : 'NEW';
    const toLabel = log.to_status ? String(log.to_status).toUpperCase() : 'UNKNOWN';
    events.push({
      type: 'status_change',
      timestamp: log.created_at,
      title: `Status: ${fromLabel} ➔ ${toLabel}`,
      description: log.note || `Order transitioned from ${log.from_status} to ${log.to_status}`
    });
  });

  // 3. Serial Scanned Events
  (serials ?? []).forEach(s => {
    events.push({
      type: 'serial_scanned',
      timestamp: s.created_at,
      title: `IMEI / Serial Scanned`,
      description: `${s.product_name} — S/N: ${s.serial_no}`
    });
  });

  events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return {
    order_number: order.order_number,
    created_at: order.created_at,
    status: order.status,
    payment_status: order.payment_status,
    payment_method: order.payment_method,
    customer_name: addr?.name ?? 'Customer',
    customer_phone: order.customer_phone,
    city: addr?.city ?? '—',
    total: order.total,
    events
  };
}

export type DependencyReportRow = {
  id: string;
  order_number: string;
  created_at: string;
  updated_at: string;
  status: string;
  payment_status: string;
  payment_method: string;
  fulfillment: string;
  total: number;
  customer_name: string;
  customer_phone: string;
  city: string;
  address_line: string;
  items_summary: string;
  serials: { product_name: string; serial_no: string; scanned_at: string }[];
  status_history: { from_status: string | null; to_status: string; created_at: string; note: string | null }[];
};

export async function getOrderDependencyReport(
  startDate?: string,
  endDate?: string
): Promise<DependencyReportRow[]> {
  await requireStaff();
  const supabase = (await getServerSupabase())!;

  let query = supabase.from('orders')
    .select(`
      id, order_number, status, payment_status, payment_method, fulfillment, total, created_at, updated_at,
      customer_phone, shipping_address,
      order_items(qty, product_name)
    `)
    .order('created_at', { ascending: false });

  if (startDate) query = query.gte('created_at', startDate);
  if (endDate) query = query.lte('created_at', endDate);

  const { data: orders, error } = await query.limit(500);
  if (error || !orders) throw new Error(error?.message ?? 'Failed to fetch report');

  const orderIds = orders.map(o => o.id);
  if (orderIds.length === 0) return [];

  const [{ data: statusLogs }, { data: serials }] = await Promise.all([
    supabase.from('order_status_log')
      .select('order_id, from_status, to_status, note, created_at')
      .in('order_id', orderIds)
      .order('created_at', { ascending: true }),
    supabase.from('order_item_serials')
      .select('order_id, product_name, serial_no, created_at')
      .in('order_id', orderIds)
      .order('created_at', { ascending: true })
  ]);

  const logsByOrder = new Map<string, { from_status: string | null; to_status: string; created_at: string; note: string | null }[]>();
  (statusLogs ?? []).forEach(l => {
    const arr = logsByOrder.get(l.order_id) ?? [];
    arr.push({ from_status: l.from_status, to_status: l.to_status, created_at: l.created_at, note: l.note });
    logsByOrder.set(l.order_id, arr);
  });

  const serialsByOrder = new Map<string, { product_name: string; serial_no: string; scanned_at: string }[]>();
  (serials ?? []).forEach(s => {
    const arr = serialsByOrder.get(s.order_id) ?? [];
    arr.push({ product_name: s.product_name, serial_no: s.serial_no, scanned_at: s.created_at });
    serialsByOrder.set(s.order_id, arr);
  });

  return orders.map(o => {
    const addr = o.shipping_address as { name?: string; city?: string; line1?: string } | null;
    const items = (o.order_items as { qty: number; product_name: string }[] ?? []);
    const items_summary = items.map(i => `${i.qty}x ${i.product_name}`).join('; ');

    return {
      id: o.id,
      order_number: o.order_number,
      created_at: o.created_at,
      updated_at: o.updated_at,
      status: o.status,
      payment_status: o.payment_status,
      payment_method: o.payment_method,
      fulfillment: o.fulfillment,
      total: o.total,
      customer_name: addr?.name ?? 'Customer',
      customer_phone: o.customer_phone,
      city: addr?.city ?? '—',
      address_line: addr?.line1 ?? '',
      items_summary,
      serials: serialsByOrder.get(o.id) ?? [],
      status_history: logsByOrder.get(o.id) ?? []
    };
  });
}

export async function recallOrder(orderId: string) {
  await requireStaff(['owner']);
  const supabase = (await getServerSupabase())!;
  const { error } = await supabase.from('orders')
    .update({ status: 'pending' })
    .eq('id', orderId)
    .eq('status', 'cancelled');
  if (error) throw new Error(error.message);
  // Best-effort stock re-reservation; may fail if stock is now sold out.
  const admin = getAdminSupabase()!;
  const { data: items } = await admin.from('order_items')
    .select('variant_id, qty').eq('order_id', orderId);
  for (const i of items ?? []) {
    try { await admin.rpc('reserve_stock', { p_order_id: orderId, p_variant_id: i.variant_id, p_qty: i.qty }); }
    catch { /* ignore — stock may be exhausted */ }
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
    warranty_months: Math.max(0, Number(form.get('warranty_months') || 0)),
    meta_title: String(form.get('meta_title') || '').trim().slice(0, 120) || null,
    meta_description: String(form.get('meta_description') || '').trim().slice(0, 300) || null,
    has_storage_variants: form.get('has_storage_variants') === 'true',
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

  // ── Variant builder payload (colours × RAM/ROM) ──
  await processVariantPayload(form, productId, row.name, row.base_price);

  revalidatePath('/admin/products');
  return productId;
}

/**
 * Processes the VariantBuilder payload: uploads one optimized photo per colour,
 * then creates a product_variants row per enabled (colour × ram/rom) cell,
 * storing the colour hex on the image and attributes on the variant.
 * No-op if the form carries no variants_payload.
 */
async function processVariantPayload(
  form: FormData,
  productId: string,
  productName: string,
  basePrice: number
) {
  const raw = String(form.get('variants_payload') || '');
  if (!raw) return;

  let parsed: {
    hasStorage: boolean;
    variants: {
      colorKey: string; colorIndex: number; hex: string | null;
      existingPath: string | null; ram: string | null; rom: string | null;
      stock: number; price?: number;
    }[];
  };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return;
  }
  if (!parsed.variants?.length) return;

  const supabase = (await getServerSupabase())!;
  const admin = getAdminSupabase()!;
  const photos = form.getAll('variant_photos').filter((f): f is File => f instanceof File);

  // sharp is bundled with Next; optimize colour photos to <=1600px WebP q90.
  let sharp: typeof import('sharp') | null = null;
  try { sharp = (await import('sharp')).default as unknown as typeof import('sharp'); } catch { sharp = null; }

  // Upload each distinct colour photo once → map colorKey → { path, hex }.
  const colorMap = new Map<string, { path: string | null; hex: string | null }>();
  const uploadErrors: string[] = [];
  // colorIndex aligns with the order photos were added in the builder.
  const distinctColors = [...new Map(parsed.variants.map(v => [v.colorKey, v])).values()]
    .sort((a, b) => a.colorIndex - b.colorIndex);

  let photoCursor = 0;
  for (const c of distinctColors) {
    if (c.existingPath) {
      colorMap.set(c.colorKey, { path: c.existingPath, hex: c.hex });
      continue;
    }
    const file = photos[photoCursor++];
    if (!file || file.size === 0) {
      colorMap.set(c.colorKey, { path: null, hex: c.hex });
      continue;
    }
    let buf: Uint8Array = new Uint8Array(await file.arrayBuffer());
    let contentType = file.type || 'image/webp';
    let ext = 'webp';
    if (sharp) {
      try {
        buf = new Uint8Array(await sharp(Buffer.from(buf))
          .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 90 })
          .toBuffer());
        contentType = 'image/webp';
      } catch { /* keep original buffer */ ext = (file.name.split('.').pop() || 'webp').toLowerCase(); }
    }
    const path = `${productId}/colors/${Date.now()}-${c.colorIndex}.${ext}`;
    const { error: upErr } = await admin.storage.from('product-images')
      .upload(path, buf, { contentType, upsert: true });
    if (upErr) uploadErrors.push(`colour #${c.colorIndex + 1}: ${upErr.message}`);
    colorMap.set(c.colorKey, { path: upErr ? null : path, hex: c.hex });
  }

  // Insert colour image rows (carrying hex) and capture their ids for variant links.
  const imageIdByColor = new Map<string, string>();
  let sort = 0;
  for (const c of distinctColors) {
    const info = colorMap.get(c.colorKey);
    if (!info?.path) continue;
    const { data, error } = await supabase.from('product_images').insert({
      product_id: productId,
      storage_path: info.path,
      alt: productName,
      color_hex: info.hex,
      sort_order: sort++,
    }).select('id').single();
    if (!error && data) imageIdByColor.set(c.colorKey, data.id);
  }

  // Build variant rows. SKU = product slug-ish + attrs; unique-safe with index.
  const skuBase = productName.toUpperCase().replace(/[^A-Z0-9]+/g, '-').slice(0, 18);
  const rows = parsed.variants.map((v, i) => {
    const attributes: Record<string, string> = {};
    if (v.ram) attributes.ram = v.ram;
    if (v.rom) attributes.rom = v.rom;
    const info = colorMap.get(v.colorKey);
    if (info?.hex) attributes.color = info.hex;
    const skuParts = [skuBase, v.ram, v.rom, info?.hex?.replace('#', '')].filter(Boolean);
    return {
      product_id: productId,
      sku: `${skuParts.join('-')}-${i}`.slice(0, 60),
      name: [v.ram && v.rom ? `${v.ram}/${v.rom}` : null].filter(Boolean).join(' ') || 'Colour',
      attributes,
      price: v.price ?? basePrice,
      stock_qty: Math.max(0, v.stock ?? 0),
      is_default: i === 0,
      is_active: true,
    };
  });

  if (rows.length) {
    // Replace any prior builder-made variants for a clean re-save, but keep the
    // mandatory default if no rows (shouldn't happen here).
    await supabase.from('product_variants')
      .delete().eq('product_id', productId).neq('is_default', true);
    const { data: inserted } = await supabase.from('product_variants')
      .insert(rows).select('id, attributes');

    // Link each colour's image to one of its variants (variant_id on image).
    if (inserted) {
      for (const [colorKey, imageId] of imageIdByColor) {
        const info = colorMap.get(colorKey);
        const match = inserted.find(r =>
          (r.attributes as Record<string, string>)?.color === info?.hex);
        if (match) {
          await supabase.from('product_images')
            .update({ variant_id: match.id }).eq('id', imageId);
        }
      }
    }
  }

  // Variants saved — but if any photo failed to reach the bucket, tell staff so
  // they can re-upload (the product itself is saved correctly).
  if (uploadErrors.length) {
    throw new Error(
      `Saved, but ${uploadErrors.length} colour photo(s) failed to upload — please re-open and re-upload: ${uploadErrors.join('; ')}`
    );
  }
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

export async function createStaffAccount(form: FormData) {
  await requireStaff(['owner']);
  const admin = getAdminSupabase()!;
  const email    = String(form.get('email')     || '').trim().toLowerCase();
  const password = String(form.get('password')  || '');
  const fullName = String(form.get('full_name') || email);
  const roleName = String(form.get('role')      || 'packer');

  if (!email || !password) throw new Error('Email and password are required.');
  if (password.length < 6) throw new Error('Password must be at least 6 characters.');

  const { data: auth, error: authErr } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (authErr) throw new Error(authErr.message);

  const { data: role } = await admin.from('roles').select('id').eq('name', roleName).single();
  const { error: staffErr } = await admin.from('staff').insert({
    user_id: auth.user.id, role_id: role?.id, full_name: fullName, is_active: true,
  });
  if (staffErr) {
    await admin.auth.admin.deleteUser(auth.user.id).catch(() => {});
    throw new Error(staffErr.message);
  }
  revalidatePath('/admin/staff');
}

export async function deleteStaff(userId: string) {
  const me = await requireStaff(['owner']);
  if (me.user_id === userId) throw new Error('Cannot delete your own account.');
  const admin = getAdminSupabase()!;
  await admin.from('staff').delete().eq('user_id', userId);
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/staff');
}

export async function resetStaffPassword(form: FormData) {
  await requireStaff(['owner']);
  const userId      = String(form.get('user_id')      || '');
  const newPassword = String(form.get('new_password') || '');
  if (!userId)               throw new Error('User ID required.');
  if (newPassword.length < 6) throw new Error('Password must be at least 6 characters.');
  const admin = getAdminSupabase()!;
  const { error } = await admin.auth.admin.updateUserById(userId, { password: newPassword });
  if (error) throw new Error(error.message);
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
export async function confirmPendingOrder(orderId: string) {
  await requireStaff();
  const supabase = (await getServerSupabase())!;
  const { data: order } = await supabase.from('orders').select('payment_method').eq('id', orderId).single();
  if (order?.payment_method === 'cod') {
    // For COD, advance status from 'pending' to 'paid' (confirmed) while keeping payment_status as 'unpaid'
    const { error } = await supabase.from('orders')
      .update({ status: 'paid', updated_at: new Date().toISOString() })
      .eq('id', orderId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.rpc('mark_order_collected', { p_order_id: orderId });
    if (error) throw new Error(error.message);
  }
  revalidatePath('/admin/orders');
}

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
  // move the order to 'dispatched' so the board stays in sync
  await supabase.from('orders').update({ status: 'dispatched' }).eq('id', orderId).in('status', ['paid', 'packed']);
  revalidatePath('/admin/shipments');
}

export async function advanceShipment(shipmentId: string, status: string) {
  await requireStaff();
  const supabase = (await getServerSupabase())!;
  await supabase.from('shipments').update({ status, updated_at: new Date().toISOString() }).eq('id', shipmentId);
  revalidatePath('/admin/shipments');
}

export type DispatchScanResult = {
  product_name: string; serial_no: string; warranty_expires_at: string;
  period_months: number; tier: string | null; discount_pct: number | null; coupon_code: string | null;
};

// Pack step: scan a unit's serial/IMEI -> register warranty (period auto from
// the product) AND activate a loyalty discount on the customer's mobile. One RPC,
// one transaction (see migration 0009).
export async function dispatchScanSerial(orderId: string, serial: string, variantId: string | null) {
  await requireStaff();
  const supabase = (await getServerSupabase())!;
  const { data, error } = await supabase.rpc('dispatch_scan_serial', {
    p_order_id: orderId, p_serial: serial.trim(), p_variant_id: variantId || null
  });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/orders');
  revalidatePath('/admin/warranties');
  return data as DispatchScanResult;
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

// ---------------- Product visibility & soft delete ----------------

/** Publish ⇄ Hide: toggles whether a product appears on the website. */
export async function setProductActive(productId: string, active: boolean) {
  await requireStaff(['owner', 'manager']);
  const supabase = (await getServerSupabase())!;
  const { error } = await supabase.from('products')
    .update({ is_active: active }).eq('id', productId);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/products');
  revalidatePath('/admin/products/' + productId);
  revalidatePath('/shop');
  revalidatePath('/', 'layout');
}

/** Soft delete: moves a product to Trash (kept for order/warranty history). */
export async function softDeleteProduct(productId: string) {
  const staff = await requireStaff(['owner', 'manager']);
  const supabase = (await getServerSupabase())!;
  const { error } = await supabase.from('products')
    .update({ deleted_at: new Date().toISOString(), deleted_by: staff.user_id, is_active: false })
    .eq('id', productId);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/products');
  revalidatePath('/admin/products/trash');
}

/** Restore a trashed product (stays hidden until re-published). */
export async function restoreProduct(productId: string) {
  await requireStaff(['owner', 'manager']);
  const supabase = (await getServerSupabase())!;
  const { error } = await supabase.from('products')
    .update({ deleted_at: null, deleted_by: null }).eq('id', productId);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/products');
  revalidatePath('/admin/products/trash');
}

/**
 * Permanently purge a trashed product. Blocked if it has order history, to
 * protect reports/invoices — those products should stay soft-deleted forever.
 */
export async function purgeProduct(productId: string) {
  await requireStaff(['owner']);
  const supabase = (await getServerSupabase())!;

  // Guard: refuse purge if any order references this product's variants.
  const { data: variantIds } = await supabase.from('product_variants')
    .select('id').eq('product_id', productId);
  const ids = (variantIds ?? []).map(v => v.id);
  if (ids.length) {
    const { count } = await supabase.from('order_items')
      .select('id', { count: 'exact', head: true }).in('variant_id', ids);
    if ((count ?? 0) > 0) {
      throw new Error('Cannot permanently delete — this product has order history. It stays in Trash to keep your reports intact.');
    }
  }

  // Safe to hard-delete: cascades remove variants/images/suggestions.
  const { error } = await supabase.from('products').delete().eq('id', productId);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/products/trash');
}

// ---------------- Global admin search (Ctrl+K palette) ----------------
export type AdminHit = { kind: 'order' | 'product' | 'customer'; title: string; sub: string; href: string };

export async function adminGlobalSearch(query: string): Promise<AdminHit[]> {
  await requireStaff();
  const q = query.trim().replace(/[^\p{L}\p{N}\s@.+-]/gu, '').slice(0, 60);
  if (q.length < 2) return [];
  const supabase = (await getServerSupabase())!;
  const like = `%${q}%`;

  const [orders, products, skus, contacts] = await Promise.all([
    supabase.from('orders')
      .select('id, order_number, status, total, customer_phone')
      .or(`order_number.ilike.${like},customer_phone.ilike.${like}`)
      .order('created_at', { ascending: false }).limit(5),
    supabase.from('products')
      .select('id, name, brand, is_active')
      .or(`name.ilike.${like},brand.ilike.${like}`)
      .limit(5),
    supabase.from('product_variants')
      .select('sku, products!inner(id, name)')
      .ilike('sku', like).limit(3),
    supabase.from('contacts')
      .select('id, full_name, phone')
      .or(`full_name.ilike.${like},phone.ilike.${like}`)
      .limit(5)
  ]);

  const hits: AdminHit[] = [];
  for (const o of orders.data ?? [])
    hits.push({ kind: 'order', title: o.order_number, sub: `${o.status} · Rs ${Number(o.total).toLocaleString('en-LK')} · ${o.customer_phone}`, href: '/admin/orders' });
  for (const p of products.data ?? [])
    hits.push({ kind: 'product', title: p.name, sub: `${p.brand ?? 'Product'}${p.is_active ? '' : ' · inactive'}`, href: `/admin/products/${p.id}` });
  for (const v of skus.data ?? []) {
    const prod = v.products as unknown as { id: string; name: string };
    hits.push({ kind: 'product', title: prod.name, sub: `SKU ${v.sku}`, href: `/admin/products/${prod.id}` });
  }
  for (const c of contacts.data ?? [])
    hits.push({ kind: 'customer', title: c.full_name ?? c.phone ?? 'Customer', sub: c.phone ?? '', href: '/admin/customers' });

  // de-dupe products found via both name and SKU
  const seen = new Set<string>();
  return hits.filter(h => { const k = h.kind + h.href + h.title; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 12);
}
