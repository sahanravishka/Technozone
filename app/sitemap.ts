import type { MetadataRoute } from 'next';
import { getBrands, getCategories, getProducts, brandSlug } from '@/lib/data';
import { locales } from '@/lib/i18n/config';
import { SITE, KOKO_ENABLED } from '@/lib/site';
import { kokoConfigured } from '@/lib/koko';

// Refresh hourly so newly added products appear in the sitemap without a redeploy.
export const revalidate = 3600;

const langAlts = (path: string) =>
  Object.fromEntries([
    ...locales.map(l => [l, `${SITE.url}/${l}${path}`]),
    ['x-default', `${SITE.url}/en${path}`]
  ]);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [cats, products, brands] = await Promise.all([getCategories(), getProducts(), getBrands()]);
  const now = new Date().toISOString();
  const out: MetadataRoute.Sitemap = [];

  // Only emit one entry per canonical path (English), with hreflang alternates covering all locales
  out.push({
    url: `${SITE.url}/en`,
    lastModified: now, changeFrequency: 'daily', priority: 1,
    alternates: { languages: langAlts('') }
  });

  for (const c of cats)
    out.push({
      url: `${SITE.url}/en/category/${c.slug}`,
      lastModified: now, changeFrequency: 'daily', priority: 0.8,
      alternates: { languages: langAlts(`/category/${c.slug}`) }
    });

  for (const p of products)
    out.push({
      url: `${SITE.url}/en/product/${p.slug}`,
      lastModified: now, changeFrequency: 'weekly', priority: 0.9,
      alternates: { languages: langAlts(`/product/${p.slug}`) }
    });

  // Brand landing pages — target "<brand> price in sri lanka" searches
  for (const b of brands)
    out.push({
      url: `${SITE.url}/en/brand/${brandSlug(b)}`,
      lastModified: now, changeFrequency: 'daily', priority: 0.85,
      alternates: { languages: langAlts(`/brand/${brandSlug(b)}`) }
    });

  // Policy pages — trust signals search engines look for on stores
  for (const path of ['/terms', '/warranty-policy', '/return-policy', '/privacy'])
    out.push({
      url: `${SITE.url}/en${path}`,
      lastModified: now, changeFrequency: 'monthly', priority: 0.3,
      alternates: { languages: langAlts(path) }
    });

  out.push({ url: `${SITE.url}/en/services`, lastModified: now, changeFrequency: 'monthly', priority: 0.7, alternates: { languages: langAlts('/services') } });
  out.push({ url: `${SITE.url}/en/warranty`, lastModified: now, changeFrequency: 'monthly', priority: 0.5, alternates: { languages: langAlts('/warranty') } });
  out.push({ url: `${SITE.url}/en/track`, lastModified: now, changeFrequency: 'monthly', priority: 0.5, alternates: { languages: langAlts('/track') } });
  out.push({ url: `${SITE.url}/en/returns`, lastModified: now, changeFrequency: 'monthly', priority: 0.5, alternates: { languages: langAlts('/returns') } });

  // Only list it once it's actually live — no point sending Google a page
  // that 404s because Koko isn't configured.
  if (KOKO_ENABLED && kokoConfigured())
    out.push({ url: `${SITE.url}/en/koko`, lastModified: now, changeFrequency: 'weekly', priority: 0.8, alternates: { languages: langAlts('/koko') } });

  return out;
}
