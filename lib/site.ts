// One place to rebrand the whole shop.
export const SITE = {
  name: 'Techno Zone Lanka',
  wordmark: ['TECHNO ZONE', 'LANKA'] as const,   // second part renders in logo cyan
  tagline: 'Genuine gadgets, islandwide.',
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '94770000000',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  currency: 'LKR'
};

export const waLink = (text: string) =>
  `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(text)}`;

export const formatLKR = (n: number) =>
  'Rs ' + new Intl.NumberFormat('en-LK', { maximumFractionDigits: 0 }).format(n);
