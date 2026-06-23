import type { Metadata } from 'next';
import type { Locale } from '@/lib/i18n/config';
import { getDict } from '@/lib/i18n/dictionaries';
import ReturnForm from '@/components/ReturnForm';

export const metadata: Metadata = { title: 'Request a return', robots: { index: false } };

export default async function ReturnsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const dict = getDict(locale);
  return (
    <div className="mx-auto max-w-md px-4 py-12 md:py-16">
      <div className="text-center">
        <h1 className="text-[1.7rem] font-extrabold tracking-tight">{dict.returns.title}</h1>
        <p className="mt-2 text-[14px] text-muted">{dict.returns.sub}</p>
      </div>
      <div className="mt-7"><ReturnForm dict={dict} locale={locale} /></div>
    </div>
  );
}
