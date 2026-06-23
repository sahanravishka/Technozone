import type { Metadata } from 'next';
import type { Locale } from '@/lib/i18n/config';
import { getDict } from '@/lib/i18n/dictionaries';
import { getDeliveryZones, getActiveDiscounts, getProducts, localized } from '@/lib/data';
import { getServerSupabase } from '@/lib/supabase-clients/server';
import { payhereConfigured } from '@/lib/payhere';
import CheckoutForm from '@/components/CheckoutForm';
import CheckoutStub from '@/components/CheckoutStub';

export const metadata: Metadata = { title: 'Checkout', robots: { index: false } };

export default async function CheckoutPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const dict = getDict(locale);
  const supabase = await getServerSupabase();

  // No backend at all (demo): WhatsApp-only handoff.
  if (!supabase) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 md:px-6 md:py-16">
        <h1 className="mb-6 text-center text-2xl font-bold md:text-3xl">{dict.checkout.title}</h1>
        <CheckoutStub dict={dict} locale={locale} />
      </div>
    );
  }

  // Backend present: full checkout. PayHere may or may not be set up yet —
  // COD and WhatsApp ordering work regardless.
  const [zones, discounts, popular] = await Promise.all([
    getDeliveryZones(), getActiveDiscounts(), getProducts({ limit: 12 })
  ]);
  const { data: { user } } = await supabase.auth.getUser();
  const suggestions = popular.map(p => localized(p, locale));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-12">
      <h1 className="mb-6 text-2xl font-bold md:text-3xl">{dict.checkout.title}</h1>
      <CheckoutForm dict={dict} zones={zones} locale={locale} signedIn={!!user}
        suggestions={suggestions} discounts={discounts} payhereOn={payhereConfigured()} />
    </div>
  );
}
