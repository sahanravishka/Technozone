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

export function generateStaticParams() {
  return locales.map(locale => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    metadataBase: new URL(SITE.url),
    title: { default: SITE.seoTitle, template: `%s · ${SITE.name}` },
    description: SITE.description,
    alternates: {
      languages: Object.fromEntries(locales.map(l => [l, `/${l}`]))
    },
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
