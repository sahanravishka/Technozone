import { NextRequest, NextResponse } from 'next/server';
import { searchProducts, getActiveDiscounts } from '@/lib/data';
import { priceProduct } from '@/lib/pricing';
import { imageUrl } from '@/lib/supabase';

// Lightweight search-as-you-type endpoint for the header search box.
// Returns at most 6 slim results; sanitisation happens in searchProducts.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim().slice(0, 60);
  if (q.length < 2) return NextResponse.json({ items: [] });

  const [products, discounts] = await Promise.all([
    searchProducts(q, 6), getActiveDiscounts()
  ]);

  const items = products.slice(0, 6).map(p => {
    const pricing = priceProduct(p, discounts);
    const img = p.product_images?.[0];
    return {
      slug: p.slug,
      name: p.name,
      brand: p.brand,
      price: pricing.price,
      inStock: pricing.stock > 0,
      image: img ? imageUrl(img.storage_path) : null
    };
  });

  return NextResponse.json(
    { items },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } }
  );
}
