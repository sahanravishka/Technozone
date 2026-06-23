import Image from 'next/image';
import Link from 'next/link';
import type { Locale } from '@/lib/i18n/config';
import { getDict } from '@/lib/i18n/dictionaries';
import { getActiveDiscounts, getCategories, getProducts, localized } from '@/lib/data';
import { priceProduct } from '@/lib/pricing';
import { imageUrl } from '@/lib/supabase';
import { formatLKR, waLink, SITE } from '@/lib/site';
import Reveal from '@/components/Reveal';
import ProductGrid from '@/components/ProductGrid';
import FeaturedSpotlight from '@/components/FeaturedSpotlight';
import { safeJsonLd } from '@/lib/jsonld';

export const revalidate = 300;

// pastel tints + line icons cycled across the category tiles
const CAT_TINTS = ['bg-tint-sky', 'bg-tint-mint', 'bg-tint-lav', 'bg-tint-peach', 'bg-tint-tone'];
const CAT_ICONS = [
  <g key="a"><rect x="7" y="2" width="10" height="20" rx="2.5" /><path d="M11 18h2" /></g>,
  <g key="b"><rect x="3" y="5" width="18" height="11" rx="2" /><path d="M2 20h20" /></g>,
  <g key="c"><path d="M4 13a8 8 0 0 1 16 0" /><rect x="3" y="13" width="4" height="7" rx="2" /><rect x="17" y="13" width="4" height="7" rx="2" /></g>,
  <g key="d"><rect x="5" y="3" width="14" height="18" rx="3" /><circle cx="12" cy="12" r="3" /></g>,
  <g key="e"><rect x="6" y="2" width="12" height="20" rx="4" /><path d="M9 6h6" /></g>
];

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const dict = getDict(locale);
  const [categories, discounts, productsRaw] = await Promise.all([
    getCategories(), getActiveDiscounts(), getProducts({ limit: 12 })
  ]);
  const products = productsRaw.map(p => localized(p, locale));

  const hero = products[0];
  const heroImg = hero?.product_images?.[0];
  const heroPrice = hero ? priceProduct(hero, discounts) : null;

  const shopHref = `/${locale}/category/${categories[0]?.slug ?? ''}`;

  // JSON-LD for Organization + WebSite schema (SEO)
  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE.name,
    url: SITE.url,
    logo: `${SITE.url}/icon.png`,
    contactPoint: { '@type': 'ContactPoint', telephone: `+${SITE.whatsapp}`, contactType: 'customer service' }
  };
  const siteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name,
    url: SITE.url,
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE.url}/{locale}/search?q={search_term_string}` },
      'query-input': 'required name=search_term_string'
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-6">
      {/* JSON-LD Organization + WebSite schema for SEO */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(orgJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(siteJsonLd) }} />

      {/* ===================== HERO — with organic shapes ===================== */}
      <section className="pt-6 md:pt-7" aria-label="Featured product">
        <div className="hero-card power-on relative grid items-center gap-8 overflow-hidden p-8 md:grid-cols-[1.05fr_.95fr] md:p-14"
          style={{ borderRadius: '36px' }}>
          {/* Decorative blob shapes */}
          <div className="absolute -left-16 -top-16 h-64 w-64 rounded-full bg-gradient-to-br from-volt/10 to-accent/10 blur-3xl" aria-hidden />
          <div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-gradient-to-tl from-accent/10 to-volt/5 blur-3xl" aria-hidden />

          <div className="relative z-10">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-card px-3.5 py-1.5 text-[12px] font-bold uppercase tracking-[0.04em] text-volt">
              <span className="h-1.5 w-1.5 rounded-full bg-volt animate-pulse" />{dict.hero.eyebrow}
            </span>
            <h1 className="text-[2.1rem] font-extrabold leading-[1.04] tracking-[-0.03em] md:text-[3.6rem]">
              {dict.hero.title1}<br />{dict.hero.title2}
            </h1>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted md:text-[17px]">{dict.hero.sub}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              {/* Primary CTA — Pill shape with gradient glow */}
              <Link href={shopHref}
                className="btn-pill pressable inline-flex h-12 items-center gap-2 bg-gradient-to-r from-volt to-volt-deep px-7 text-[14.5px] font-bold text-white shadow-[0_12px_28px_-10px_rgba(27,111,216,.6)] transition-all hover:shadow-[0_16px_36px_-8px_rgba(27,111,216,.7)] hover:-translate-y-0.5">
                {dict.hero.shopNow} <ArrowIcon />
              </Link>
              {/* Secondary CTA — Organic/blob shape */}
              <a href={waLink('Hi! I have a question about a product.')} target="_blank" rel="noopener noreferrer"
                className="btn-organic pressable inline-flex h-12 items-center border border-line bg-card px-7 text-[14.5px] font-bold transition-colors hover:bg-tint-tone">
                {dict.hero.askWhatsApp}
              </a>
            </div>
          </div>

          {hero && (
            <Link href={`/${locale}/product/${hero.slug}`}
              className="hero-stage group relative mx-auto grid aspect-square w-full max-w-[260px] place-items-center overflow-hidden sm:max-w-[340px] md:max-w-[420px]"
              style={{ borderRadius: '28px' }}>
              <div className="absolute inset-[16%] rounded-full bg-volt/15 blur-2xl" />
              {heroImg && (
                <Image src={imageUrl(heroImg.storage_path)} alt={hero.name} width={520} height={620}
                  priority fetchPriority="high"
                  className="relative z-10 object-contain transition-transform duration-500 group-hover:scale-105"
                  style={{ width: '90%', height: '90%', mixBlendMode: 'multiply' }} />
              )}
              {heroPrice && (
                <div className="card-glass absolute bottom-4 right-4 z-20 px-4 py-2.5 text-right shadow-soft"
                  style={{ borderRadius: '20px' }}>
                  <div className="text-[11px] font-semibold text-muted">{dict.home.from}</div>
                  <div className="text-[19px] font-extrabold tracking-[-0.02em]">{formatLKR(heroPrice.price)}</div>
                </div>
              )}
            </Link>
          )}
        </div>
      </section>

      {/* ===================== CATEGORIES — organic tile shapes ===================== */}
      <Reveal>
        <section className="py-12 md:py-16" aria-label="Product categories">
          <div className="mb-7 flex items-end justify-between gap-5">
            <div>
              <h2 className="text-[1.6rem] font-extrabold tracking-[-0.025em] md:text-[2.1rem]">{dict.home.catTitle}</h2>
              <p className="mt-1.5 text-[14px] text-muted md:text-[15px]">{dict.home.catSub}</p>
            </div>
            <Link href={`/${locale}/search`} className="hidden shrink-0 items-center gap-1.5 text-[14px] font-bold text-volt hover:underline md:inline-flex">
              {dict.home.allCats} <ArrowIcon />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-5">
            {categories.slice(0, 5).map((c, i) => (
              <Link key={c.id} href={`/${locale}/category/${c.slug}`}
                className={`cat-tile group flex min-h-[150px] flex-col justify-between p-5 transition-all duration-300 ${CAT_TINTS[i % CAT_TINTS.length]}`}
                style={{ borderRadius: '22px' }}>
                <span className="cat-icon grid h-11 w-11 place-items-center bg-card text-ink shadow-sm" style={{ borderRadius: '14px' }}>
                  <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    {CAT_ICONS[i % CAT_ICONS.length]}
                  </svg>
                </span>
                <span className="flex items-center justify-between">
                  <span className="text-[16px] font-bold tracking-[-0.01em]">{c.name}</span>
                  <span className="text-muted transition-transform group-hover:translate-x-0.5"><ArrowIcon /></span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </Reveal>

      {/* ===================== TRENDING PRODUCTS ===================== */}
      <Reveal>
        <section className="pb-12 md:pb-16" aria-label="Trending products">
          <div className="mb-7 flex items-end justify-between gap-5">
            <div>
              <h2 className="text-[1.6rem] font-extrabold tracking-[-0.025em] md:text-[2.1rem]">{dict.home.trendTitle}</h2>
              <p className="mt-1.5 text-[14px] text-muted md:text-[15px]">{dict.home.trendSub}</p>
            </div>
            <Link href={`/${locale}/search`} className="inline-flex shrink-0 items-center gap-1.5 text-[14px] font-bold text-volt hover:underline">
              {dict.home.seeAll} <ArrowIcon />
            </Link>
          </div>
          <ProductGrid products={products.slice(0, 8)} discounts={discounts} locale={locale} dict={dict} />
        </section>
      </Reveal>

      {/* ===================== FEATURE SPOTLIGHT — auto-rotating ===================== */}
      {products.length > 0 && (
        <Reveal>
          <section className="pb-12 md:pb-16" aria-label="Featured product spotlight">
            <FeaturedSpotlight products={products} discounts={discounts} locale={locale} dict={dict} />
          </section>
        </Reveal>
      )}

      {/* ===================== PROMOS — Diagonal-cut & blob shapes ===================== */}
      <Reveal>
        <section className="grid gap-4 pb-12 md:grid-cols-2 md:pb-16" aria-label="Promotions">
          <div className="relative flex min-h-[240px] flex-col justify-between overflow-hidden bg-tint-lav p-9"
            style={{ borderRadius: '26px' }}>
            <div className="relative z-10">
              <h3 className="max-w-[70%] text-[1.5rem] font-extrabold tracking-[-0.025em]">{dict.home.promoTitle}</h3>
              <p className="mt-2 max-w-[80%] text-[14.5px] text-muted">{dict.home.promoSub}</p>
            </div>
            {/* Pill button with gradient */}
            <Link href={`/${locale}/services`}
              className="btn-pill pressable relative z-10 mt-5 inline-flex h-11 w-fit items-center gap-2 bg-gradient-to-r from-volt to-accent px-6 text-[14px] font-bold text-white transition-all hover:-translate-y-0.5">
              {dict.services.bookCta} <ArrowIcon />
            </Link>
            {/* Decorative blob */}
            <div className="absolute -bottom-12 -right-12 h-56 w-56 bg-gradient-to-br from-volt to-accent opacity-25" style={{ borderRadius: '40% 60% 70% 30% / 40% 50% 60% 50%' }} />
          </div>
          <div className="relative flex min-h-[240px] flex-col justify-between overflow-hidden bg-tint-peach p-9"
            style={{ borderRadius: '26px' }}>
            <div className="relative z-10">
              <h3 className="max-w-[70%] text-[1.5rem] font-extrabold tracking-[-0.025em]">{dict.warranty.title}</h3>
              <p className="mt-2 max-w-[80%] text-[14.5px] text-muted">{dict.warranty.sub}</p>
            </div>
            {/* Organic button shape */}
            <Link href={`/${locale}/warranty`}
              className="btn-organic pressable relative z-10 mt-5 inline-flex h-11 w-fit items-center gap-2 border border-line bg-card px-6 text-[14px] font-bold transition-colors hover:bg-tint-tone">
              {dict.warranty.check} <ArrowIcon />
            </Link>
            <div className="absolute -bottom-12 -right-12 h-56 w-56 bg-gradient-to-br from-[#ff8a4b] to-[#ff5b6a] opacity-25" style={{ borderRadius: '60% 40% 30% 70% / 50% 60% 40% 50%' }} />
          </div>
        </section>
      </Reveal>

      {/* ===================== VALUE STRIP — glassmorphism cards ===================== */}
      <Reveal>
        <section className="grid gap-4 border-y border-line py-10 sm:grid-cols-2 lg:grid-cols-4" aria-label="Why shop with us">
          {[
            { t: dict.trust.warranty, s: dict.trust.warrantysub, i: <><path d="M12 2 4 5v6c0 5 3.5 8 8 11 4.5-3 8-6 8-11V5z" /><path d="m9 12 2 2 4-4" /></> },
            { t: dict.trust.courier, s: dict.trust.couriersub, i: <><rect x="1" y="6" width="14" height="11" rx="2" /><path d="M15 9h4l3 3v5h-7" /><circle cx="6" cy="18" r="1.6" /><circle cx="17" cy="18" r="1.6" /></> },
            { t: dict.trust.whatsapp, s: dict.trust.whatsappsub, i: <><path d="M3 12a9 9 0 0 1 18 0" /><path d="M21 12v4a3 3 0 0 1-3 3h-3" /><rect x="3" y="11" width="3" height="6" rx="1.5" /><rect x="18" y="11" width="3" height="6" rx="1.5" /></> },
            { t: dict.trust.payment, s: dict.trust.paymentsub, i: <><rect x="2" y="5" width="20" height="14" rx="2.5" /><path d="M2 10h20" /></> }
          ].map((v, i) => (
            <div key={i} className="card-glass flex items-start gap-3.5 p-4" style={{ borderRadius: '18px' }}>
              <span className="grid h-11 w-11 shrink-0 place-items-center bg-gradient-to-br from-volt/10 to-accent/10 text-volt" style={{ borderRadius: '14px' }}>
                <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{v.i}</svg>
              </span>
              <div>
                <h4 className="text-[14.5px] font-bold">{v.t}</h4>
                <p className="mt-0.5 text-[13px] text-muted">{v.s}</p>
              </div>
            </div>
          ))}
        </section>
      </Reveal>

      {/* ===================== WHATSAPP CTA BAND — with gradient mesh ===================== */}
      <Reveal>
        <section className="my-12 md:my-16" aria-label="Contact us on WhatsApp">
          <div className="relative overflow-hidden bg-deep px-7 py-12 text-center text-white md:px-12 md:py-16"
            style={{ borderRadius: '36px' }}>
            {/* Gradient mesh blobs */}
            <div className="absolute -left-20 -top-20 h-60 w-60 rounded-full bg-gradient-to-br from-volt/30 to-transparent blur-3xl" aria-hidden />
            <div className="absolute -bottom-16 -right-16 h-52 w-52 rounded-full bg-gradient-to-tl from-accent/25 to-transparent blur-3xl" aria-hidden />

            <h2 className="relative mx-auto max-w-2xl text-[1.7rem] font-extrabold tracking-[-0.03em] md:text-[2.4rem]">{dict.home.ctaTitle}</h2>
            <p className="relative mx-auto mt-3 max-w-xl text-[15px] text-white/60 md:text-[16px]">{dict.home.ctaSub}</p>
            <a href={waLink('Hi! I have a question.')} target="_blank" rel="noopener noreferrer"
              className="btn-pill pressable relative mt-7 inline-flex h-12 items-center gap-2.5 bg-[#25D366] px-8 text-[15px] font-bold text-white transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-8px_rgba(37,211,102,.5)]">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
                <path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.5A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.7-.1-.4-.1-.9-.3-1.6-.6-2.8-1.2-4.6-4-4.7-4.2-.1-.2-1.1-1.4-1.1-2.7s.7-1.9.9-2.2c.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2.1.4 0 .5l-.4.6c-.1.2-.3.3-.1.6.1.3.7 1.1 1.4 1.8.9.8 1.7 1 2 1.2.2.1.4.1.5-.1l.7-.8c.2-.2.3-.2.6-.1l1.8.9c.2.1.4.2.5.3.1.2.1.7-.1 1.3Z" />
              </svg>
              {dict.home.ctaBtn}
            </a>
          </div>
        </section>
      </Reveal>
    </div>
  );
}
