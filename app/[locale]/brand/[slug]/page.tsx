import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Locale } from '@/lib/i18n/config';
import { locales } from '@/lib/i18n/config';
import { getDict } from '@/lib/i18n/dictionaries';
import { getActiveDiscounts, getBrandBySlug, getBrands, brandSlug, localized } from '@/lib/data';
import { priceProduct } from '@/lib/pricing';
import { formatLKR, SITE } from '@/lib/site';
import ProductGrid from '@/components/ProductGrid';
import { safeJsonLd } from '@/lib/jsonld';

// Brand landing pages target the highest-volume local search pattern:
// "samsung price in sri lanka", "nokia phones sri lanka", etc.
export const revalidate = 300;

type Props = { params: Promise<{ locale: Locale; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const res = await getBrandBySlug(slug);
  if (!res) return {};
  const title = `${res.brand} Price List in Sri Lanka ${new Date().getFullYear()}`;
  const desc = `Latest ${res.brand} prices in Sri Lanka at ${SITE.name}. ${res.products.length}+ genuine ${res.brand} products with official warranty, islandwide delivery and cash on delivery.`.slice(0, 160);
  return {
    title,
    description: desc,
    alternates: {
      canonical: `/${locale}/brand/${slug}`,
      languages: {
        ...Object.fromEntries(locales.map(l => [l, `/${l}/brand/${slug}`])),
        'x-default': `/en/brand/${slug}`
      }
    },
    openGraph: { title: `${title} — ${SITE.name}`, description: desc, type: 'website' }
  };
}

export default async function BrandPage({ params }: Props) {
  const { locale, slug } = await params;
  const dict = getDict(locale);
  const [res, discounts, brands] = await Promise.all([
    getBrandBySlug(slug), getActiveDiscounts(), getBrands()
  ]);
  if (!res) notFound();
  const products = res.products.map(p => localized(p, locale));
  const brandUrl = `${SITE.url}/${locale}/brand/${slug}`;

  // Price-list table data: this is the content Google features for
  // "<brand> price list in sri lanka" queries.
  const priced = products
    .map(p => ({ p, pricing: priceProduct(p, discounts) }))
    .filter(x => x.pricing.price > 0);

  // Genuine "last updated" — the most recent updated_at among priced
  // products, not just today's date. Always showing the current month
  // regardless of whether anything actually changed is a soft
  // trust/accuracy problem (the plan we're working from explicitly flags
  // this: "only change the date when the information was actually
  // reviewed"), not a real freshness signal.
  const lastUpdated = priced.reduce<Date | null>((latest, { p }) => {
    if (!p.updated_at) return latest;
    const d = new Date(p.updated_at);
    return !latest || d > latest ? d : latest;
  }, null);

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: SITE.name, item: `${SITE.url}/${locale}` },
      { '@type': 'ListItem', position: 2, name: res.brand, item: brandUrl }
    ]
  };

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${res.brand} Price List in Sri Lanka`,
    url: brandUrl,
    numberOfItems: priced.length,
    itemListElement: priced.slice(0, 30).map((x, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE.url}/${locale}/product/${x.p.slug}`,
      name: x.p.name
    }))
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(itemListJsonLd) }} />

      <nav className="breadcrumb mb-4" aria-label="Breadcrumb">
        <Link href={`/${locale}`}>{SITE.name}</Link>
        <span className="sep" aria-hidden>/</span>
        <span className="text-ink font-semibold">{res.brand}</span>
      </nav>

      <div className="relative mb-8 overflow-hidden bg-gradient-to-r from-tint-sky to-tint-mint p-8 md:p-12" style={{ borderRadius: '28px' }}>
        <div className="absolute -right-12 -top-12 h-40 w-40 bg-gradient-to-br from-volt/15 to-accent/15 blur-2xl" style={{ borderRadius: '40% 60% 60% 40%' }} aria-hidden />
        <h1 className="relative z-10 text-2xl font-extrabold tracking-[-0.02em] md:text-3xl">
          {res.brand} Price in Sri Lanka
        </h1>
        <p className="relative z-10 mt-2 max-w-2xl text-[14px] text-muted">
          Updated {res.brand} price list at {SITE.name} — {products.length} genuine products with official warranty,
          islandwide delivery and cash on delivery.
        </p>

        {brands.length > 1 && (
          <div className="rail relative z-10 mt-4 flex gap-2 overflow-x-auto">
            {brands.map(b => (
              <Link key={b} href={`/${locale}/brand/${brandSlug(b)}`}
                className={`pressable shrink-0 px-4 py-2 text-[13px] font-semibold transition-all ${b === res.brand ? 'btn-pill bg-volt text-white shadow-md' : 'bg-card/80 text-muted hover:text-ink backdrop-blur-sm'}`}
                style={{ borderRadius: b === res.brand ? '999px' : '14px' }}>
                {b}
              </Link>
            ))}
          </div>
        )}
      </div>

      {products.length > 0
        ? <ProductGrid products={products} discounts={discounts} locale={locale} dict={dict} />
        : <div className="card-glass p-8 text-center text-muted" style={{ borderRadius: '24px' }}>
            No {res.brand} products yet — check back soon.
          </div>}

      {/* Crawlable price-list table — the exact format Google surfaces for
          "<brand> price list" queries. Hidden on small screens to keep mobile clean. */}
      {priced.length > 0 && (
        <section className="mt-12 hidden md:block">
          <h2 className="text-lg font-extrabold tracking-[-0.01em]">
            {res.brand} Price List in Sri Lanka
            {lastUpdated && ` (Updated ${lastUpdated.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })})`}
          </h2>
          <div className="mt-4 overflow-hidden rounded-2xl border border-line">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-paper text-left text-muted">
                  <th className="px-4 py-3 font-semibold">Model</th>
                  <th className="px-4 py-3 font-semibold">Price (LKR)</th>
                  <th className="px-4 py-3 font-semibold">Availability</th>
                </tr>
              </thead>
              <tbody>
                {priced.map(({ p, pricing }) => (
                  <tr key={p.id} className="border-t border-line">
                    <td className="px-4 py-3">
                      <Link href={`/${locale}/product/${p.slug}`} className="font-semibold hover:text-volt">{p.name}</Link>
                    </td>
                    <td className="px-4 py-3 font-semibold">{formatLKR(pricing.price)}</td>
                    <td className="px-4 py-3">{pricing.stock > 0 ? 'In stock' : 'Out of stock'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
