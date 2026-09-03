import { getStaff } from '@/lib/admin-auth';
import { getServerSupabase } from '@/lib/supabase-clients/server';

// One-click catalog backup: full product + variant list as CSV, opens
// straight in Excel / Google Sheets. Staff-gated.
export const dynamic = 'force-dynamic';

const csvCell = (v: unknown) => {
  let s = v == null ? '' : String(v);
  // Formula-injection guard — see the same helper in orders/export/route.ts.
  if (/^[=+\-@]/.test(s)) s = '\t' + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET() {
  const staff = await getStaff();
  if (!staff) return new Response('forbidden', { status: 403 });

  const supabase = (await getServerSupabase())!;
  const { data: products } = await supabase.from('products')
    .select(`id, slug, name, brand, base_price, is_active, warranty_months, created_at,
             categories ( name ),
             product_variants ( sku, name, price, stock_qty, reserved_qty, is_active )`)
    .order('name');

  const header = [
    'Product', 'Brand', 'Category', 'Slug', 'Variant', 'SKU',
    'Price (LKR)', 'Stock', 'Reserved', 'Product active', 'Variant active', 'Warranty (months)'
  ];
  const rows: string[] = [header.join(',')];

  for (const p of products ?? []) {
    const cat = (p.categories as unknown as { name: string } | null)?.name ?? '';
    const variants = (p.product_variants ?? []) as {
      sku: string; name: string; price: number; stock_qty: number; reserved_qty: number; is_active: boolean;
    }[];
    if (variants.length === 0) {
      rows.push([p.name, p.brand ?? '', cat, p.slug, '', '', p.base_price, 0, 0, p.is_active ? 'yes' : 'no', '', p.warranty_months ?? 0].map(csvCell).join(','));
    }
    for (const v of variants) {
      rows.push([
        p.name, p.brand ?? '', cat, p.slug, v.name, v.sku,
        v.price, v.stock_qty, v.reserved_qty,
        p.is_active ? 'yes' : 'no', v.is_active ? 'yes' : 'no', p.warranty_months ?? 0
      ].map(csvCell).join(','));
    }
  }

  // BOM so Excel opens it as UTF-8 (Sinhala/Tamil product names stay intact)
  const csv = '\uFEFF' + rows.join('\r\n');
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="products-${stamp}.csv"`
    }
  });
}
