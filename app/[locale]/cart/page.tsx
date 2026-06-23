import type { Metadata } from 'next';
import type { Locale } from '@/lib/i18n/config';
import { getDict } from '@/lib/i18n/dictionaries';
import { getDeliveryZones } from '@/lib/data';
import CartView from '@/components/CartView';

export const metadata: Metadata = { title: 'Cart', robots: { index: false } };

export default async function CartPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const dict = getDict(locale);
  const zones = await getDeliveryZones();
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-12">
      <h1 className="mb-6 text-2xl font-bold md:text-3xl">{dict.cart.title}</h1>
      <CartView dict={dict} zones={zones} locale={locale} />
    </div>
  );
}
