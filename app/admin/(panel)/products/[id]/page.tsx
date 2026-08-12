import { notFound } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase-clients/server';
import { saveVariant } from '@/app/admin/actions';
import Link from 'next/link';
import PageHeader from '@/components/admin/PageHeader';
import { ProductForm } from '@/components/admin/ProductForm';
import ProductVisibilityControls from '@/components/admin/ProductVisibilityControls';
import ExistingImageManager from '@/components/admin/ExistingImageManager';

export const dynamic = 'force-dynamic';

const inp = 'h-11 w-full rounded-xl bg-paper px-3.5 text-[13.5px] font-medium outline-none focus:ring-2 focus:ring-volt';
const lbl = 'mb-1.5 block text-[12px] font-bold uppercase tracking-[0.05em] text-muted';

export default async function ProductEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === 'new';
  const supabase = (await getServerSupabase())!;

  const [{ data: categories }, { data: allProducts }, { data: presetRows }] = await Promise.all([
    supabase.from('categories').select('id, name').order('sort_order'),
    supabase.from('products').select('id, name').is('deleted_at', null).order('name').limit(500),
    supabase.from('ram_rom_presets').select('id, ram, rom').eq('is_active', true).order('sort_order'),
  ]);

  let product: Record<string, unknown> | null = null;
  let variants: { id: string; sku: string; name: string; price: number; stock_qty: number; is_active: boolean }[] = [];
  let suggested: string[] = [];

  if (!isNew) {
    const { data } = await supabase
      .from('products')
      .select('*, product_variants(id, sku, name, price, stock_qty, is_active), product_suggestions!product_suggestions_product_id_fkey(suggested_product_id), product_images(id, storage_path)')
      .eq('id', id)
      .maybeSingle();
    if (!data) notFound();
    product  = data;
    variants = data.product_variants;
    suggested = data.product_suggestions.map((s: { suggested_product_id: string }) => s.suggested_product_id);
  }

  const images = product?.product_images as { id: string; storage_path: string }[] || [];

  const specsText = product?.specs
    ? Object.entries(product.specs as Record<string, string>).map(([k, v]) => `${k}: ${v}`).join('\n')
    : '';

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={isNew ? 'Add new product' : String(product?.name ?? 'Edit product')}
        subtitle={isNew ? 'Fill in the details below — slug is auto-generated from the name' : 'Edit product details, image and variants'}
      >
        <Link href="/admin/products"
          className="pressable admin-card px-3.5 py-2 text-[12.5px] font-semibold text-muted hover:bg-paper">
          ← Back to products
        </Link>
      </PageHeader>

      {/* Main product form (client component — handles auto-slug + save) */}
      <ProductForm
        id={id}
        isNew={isNew}
        product={product}
        categories={categories ?? []}
        allProducts={allProducts ?? []}
        suggested={suggested}
        specsText={specsText}
        presets={presetRows ?? []}
      />

      {/* Visibility: publish/hide + delete to trash (existing products only) */}
      {!isNew && (
        <>
          <ProductVisibilityControls
            productId={id}
            isActive={Boolean(product?.is_active)}
          />
          <ExistingImageManager 
            productId={id} 
            images={images} 
          />
        </>
      )}

      {/* Variants section — only shown for existing products */}
      {!isNew && (
        <div className="admin-card mt-5 overflow-hidden">
          <div className="flex items-center justify-between border-b border-line bg-paper/60 px-5 py-3.5">
            <div>
              <h3 className="text-[13.5px] font-bold">Variants</h3>
              <p className="mt-0.5 text-[11.5px] text-muted">SKU, price and stock per colour / size / storage</p>
            </div>
            <span className="rounded-full bg-volt-soft px-2.5 py-0.5 text-[11.5px] font-semibold text-volt">{variants.length}</span>
          </div>

          <div className="divide-y divide-line">
            {variants.map(v => (
              <form key={v.id} action={saveVariant} className="p-4">
                <input type="hidden" name="vid"        value={v.id} />
                <input type="hidden" name="product_id" value={id} />
                <div className="grid gap-3 sm:grid-cols-[1fr_1fr_120px_100px] sm:items-end">
                  <div><label className={lbl}>SKU</label>
                    <input name="sku" defaultValue={v.sku} className={inp} /></div>
                  <div><label className={lbl}>Variant name</label>
                    <input name="vname" defaultValue={v.name} placeholder="Black / 128GB" className={inp} /></div>
                  <div><label className={lbl}>Price (LKR)</label>
                    <input name="price" type="number" step="0.01" defaultValue={v.price} className={inp} /></div>
                  <div><label className={lbl}>Stock</label>
                    <input name="stock" type="number" defaultValue={v.stock_qty} className={inp} /></div>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-[12.5px] font-semibold">
                    <input type="checkbox" name="vactive" defaultChecked={v.is_active} className="h-4 w-4 accent-[#1B6FD8]" />
                    Active
                  </label>
                  <button className="pressable ml-auto h-9 rounded-xl bg-ink px-5 text-[12.5px] font-semibold text-white hover:bg-[#1a2540]">
                    Save variant
                  </button>
                </div>
              </form>
            ))}
          </div>

          {/* Add new variant */}
          <form action={saveVariant} className="border-t-2 border-dashed border-line p-4">
            <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.05em] text-volt">+ Add variant</p>
            <input type="hidden" name="vid"        value="" />
            <input type="hidden" name="product_id" value={id} />
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_120px_100px] sm:items-end">
              <div><label className={lbl}>SKU *</label>
                <input name="sku" required placeholder="NOKIA-C300-BLK" className={inp} /></div>
              <div><label className={lbl}>Variant name</label>
                <input name="vname" placeholder="Black / 128GB" className={inp} /></div>
              <div><label className={lbl}>Price (LKR) *</label>
                <input name="price" type="number" step="0.01" required placeholder="45000" className={inp} /></div>
              <div><label className={lbl}>Stock</label>
                <input name="stock" type="number" defaultValue={0} className={inp} /></div>
            </div>
            <div className="mt-3 flex justify-end">
              <button className="pressable h-9 rounded-xl bg-volt px-5 text-[12.5px] font-semibold text-white hover:bg-volt-deep">
                Add variant
              </button>
            </div>
          </form>
        </div>
      )}

      {isNew && (
        <p className="mt-4 text-center text-[12px] text-muted">
          You can add variants and images after saving the product.
        </p>
      )}
    </div>
  );
}
