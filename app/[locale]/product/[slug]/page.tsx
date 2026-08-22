import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Locale } from '@/lib/i18n/config';
import { locales } from '@/lib/i18n/config';
import { getDict } from '@/lib/i18n/dictionaries';
import { getActiveDiscounts, getProductBySlug, getSuggestions, getReviews, getCategories, localized } from '@/lib/data';
import { priceProduct } from '@/lib/pricing';
import { imageUrl } from '@/lib/supabase';
import { SITE } from '@/lib/site';
import ProductBuyPanel from '@/components/ProductBuyPanel';
import ProductGrid from '@/components/ProductGrid';
import Reviews from '@/components/Reviews';
import Reveal from '@/components/Reveal';
import { safeJsonLd } from '@/lib/jsonld';
import RecentlyViewed, { RecentlyViewedTracker } from '@/components/RecentlyViewed';
import ProductFaq from '@/components/ProductFaq';

export const revalidate = 0;

type Props = { params: Promise<{ locale: Locale; slug: string }> };

// Per-product SEO: meta, OG (clean WhatsApp previews), canonical + hreflang
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const raw = await getProductBySlug(slug);
  if (!raw) return {};
  const p = localized(raw, locale);
  const img = p.product_images?.[0];
  // Keyword pattern that ranks for local intent: "<Product> Price in Sri Lanka"
  const pricing = priceProduct(p, await getActiveDiscounts());
  const priceStr = pricing.price > 0 ? ` is Rs ${pricing.price.toLocaleString('en-LK')}` : '';
  // Staff can hand-tune these per product from the admin SEO panel;
  // otherwise fall back to the local-intent template that ranks in LK.
  const title = p.meta_title?.trim() || `${p.name} Price in Sri Lanka`;
  const desc = (p.meta_description?.trim() || (p.description
    ? `${p.name}${priceStr} at ${SITE.name}. ${p.description}`
    : `${p.name}${priceStr} at ${SITE.name}. Genuine stock, official warranty and islandwide cash on delivery.`
  )).slice(0, 160);
  return {
    title,
    description: desc,
    alternates: {
      canonical: `/${locale}/product/${slug}`,
      languages: {
        ...Object.fromEntries(locales.map(l => [l, `/${l}/product/${slug}`])),
        'x-default': `/en/product/${slug}`
      }
    },
    openGraph: {
      title: `${title} — ${SITE.name}`, description: desc, type: 'website',
      images: img ? [{ url: imageUrl(img.storage_path), width: 1200, height: 1200, alt: p.name }] : []
    }
  };
}

export default async function ProductPage({ params }: Props) {
  const { locale, slug } = await params;
  const dict = getDict(locale);
  const raw = await getProductBySlug(slug);
  if (!raw) notFound();
  const [discounts, suggestionsRaw, reviews, categories] = await Promise.all([
    getActiveDiscounts(), getSuggestions(raw.id), getReviews(raw.id), getCategories()
  ]);
  const product = localized(raw, locale);
  const suggestions = suggestionsRaw.map(p => localized(p, locale));
  const pricing = priceProduct(product, discounts);
  const productUrl = `${SITE.url}/${locale}/product/${slug}`;
  const category = categories.find(c => c.id === product.category_id);

  // JSON-LD Product schema -> price + stock eligible for Google rich results
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description ?? undefined,
    sku: pricing.sku,
    brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
    image: product.product_images?.map(i => imageUrl(i.storage_path)),
    aggregateRating: product.rating_count ? {
      '@type': 'AggregateRating',
      ratingValue: product.rating_avg, reviewCount: product.rating_count
    } : undefined,
    offers: {
      '@type': 'Offer',
      url: productUrl,
      priceCurrency: 'LKR',
      price: pricing.price,
      // Google Merchant listing requirements: condition, price validity,
      // shipping + return policy all make the listing eligible for the
      // full rich result (price, stars, shipping) in Search.
      itemCondition: 'https://schema.org/NewCondition',
      priceValidUntil: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10),
      availability: pricing.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: SITE.name },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'LK' },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 1, unitCode: 'DAY' },
          transitTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 4, unitCode: 'DAY' }
        }
      },
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'LK',
        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: 7,
        returnMethod: 'https://schema.org/ReturnByMail',
        returnFees: 'https://schema.org/ReturnFeesCustomerResponsibility'
      }
    }
  };

  // JSON-LD BreadcrumbList for SEO
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: SITE.name, item: `${SITE.url}/${locale}` },
      ...(category ? [{ '@type': 'ListItem', position: 2, name: category.name, item: `${SITE.url}/${locale}/category/${category.slug}` }] : []),
      { '@type': 'ListItem', position: category ? 3 : 2, name: product.name, item: productUrl }
    ]
  };

  // JSON-LD FAQPage — mirrors the visible accordion below exactly. Google
  // requires FAQ structured data to match visible on-page content; an
  // accordion (collapsed by default, expandable on click) is fine, but
  // content that's invisible even when interacted with is a policy
  // violation that can trigger a manual penalty rather than help rankings.
  const faqJsonLd = product.faqs?.length ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: product.faqs.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a }
    }))
  } : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }} />
      {faqJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }} />}

      {/* Breadcrumbs */}
      <nav className="breadcrumb mb-6" aria-label="Breadcrumb">
        <Link href={`/${locale}`}>{SITE.name}</Link>
        <span className="sep" aria-hidden>/</span>
        {category && (
          <>
            <Link href={`/${locale}/category/${category.slug}`}>{category.name}</Link>
            <span className="sep" aria-hidden>/</span>
          </>
        )}
        <span className="min-w-0 truncate text-ink font-semibold">{product.name}</span>
      </nav>

      <ProductBuyPanel product={product} discounts={discounts} dict={dict} productUrl={productUrl} />

      <Reveal>
        <Reviews productId={product.id} reviews={reviews} dict={dict}
          ratingAvg={product.rating_avg ?? 0} ratingCount={product.rating_count ?? 0} />
      </Reveal>

      {suggestions.length > 0 && (
        <Reveal>
          <section className="mt-16" aria-label="Related products">
            <h2 className="mb-5 text-lg font-bold md:text-xl">{dict.sections.related}</h2>
            <ProductGrid products={suggestions} discounts={discounts} locale={locale} dict={dict} />
          </section>
        </Reveal>
      )}

      {/* Record this visit + show the visitor's own browsing trail */}
      <RecentlyViewedTracker
        slug={slug}
        name={product.name}
        image={product.product_images?.[0] ? imageUrl(product.product_images[0].storage_path) : null}
        price={pricing.price}
      />
      <RecentlyViewed locale={locale} title={dict.sections.recentlyViewed} excludeSlug={slug} />
      {/* Spacer so sticky mobile CTA bar doesn't cover the last section */}
      <div className="h-28 md:hidden" aria-hidden />
    </div>
  );
}
