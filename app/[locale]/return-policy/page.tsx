import type { Metadata } from 'next';
import Link from 'next/link';
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
    title: 'Return & Refund Policy',
    description: `${SITE.name} return policy — 7-day returns islandwide in Sri Lanka, wrong/damaged item replacement, and how refunds are paid for COD and card orders.`,
    alternates: {
      canonical: `/${locale}/return-policy`,
      languages: { ...Object.fromEntries(locales.map(l => [l, `/${l}/return-policy`])), 'x-default': '/en/return-policy' }
    }
  };
}

export default async function ReturnPolicyPage({ params }: Props) {
  const { locale } = await params;
  return (
    <PolicyArticle
      locale={locale}
      title="Return & Refund Policy"
      updated={UPDATED}
      intro={`We want you to be completely happy with your purchase. If something isn't right, you can request a return within 7 days of delivery — the whole process starts online and works from anywhere in Sri Lanka.`}
      sections={[
        {
          heading: 'The 7-day return window',
          body: <>
            <p>You may request a return within <b>7 days of receiving your order</b>. Start the request on our <Link className="text-volt underline" href={`/${locale}/returns`}>returns page</Link> with your order number, or message us on <a className="text-volt underline" href={waLink('Hi! I would like to return an item.')} target="_blank" rel="noopener noreferrer">WhatsApp</a>.</p>
          </>
        },
        {
          heading: 'What can be returned',
          body: <>
            <p>✔ <b>Wrong item delivered</b> — we replace it and cover all courier costs.<br />
            ✔ <b>Damaged or defective on arrival</b> — reported within 48 hours, replaced as a priority, courier on us.<br />
            ✔ <b>Not as described</b> — if the product materially differs from its listing.<br />
            ✔ <b>Change of mind</b> — accepted only if the item is <b>unopened and sealed</b> in its original packaging; return courier cost is borne by the customer.</p>
          </>
        },
        {
          heading: "What can't be returned",
          body: <>
            <p>• Devices that have been <b>activated, registered to an account</b>, or had the manufacturer&rsquo;s seal opened (except for defects covered by warranty).<br />
            • Items with physical or liquid damage caused after delivery.<br />
            • Earphones, earbuds and other in-ear hygiene items once unsealed.<br />
            • Software licences, top-ups and gift cards.</p>
            <p>Faults that appear after the 7-day window are handled under the <Link className="text-volt underline" href={`/${locale}/warranty-policy`}>Warranty Policy</Link> instead.</p>
          </>
        },
        {
          heading: 'Condition of returned items',
          body: <>
            <p>Please return the item with <b>everything that came in the box</b> — device, accessories, manuals, free gifts — in the original packaging. Remove any accounts and locks (Google/Apple ID, PIN) and back up your data first. Items returned incomplete, locked, or in a different condition than delivered may be refused or subject to a deduction.</p>
          </>
        },
        {
          heading: 'How to return from anywhere in Sri Lanka',
          body: <>
            <p><b>1.</b> Submit the request on our <Link className="text-volt underline" href={`/${locale}/returns`}>returns page</Link> or via WhatsApp within 7 days.<br />
            <b>2.</b> We approve it and share the return address and courier instructions (or arrange pickup where available).<br />
            <b>3.</b> We inspect the item within <b>2–3 working days</b> of receiving it.<br />
            <b>4.</b> You choose: <b>replacement</b>, <b>exchange</b> (pay/receive the difference), <b>store credit</b>, or <b>refund</b>.</p>
            <p>You can also bring the item directly to our Nugegoda shop.</p>
          </>
        },
        {
          heading: 'Refunds — how and when',
          body: <>
            <p>Once a return is approved after inspection:</p>
            <p>• <b>Card payments (PayHere)</b> — refunded to the same card, typically within <b>5–10 working days</b> depending on your bank.<br />
            • <b>Cash on delivery</b> — refunded by bank transfer to your account, typically within <b>3–5 working days</b> of approval.<br />
            • <b>Store credit</b> — issued immediately on approval.</p>
            <p>Original delivery charges are refunded only when the return is due to our error (wrong, damaged or not-as-described items).</p>
          </>
        },
        {
          heading: 'Order cancellations',
          body: <>
            <p>You can cancel an order free of charge <b>any time before it is dispatched</b> — message us on WhatsApp with your order number. Prepaid amounts are refunded in full. Once dispatched, the 7-day return process applies instead.</p>
          </>
        }
      ]}
      crossLinks={[
        { label: 'Start a return', href: '/returns' },
        { label: 'Warranty Policy', href: '/warranty-policy' },
        { label: 'Terms & Conditions', href: '/terms' }
      ]}
    />
  );
}
