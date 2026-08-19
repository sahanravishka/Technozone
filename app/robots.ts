import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api', '/order-form'] }],
    // Hardcoded (not built from SITE.url) so the Sitemap directive can never
    // resolve as a relative path — a bare "/sitemap.xml" line is invalid
    // per the robots.txt spec and search engines will ignore/flag it.
    sitemap: 'https://technozonelanka.com/sitemap.xml'
  };
}
