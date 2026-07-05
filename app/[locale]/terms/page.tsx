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
    title: 'Terms & Conditions',
    description: `Terms and conditions for shopping at ${SITE.name} — ordering, pricing, payment (COD & online), delivery across Sri Lanka, warranties and returns.`,
    alternates: {
      canonical: `/${locale}/terms`,
      languages: { ...Object.fromEntries(locales.map(l => [l, `/${l}/terms`])), 'x-default': '/en/terms' }
    }
  };
}

export default async function TermsPage({ params }: Props) {
  const { locale } = await params;
  return (
    <PolicyArticle
      locale={locale}
      title="Terms & Conditions"
      updated={UPDATED}
      intro={`These terms govern your use of ${SITE.url.replace('https://', '')} and every purchase you make from ${SITE.name}. By placing an order you agree to them. They are written in plain language — if anything is unclear, message us on WhatsApp before ordering.`}
      sections={[
        {
          heading: 'Who we are',
          body: <>
            <p><b>{SITE.name}</b> is an electronics retailer based in <b>Nugegoda, Sri Lanka</b>, selling genuine mobile phones, tablets and accessories online and in-store, with islandwide delivery. You can reach us any time via <a className="text-volt underline" href={waLink('Hi! I have a question about my order.')} target="_blank" rel="noopener noreferrer">WhatsApp</a>.</p>
          </>
        },
        {
          heading: 'Products & pricing',
          body: <>
            <p>All products we sell are <b>100% genuine</b>. Prices are shown in <b>Sri Lankan Rupees (LKR)</b> and include the product and its stated warranty; delivery charges (if any) are shown separately at checkout before you pay.</p>
            <p>Prices can change at any time due to currency and import cost fluctuations, but <b>the price you see at checkout is the price you pay</b> — confirmed orders are never re-priced. If a product was listed at a clearly mistaken price due to a technical error, we may cancel the order with a full refund of anything paid.</p>
            <p>Product photos are for illustration; minor variations in colour or packaging can occur between manufacturing batches.</p>
          </>
        },
        {
          heading: 'Ordering & order confirmation',
          body: <>
            <p>An order is confirmed when you receive an order number. We may contact you by phone or WhatsApp to verify an order before dispatch — this protects both of us from fraudulent orders. Orders that cannot be verified, or with unreachable contact numbers, may be cancelled.</p>
            <p>Stock is reserved when your order is confirmed. In the rare case an item is unavailable after you order, we will contact you to offer an alternative, a wait time, or a full refund — your choice.</p>
          </>
        },
        {
          heading: 'Payment',
          body: <>
            <p>We accept: <b>Cash on Delivery (COD)</b> islandwide, <b>online card payment</b> (Visa / Mastercard) securely processed by PayHere, and payment on <b>store pickup</b> in Nugegoda. We never see or store your card details — online payments are handled entirely by PayHere, a Central Bank-approved payment provider.</p>
            <p>For COD orders, please have the exact amount ready and inspect the sealed package with the courier present.</p>
          </>
        },
        {
          heading: 'Delivery & pickup',
          body: <>
            <p>We deliver to <b>every district in Sri Lanka</b>, typically within <b>1–4 working days</b> of dispatch (Colombo and suburbs usually 1–2 days; outstation 2–4 days). Delivery times are estimates and can be affected by courier delays, weather or public holidays.</p>
            <p>You can also choose <b>free store pickup</b> at our Nugegoda shop at checkout — we&rsquo;ll message you when your order is ready.</p>
            <p>Please check the parcel for external damage before accepting it. If a package arrives visibly damaged, refuse it or note the damage with the courier and contact us immediately.</p>
          </>
        },
        {
          heading: 'Warranty & returns',
          body: <>
            <p>Every product carries the warranty stated on its product page, registered against your device&rsquo;s IMEI/serial at dispatch. Full details are in our <b>Warranty Policy</b>, and our 7-day return process is described in the <b>Return Policy</b> — both linked below.</p>
          </>
        },
        {
          heading: 'Your account',
          body: <>
            <p>You are responsible for keeping your account credentials safe and for activity under your account. Provide accurate contact and delivery details — we are not responsible for failed deliveries caused by incorrect information. We may suspend accounts used for fraudulent or abusive activity.</p>
          </>
        },
        {
          heading: 'Fair use of the website',
          body: <>
            <p>You may not misuse the site: no attempts to breach security, scrape data at scale, post false reviews, or place hoax orders. Content on this site (text, images, design) belongs to {SITE.name} or its licensors and may not be copied for commercial use without permission.</p>
          </>
        },
        {
          heading: 'Liability',
          body: <>
            <p>Nothing in these terms removes your rights under Sri Lankan consumer protection law, including the Consumer Affairs Authority Act. Beyond what the law requires, our liability for any order is limited to the amount you paid for that order. We are not liable for indirect losses such as loss of data — always back up a device before handing it over for repair or return.</p>
          </>
        },
        {
          heading: 'Governing law & changes',
          body: <>
            <p>These terms are governed by the laws of the <b>Democratic Socialist Republic of Sri Lanka</b>. We may update these terms from time to time; the version published on this page at the time of your order applies to that order.</p>
          </>
        }
      ]}
      crossLinks={[
        { label: 'Warranty Policy', href: '/warranty-policy' },
        { label: 'Return Policy', href: '/return-policy' },
        { label: 'Privacy Policy', href: '/privacy' }
      ]}
    />
  );
}
