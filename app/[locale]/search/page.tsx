import type { Metadata } from 'next';
import type { Locale } from '@/lib/i18n/config';
import { getDict } from '@/lib/i18n/dictionaries';
import { searchProducts, getActiveDiscounts, getBrands, getCategories, localized } from '@/lib/data';
import { priceProduct } from '@/lib/pricing';
import ProductGrid from '@/components/ProductGrid';
import SearchControls from '@/components/SearchControls';

export const metadata: Metadata = { title: 'Search', robots: { index: false } };
export const dynamic = 'force-dynamic';

type SP = { q?: string; sort?: string; brand?: string; min?: string; max?: string; stock?: string };

export default async function SearchPage({ params, searchParams }:
  { params: Promise<{ locale: Locale }>; searchParams: Promise<SP> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const dict = getDict(locale);
  const q = (sp.q ?? '').trim();

  const [rawResults, discounts, brands] = await Promise.all([
    q ? searchProducts(q) : Promise.resolve([]),
    getActiveDiscounts(), getBrands()
  ]);

  // resolve display price once, then filter + sort in-memory (catalog is small)
  let items = rawResults.map(p => {
    const lp = localized(p, locale);
    return { product: lp, pricing: priceProduct(lp, discounts) };
  });

  if (sp.brand) items = items.filter(i => (i.product.brand ?? '') === sp.brand);
  if (sp.min) items = items.filter(i => i.pricing.price >= Number(sp.min));
  if (sp.max) items = items.filter(i => i.pricing.price <= Number(sp.max));
  if (sp.stock === '1') items = items.filter(i => i.pricing.stock > 0);

  switch (sp.sort) {
    case 'price_asc': items.sort((a, b) => a.pricing.price - b.pricing.price); break;
    case 'price_desc': items.sort((a, b) => b.pricing.price - a.pricing.price); break;
    case 'rating': items.sort((a, b) => (b.product.rating_avg ?? 0) - (a.product.rating_avg ?? 0)); break;
    default: break; // relevance (as returned)
  }

  const products = items.map(i => i.product);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
      <SearchControls dict={dict} locale={locale} brands={brands} initialQuery={q} sp={sp} />

      {!q ? (
        <p className="py-16 text-center text-[14px] text-muted">{dict.search.prompt}</p>
      ) : products.length === 0 ? (
        <p className="py-16 text-center text-[14px] text-muted">{dict.search.noResults} &ldquo;{q}&rdquo;</p>
      ) : (
        <>
          <p className="mb-4 text-[13px] text-muted">{products.length} {dict.search.results}</p>
          <ProductGrid products={products} discounts={discounts} locale={locale} dict={dict} />
        </>
      )}
    </div>
  );
}
