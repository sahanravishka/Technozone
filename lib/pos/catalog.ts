// POS catalog adapter — maps POS API shapes onto the website's existing
// Product/Category types so all current components keep working unchanged.
// The website routes products by slug; POS keys by Mongo _id, so we synthesize
// a SEO-ish slug `name--{posId}` and parse the id back on the detail route.

import type { Category, Product, ProductImage, Variant } from '@/lib/types';
import type { PosCategory, PosProduct, PosVariation } from './types';
import { posFetch, unwrapList, unwrapOne, posImageUrl, num } from './client';

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60);

/** Build the website slug for a POS product: `nice-name--<24hex id>`. */
export function posSlug(name: string, id: string): string {
  return `${slugify(name || 'product')}--${id}`;
}

/** Extract the POS _id from a synthesized slug (trailing 24-hex after `--`). */
export function parsePosId(slug: string): string | null {
  const m = slug.match(/--([a-f0-9]{24})$/i);
  if (m) return m[1];
  // Fallback: a bare id passed directly
  return /^[a-f0-9]{24}$/i.test(slug) ? slug : null;
}

function warrantyMonths(p: PosProduct): number {
  const v = p.warrantyPeriodValue ?? 0;
  if (!v) return 0;
  switch (p.warrantyPeriodUnit) {
    case 'years': return v * 12;
    case 'days':  return Math.max(1, Math.round(v / 30));
    default:      return v; // months
  }
}

function categoryId(p: PosProduct): string | null {
  if (typeof p.categoryID === 'string') return p.categoryID;
  if (p.categoryID && typeof p.categoryID === 'object') return p.categoryID._id;
  if (p.category?._id) return p.category._id;
  return null;
}

function mapVariations(p: PosProduct, basePrice: number): { variants: Variant[]; images: ProductImage[] } {
  const variants: Variant[] = [];
  const images: ProductImage[] = [];
  let sort = 0;

  const vs = (p.variations ?? []).filter((v): v is PosVariation => !!v);
  if (vs.length) {
    vs.forEach((v, i) => {
      const vid = v._id ?? `${p._id}-v${i}`;
      const hex = v.colorHex || v.color || '';
      const price = num(v.sellingPrice) || basePrice;
      variants.push({
        id: vid,
        sku: p.barcode || `${p._id}-${i}`,
        name: v.color || 'Colour',
        attributes: hex ? { color: hex } : {},
        price,
        stock_qty: v.availableQty ?? 0,
        reserved_qty: 0,
        is_default: i === 0,
        is_active: true,
      });
      (v.images ?? []).forEach(img => {
        images.push({ id: `${vid}-${sort}`, storage_path: posImageUrl(img), alt: p.name, sort_order: sort++, color_hex: hex || null, variant_id: vid });
      });
    });
  } else {
    variants.push({
      id: `${p._id}-default`,
      sku: p.barcode || p._id,
      name: 'Default',
      attributes: {},
      price: basePrice,
      stock_qty: p.totalStock ?? p.stockQty ?? 0,
      reserved_qty: 0,
      is_default: true,
      is_active: true,
    });
  }

  // Main product image first (if any and not already covered by a variation).
  if (p.image) {
    images.unshift({ id: `${p._id}-main`, storage_path: posImageUrl(p.image), alt: p.name, sort_order: -1, color_hex: null, variant_id: null });
  }
  return { variants, images };
}

/** POS product -> website Product. */
export function adaptProduct(p: PosProduct): Product {
  const basePrice = num(p.sellingPrice) || num(p.MRP);
  const { variants, images } = mapVariations(p, basePrice);
  const specs: Record<string, string> = {};
  for (const s of p.specifications ?? []) if (s?.key) specs[s.key] = s.value;

  return {
    id: p._id,
    slug: posSlug(p.name, p._id),
    name: p.name,
    brand: p.brand ?? null,
    description: p.description ?? null,
    specs,
    base_price: basePrice,
    category_id: categoryId(p),
    warranty_months: warrantyMonths(p),
    product_variants: variants,
    product_images: images,
    rating_avg: p.rating ?? 0,
    rating_count: p.reviewCount ?? 0,
  };
}

/** POS category -> website Category. */
export function adaptCategory(c: PosCategory): Category {
  return {
    id: c._id,
    slug: c.slug ? slugify(c.slug) : posSlug(c.name, c._id),
    name: c.name,
    sort_order: c.sortOrder ?? 0,
    image_path: c.image ? posImageUrl(c.image) : null,
  };
}

// ---------------------------------------------------------------------------
// Fetchers (return website types; throw on failure so callers can fall back)
// ---------------------------------------------------------------------------

const REVALIDATE = 300;

export async function posGetCategories(): Promise<Category[]> {
  const raw = await posFetch<unknown>('/categories', { revalidate: REVALIDATE });
  return unwrapList<PosCategory>(raw)
    .map(adaptCategory)
    .sort((a, b) => a.sort_order - b.sort_order);
}

export async function posGetProducts(opts?: { categorySlug?: string; limit?: number }): Promise<Product[]> {
  const limit = opts?.limit ?? 60;
  const raw = await posFetch<unknown>(`/products/public?limit=${limit}`, { revalidate: REVALIDATE });
  let products = unwrapList<PosProduct>(raw).map(adaptProduct);

  if (opts?.categorySlug) {
    const cats = await posGetCategories();
    const cat = cats.find(c => c.slug === opts.categorySlug);
    if (cat) products = products.filter(p => p.category_id === cat.id);
  }
  return opts?.limit ? products.slice(0, opts.limit) : products;
}

export async function posGetProductBySlug(slug: string): Promise<Product | null> {
  const id = parsePosId(slug);
  if (!id) return null;
  const raw = await posFetch<unknown>(`/products/public/${id}`, { revalidate: REVALIDATE });
  const p = unwrapOne<PosProduct>(raw);
  return p ? adaptProduct(p) : null;
}

export async function posSearchProducts(query: string, limit = 60): Promise<Product[]> {
  const q = query.trim().replace(/[^\p{L}\p{N}\s-]/gu, '').slice(0, 60).trim();
  if (!q) return [];
  const raw = await posFetch<unknown>(`/products/search?q=${encodeURIComponent(q)}&limit=${limit}`, { revalidate: 60 });
  return unwrapList<PosProduct>(raw).map(adaptProduct).slice(0, limit);
}

export async function posGetRelated(productId: string, limit = 6): Promise<Product[]> {
  const raw = await posFetch<unknown>(`/products/public/${productId}/related?limit=${limit}`, { revalidate: REVALIDATE });
  return unwrapList<PosProduct>(raw).map(adaptProduct).slice(0, limit);
}

export async function posGetProductsByIds(ids: string[]): Promise<Product[]> {
  if (!ids.length) return [];
  const raw = await posFetch<unknown>('/products/by-ids', { method: 'POST', body: { ids } });
  return unwrapList<PosProduct>(raw).map(adaptProduct);
}
