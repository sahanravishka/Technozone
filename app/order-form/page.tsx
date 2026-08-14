import type { Metadata } from 'next';
import { getProducts, getCategories } from '@/lib/data';
import { imageUrl } from '@/lib/supabase';
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

export default async function OrderFormPage() {
  const [products, categories] = await Promise.all([
    getProducts({ limit: 500 }),
    getCategories(),
  ]);

  const modules = products
    .filter(p => p.product_variants?.length)
    .map(p => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      categoryId: p.category_id,
      image: p.product_images?.[0] ? imageUrl(p.product_images[0].storage_path) : null,
      variants: p.product_variants.map(v => ({
        id: v.id,
        name: v.name,
        price: Number(v.price),
        inStock: (v.stock_qty ?? 0) > 0,
      })),
    }));

  const cats = categories.map(c => ({
    id: c.id, name: c.name, slug: c.slug,
    icon: CATEGORY_ICON[c.slug] ?? '🛍️',
    count: modules.filter(m => m.categoryId === c.id).length,
  })).filter(c => c.count > 0);

  return <OrderFormClient modules={modules} categories={cats} />;
}
