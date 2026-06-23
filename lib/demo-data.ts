import type { Category, Discount, Product } from './types';

// ------------------------------------------------------------------
// DEMO CATALOG — used automatically when Supabase env vars are absent
// or tables are empty, so the storefront can be previewed instantly.
// Replace by adding real products in the admin (Stage 5).
// ------------------------------------------------------------------

const u = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=70`;

export const demoCategories: Category[] = [
  { id: 'c1', slug: 'phones-tablets', name: 'Phones & Tablets', sort_order: 1 },
  { id: 'c2', slug: 'audio', name: 'Audio', sort_order: 2 },
  { id: 'c3', slug: 'chargers-cables', name: 'Chargers & Cables', sort_order: 3 },
  { id: 'c4', slug: 'smart-devices', name: 'Smart Devices', sort_order: 4 },
  { id: 'c5', slug: 'accessories', name: 'Accessories', sort_order: 5 }
];

const P = (
  p: Partial<Product> & { id: string; slug: string; name: string; base_price: number },
  img: string, stock = 12, sku?: string
): Product => ({
  brand: null, description: null, specs: {}, category_id: null,
  product_translations: [],
  product_images: [{ id: p.id + '-img', storage_path: img, alt: p.name, sort_order: 0 }],
  product_variants: [{
    id: p.id + '-v1', sku: sku ?? p.slug.toUpperCase().slice(0, 12),
    name: 'Default', attributes: {}, price: p.base_price,
    stock_qty: stock, reserved_qty: 0, is_default: true, is_active: true
  }],
  ...p
});

export const demoProducts: Product[] = [
  {
    ...P({ id: 'p1', slug: 'galaxy-a56-5g', name: 'Samsung Galaxy A56 5G', base_price: 134900, category_id: 'c1', brand: 'Samsung',
      description: 'Flagship-grade camera and a 5,000 mAh battery that comfortably outlasts a power cut. Official Samsung Lanka warranty.',
      specs: { Display: '6.7" Super AMOLED 120 Hz', Camera: '50 MP OIS triple', Battery: '5000 mAh, 45 W', Warranty: '1 year official' } },
      u('photo-1610945265064-0e34e5519bbf'), 8, 'SAM-A56-128'),
    product_variants: [
      { id: 'p1-v1', sku: 'SAM-A56-128', name: 'Awesome Graphite / 128GB', attributes: { color: 'Graphite', storage: '128GB' }, price: 134900, stock_qty: 8, reserved_qty: 0, is_default: true, is_active: true },
      { id: 'p1-v2', sku: 'SAM-A56-256', name: 'Awesome Lilac / 256GB', attributes: { color: 'Lilac', storage: '256GB' }, price: 149900, stock_qty: 3, reserved_qty: 0, is_default: false, is_active: true }
    ]
  },
  P({ id: 'p2', slug: 'redmi-note-14', name: 'Xiaomi Redmi Note 14', base_price: 79900, category_id: 'c1', brand: 'Xiaomi',
    description: 'The best-value mid-ranger in the country right now — AMOLED screen, 108 MP camera, fast charging.',
    specs: { Display: '6.67" AMOLED', Camera: '108 MP', Battery: '5500 mAh, 45 W', Warranty: '1 year' } },
    u('photo-1598327105666-5b89351aff97'), 15, 'XIA-RN14-128'),
  P({ id: 'p3', slug: 'jbl-tune-520bt', name: 'JBL Tune 520BT Headphones', base_price: 24900, category_id: 'c2', brand: 'JBL',
    description: 'JBL Pure Bass sound with 57 hours of battery. Foldable, light, made for the daily commute.',
    specs: { Battery: '57 h playtime', Bluetooth: '5.3', Charging: 'USB-C fast charge', Warranty: '1 year' } },
    u('photo-1583394838336-acd977736f90'), 20, 'JBL-T520-BLK'),
  P({ id: 'p4', slug: 'anker-soundcore-r50i', name: 'Anker Soundcore R50i Earbuds', base_price: 12900, category_id: 'c2', brand: 'Anker',
    description: '10 mm drivers, 30-hour total battery and an IPX5 rating that shrugs off monsoon season.',
    specs: { Battery: '30 h with case', Rating: 'IPX5 water resistant', Modes: '22 EQ presets', Warranty: '6 months' } },
    u('photo-1590658268037-6bf12165a8df'), 30, 'ANK-R50I-BLK'),
  P({ id: 'p5', slug: 'anker-737-power-bank', name: 'Anker 737 Power Bank 24,000 mAh', base_price: 49900, category_id: 'c4', brand: 'Anker',
    description: '140 W output charges a laptop, a phone and earbuds at once. The island-life essential.',
    specs: { Capacity: '24,000 mAh', Output: '140 W max', Ports: '2× USB-C, 1× USB-A', Display: 'Smart digital' } },
    u('photo-1609091839311-d5365f9ff1c5'), 10, 'ANK-737-24K'),
  P({ id: 'p6', slug: 'ugreen-100w-gan-charger', name: 'UGREEN 100W GaN Charger', base_price: 18900, category_id: 'c3', brand: 'UGREEN',
    description: 'One brick for everything — 4 ports, GaN-cool, half the size of the charger it replaces.',
    specs: { Output: '100 W total', Ports: '3× USB-C, 1× USB-A', Tech: 'GaN II', Warranty: '1 year' } },
    u('photo-1583863788434-e58a36330cf0'), 25, 'UGR-100W-GAN'),
  P({ id: 'p7', slug: 'baseus-usb-c-cable-100w', name: 'Baseus 100W USB-C Cable 2m', base_price: 3490, category_id: 'c3', brand: 'Baseus',
    description: 'Braided, 100 W e-marker, survives being run over by an office chair. We tested.',
    specs: { Power: '100 W PD', Length: '2 m braided', Data: '480 Mbps' } },
    u('photo-1585060544812-6b45742d762f'), 60, 'BAS-C100-2M'),
  P({ id: 'p8', slug: 'amazfit-bip-5', name: 'Amazfit Bip 5 Smartwatch', base_price: 27900, category_id: 'c4', brand: 'Amazfit',
    description: 'Big 1.91" screen, Bluetooth calling, 10-day battery and proper GPS for your morning Galle Face run.',
    specs: { Display: '1.91" HD', Battery: '10 days', GPS: 'Built-in', Calls: 'Bluetooth calling' } },
    u('photo-1579586337278-3befd40fd17a'), 14, 'AMZ-BIP5-BLK'),
  P({ id: 'p9', slug: 'logitech-m331-silent', name: 'Logitech M331 Silent Mouse', base_price: 6900, category_id: 'c5', brand: 'Logitech',
    description: '90% quieter clicks, 24-month battery, works on the lunch-table tablecloth.',
    specs: { Clicks: 'SilentTouch', Battery: '24 months', Wireless: '2.4 GHz nano receiver' } },
    u('photo-1527864550417-7fd91fc51a46'), 40, 'LOG-M331-BLK'),
  P({ id: 'p10', slug: 'sandisk-ultra-128gb', name: 'SanDisk Ultra 128GB microSD', base_price: 4990, category_id: 'c5', brand: 'SanDisk',
    description: '140 MB/s, A1-rated for app performance. Genuine stock with 10-year warranty.',
    specs: { Capacity: '128 GB', Speed: '140 MB/s', Class: 'A1, U1', Warranty: '10 years' } },
    u('photo-1591488320449-011701bb6704'), 50, 'SDK-U128-MSD')
];

export const demoDiscounts: Discount[] = [
  { id: 'd1', scope: 'product', product_id: 'p3', category_id: null, type: 'percentage', value: 15 },
  { id: 'd2', scope: 'category', product_id: null, category_id: 'c3', type: 'percentage', value: 10 }
];

export const demoSuggestions: Record<string, string[]> = {
  p1: ['p6', 'p7', 'p4'], p2: ['p6', 'p7'], p3: ['p4'], p5: ['p7', 'p6'],
  p6: ['p7'], p8: ['p5'], p9: ['p10']
};
