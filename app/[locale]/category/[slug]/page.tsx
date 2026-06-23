import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Locale } from '@/lib/i18n/config';
import { locales } from '@/lib/i18n/config';
import { getDict } from '@/lib/i18n/dictionaries';
import { getActiveDiscounts, getCategories, getProducts, localized } from '@/lib/data';
import { SITE } from '@/lib/site';
import ProductGrid from '@/components/ProductGrid';
import { safeJsonLd } from '@/lib/jsonld';

export const revalidate = 300;

type Props = { params: Promise<{ locale: Locale; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const cat = (await getCategories()).find(c => c.slug === slug);
  const title = cat?.name ?? 'Category';
  const desc = `Shop ${cat?.name ?? 'gadgets'} online at ${SITE.name} — genuine stock, islandwide delivery across Sri Lanka.`;
  return {
    title,
    description: desc,
    alternates: {
      canonical: `/${locale}/category/${slug}`,
      languages: Object.fromEntries(locales.map(l => [l, `/${l}/category/${slug}`]))
    },
    openGraph: {
      title: `${title} — ${SITE.name}`,
      description: desc,
      type: 'website'
    }
  };
}

export default async function CategoryPage({ params }: Props) {
  const { locale, slug } = await params;
  const dict = getDict(locale);
  const [categories, discounts, productsRaw] = await Promise.all([
    getCategories(), getActiveDiscounts(), getProducts({ categorySlug: slug })
  ]);
  const cat = categories.find(c => c.slug === slug);
  if (!cat) notFound();
  const products = productsRaw.map(p => localized(p, locale));

  // JSON-LD BreadcrumbList for SEO
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: SITE.name, item: `${SITE.url}/${locale}` },
      { '@type': 'ListItem', position: 2, name: cat.name, item: `${SITE.url}/${locale}/category/${slug}` }
    ]
  };

  // JSON-LD CollectionPage
  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: cat.name,
    description: `Shop ${cat.name} at ${SITE.name}`,
    url: `${SITE.url}/${locale}/category/${slug}`,
    numberOfItems: products.length
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(collectionJsonLd) }} />

      {/* Breadcrumbs */}
      <nav className="breadcrumb mb-4" aria-label="Breadcrumb">
        <Link href={`/${locale}`}>{SITE.name}</Link>
        <span className="sep" aria-hidden>/</span>
        <Link href={`/${locale}/search`}>{dict.nav.categories}</Link>
        <span className="sep" aria-hidden>/</span>
        <span className="text-ink font-semibold">{cat.name}</span>
      </nav>

      {/* Category Header with organic shape */}
      <div className="relative mb-8 overflow-hidden bg-gradient-to-r from-tint-sky to-tint-mint p-8 md:p-12"
        style={{ borderRadius: '28px' }}>
        <div className="absolute -right-12 -top-12 h-40 w-40 bg-gradient-to-br from-volt/15 to-accent/15 blur-2xl" style={{ borderRadius: '40% 60% 60% 40%' }} aria-hidden />
        <h1 className="relative z-10 text-2xl font-extrabold tracking-[-0.02em] md:text-3xl">{cat.name}</h1>
        <p className="relative z-10 mt-2 text-[14px] text-muted">{products.length} items available</p>

        {/* Category quick-filter chips */}
        {categories.length > 1 && (
          <div className="rail relative z-10 mt-4 flex gap-2 overflow-x-auto">
            {categories.map(c => (
              <Link key={c.id} href={`/${locale}/category/${c.slug}`}
                className={`pressable shrink-0 px-4 py-2 text-[13px] font-semibold transition-all ${c.id === cat.id ? 'btn-pill bg-volt text-white shadow-md' : 'bg-card/80 text-muted hover:text-ink backdrop-blur-sm'}`}
                style={{ borderRadius: c.id === cat.id ? '999px' : '14px' }}>
                {c.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Product Grid */}
      <div>
        {products.length > 0
          ? <ProductGrid products={products} discounts={discounts} locale={locale} dict={dict} />
          : <div className="card-glass p-8 text-center text-muted" style={{ borderRadius: '24px' }}>
              No products here yet — check back soon.
            </div>}
      </div>
    </div>
  );
}
