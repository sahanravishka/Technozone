'use server';

import { revalidatePath } from 'next/cache';
import { getServerSupabase } from '@/lib/supabase-clients/server';
import { getStaff } from '@/lib/admin-auth';

async function requireStaff(roles?: string[]) {
  const staff = await getStaff();
  if (!staff) throw new Error('forbidden');
  if (roles && !roles.includes(staff.role)) throw new Error('forbidden');
  return staff;
}

export async function bulkSetActive(ids: string[], active: boolean) {
  await requireStaff(['owner', 'manager']);
  if (!ids.length) return;
  const supabase = (await getServerSupabase())!;
  const { error } = await supabase.from('products').update({ is_active: active }).in('id', ids);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/products');
  revalidatePath('/shop');
  revalidatePath('/', 'layout');
}

export async function bulkSetCategory(ids: string[], categoryId: string | null) {
  await requireStaff(['owner', 'manager']);
  if (!ids.length) return;
  const supabase = (await getServerSupabase())!;
  const { error } = await supabase.from('products').update({ category_id: categoryId }).in('id', ids);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/products');
}

/** Adjust price of every variant (+ base_price) for the given products by a percentage. */
export async function bulkAdjustPrice(ids: string[], pct: number) {
  await requireStaff(['owner', 'manager']);
  if (!ids.length || !Number.isFinite(pct)) return;
  const supabase = (await getServerSupabase())!;
  const factor = 1 + pct / 100;

  const { data: products } = await supabase.from('products').select('id, base_price').in('id', ids);
  for (const p of products ?? []) {
    const newBase = Math.max(0, Math.round(Number(p.base_price) * factor * 100) / 100);
    await supabase.from('products').update({ base_price: newBase }).eq('id', p.id);
  }

  const { data: variants } = await supabase.from('product_variants').select('id, price').in('product_id', ids);
  for (const v of variants ?? []) {
    const newPrice = Math.max(0, Math.round(Number(v.price) * factor * 100) / 100);
    await supabase.from('product_variants').update({ price: newPrice }).eq('id', v.id);
  }

  revalidatePath('/admin/products');
}

/** Quick inline stock edit from the product list — single variant, no need to open the editor. */
export async function setVariantStock(variantId: string, qty: number) {
  await requireStaff(['owner', 'manager']);
  const supabase = (await getServerSupabase())!;
  const { error } = await supabase.from('product_variants')
    .update({ stock_qty: Math.max(0, Math.round(qty)) }).eq('id', variantId);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/products');
}

export async function bulkTrash(ids: string[]) {
  const staff = await requireStaff(['owner', 'manager']);
  if (!ids.length) return;
  const supabase = (await getServerSupabase())!;
  const { error } = await supabase.from('products')
    .update({ deleted_at: new Date().toISOString(), deleted_by: staff.user_id, is_active: false })
    .in('id', ids);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/products');
  revalidatePath('/admin/products/trash');
}
