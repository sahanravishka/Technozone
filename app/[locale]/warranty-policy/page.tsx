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
    title: 'Warranty Policy',
    description: `${SITE.name} warranty policy — official warranty registered by IMEI, what's covered, what voids warranty, and how to claim anywhere in Sri Lanka.`,
    alternates: {
      canonical: `/${locale}/warranty-policy`,
      languages: { ...Object.fromEntries(locales.map(l => [l, `/${l}/warranty-policy`])), 'x-default': '/en/warranty-policy' }
    }
  };
}

export default async function WarrantyPolicyPage({ params }: Props) {
  const { locale } = await params;
  return (
    <PolicyArticle
      locale={locale}
      title="Warranty Policy"
      updated={UPDATED}
      intro={`Every product sold by ${SITE.name} is genuine and carries the warranty period shown on its product page. Your warranty is registered against the device's IMEI or serial number the moment we dispatch your order — no warranty card to lose.`}
      sections={[
        {
          heading: 'Warranty period & registration',
          body: <>
            <p>The warranty period for each product is shown clearly on its product page (for example, <b>12 months</b> for most phones and <b>3–6 months</b> for most accessories). The period starts on the <b>date of delivery or pickup</b>.</p>
            <p>At dispatch we scan and record your device&rsquo;s <b>IMEI / serial number</b> against your order, so your warranty is registered automatically. You can check your warranty status any time on our <Link className="text-volt underline" href={`/${locale}/warranty`}>warranty lookup page</Link> using your IMEI or order number.</p>
          </>
        },
        {
          heading: "What's covered",
          body: <>
            <p>The warranty covers <b>manufacturing defects</b> — faults in materials or workmanship that appear under normal use. Typical examples: a device that won&rsquo;t power on, screen or speaker defects not caused by impact, charging port failure under normal use, and battery faults beyond normal capacity ageing.</p>
            <p>If a covered fault is confirmed, we will <b>repair the device</b>, <b>replace it</b> with the same or an equivalent model, or — where neither is possible — <b>refund</b> it, at our discretion and at no cost to you.</p>
          </>
        },
        {
          heading: "What's not covered",
          body: <>
            <p>Like all manufacturer warranties, the following are excluded:</p>
            <p>• <b>Physical damage</b> — cracked screens, dents, bends, or damage from drops and impacts.<br />
            • <b>Liquid damage</b> — including humidity indicators being triggered.<br />
            • <b>Unauthorized repair or opening</b> — broken warranty seals, third-party parts, or tampering.<br />
            • <b>Software issues</b> caused by rooting, flashing custom firmware, or malware.<br />
            • Normal wear and tear — scratches, cosmetic ageing, and gradual battery capacity loss.<br />
            • Accessories-in-the-box (cables, cases) beyond their own stated warranty.</p>
          </>
        },
        {
          heading: 'How to claim',
          body: <>
            <p><b>Step 1</b> — Contact us on <a className="text-volt underline" href={waLink('Hi! I need to make a warranty claim.')} target="_blank" rel="noopener noreferrer">WhatsApp</a> with your order number or IMEI and a short description (photos/video help a lot).</p>
            <p><b>Step 2</b> — Bring the device to our Nugegoda shop, or courier it to us from anywhere in Sri Lanka. Please back up and remove any locks (Google/Apple account, PIN) first — we cannot service locked devices.</p>
            <p><b>Step 3</b> — Our technicians confirm the fault, usually within <b>3–7 working days</b>. Manufacturer-level repairs that must go to the official agent can take longer; we&rsquo;ll keep you updated throughout, and you can track progress on our <Link className="text-volt underline" href={`/${locale}/track`}>repair tracking page</Link>.</p>
          </>
        },
        {
          heading: 'Dead on arrival (DOA)',
          body: <>
            <p>If a device is faulty <b>out of the box</b>, report it to us within <b>48 hours of delivery</b> with the complete packaging and accessories. Confirmed DOA units are replaced with a brand-new unit as a priority, with courier costs on us.</p>
          </>
        },
        {
          heading: 'Your statutory rights',
          body: <>
            <p>This policy is in addition to — and never limits — your rights as a consumer under Sri Lankan law, including the Consumer Affairs Authority Act.</p>
          </>
        }
      ]}
      crossLinks={[
        { label: 'Check my warranty', href: '/warranty' },
        { label: 'Return Policy', href: '/return-policy' },
        { label: 'Terms & Conditions', href: '/terms' }
      ]}
    />
  );
}
