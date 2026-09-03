import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { locales, type Locale } from '@/lib/i18n/config';
import { getDict } from '@/lib/i18n/dictionaries';
import { getActiveDiscounts, getCategories, getHomepageBanners, getBusinessProfile, getProducts, getBrandTiles, localized } from '@/lib/data';
import { priceProduct } from '@/lib/pricing';
import { imageUrl } from '@/lib/supabase';
import { formatLKR, waLink, SITE, KOKO_ENABLED } from '@/lib/site';
import { kokoConfigured } from '@/lib/koko';
import Reveal from '@/components/Reveal';
import ProductGrid from '@/components/ProductGrid';
import RecentlyViewed from '@/components/RecentlyViewed';
import FeaturedSpotlight from '@/components/FeaturedSpotlight';
import SectionHeading from '@/components/SectionHeading';
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

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    alternates: {
      canonical: `/${locale}`,
      languages: {
        ...Object.fromEntries(locales.map(l => [l, `/${l}`])),
        'x-default': '/en'
      }
    }
  };
}

export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const dict = getDict(locale);
  const [categories, discounts, productsRaw, banners, businessProfile, brandTiles] = await Promise.all([
    getCategories(), getActiveDiscounts(), getProducts({ limit: 12 }), getHomepageBanners(), getBusinessProfile(), getBrandTiles()
  ]);
  const products = productsRaw.map(p => localized(p, locale));
  const kokoOn = KOKO_ENABLED && kokoConfigured();

  const hero = products[0];
  const heroImg = hero?.product_images?.[0];
  const heroPrice = hero ? priceProduct(hero, discounts) : null;

  const shopHref = `/${locale}/category/${categories[0]?.slug ?? ''}`;

  // JSON-LD for Organization + WebSite schema (SEO)
  // Upgraded from plain Organization to LocalBusiness + Organization, with
  // a real address and opening hours, and @id entity-linking between the
  // business, website and homepage. A direct technical audit of a
  // top-ranking Nokia competitor (celltronics.lk) showed they do exactly
  // this; we didn't. LocalBusiness + address is a real local-search/Maps
  // ranking factor that plain Organization schema doesn't provide.
  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@id': `${SITE.url}/#organization`,
    '@type': ['LocalBusiness', businessProfile?.category || 'ElectronicsStore', 'Organization'],
    name: SITE.name,
    url: SITE.url,
    logo: `${SITE.url}/icon.png`,
    image: `${SITE.url}/icon.png`,
    sameAs: Object.values(SITE.social).filter(Boolean),
    telephone: businessProfile?.phone || `+${SITE.whatsapp}`,
    priceRange: 'LKR',
    address: {
      '@type': 'PostalAddress',
      ...(businessProfile?.street ? { streetAddress: businessProfile.street } : {}),
      addressLocality: businessProfile?.locality || 'Nugegoda',
      addressRegion: businessProfile?.region || 'Western Province',
      addressCountry: 'LK'
    },
    ...(businessProfile?.ratingValue && businessProfile?.reviewCount ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: businessProfile.ratingValue,
        reviewCount: businessProfile.reviewCount
      }
    } : {}),
    contactPoint: { '@type': 'ContactPoint', telephone: businessProfile?.phone || `+${SITE.whatsapp}`, contactType: 'customer service' }
  };
  const siteJsonLd = {
    '@context': 'https://schema.org',
    '@id': `${SITE.url}/#website`,
    '@type': 'WebSite',
    name: SITE.name,
    url: SITE.url,
    publisher: { '@id': `${SITE.url}/#organization` },
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
      {/* FAQPage schema — answers the exact questions LK buyers google before
          purchasing from an online phone shop */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: `Does ${SITE.name} deliver islandwide in Sri Lanka?`,
            acceptedAnswer: { '@type': 'Answer', text: `Yes. ${SITE.name} delivers to every district in Sri Lanka, usually within 1–4 working days, with cash on delivery available.` }
          },
          {
            '@type': 'Question',
            name: 'Is cash on delivery (COD) available?',
            acceptedAnswer: { '@type': 'Answer', text: 'Yes, cash on delivery is available islandwide, so you can pay when your phone arrives. Online card payment via PayHere is also supported.' }
          },
          {
            '@type': 'Question',
            name: 'Are the phones genuine with warranty?',
            acceptedAnswer: { '@type': 'Answer', text: `All phones and accessories at ${SITE.name} are 100% genuine with official warranty. Warranty is registered against your IMEI at dispatch.` }
          },
          {
            '@type': 'Question',
            name: 'Can I buy a Nokia phone in installments with Koko?',
            acceptedAnswer: { '@type': 'Answer', text: `Yes. ${SITE.name} accepts Koko — split any Nokia phone or accessory into 3 interest-free installments, pay the first third at checkout and the rest over the next 2 months.` }
          },
          {
            '@type': 'Question',
            name: 'Where is the shop located?',
            acceptedAnswer: { '@type': 'Answer', text: `${SITE.name} is located in Nugegoda, Sri Lanka. You can order online for delivery or choose store pickup at checkout.` }
          }
        ]
      }) }} />

      {/* ===================== HERO — with video background ===================== */}
      <section className="pt-6 md:pt-7" aria-label="Featured product">
        <div className="hero-card power-on relative flex min-h-[480px] items-center overflow-hidden p-8 md:p-16"
          style={{ borderRadius: '36px' }}>
          
          <video 
            src="/hero-video.mp4" 
            autoPlay 
            loop 
            muted 
            playsInline 
            className="absolute inset-0 z-0 h-full w-full object-cover object-[80%_center] md:object-center" 
          />

          {/* Decorative blob shapes */}
          <div className="absolute -left-16 -top-16 z-0 h-64 w-64 rounded-full bg-gradient-to-br from-volt/30 to-accent/30 blur-3xl" aria-hidden />
          <div className="absolute -bottom-20 -right-20 z-0 h-72 w-72 rounded-full bg-gradient-to-tl from-accent/30 to-volt/20 blur-3xl" aria-hidden />

          <div className="relative z-10 max-w-2xl">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/40 bg-black/40 px-3.5 py-1.5 text-[12px] font-bold uppercase tracking-[0.04em] text-white shadow-sm backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-volt animate-pulse" />{dict.hero.eyebrow}
            </span>
            <h1 className="text-[2.1rem] font-extrabold leading-[1.04] tracking-[-0.03em] text-white md:text-[3.8rem]"
                style={{ textShadow: '0 2px 10px rgba(0,0,0,0.6), 0 4px 30px rgba(0,0,0,0.4)' }}>
              {dict.hero.title1}<br />{dict.hero.title2}
            </h1>
            <p className="mt-4 max-w-md text-[15.5px] font-medium leading-relaxed text-white/90 md:text-[18px]"
               style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
              {dict.hero.sub}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {/* Primary CTA — Pill shape with gradient glow */}
              <Link href={shopHref}
                className="btn-pill pressable inline-flex h-12 items-center gap-2 bg-gradient-to-r from-volt to-volt-deep px-7 text-[14.5px] font-bold text-white shadow-[0_12px_28px_-10px_rgba(27,111,216,.6)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_36px_-8px_rgba(27,111,216,.7)]">
                {dict.hero.shopNow} <ArrowIcon />
              </Link>
              {/* Secondary CTA — Organic/blob shape */}
              <a href={waLink('Hi! I have a question about a product.')} target="_blank" rel="noopener noreferrer"
                className="btn-organic pressable inline-flex h-12 items-center border border-line bg-card/80 px-7 text-[14.5px] font-bold shadow-sm backdrop-blur-md transition-colors hover:bg-card">
                {dict.hero.askWhatsApp}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== KOKO PROMO STRIP — BNPL awareness for Nokia buyers ===================== */}
      {kokoOn && (
        <Reveal>
          <section className="pt-6 md:pt-8" aria-label="Now accepting Koko">
            <Link href={`/${locale}/search?q=nokia`}
              className="pressable group block overflow-hidden shadow-soft transition-transform hover:-translate-y-0.5"
              style={{ borderRadius: '26px' }}>
              <Image src="/banners/koko-promo-wide.jpg" alt="Now accepting Koko — pay for your Nokia phone in 3 easy, interest-free installments"
                width={2062} height={496} className="h-auto w-full object-cover" priority={false} />
            </Link>
          </section>
        </Reveal>
      )}

      {/* ===================== CATEGORIES — organic tile shapes ===================== */}
      <Reveal>
        <section className="py-12 md:py-16" aria-label="Product categories">
          <SectionHeading title={dict.home.catTitle} sub={dict.home.catSub}
            href={`/${locale}/search`} cta={dict.home.allCats} />
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
          <SectionHeading title={dict.home.trendTitle} sub={dict.home.trendSub}
            href={`/${locale}/search`} cta={dict.home.seeAll} />
          <ProductGrid products={products.slice(0, 8)} discounts={discounts} locale={locale} dict={dict} />
        </section>
      </Reveal>

      {/* ===================== BRAND RAIL — tiles into the brand price lists ===================== */}
      {brandTiles.length > 0 && (
        <Reveal>
          <section className="pb-12 md:pb-16" aria-label="Shop by brand">
            <SectionHeading title={dict.home.brandTitle} sub={dict.home.brandSub} />
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4">
              {brandTiles.map(b => (
                <Link key={b.slug} href={`/${locale}/brand/${b.slug}`}
                  className="card-soft group relative flex aspect-[4/3] flex-col justify-end overflow-hidden border border-line p-4"
                  style={{ borderRadius: '20px' }}>
                  {b.image && (
                    <Image src={imageUrl(b.image)} alt="" fill sizes="(min-width: 768px) 25vw, 50vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.06]" />
                  )}
                  {/* Keeps the label readable whatever the product shot behind it. */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" aria-hidden />
                  <div className="relative z-10">
                    <p className="text-[15px] font-extrabold text-white">{b.brand}</p>
                    <p className="text-[12px] font-semibold text-white/70">
                      {b.count} {b.count === 1 ? dict.home.brandItem : dict.home.brandItems}
                    </p>
                  </div>
                </Link>
              ))}
              {/* The "all" tile that closes the row */}
              <Link href={`/${locale}/search`}
                className="card-soft group flex aspect-[4/3] flex-col items-center justify-center gap-2 border border-line bg-paper p-4 text-center"
                style={{ borderRadius: '20px' }}>
                <span className="grid h-11 w-11 place-items-center rounded-full bg-volt/10 text-volt transition-transform duration-300 group-hover:scale-110">
                  <ArrowIcon />
                </span>
                <p className="text-[14px] font-bold">{dict.sections.all}</p>
              </Link>
            </div>
          </section>
        </Reveal>
      )}

      {/* ===================== FEATURE SPOTLIGHT — auto-rotating ===================== */}
      {products.length > 0 && (
        <Reveal>
          <section className="pb-12 md:pb-16" aria-label="Featured product spotlight">
            <FeaturedSpotlight products={products} discounts={discounts} locale={locale} dict={dict} />
          </section>
        </Reveal>
      )}

      {/* ===================== PROMOS — admin-managed banners, or defaults ===================== */}
      <Reveal>
        {banners.length > 0 ? (
          <section className={`grid gap-4 pb-12 md:pb-16 ${banners.length === 1 ? '' : 'md:grid-cols-2'}`} aria-label="Promotions">
            {banners.map((b, i) => {
              const card = (
                <div className="laminated relative flex min-h-[240px] flex-col justify-between overflow-hidden p-9" style={{ borderRadius: '26px' }}>
                  {b.image_path && (
                    <>
                      <Image src={imageUrl(b.image_path)} alt="" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" aria-hidden />
                    </>
                  )}
                  {!b.image_path && (
                    <div className={`absolute inset-0 ${i % 2 ? 'bg-tint-peach' : 'bg-tint-lav'}`} aria-hidden />
                  )}
                  <div className="relative z-10">
                    {b.badge_text && (
                      <span className="mb-2 inline-block rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-ink">
                        {b.badge_text}
                      </span>
                    )}
                    <h3 className={`max-w-[80%] text-[1.5rem] font-extrabold tracking-[-0.025em] ${b.image_path ? 'text-white' : ''}`}>{b.title}</h3>
                    {b.subtitle && <p className={`mt-2 max-w-[85%] text-[14.5px] ${b.image_path ? 'text-white/85' : 'text-muted'}`}>{b.subtitle}</p>}
                  </div>
                  {b.link_url && (
                    <span className="btn-pill pressable relative z-10 mt-5 inline-flex h-11 w-fit items-center gap-2 bg-gradient-to-r from-volt to-accent px-6 text-[14px] font-bold text-white transition-all hover:-translate-y-0.5">
                      {dict.home.seeAll} <ArrowIcon />
                    </span>
                  )}
                </div>
              );
              return b.link_url ? (
                <Link key={b.id} href={b.link_url}>{card}</Link>
              ) : (
                <div key={b.id}>{card}</div>
              );
            })}
          </section>
        ) : (
          <section className="grid gap-4 pb-12 md:grid-cols-2 md:pb-16" aria-label="Promotions">
            <div className="laminated relative flex min-h-[240px] flex-col justify-between overflow-hidden bg-tint-lav p-9"
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
            <div className="laminated relative flex min-h-[240px] flex-col justify-between overflow-hidden bg-tint-peach p-9"
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
        )}
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

      {/* ===================== SEO CONTENT — mobile phones, Nokia, networking, readability ===================== */}
      <Reveal>
        <section className="pb-12 md:pb-16" aria-label="About Techno Zone Lanka">
          <div className="rounded-[28px] border border-line bg-card px-8 py-8 md:px-12 md:py-10">
            <h2 className="mb-6 text-[1.35rem] font-extrabold tracking-[-0.025em]">
              Mobile phones &amp; gadgets in Sri Lanka
            </h2>
            <div className="grid gap-6 text-[14.5px] leading-[1.8] text-muted sm:grid-cols-2">
              <div className="space-y-4">
                <p>
                  Techno Zone Lanka is your trusted mobile phone shop in Sri Lanka. We stock genuine Nokia mobile phones, Samsung smartphones, and budget handsets. Every phone comes with an official agent warranty. Order online and get delivery islandwide.
                </p>
                <p>
                  Our Nokia range covers feature phones for everyday calls and budget smartphones for students and families. Nokia phones are built to last. They offer long battery life and reliable performance. We carry the latest Nokia models at honest prices.
                </p>
              </div>
              <div className="space-y-4">
                <p>
                  We carry more than just mobile phones. Our store has audio gear, networking solutions, tablets, chargers, and AI and cloud-ready smart accessories. Every product is sourced through authorised channels. You get genuine warranty cover and real after-sales support.
                </p>
                <p>
                  We also repair mobile phones. Our technicians handle screen replacements, battery swaps, charging port fixes, and software issues. Drop your device off or book a repair online. We send WhatsApp updates at every step so you always know the status.
                </p>
              </div>
            </div>
          </div>
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

      {/* Personal browsing trail — pulls from localStorage, hidden when empty */}
      <RecentlyViewed locale={locale} title={dict.sections.recentlyViewed} />
    </div>
  );
}
