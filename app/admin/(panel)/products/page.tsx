import Link from 'next/link';
import { getServerSupabase } from '@/lib/supabase-clients/server';
import PageHeader from '@/components/admin/PageHeader';
import ProductListTable from '@/components/admin/ProductListTable';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

type SearchParams = {
  q?: string; category?: string; stock?: string; sort?: string; page?: string;
};

export default async function AdminProducts({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const q = (sp.q ?? '').trim();
  const category = sp.category ?? '';
  const stock = sp.stock ?? '';
  const sort = sp.sort ?? 'newest';
  const page = Math.max(1, Number(sp.page ?? 1));

  const supabase = (await getServerSupabase())!;

  const { data: categories } = await supabase.from('categories').select('id, name').order('sort_order');

  let query = supabase.from('products')
    .select('id, name, slug, is_active, category_id, base_price, product_variants(price, stock_qty, sku), product_images(storage_path)', { count: 'exact' })
    .is('deleted_at', null);

  if (q) query = query.ilike('name', `%${q}%`);
  if (category) query = query.eq('category_id', category);

  switch (sort) {
    case 'name-asc':  query = query.order('name', { ascending: true }); break;
    case 'name-desc': query = query.order('name', { ascending: false }); break;
    case 'price-asc': query = query.order('base_price', { ascending: true }); break;
    case 'price-desc': query = query.order('base_price', { ascending: false }); break;
    default: query = query.order('created_at', { ascending: false });
  }

  // Stock filter needs post-fetch filtering (aggregated across variants), so
  // fetch a wider window when active and paginate the filtered result in memory.
  const wide = stock ? 1000 : PAGE_SIZE;
  const from = stock ? 0 : (page - 1) * PAGE_SIZE;
  query = query.range(from, from + wide - 1);

  const { data: rawProducts, count } = await query;
  let products = rawProducts ?? [];

  if (stock === 'out') products = products.filter(p => p.product_variants.reduce((n, v) => n + v.stock_qty, 0) === 0);
  if (stock === 'low') products = products.filter(p => {
    const s = p.product_variants.reduce((n, v) => n + v.stock_qty, 0);
    return s > 0 && s <= 5;
  });

  const totalCount = stock ? products.length : (count ?? 0);
  if (stock) products = products.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const qs = (overrides: Partial<SearchParams>) => {
    const merged = { q, category, stock, sort, ...overrides };
    const params = new URLSearchParams();
    Object.entries(merged).forEach(([k, v]) => { if (v) params.set(k, String(v)); });
    return `/admin/products?${params.toString()}`;
  };

  const inp = 'h-10 rounded-xl bg-paper px-3.5 text-[12.5px] font-medium outline-none focus:ring-2 focus:ring-volt';

  return (
    <div>
      <PageHeader title="Products" subtitle={`Catalog, stock and pricing · ${totalCount} product${totalCount === 1 ? '' : 's'}`}>
        <a href="/admin/products/export" download
          className="pressable admin-card px-3.5 py-2.5 text-[12.5px] font-semibold text-muted hover:bg-paper">
          ⬇ Export CSV
        </a>
        <Link href="/admin/products/trash"
          className="pressable admin-card px-3.5 py-2.5 text-[12.5px] font-semibold text-muted hover:bg-paper">
          Trash
        </Link>
        <Link href="/admin/products/new"
          className="pressable rounded-btn bg-volt px-4 py-2.5 text-[12.5px] font-semibold text-white hover:bg-volt-deep">
          + New product
        </Link>
      </PageHeader>

      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Search by name…" aria-label="Search products by name" className={`${inp} min-w-[180px] flex-1`} />
        <select name="category" defaultValue={category} aria-label="Filter by category" className={inp}>
          <option value="">All categories</option>
          {(categories ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select name="stock" defaultValue={stock} aria-label="Filter by stock level" className={inp}>
          <option value="">All stock levels</option>
          <option value="low">Low stock (≤5)</option>
          <option value="out">Out of stock</option>
        </select>
        <select name="sort" defaultValue={sort} aria-label="Sort products" className={inp}>
          <option value="newest">Newest first</option>
          <option value="name-asc">Name A–Z</option>
          <option value="name-desc">Name Z–A</option>
          <option value="price-asc">Price low–high</option>
          <option value="price-desc">Price high–low</option>
        </select>
        <button className="pressable h-10 rounded-xl bg-ink px-5 text-[12.5px] font-semibold text-white">
          Filter
        </button>
        {(q || category || stock || sort !== 'newest') && (
          <Link href="/admin/products" className="pressable grid h-10 place-items-center rounded-xl border border-line bg-card px-4 text-[12.5px] font-semibold text-muted">
            Clear
          </Link>
        )}
      </form>

      <ProductListTable products={products} categories={categories ?? []} />

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Link href={qs({ page: String(Math.max(1, page - 1)) })}
            className={`pressable rounded-lg border border-line bg-card px-3 py-1.5 text-[12px] font-semibold ${page <= 1 ? 'pointer-events-none opacity-40' : 'hover:bg-paper'}`}>
            ← Prev
          </Link>
          <span className="text-[12.5px] text-muted">Page {page} of {totalPages}</span>
          <Link href={qs({ page: String(Math.min(totalPages, page + 1)) })}
            className={`pressable rounded-lg border border-line bg-card px-3 py-1.5 text-[12px] font-semibold ${page >= totalPages ? 'pointer-events-none opacity-40' : 'hover:bg-paper'}`}>
            Next →
          </Link>
        </div>
      )}
    </div>
  );
}
