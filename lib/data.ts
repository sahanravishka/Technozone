import { getSupabase } from './supabase';
import { demoCategories, demoDiscounts, demoProducts, demoSuggestions } from './demo-data';
import type { Category, DeliveryZone, Discount, Product, Review, ServiceType } from './types';
import { posEnabled } from './pos/client';
import {
  posGetCategories, posGetProducts, posGetProductBySlug,
  posSearchProducts, posGetRelated, posGetProductsByIds,
} from './pos/catalog';

// ------------------------------------------------------------------
// Data layer. Every read goes through here so the future native app /
// API routes reuse identical queries. Falls back to demo data when
// Supabase is not configured or the catalog is empty.
// ------------------------------------------------------------------

const PRODUCT_SELECT = `
  id, slug, name, brand, description, specs, base_price, category_id, rating_avg, rating_count, meta_title, meta_description, faqs, warranty_months,
  product_variants ( id, sku, name, attributes, price, stock_qty, reserved_qty, is_default, is_active ),
  product_images ( id, storage_path, alt, sort_order, color_hex, variant_id ),
  product_translations ( locale, name, description )
`;

export async function getCategories(): Promise<Category[]> {
  // POS is the source of truth when configured; fall back on any error.
  if (posEnabled()) {
    try { const c = await posGetCategories(); if (c.length) return c; } catch { /* fall through */ }
  }
  const sb = getSupabase();
  if (!sb) return demoCategories;
  const { data } = await sb.from('categories')
    .select('id, slug, name, sort_order, image_path, description').eq('is_active', true).order('sort_order');
  return data?.length ? data : demoCategories;
}

export type HomepageBanner = {
  id: string; title: string; subtitle: string | null; badge_text: string | null;
  link_url: string | null; image_path: string | null;
};

/** Admin-managed homepage promo banners. Empty when none are configured —
 *  the homepage falls back to its default promo cards in that case. */
export async function getHomepageBanners(): Promise<HomepageBanner[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const now = new Date().toISOString();
  const { data } = await sb.from('homepage_banners')
    .select('id, title, subtitle, badge_text, link_url, image_path')
    .eq('is_active', true)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order('sort_order').limit(4);
  return data ?? [];
}

export type BusinessProfile = {
  street?: string; locality?: string; region?: string; phone?: string;
  category?: string; ratingValue?: number; reviewCount?: number;
  openingHours?: string[];
};

/** Real, admin-editable business details (address/phone/Google rating) for
 *  LocalBusiness structured data — kept in sync with the actual Google
 *  Business Profile rather than hardcoded, so it stays accurate as reviews
 *  grow and doesn't need a code change to update. */
export async function getBusinessProfile(): Promise<BusinessProfile | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.from('site_settings').select('value').eq('key', 'business_profile').maybeSingle();
  return (data?.value as BusinessProfile) ?? null;
}

export async function getActiveDiscounts(): Promise<Discount[]> {
  const sb = getSupabase();
  if (!sb) return demoDiscounts;
  const { data } = await sb.from('discounts')
    .select('id, scope, product_id, category_id, type, value');
  return data ?? demoDiscounts;
}

export async function getProducts(opts?: { categorySlug?: string; limit?: number }): Promise<Product[]> {
  if (posEnabled()) {
    try { const p = await posGetProducts(opts); if (p.length) return p; } catch { /* fall through */ }
  }
  const sb = getSupabase();
  if (sb) {
    let q = sb.from('products').select(PRODUCT_SELECT).eq('is_active', true).is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (opts?.categorySlug) {
      const { data: cat } = await sb.from('categories').select('id').eq('slug', opts.categorySlug).single();
      if (cat) q = q.eq('category_id', cat.id);
    }
    if (opts?.limit) q = q.limit(opts.limit);
    const { data } = await q;
    if (data?.length) return data as unknown as Product[];
  }
  let list = demoProducts;
  if (opts?.categorySlug) {
    const cat = demoCategories.find(c => c.slug === opts.categorySlug);
    list = list.filter(p => p.category_id === cat?.id);
  }
  return opts?.limit ? list.slice(0, opts.limit) : list;
}

/** Fetch specific products by id, preserving no particular order — used by the
 *  client-side wishlist page (ids come from localStorage / the wishlists table). */
export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  if (!ids.length) return [];
  if (posEnabled()) {
    try { const p = await posGetProductsByIds(ids); if (p.length) return p; } catch { /* fall through */ }
  }
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb.from('products').select(PRODUCT_SELECT).in('id', ids).eq('is_active', true).is('deleted_at', null);
    if (data) return data as unknown as Product[];
  }
  return demoProducts.filter(p => ids.includes(p.id));
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (posEnabled()) {
    try { const p = await posGetProductBySlug(slug); if (p) return p; } catch { /* fall through */ }
  }
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb.from('products').select(PRODUCT_SELECT)
      .eq('slug', slug).eq('is_active', true).is('deleted_at', null).maybeSingle();
    if (data) return data as unknown as Product;
  }
  return demoProducts.find(p => p.slug === slug) ?? null;
}

/** Manual "related / frequently bought together" pins (admin-curated). */
export async function getSuggestions(productId: string): Promise<Product[]> {
  if (posEnabled()) {
    try { const p = await posGetRelated(productId); if (p.length) return p; } catch { /* fall through */ }
  }
  const sb = getSupabase();
  if (sb) {
    const { data: links } = await sb.from('product_suggestions')
      .select('suggested_product_id, sort_order').eq('product_id', productId).order('sort_order');
    if (links?.length) {
      const ids = links.map(l => l.suggested_product_id);
      const { data } = await sb.from('products').select(PRODUCT_SELECT)
        .in('id', ids).eq('is_active', true).is('deleted_at', null);
      if (data?.length) return data as unknown as Product[];
    }
    if (links) return []; // connected, just no pins
  }
  const ids = demoSuggestions[productId] ?? [];
  return demoProducts.filter(p => ids.includes(p.id));
}

export async function getDeliveryZones(): Promise<DeliveryZone[]> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb.from('delivery_zones')
      .select('id, name, fee').eq('is_active', true).order('sort_order');
    if (data?.length) return data;
  }
  return [
    { id: 'z1', name: 'Colombo & Suburbs', fee: 350 },
    { id: 'z2', name: 'Outstation', fee: 450 }
  ];
}

/** Apply product_translations for a locale, falling back to defaults. */
export function localized(p: Product, locale: string): Product {
  if (locale === 'en' || !p.product_translations?.length) return p;
  const t = p.product_translations.find(t => t.locale === locale);
  if (!t) return p;
  return { ...p, name: t.name || p.name, description: t.description ?? p.description };
}

// ---------------- Reviews ----------------
export async function getReviews(productId: string): Promise<Review[]> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb.from('reviews')
      .select('id, product_id, author_name, rating, title, body, is_verified, by_staff, status, created_at')
      .eq('product_id', productId).eq('status', 'published')
      .order('created_at', { ascending: false }).limit(50);
    if (data) return data as unknown as Review[];
  }
  // demo: a couple of sample reviews keyed loosely off the product id hash
  return [];
}

// ---------------- Service types ----------------
export async function getServiceTypes(): Promise<ServiceType[]> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb.from('service_types')
      .select('id, name, base_price, est_days, is_active, sort_order')
      .eq('is_active', true).order('sort_order');
    if (data?.length) return data as unknown as ServiceType[];
  }
  return [
    { id: 's1', name: 'Screen replacement', base_price: null, est_days: 2, is_active: true, sort_order: 1 },
    { id: 's2', name: 'Battery replacement', base_price: null, est_days: 1, is_active: true, sort_order: 2 },
    { id: 's3', name: 'Charging port repair', base_price: null, est_days: 2, is_active: true, sort_order: 3 },
    { id: 's4', name: 'Water damage treatment', base_price: null, est_days: 4, is_active: true, sort_order: 4 },
    { id: 's5', name: 'Software / OS issue', base_price: null, est_days: 1, is_active: true, sort_order: 5 },
    { id: 's6', name: 'Other / diagnostic', base_price: null, est_days: 2, is_active: true, sort_order: 9 }
  ];
}

// ---------------- Cart suggestions (accessories for items in cart) ----------------
export async function getCartSuggestions(productIds: string[], limit = 6): Promise<Product[]> {
  if (!productIds.length) return [];
  const sb = getSupabase();
  if (sb) {
    // pinned suggestions for the cart's products, excluding what's already in cart
    const { data: links } = await sb.from('product_suggestions')
      .select('suggested_product_id').in('product_id', productIds);
    const ids = [...new Set((links ?? []).map(l => l.suggested_product_id))]
      .filter(id => !productIds.includes(id)).slice(0, limit);
    if (ids.length) {
      const { data } = await sb.from('products').select(PRODUCT_SELECT)
        .in('id', ids).eq('is_active', true).is('deleted_at', null);
      if (data?.length) return data as unknown as Product[];
    }
    // fallback: cheap accessories from an "Accessories"/"Chargers" category
    const { data: acc } = await sb.from('products').select(PRODUCT_SELECT)
      .eq('is_active', true).is('deleted_at', null).order('base_price').limit(limit + productIds.length);
    return ((acc ?? []) as unknown as Product[]).filter(p => !productIds.includes(p.id)).slice(0, limit);
  }
  // demo
  const ids = [...new Set(productIds.flatMap(id => demoSuggestions[id] ?? []))]
    .filter(id => !productIds.includes(id)).slice(0, limit);
  return demoProducts.filter(p => ids.includes(p.id));
}

// ---------------- Search ----------------
export async function searchProducts(query: string, limit = 60): Promise<Product[]> {
  if (posEnabled()) {
    try { const p = await posSearchProducts(query, limit); if (p.length) return p; } catch { /* fall through */ }
  }
  // Whitelist to letters/numbers/space/hyphen. This is what prevents the raw
  // term from injecting PostgREST .or() conditions (commas, parens, dots, :, *).
  const q = query.trim().replace(/[^\p{L}\p{N}\s-]/gu, '').slice(0, 60).trim();
  if (!q) return [];
  const sb = getSupabase();
  if (sb) {
    // match SKUs first (separate table), then OR name/brand/those product ids
    const { data: skuRows } = await sb.from('product_variants')
      .select('product_id').ilike('sku', `%${q}%`).limit(50);
    const skuIds = [...new Set((skuRows ?? []).map(r => r.product_id))];

    let filter = `name.ilike.%${q}%,brand.ilike.%${q}%`;
    if (skuIds.length) filter += `,id.in.(${skuIds.join(',')})`;

    const { data } = await sb.from('products').select(PRODUCT_SELECT)
      .eq('is_active', true).is('deleted_at', null).or(filter).limit(limit);
    if (data) return data as unknown as Product[];
  }
  // demo fallback: match name/brand/sku in-memory
  const needle = q.toLowerCase();
  return demoProducts.filter(p =>
    p.name.toLowerCase().includes(needle) ||
    (p.brand ?? '').toLowerCase().includes(needle) ||
    p.product_variants.some(v => v.sku.toLowerCase().includes(needle))
  ).slice(0, limit);
}

/** Distinct brand list for filter dropdowns. */
export async function getBrands(): Promise<string[]> {
  if (posEnabled()) {
    try {
      const p = await posGetProducts({ limit: 500 });
      const brands = [...new Set(p.map(x => x.brand ?? '').filter(Boolean))].sort();
      if (brands.length) return brands;
    } catch { /* fall through */ }
  }
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb.from('products').select('brand').eq('is_active', true).is('deleted_at', null).not('brand', 'is', null);
    if (data) return [...new Set(data.map(d => d.brand as string).filter(Boolean))].sort();
  }
  return [...new Set(demoProducts.map(p => p.brand ?? '').filter(Boolean))].sort();
}

// ---------------- Brand pages (SEO landing pages) ----------------
/** URL-safe slug for a brand name ("Anker Soundcore" -> "anker-soundcore"). */
export function brandSlug(brand: string): string {
  return brand.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Resolve a brand slug back to the canonical brand name + its products. */
export async function getBrandBySlug(slug: string): Promise<{ brand: string; products: Product[] } | null> {
  const brands = await getBrands();
  const brand = brands.find(b => brandSlug(b) === slug);
  if (!brand) return null;
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb.from('products').select(PRODUCT_SELECT)
      .eq('is_active', true).is('deleted_at', null).eq('brand', brand).order('created_at', { ascending: false });
    return { brand, products: (data as unknown as Product[]) ?? [] };
  }
  return { brand, products: demoProducts.filter(p => p.brand === brand) };
}

// ---------------- Couriers ----------------
export async function getCouriers(): Promise<import('./types').Courier[]> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb.from('couriers').select('id, name, code, track_url_template, is_active, sort_order')
      .eq('is_active', true).order('sort_order');
    if (data?.length) return data as unknown as import('./types').Courier[];
  }
  return [
    { id: 'c1', name: 'Koombiyo Delivery', code: 'koombiyo', track_url_template: 'https://koombiyodelivery.lk/track/{tracking}', is_active: true, sort_order: 1 },
    { id: 'c5', name: 'Hand delivery / other', code: 'manual', track_url_template: null, is_active: true, sort_order: 9 }
  ];
}
