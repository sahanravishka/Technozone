import { getServerSupabase } from '@/lib/supabase-clients/server';
import { upsertCategory } from './actions';
import PageHeader from '@/components/admin/PageHeader';
import CategoryRow from '@/components/admin/CategoryRow';

export const dynamic = 'force-dynamic';

const inp = 'h-11 w-full rounded-xl bg-paper px-3.5 text-[13px] font-medium outline-none focus:ring-2 focus:ring-volt';
const lbl = 'mb-1.5 block text-[11.5px] font-bold uppercase tracking-[0.05em] text-muted';

export default async function AdminCategories() {
  const supabase = (await getServerSupabase())!;
  const [{ data: categories }, { data: counts }] = await Promise.all([
    supabase.from('categories')
      .select('id, name, slug, parent_id, sort_order, is_active, image_path, description')
      .order('sort_order'),
    supabase.from('products').select('category_id').is('deleted_at', null),
  ]);

  const productCount = new Map<string, number>();
  for (const p of counts ?? []) {
    if (!p.category_id) continue;
    productCount.set(p.category_id, (productCount.get(p.category_id) ?? 0) + 1);
  }

  const rows = categories ?? [];

  return (
    <div className="max-w-3xl">
      <PageHeader title="Categories" subtitle="Organize the catalog into browsable sections" />

      <div className="admin-card mb-6 overflow-hidden">
        <form action={upsertCategory} className="p-5">
          <p className="mb-4 text-[12.5px] text-muted">Add a new category. Leave the slug blank to auto-generate it from the name.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={lbl} htmlFor="cat-name">Name</label>
              <input id="cat-name" name="name" required placeholder="e.g. Smartphones" className={inp} />
            </div>
            <div>
              <label className={lbl} htmlFor="cat-slug">URL slug (optional)</label>
              <input id="cat-slug" name="slug" placeholder="smartphones" className={inp} />
            </div>
            <div>
              <label className={lbl} htmlFor="cat-parent">Parent category</label>
              <select id="cat-parent" name="parent_id" defaultValue="" className={inp}>
                <option value="">— None (top level) —</option>
                {rows.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl} htmlFor="cat-image">Tile / banner image</label>
              <input id="cat-image" name="image" type="file" accept="image/*" className={`${inp} pt-2`} />
            </div>
          </div>
          <div className="mt-3">
            <label className={lbl} htmlFor="cat-desc">Description (shown on the category page, helps SEO)</label>
            <textarea id="cat-desc" name="description" rows={3}
              placeholder="2–3 sentences about what's in this category — shown as body text on the page and used as the search snippet."
              className="w-full resize-none rounded-lg bg-paper px-3 py-2.5 text-[12.5px] font-medium outline-none focus:ring-2 focus:ring-volt" />
          </div>
          <label className="mt-3 flex items-center gap-2 text-[12.5px] font-medium">
            <input type="checkbox" name="is_active" defaultChecked className="h-4 w-4 rounded accent-volt" />
            Visible on the storefront
          </label>
          <div className="mt-4 flex justify-end">
            <button className="pressable h-10 rounded-xl bg-volt px-6 text-[13px] font-semibold text-white hover:bg-volt-deep">
              + Add category
            </button>
          </div>
        </form>
      </div>

      <div className="admin-card overflow-hidden">
        {rows.length ? rows.map((c, i) => (
          <CategoryRow
            key={c.id}
            category={c}
            categories={rows}
            isFirst={i === 0}
            isLast={i === rows.length - 1}
            productCount={productCount.get(c.id) ?? 0}
          />
        )) : (
          <p className="p-8 text-center text-[13px] text-muted">No categories yet — add your first one above.</p>
        )}
      </div>
    </div>
  );
}
