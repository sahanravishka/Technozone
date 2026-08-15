import type { Metadata } from 'next';
import { getSupabase, imageUrl } from '@/lib/supabase';
import OrderFormClient from './OrderFormClient';

// Never indexed — this page only exists for direct links shared with people
// who message the shop on Facebook.
export const metadata: Metadata = {
  title: 'Place Your Order — Techno Zone Lanka',
  robots: { index: false, follow: false, nocache: true },
};

export const revalidate = 0;

const CATEGORY_ICON: Record<string, string> = {
  'phones-tablets': '📱', 'audio': '🎧', 'chargers-cables': '🔌',
  'accessories': '🎒', 'smart-devices': '⌚',
};

// Deliberately lighter than lib/data.ts's shared getProducts(): this page
// only needs id/name/brand/category/variants/first-image — no descriptions,
// specs, or product_translations — so the query stays fast even as the
// catalog grows, and never risks the "silently fall back to tiny demo
// dataset with fake category ids" behaviour the shared helper has when a
// heavier nested query errors out.
async function loadCatalog() {
  const sb = getSupabase();
  if (!sb) {
    console.error('[order-form] Supabase not configured — no products/categories to show');
    return { products: [], categories: [] };
  }

  const [catRes, prodRes] = await Promise.all([
    sb.from('categories').select('id, slug, name, sort_order').eq('is_active', true).order('sort_order'),
    sb.from('products')
      .select(`
        id, name, brand, category_id,
        product_variants ( id, name, price, stock_qty, is_active ),
        product_images ( storage_path, sort_order )
      `)
      .eq('is_active', true).is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1000),
  ]);

  if (catRes.error) console.error('[order-form] categories query failed:', catRes.error.message);
  if (prodRes.error) console.error('[order-form] products query failed:', prodRes.error.message);

  return { products: prodRes.data ?? [], categories: catRes.data ?? [] };
}

export default async function OrderFormPage() {
  const { products, categories } = await loadCatalog();

  const modules = products
    .filter(p => p.product_variants?.some(v => v.is_active))
    .map(p => {
      const img = [...(p.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0];
      return {
        id: p.id,
        name: p.name,
        brand: p.brand,
        categoryId: p.category_id,
        image: img ? imageUrl(img.storage_path) : null,
        variants: p.product_variants
          .filter(v => v.is_active)
          .map(v => ({
            id: v.id,
            name: v.name,
            price: Number(v.price),
            inStock: (v.stock_qty ?? 0) > 0,
          })),
      };
    });

  const cats = categories.map(c => ({
    id: c.id, name: c.name, slug: c.slug,
    icon: CATEGORY_ICON[c.slug] ?? '🛍️',
    count: modules.filter(m => m.categoryId === c.id).length,
  })).filter(c => c.count > 0);

  return <OrderFormClient modules={modules} categories={cats} />;
}
