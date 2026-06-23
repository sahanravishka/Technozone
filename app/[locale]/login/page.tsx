import type { Metadata } from 'next';
import { Suspense } from 'react';
import type { Locale } from '@/lib/i18n/config';
import { getDict } from '@/lib/i18n/dictionaries';
import AuthForm from '@/components/AuthForm';

export const metadata: Metadata = { title: 'Sign in', robots: { index: false } };

export default async function LoginPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const dict = getDict(locale);
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:py-16">
      <Suspense>
        <AuthForm dict={dict} locale={locale} />
      </Suspense>
    </div>
  );
}
