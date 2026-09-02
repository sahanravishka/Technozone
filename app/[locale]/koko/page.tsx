import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Locale } from '@/lib/i18n/config';
import { locales } from '@/lib/i18n/config';
import { SITE, KOKO_ENABLED } from '@/lib/site';
import { kokoConfigured } from '@/lib/koko';
import { safeJsonLd } from '@/lib/jsonld';
import ProductFaq from '@/components/ProductFaq';

export const revalidate = 86400;

type Props = { params: Promise<{ locale: Locale }> };

// Targets the "koko sri lanka" / "buy now pay later sri lanka" / "nokia
// phone installment sri lanka" family of searches — the same local-intent
// pattern the brand pages already use, just for a payment method instead
// of a brand.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const title = 'Koko — Buy Now, Pay Later in Sri Lanka';
  const desc = `Shop Nokia phones and gadgets at ${SITE.name} and pay with Koko — split into 3 installments, interest-free. Pay 1/3 today, the rest over the next 2 months.`;
  return {
    title, description: desc,
    alternates: {
      canonical: `/${locale}/koko`,
      languages: { ...Object.fromEntries(locales.map(l => [l, `/${l}/koko`])), 'x-default': '/en/koko' }
    },
    openGraph: { title: `${title} — ${SITE.name}`, description: desc, type: 'website' }
  };
}

const FAQS = [
  {
    q: 'How does paying with Koko work at Techno Zone Lanka?',
    a: 'Choose Koko at checkout and complete the quick approval on Koko’s own secure page. You pay the first third of your order today, and the remaining two-thirds are automatically split over the next 2 months — no manual transfers to remember.'
  },
  {
    q: 'Is Koko really interest-free?',
    a: 'Yes — Koko’s installment plan itself carries no interest. A 12% Koko service fee is added to orders paid this way, shown clearly on the checkout page and your order summary before you confirm, exactly like a card processing fee. It’s a merchant service charge, not interest.'
  },
  {
    q: 'What do I need to check out with Koko?',
    a: 'A Sri Lankan mobile number and a few basic details — Koko handles identity and payment approval directly on their own page during checkout, and it only takes a moment.'
  },
  {
    q: 'Which products can I buy with Koko?',
    a: `Most items storewide, including Nokia phones, audio gear and accessories — if your order qualifies, Koko simply appears as a payment option at checkout alongside Cash on Delivery and card payment.`
  },
  {
    q: 'What if I need to return something I bought with Koko?',
    a: `Our standard 7-day return policy applies. Message us on WhatsApp with your order number and we’ll sort out the return and coordinate the refund with Koko directly.`
  }
];

export default async function KokoInfoPage({ params }: Props) {
  const { locale } = await params;
  // Never promise a payment method that isn't actually live at checkout —
  // same gate the checkout form itself uses.
  if (!KOKO_ENABLED || !kokoConfigured()) notFound();

  const pageUrl = `${SITE.url}/${locale}/koko`;

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: SITE.name, item: `${SITE.url}/${locale}` },
      { '@type': 'ListItem', position: 2, name: 'Pay with Koko', item: pageUrl }
    ]
  };

  // Mirrors the visible accordion below exactly — required for Google's
  // FAQ structured-data policy (same rule the product-page FAQ follows).
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }))
  };

  const steps = [
    { n: '1', t: 'Add to cart & checkout', s: 'Shop as normal, then choose Koko as your payment method.' },
    { n: '2', t: 'Approve on Koko’s page', s: 'A quick, secure approval on Koko’s own site — no paperwork.' },
    { n: '3', t: 'Pay 1/3 today', s: 'The rest splits automatically over the next 2 months, interest-free.' }
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }} />

      <nav className="breadcrumb mb-4" aria-label="Breadcrumb">
        <Link href={`/${locale}`}>{SITE.name}</Link>
        <span className="sep" aria-hidden>/</span>
        <span className="text-ink font-semibold">Pay with Koko</span>
      </nav>

      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-r from-tint-lav to-tint-sky p-8 md:p-12" style={{ borderRadius: '28px' }}>
        <div className="absolute -right-12 -top-12 h-40 w-40 bg-gradient-to-br from-volt/15 to-accent/15 blur-2xl" style={{ borderRadius: '40% 60% 60% 40%' }} aria-hidden />
        <span className="relative z-10 inline-flex items-center gap-2 rounded-full bg-card px-3.5 py-1.5 text-[12px] font-bold uppercase tracking-[0.04em] text-[#6D28D9] shadow-sm">
          🟣 Now accepting Koko
        </span>
        <h1 className="relative z-10 mt-4 text-2xl font-extrabold tracking-[-0.02em] md:text-4xl">
          Buy Now, Pay Later with Koko
        </h1>
        <p className="relative z-10 mt-3 max-w-2xl text-[15px] text-muted md:text-[16px]">
          Get your Nokia phone or gadget today and split the cost into 3 interest-free installments —
          pay a third now, the rest over the next 2 months. Available islandwide at {SITE.name}.
        </p>
        <div className="relative z-10 mt-6 flex flex-wrap gap-3">
          <Link href={`/${locale}/search?q=nokia`}
            className="pressable inline-flex h-12 items-center rounded-btn bg-volt px-6 text-[14px] font-bold text-white shadow-md hover:bg-volt-deep">
            Shop Nokia phones with Koko →
          </Link>
          <Link href={`/${locale}/checkout`}
            className="pressable inline-flex h-12 items-center rounded-btn border border-line bg-card px-6 text-[14px] font-bold hover:bg-paper">
            Go to checkout
          </Link>
        </div>
      </div>

      {/* How it works */}
      <section className="mt-12">
        <h2 className="text-[1.4rem] font-extrabold tracking-[-0.02em] md:text-[1.7rem]">How it works</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {steps.map(s => (
            <div key={s.n} className="card-glass p-5" style={{ borderRadius: '18px' }}>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[#6D28D9]/[0.1] text-[14px] font-black text-[#6D28D9]">{s.n}</span>
              <h3 className="mt-3 text-[14.5px] font-bold">{s.t}</h3>
              <p className="mt-1 text-[13px] text-muted">{s.s}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Banner */}
      <div className="mt-10 overflow-hidden shadow-soft" style={{ borderRadius: '24px' }}>
        <Image src="/banners/koko-promo-dark.jpg" alt="Techno Zone Lanka now accepts Koko — buy now, pay later"
          width={2752} height={1536} className="h-auto w-full object-cover" />
      </div>

      {/* FAQ */}
      <section className="mt-12 max-w-2xl">
        <ProductFaq faqs={FAQS} />
      </section>

      {/* Internal links */}
      <section className="mt-10 rounded-3xl bg-card p-6 text-center md:p-8">
        <p className="text-[14.5px] font-bold">Ready to shop?</p>
        <p className="mt-1 text-[13px] text-muted">Browse our full Nokia range or head straight to checkout.</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
          <Link href={`/${locale}/brand/nokia`} className="pressable rounded-btn bg-paper px-5 py-2.5 text-[13px] font-bold hover:bg-line/60">
            Nokia price list →
          </Link>
          <Link href={`/${locale}/search`} className="pressable rounded-btn bg-paper px-5 py-2.5 text-[13px] font-bold hover:bg-line/60">
            Browse all products →
          </Link>
        </div>
      </section>
    </div>
  );
}
