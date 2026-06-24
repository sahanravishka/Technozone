import type { Metadata } from 'next';
import type { Locale } from '@/lib/i18n/config';
import { locales } from '@/lib/i18n/config';
import { getDict } from '@/lib/i18n/dictionaries';
import { getServiceTypes } from '@/lib/data';
import RepairForm from '@/components/RepairForm';

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: 'Phone Repairs & Services in Sri Lanka',
    description: 'Book a mobile phone or device repair at Techno Zone Lanka. Screen replacements, battery swaps, charging port fixes and software help. WhatsApp updates at every step.',
    alternates: {
      canonical: `/${locale}/services`,
      languages: {
        ...Object.fromEntries(locales.map(l => [l, `/${l}/services`])),
        'x-default': '/en/services'
      }
    }
  };
}

export default async function ServicesPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const dict = getDict(locale);
  const types = await getServiceTypes();
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 md:px-6 md:py-14">
      <div className="text-center">
        <p className="text-[12.5px] font-semibold text-volt">{dict.services.eyebrow}</p>
        <h1 className="mt-2 text-[1.8rem] font-extrabold tracking-tight md:text-[2.4rem]">{dict.services.title}</h1>
        <p className="mx-auto mt-3 max-w-md text-[14px] text-muted">{dict.services.sub}</p>
      </div>
      <div className="mt-8">
        <RepairForm dict={dict} types={types} locale={locale} />
      </div>
    </div>
  );
}
