import type { Metadata } from 'next';
import type { Locale } from '@/lib/i18n/config';
import { locales } from '@/lib/i18n/config';
import { SITE, waLink } from '@/lib/site';
import PolicyArticle from '@/components/PolicyArticle';

export const revalidate = 86400;
const UPDATED = 'July 2026';

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: 'Privacy Policy',
    description: `How ${SITE.name} collects, uses and protects your personal information — orders, payments, delivery and marketing, in line with Sri Lanka's Personal Data Protection Act.`,
    alternates: {
      canonical: `/${locale}/privacy`,
      languages: { ...Object.fromEntries(locales.map(l => [l, `/${l}/privacy`])), 'x-default': '/en/privacy' }
    }
  };
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  return (
    <PolicyArticle
      locale={locale}
      title="Privacy Policy"
      updated={UPDATED}
      intro={`${SITE.name} collects only the information needed to sell, deliver and support genuine products — nothing more. This page explains exactly what we collect, why, and the choices you have, in line with Sri Lanka's Personal Data Protection Act (PDPA) No. 9 of 2022.`}
      sections={[
        {
          heading: 'What we collect',
          body: <>
            <p>• <b>Order details</b> — your name, phone number, delivery address and email, so we can deliver and contact you about your order.<br />
            • <b>Account details</b> — your login email and order history, if you create an account.<br />
            • <b>Device identifiers</b> — the IMEI/serial of devices you buy, recorded at dispatch to register your warranty.<br />
            • <b>Support messages</b> — WhatsApp or form messages you send us, to resolve your requests.</p>
          </>
        },
        {
          heading: 'What we never collect',
          body: <>
            <p>We <b>never see or store your card number</b>. Online payments are processed entirely by PayHere on their secure, Central Bank-approved systems — we only receive confirmation that a payment succeeded.</p>
          </>
        },
        {
          heading: 'How we use your information',
          body: <>
            <p>To process and deliver orders, register and honour warranties, handle returns and repairs, answer support messages, prevent fraud (for example verifying high-value COD orders by phone), and — only if you opt in — send offers on WhatsApp. We do <b>not</b> sell or rent your personal information to anyone.</p>
          </>
        },
        {
          heading: 'Who we share it with',
          body: <>
            <p>Only the minimum needed to serve you: <b>courier partners</b> receive your name, address and phone number to deliver; <b>PayHere</b> processes online payments; and official <b>manufacturer service agents</b> may receive device details for warranty repairs. Each partner may only use the data to perform that service.</p>
          </>
        },
        {
          heading: 'Cookies & analytics',
          body: <>
            <p>We use essential cookies to keep your cart and login working, and basic analytics to understand which pages are useful. We don&rsquo;t use invasive cross-site tracking.</p>
          </>
        },
        {
          heading: 'Security & retention',
          body: <>
            <p>Your data is stored on secured, access-controlled infrastructure with row-level security, and staff access is limited by role. We keep order and warranty records for as long as needed to honour warranties and meet legal/accounting requirements, then delete or anonymise them.</p>
          </>
        },
        {
          heading: 'Your rights',
          body: <>
            <p>Under the PDPA you can ask us at any time to <b>see</b> the personal data we hold about you, <b>correct</b> it, or <b>delete</b> it (where we&rsquo;re not legally required to keep it, e.g. tax records). You can also opt out of marketing messages at any time. Just message us on <a className="text-volt underline" href={waLink('Hi! I have a privacy request.')} target="_blank" rel="noopener noreferrer">WhatsApp</a> — we respond to privacy requests within 14 days.</p>
          </>
        }
      ]}
      crossLinks={[
        { label: 'Terms & Conditions', href: '/terms' },
        { label: 'Return Policy', href: '/return-policy' },
        { label: 'Warranty Policy', href: '/warranty-policy' }
      ]}
    />
  );
}
