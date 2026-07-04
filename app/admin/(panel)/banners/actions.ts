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

const ALLOWED_IMG = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
const MAX_BYTES = 5 * 1024 * 1024;

export async function upsertBanner(form: FormData) {
  await requireStaff(['owner', 'manager']);
  const supabase = (await getServerSupabase())!;
  const id = String(form.get('id') || '');
  const row = {
    title: String(form.get('title') || '').trim(),
    subtitle: String(form.get('subtitle') || '').trim() || null,
    badge_text: String(form.get('badge_text') || '').trim() || null,
    link_url: String(form.get('link_url') || '').trim() || null,
    sort_order: Math.max(0, Number(form.get('sort_order') || 0)),
    is_active: form.get('is_active') === 'on',
  };
  if (!row.title) throw new Error('Title is required');

  let bannerId = id;
  if (id) {
    const { error } = await supabase.from('homepage_banners').update(row).eq('id', id);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await supabase.from('homepage_banners').insert(row).select('id').single();
    if (error) throw new Error(error.message);
    bannerId = data.id;
  }

  const file = form.get('image') as File | null;
  if (file && file.size > 0) {
    if (!ALLOWED_IMG.includes(file.type)) throw new Error('Image must be JPEG, PNG, WebP, AVIF or GIF');
    if (file.size > MAX_BYTES) throw new Error('Image must be 5 MB or smaller');
    const admin = getAdminSupabase()!;
    const path = `banners/${bannerId}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const { error: upErr } = await admin.storage.from('product-images')
      .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type });
    if (!upErr) {
      await supabase.from('homepage_banners').update({ image_path: path }).eq('id', bannerId);
    }
  }

  revalidatePath('/admin/banners');
  revalidatePath('/en');
}

export async function toggleBannerActive(id: string, active: boolean) {
  await requireStaff(['owner', 'manager']);
  const supabase = (await getServerSupabase())!;
  await supabase.from('homepage_banners').update({ is_active: active }).eq('id', id);
  revalidatePath('/admin/banners');
  revalidatePath('/en');
}

export async function moveBanner(id: string, direction: 'up' | 'down') {
  await requireStaff(['owner', 'manager']);
  const supabase = (await getServerSupabase())!;
  const { data: rows } = await supabase.from('homepage_banners').select('id, sort_order').order('sort_order');
  if (!rows) return;
  const idx = rows.findIndex(r => r.id === id);
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (idx < 0 || swapIdx < 0 || swapIdx >= rows.length) return;
  const a = rows[idx], b = rows[swapIdx];
  await supabase.from('homepage_banners').update({ sort_order: b.sort_order }).eq('id', a.id);
  await supabase.from('homepage_banners').update({ sort_order: a.sort_order }).eq('id', b.id);
  revalidatePath('/admin/banners');
  revalidatePath('/en');
}

export async function deleteBanner(id: string) {
  await requireStaff(['owner', 'manager']);
  const supabase = (await getServerSupabase())!;
  const { error } = await supabase.from('homepage_banners').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/banners');
  revalidatePath('/en');
}
