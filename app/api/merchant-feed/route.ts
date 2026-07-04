import { getActiveDiscounts, getProducts, getCategories } from '@/lib/data';
import { priceProduct } from '@/lib/pricing';
import { imageUrl } from '@/lib/supabase';
import { SITE } from '@/lib/site';

// Google Merchant Center RSS 2.0 product feed.
// Register the site in Merchant Center and point the feed at
//   https://technozonelanka.com/api/merchant-feed
// -> every product becomes eligible for FREE listings in the Google
//    Shopping tab + image search, a major organic channel in LK.
export const revalidate = 3600;

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
   .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export async function GET() {
  const [products, discounts, categories] = await Promise.all([
    getProducts(), getActiveDiscounts(), getCategories()
  ]);
  const catName = new Map(categories.map(c => [c.id, c.name]));

  const items = products.flatMap(p => {
    const pricing = priceProduct(p, discounts);
    if (pricing.price <= 0) return [];
    const img = p.product_images?.[0];
    if (!img) return []; // Merchant Center rejects items without images
    const link = `${SITE.url}/en/product/${p.slug}`;
    const desc = (p.description ?? `${p.name} available at ${SITE.name} with official warranty and islandwide delivery.`).slice(0, 4900);
    return [`  <item>
    <g:id>${esc(pricing.sku || p.id)}</g:id>
    <g:title>${esc(p.name.slice(0, 150))}</g:title>
    <g:description>${esc(desc)}</g:description>
    <g:link>${esc(link)}</g:link>
    <g:image_link>${esc(imageUrl(img.storage_path))}</g:image_link>${
      (p.product_images ?? []).slice(1, 11).map(i => `
    <g:additional_image_link>${esc(imageUrl(i.storage_path))}</g:additional_image_link>`).join('')}
    <g:availability>${pricing.stock > 0 ? 'in_stock' : 'out_of_stock'}</g:availability>
    <g:price>${(pricing.compareAt && pricing.compareAt > pricing.price ? pricing.compareAt : pricing.price).toFixed(2)} LKR</g:price>${pricing.compareAt && pricing.compareAt > pricing.price ? `
    <g:sale_price>${pricing.price.toFixed(2)} LKR</g:sale_price>` : ''}
    <g:condition>new</g:condition>${p.brand ? `
    <g:brand>${esc(p.brand)}</g:brand>` : ''}${p.category_id && catName.get(p.category_id) ? `
    <g:product_type>${esc(catName.get(p.category_id)!)}</g:product_type>` : ''}
    <g:identifier_exists>false</g:identifier_exists>
  </item>`];
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
  <title>${esc(SITE.name)}</title>
  <link>${esc(SITE.url)}</link>
  <description>${esc(SITE.description)}</description>
${items.join('\n')}
</channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600'
    }
  });
}
