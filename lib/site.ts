// One place to rebrand the whole shop.
export const SITE = {
  name: 'Techno Zone Lanka',
  wordmark: ['TECHNO ZONE', 'LANKA'] as const,   // second part renders in logo cyan
  tagline: 'Genuine gadgets, islandwide.',
  // SEO <title> for the homepage / default (aim 50–60 chars)
  seoTitle: 'Techno Zone Lanka — Phones, Audio & Gadgets in Sri Lanka',
  // SEO meta description (aim 150–160 chars)
  description:
    'Buy genuine phones, tablets, audio and accessories online in Sri Lanka. Official warranties, islandwide cash-on-delivery, and trusted device repair services.',
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '94770000000',
  // Production URL — falls back to the live domain so canonical/OG/sitemap are
  // never localhost even if NEXT_PUBLIC_SITE_URL isn't set in the host.
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://technozonelanka.vercel.app',
  currency: 'LKR',
  // Public social profiles — fill these in to satisfy SEO (sameAs) and link them
  // in the footer. Empty values are skipped.
  social: {
    facebook: '',
    instagram: '',
    youtube: '',
    x: '',
    linkedin: ''
  } as Record<string, string>
};

export const waLink = (text: string) =>
  `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(text)}`;

export const formatLKR = (n: number) =>
  'Rs ' + new Intl.NumberFormat('en-LK', { maximumFractionDigits: 0 }).format(n);
