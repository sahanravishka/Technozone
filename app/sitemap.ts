import type { MetadataRoute } from 'next';
import { getCategories, getProducts } from '@/lib/data';
import { locales } from '@/lib/i18n/config';
import { SITE } from '@/lib/site';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [cats, products] = await Promise.all([getCategories(), getProducts()]);
  const now = new Date().toISOString();
  const out: MetadataRoute.Sitemap = [];

  for (const l of locales) {
    // Homepage — highest priority
    out.push({ url: `${SITE.url}/${l}`, lastModified: now, changeFrequency: 'daily', priority: 1 });

    // Category pages
    for (const c of cats)
      out.push({ url: `${SITE.url}/${l}/category/${c.slug}`, lastModified: now, changeFrequency: 'daily', priority: 0.8 });

    // Product pages
    for (const p of products)
      out.push({ url: `${SITE.url}/${l}/product/${p.slug}`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 });

    // Service pages
    out.push({ url: `${SITE.url}/${l}/services`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 });
    out.push({ url: `${SITE.url}/${l}/warranty`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 });
    out.push({ url: `${SITE.url}/${l}/track`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 });
    out.push({ url: `${SITE.url}/${l}/returns`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 });
    out.push({ url: `${SITE.url}/${l}/search`, lastModified: now, changeFrequency: 'daily', priority: 0.6 });
  }

  return out;
}
