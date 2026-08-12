'use server';

import { getServerSupabase } from '@/lib/supabase-clients/server';
import { getAdminSupabase } from '@/lib/supabase-clients/admin';

export async function requestStockNotify(input: {
  productId: string; variantId: string | null; productName: string; phone: string;
}): Promise<{ ok: boolean }> {
  const admin = getAdminSupabase();
  const phone = input.phone.trim();
  if (!admin || phone.length < 7) return { ok: false };
  const { error } = await admin.from('stock_notify_requests').insert({
    product_id: input.productId,
    variant_id: input.variantId,
    product_name: input.productName.slice(0, 200),
    phone: phone.slice(0, 20),
  });
  return { ok: !error };
}

export async function submitReview(input: {
  productId: string; authorName: string; rating: number; title?: string; body?: string;
}): Promise<{ ok: boolean; verified?: boolean }> {
  const admin = getAdminSupabase();
  if (!admin) return { ok: false };
  const rating = Math.max(1, Math.min(5, Math.round(input.rating)));
  if (!input.authorName.trim() || !rating) return { ok: false };

  // verified-purchase check: did this person (by account) buy this product?
  let verified = false;
  const supabase = await getServerSupabase();
  const { data: { user } } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  if (user) {
    const { data } = await admin.from('order_items')
      .select('id, orders!inner(customer_id, status)')
      .eq('product_id', input.productId)
      .eq('orders.customer_id', user.id)
      .in('orders.status', ['paid', 'packed', 'dispatched']).limit(1);
    verified = !!data?.length;
  }

  // verified reviews publish immediately; anonymous ones queue for moderation
  await admin.from('reviews').insert({
    product_id: input.productId,
    customer_id: user?.id ?? null,
    author_name: input.authorName.trim().slice(0, 60),
    rating, title: input.title?.trim()?.slice(0, 120) || null,
    body: input.body?.trim()?.slice(0, 1500) || null,
    is_verified: verified,
    status: verified ? 'published' : 'pending'
  });
  return { ok: true, verified };
}
