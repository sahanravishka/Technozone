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
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function upsertCategory(form: FormData) {
  await requireStaff(['owner', 'manager']);
  const supabase = (await getServerSupabase())!;
  const id = String(form.get('id') || '');
  const name = String(form.get('name') || '').trim();
  const slugInput = String(form.get('slug') || '').trim();
  const slug = (slugInput || name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const parentId = String(form.get('parent_id') || '') || null;
  const sortOrder = Math.max(0, Number(form.get('sort_order') || 0));
  const isActive = form.get('is_active') === 'on';

  if (!name || !slug) throw new Error('Name is required');
  if (parentId && parentId === id) throw new Error('A category cannot be its own parent');

  const row = { name, slug, parent_id: parentId, sort_order: sortOrder, is_active: isActive };

  let categoryId = id;
  if (id) {
    const { error } = await supabase.from('categories').update(row).eq('id', id);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await supabase.from('categories').insert(row).select('id').single();
    if (error) throw new Error(error.message);
    categoryId = data.id;
  }

  const file = form.get('image') as File | null;
  if (file && file.size > 0) {
    if (!ALLOWED_IMG.includes(file.type)) throw new Error('Image must be JPEG, PNG, WebP, AVIF or GIF');
    if (file.size > MAX_BYTES) throw new Error('Image must be 5 MB or smaller');
    const admin = getAdminSupabase()!;
    const path = `categories/${categoryId}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const { error: upErr } = await admin.storage.from('product-images')
      .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type });
    if (!upErr) {
      await supabase.from('categories').update({ image_path: path }).eq('id', categoryId);
    }
  }

  revalidatePath('/admin/categories');
  revalidatePath('/en');
}

export async function toggleCategoryActive(id: string, active: boolean) {
  await requireStaff(['owner', 'manager']);
  const supabase = (await getServerSupabase())!;
  const { error } = await supabase.from('categories').update({ is_active: active }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/categories');
  revalidatePath('/en');
}

export async function moveCategory(id: string, direction: 'up' | 'down') {
  await requireStaff(['owner', 'manager']);
  const supabase = (await getServerSupabase())!;
  const { data: rows } = await supabase.from('categories').select('id, sort_order').order('sort_order');
  if (!rows) return;
  const idx = rows.findIndex(r => r.id === id);
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (idx < 0 || swapIdx < 0 || swapIdx >= rows.length) return;

  const a = rows[idx];
  const b = rows[swapIdx];
  await supabase.from('categories').update({ sort_order: b.sort_order }).eq('id', a.id);
  await supabase.from('categories').update({ sort_order: a.sort_order }).eq('id', b.id);
  revalidatePath('/admin/categories');
  revalidatePath('/en');
}

/** Blocked if any product still references this category — reassign products first. */
export async function deleteCategory(id: string) {
  await requireStaff(['owner', 'manager']);
  const supabase = (await getServerSupabase())!;
  const { count } = await supabase.from('products')
    .select('id', { count: 'exact', head: true }).eq('category_id', id);
  if ((count ?? 0) > 0) {
    throw new Error(`Cannot delete — ${count} product(s) still use this category. Reassign them first.`);
  }
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/categories');
  revalidatePath('/en');
}
