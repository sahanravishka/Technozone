import type { Metadata } from 'next';
import type { Locale } from '@/lib/i18n/config';
import { getDict } from '@/lib/i18n/dictionaries';
import WishlistPageClient from '@/components/WishlistPageClient';

export const metadata: Metadata = { title: 'Wishlist' };

export default async function WishlistPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const dict = getDict(locale);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
      <h1 className="mb-6 text-2xl font-extrabold tracking-[-0.02em] md:text-3xl">Wishlist</h1>
      <WishlistPageClient locale={locale} dict={dict} />
    </div>
  );
}
