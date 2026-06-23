import type { Category, Discount, Product } from './types';

// ------------------------------------------------------------------
// DEMO CATALOG — used automatically when Supabase env vars are absent
// or tables are empty, so the storefront can be previewed instantly.
// Replace by adding real products in the admin (Stage 5).
// ------------------------------------------------------------------

export const demoCategories: Category[] = [
  { id: 'c1', slug: 'phones-tablets', name: 'Phones & Tablets', sort_order: 1 },
  { id: 'c2', slug: 'audio', name: 'Audio', sort_order: 2 },
  { id: 'c3', slug: 'chargers-cables', name: 'Chargers & Cables', sort_order: 3 },
  { id: 'c4', slug: 'smart-devices', name: 'Smart Devices', sort_order: 4 },
  { id: 'c5', slug: 'accessories', name: 'Accessories', sort_order: 5 }
];

// Demo catalog emptied: the storefront now shows ONLY real products from the
// database. Until you add products in the admin, the catalog will be empty.
export const demoProducts: Product[] = [];

export const demoDiscounts: Discount[] = [];

export const demoSuggestions: Record<string, string[]> = {};
