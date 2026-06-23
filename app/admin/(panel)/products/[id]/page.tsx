import { notFound } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase-clients/server';
import { upsertProduct, saveVariant } from '@/app/admin/actions';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import SquareImageInput from '@/components/admin/SquareImageInput';
import PageHeader from '@/components/admin/PageHeader';

export const dynamic = 'force-dynamic';

const input = 'h-11 w-full rounded-xl bg-paper px-3.5 text-[13.5px] font-medium outline-none focus:ring-2 focus:ring-volt';
const label = 'mb-1.5 block text-[12.5px] font-semibold text-[#3D4A60]';

export default async function ProductEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === 'new';
  const supabase = (await getServerSupabase())!;

  const [{ data: categories }, { data: all }] = await Promise.all([
    supabase.from('categories').select('id, name').order('sort_order'),
    supabase.from('products').select('id, name').order('name').limit(500)
  ]);

  let product: Record<string, unknown> | null = null;
  let variants: { id: string; sku: string; name: string; price: number; stock_qty: number; is_active: boolean }[] = [];
  let suggested: string[] = [];
  if (!isNew) {
    const { data } = await supabase.from('products')
      .select('*, product_variants(id, sku, name, price, stock_qty, is_active), product_suggestions!product_suggestions_product_id_fkey(suggested_product_id)')
      .eq('id', id).maybeSingle();
    if (!data) notFound();
    product = data;
    variants = data.product_variants;
    suggested = data.product_suggestions.map((s: { suggested_product_id: string }) => s.suggested_product_id);
  }

  const specsText = product?.specs
    ? Object.entries(product.specs as Record<string, string>).map(([k, v]) => `${k}: ${v}`).join('\n') : '';

  async function save(form: FormData) {
    'use server';
    const pid = await upsertProduct(form);
    redirect(`/admin/products/${pid}`);
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title={isNew ? 'New product' : String(product?.name)} subtitle={isNew ? 'Add a product to the catalog' : 'Edit product details'}>
        <Link href="/admin/products" className="pressable admin-card px-3.5 py-2 text-[12.5px] font-semibold text-muted hover:bg-paper">← Back</Link>
      </PageHeader>

      <form action={save} className="admin-card space-y-4 p-5">
        <input type="hidden" name="id" value={isNew ? '' : id} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div><span className={label}>Name</span>
            <input name="name" defaultValue={String(product?.name ?? '')} className={input} required /></div>
          <div><span className={label}>Slug (URL)</span>
            <input name="slug" defaultValue={String(product?.slug ?? '')} className={input} placeholder="iphone-charger" required /></div>
          <div><span className={label}>Brand</span>
            <input name="brand" defaultValue={String(product?.brand ?? '')} className={input} /></div>
          <div><span className={label}>Category</span>
            <select name="category_id" defaultValue={String(product?.category_id ?? '')} className={input}>
              <option value="">—</option>
              {(categories ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select></div>
          <div><span className={label}>Base price (LKR)</span>
            <input name="base_price" type="number" step="0.01" defaultValue={String(product?.base_price ?? '')} className={input} required /></div>
          <div><span className={label}>Warranty (months)</span>
            <input name="warranty_months" type="number" min={0} defaultValue={String(product?.warranty_months ?? 12)} className={input} />
            <span className="mt-1 block text-[11px] text-muted">Auto-applied when a serial is scanned at dispatch.</span></div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-[13px] font-semibold">
              <input type="checkbox" name="is_active" defaultChecked={(product?.is_active as boolean) ?? true} className="h-4 w-4 accent-[#1B6FD8]" />
              Visible in store
            </label></div>
        </div>
        <div><span className={label}>Description</span>
          <textarea name="description" rows={3} defaultValue={String(product?.description ?? '')}
            className="w-full rounded-xl bg-paper p-3.5 text-[13.5px] font-medium outline-none focus:ring-2 focus:ring-volt" /></div>
        <div><span className={label}>Specs — one per line, `Key: Value`</span>
          <textarea name="specs" rows={4} defaultValue={specsText} placeholder={'Display: 6.7" AMOLED\nWarranty: 1 year'}
            className="w-full rounded-xl bg-paper p-3.5 font-mono text-[12.5px] outline-none focus:ring-2 focus:ring-volt" /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><span className={label}>Add image (square 1:1)</span>
            <SquareImageInput name="image" className="text-[12.5px]" /></div>
          <div><span className={label}>Related products (suggestions)</span>
            <select name="suggested" multiple size={4} defaultValue={suggested}
              className="w-full rounded-xl bg-paper p-2 text-[12.5px] outline-none focus:ring-2 focus:ring-volt">
              {(all ?? []).filter(p => p.id !== id).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select></div>
        </div>
        <button className="pressable h-11 rounded-btn bg-volt px-6 text-[13.5px] font-semibold text-white hover:bg-volt-deep">
          Save product
        </button>
      </form>

      {!isNew && (
        <div className="admin-card mt-6 p-5">
          <h2 className="mb-3 text-[15px] font-bold">Variants</h2>
          <div className="space-y-3">
            {variants.map(v => (
              <form key={v.id} action={saveVariant} className="grid grid-cols-2 items-end gap-2 border-b border-[#EEF1F6] pb-3 sm:grid-cols-[1fr_1fr_110px_90px_auto_auto]">
                <input type="hidden" name="vid" value={v.id} />
                <input type="hidden" name="product_id" value={id} />
                <div><span className={label}>SKU</span><input name="sku" defaultValue={v.sku} className={input} /></div>
                <div><span className={label}>Variant name</span><input name="vname" defaultValue={v.name} className={input} /></div>
                <div><span className={label}>Price</span><input name="price" type="number" step="0.01" defaultValue={v.price} className={input} /></div>
                <div><span className={label}>Stock</span><input name="stock" type="number" defaultValue={v.stock_qty} className={input} /></div>
                <label className="flex items-center gap-1.5 pb-3 text-[12px] font-semibold">
                  <input type="checkbox" name="vactive" defaultChecked={v.is_active} className="h-4 w-4 accent-[#1B6FD8]" /> Active
                </label>
                <button className="pressable mb-1 h-11 rounded-xl bg-ink px-4 text-[12.5px] font-semibold text-white">Save</button>
              </form>
            ))}
            {/* add new variant */}
            <form action={saveVariant} className="grid grid-cols-2 items-end gap-2 pt-1 sm:grid-cols-[1fr_1fr_110px_90px_auto_auto]">
              <input type="hidden" name="vid" value="" />
              <input type="hidden" name="product_id" value={id} />
              <div><span className={label}>SKU</span><input name="sku" className={input} placeholder="NEW-SKU" required /></div>
              <div><span className={label}>Variant name</span><input name="vname" className={input} placeholder="Black / 256GB" /></div>
              <div><span className={label}>Price</span><input name="price" type="number" step="0.01" className={input} required /></div>
              <div><span className={label}>Stock</span><input name="stock" type="number" defaultValue={0} className={input} /></div>
              <input type="hidden" name="vactive" value="on" />
              <button className="pressable mb-1 h-11 rounded-xl bg-volt px-4 text-[12.5px] font-semibold text-white sm:col-start-6">+ Add</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
