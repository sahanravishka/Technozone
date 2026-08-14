import type { Metadata } from 'next';
import { getProducts } from '@/lib/data';
import OrderFormClient from './OrderFormClient';

// Never indexed — this page only exists for direct links shared with people
// who message the shop on Facebook.
export const metadata: Metadata = {
  title: 'Place Your Order — Techno Zone Lanka',
  robots: { index: false, follow: false, nocache: true },
};

export const revalidate = 0;

export default async function OrderFormPage() {
  const products = await getProducts({ limit: 500 });

  const modules = products
    .filter(p => p.product_variants?.length)
    .map(p => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      variants: p.product_variants.map(v => ({
        id: v.id,
        name: v.name,
        price: Number(v.price),
        inStock: (v.stock_qty ?? 0) > 0,
      })),
    }));

  return <OrderFormClient modules={modules} />;
}
