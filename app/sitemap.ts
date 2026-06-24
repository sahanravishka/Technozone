import type { MetadataRoute } from 'next';
import { getCategories, getProducts } from '@/lib/data';
import { locales } from '@/lib/i18n/config';
import { SITE } from '@/lib/site';

// Refresh hourly so newly added products appear in the sitemap without a redeploy.
export const revalidate = 3600;

const langAlts = (path: string) =>
  Object.fromEntries([
    ...locales.map(l => [l, `${SITE.url}/${l}${path}`]),
    ['x-default', `${SITE.url}/en${path}`]
  ]);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [cats, products] = await Promise.all([getCategories(), getProducts()]);
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

  out.push({ url: `${SITE.url}/en/services`, lastModified: now, changeFrequency: 'monthly', priority: 0.7, alternates: { languages: langAlts('/services') } });
  out.push({ url: `${SITE.url}/en/warranty`, lastModified: now, changeFrequency: 'monthly', priority: 0.5, alternates: { languages: langAlts('/warranty') } });
  out.push({ url: `${SITE.url}/en/track`, lastModified: now, changeFrequency: 'monthly', priority: 0.5, alternates: { languages: langAlts('/track') } });
  out.push({ url: `${SITE.url}/en/returns`, lastModified: now, changeFrequency: 'monthly', priority: 0.5, alternates: { languages: langAlts('/returns') } });
  out.push({ url: `${SITE.url}/en/search`, lastModified: now, changeFrequency: 'daily', priority: 0.6, alternates: { languages: langAlts('/search') } });

  return out;
}
