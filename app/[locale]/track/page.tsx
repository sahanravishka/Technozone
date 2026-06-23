import type { Metadata } from 'next';
import type { Locale } from '@/lib/i18n/config';
import { getDict } from '@/lib/i18n/dictionaries';
import TrackForm from '@/components/TrackForm';

export const metadata: Metadata = { title: 'Track your repair', robots: { index: false } };

export default async function TrackPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const dict = getDict(locale);
  return (
    <div className="mx-auto max-w-md px-4 py-12 md:py-16">
      <div className="text-center">
        <h1 className="text-[1.7rem] font-extrabold tracking-tight">{dict.services.trackTitle}</h1>
        <p className="mt-2 text-[14px] text-muted">{dict.services.trackSub}</p>
      </div>
      <div className="mt-7"><TrackForm dict={dict} /></div>
    </div>
  );
}
