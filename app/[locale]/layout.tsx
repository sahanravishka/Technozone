import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { locales, type Locale } from '@/lib/i18n/config';
import { getDict } from '@/lib/i18n/dictionaries';
import { getCategories } from '@/lib/data';
import { CartProvider } from '@/lib/cart-store';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PwaRegister from '@/components/PwaRegister';
import { SITE } from '@/lib/site';

const LOCAL_BUSINESS_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'ElectronicsStore',
  name: 'Techno Zone Lanka',
  url: 'https://technozonelanka.com',
  telephone: '+94707501024',
  image: 'https://technozonelanka.com/logo.jpg',
  logo: 'https://technozonelanka.com/logo.jpg',
  description:
    'Shop Nokia mobile phones, tablets, audio accessories and smart gadgets in Sri Lanka. Official warranties, islandwide delivery, device repair and networking solutions.',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Sri Soratha Mawatha, Gangodawila',
    addressLocality: 'Nugegoda',
    postalCode: '10250',
    addressRegion: 'Western Province',
    addressCountry: 'LK',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: 6.8535,
    longitude: 79.8997,
  },
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '09:00',
      closes: '21:00',
    },
  ],
  sameAs: ['https://www.facebook.com/share/14YzfzBqHrP/'],
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Mobile Phones & Gadgets',
    itemListElement: [
      { '@type': 'Offer', itemOffered: { '@type': 'Product', name: 'Nokia Mobile Phones' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Product', name: 'Samsung Mobile Phones' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Product', name: 'Audio Accessories' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Product', name: 'Phone Repair Services' } },
    ],
  },
  priceRange: '$$',
  currenciesAccepted: 'LKR',
  paymentAccepted: 'Cash, Credit Card, Bank Transfer',
  areaServed: {
    '@type': 'Country',
    name: 'Sri Lanka',
  },
};

export function generateStaticParams() {
  return locales.map(locale => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    metadataBase: new URL(SITE.url),
    title: { default: SITE.seoTitle, template: `%s · ${SITE.name}` },
    description: SITE.description,
    applicationName: SITE.name,
    authors: [{ name: SITE.name, url: SITE.url }],
    publisher: SITE.name,
    creator: SITE.name,
    keywords: [
      'mobile phones Sri Lanka', 'phone prices Sri Lanka', 'buy phones online Sri Lanka',
      'Nokia price Sri Lanka', 'Samsung price Sri Lanka', 'phone shop Sri Lanka',
      'chargers', 'earbuds', 'phone repair Sri Lanka', SITE.name
    ],
    robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
    openGraph: {
      type: 'website', siteName: SITE.name, locale,
      url: `${SITE.url}/${locale}`, title: SITE.seoTitle, description: SITE.description
    },
    twitter: { card: 'summary_large_image', title: SITE.seoTitle, description: SITE.description }
  };
}

export default async function LocaleLayout({ children, params }:
  { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) notFound();
  const l = locale as Locale;
  const dict = getDict(l);
  const categories = await getCategories();

  return (
    // html lang must reflect locale for screen readers + SEO; set via effectless trick:
    <CartProvider>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(LOCAL_BUSINESS_JSON_LD) }}
      />
      <SetLang locale={l} />
      <PwaRegister />
      <Header locale={l} dict={dict} categories={categories} />
      <main className="min-h-[70vh]">{children}</main>
      <Footer dict={dict} categories={categories} locale={l} />
    </CartProvider>
  );
}

function SetLang({ locale }: { locale: string }) {
  // Server-rendered inline script: sets <html lang> before paint (fonts depend on it)
  return (
    <script dangerouslySetInnerHTML={{
      __html: `document.documentElement.lang=${JSON.stringify(locale)}`
    }} />
  );
}
