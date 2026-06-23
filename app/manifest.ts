import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.name,
    short_name: SITE.name,
    description: SITE.tagline,
    start_url: '/en',
    display: 'standalone',
    background_color: '#F5F7FA',
    theme_color: '#0B1526',
    icons: [{ src: '/icon.png', sizes: '512x512', type: 'image/png' }]
  };
}
