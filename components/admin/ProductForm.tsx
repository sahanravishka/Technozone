'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { upsertProduct } from '@/app/admin/actions';
import VariantBuilder, { type Preset } from './VariantBuilder';
import WarrantySelect from './WarrantySelect';

export interface ProductFormProps {
  id: string;
  isNew: boolean;
  product: Record<string, unknown> | null;
  categories: { id: string; name: string }[];
  allProducts: { id: string; name: string }[];
  suggested: string[];
  specsText: string;
  presets?: Preset[];
}

const inp = 'h-11 w-full rounded-xl bg-paper px-3.5 text-[13.5px] font-medium outline-none focus:ring-2 focus:ring-volt';
const lbl = 'mb-1.5 block text-[12px] font-bold uppercase tracking-[0.05em] text-muted';

function slugify(t: string) {
  return t.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function ProductForm({
  id, isNew, product, categories, allProducts, suggested, specsText, presets = [],
}: ProductFormProps) {
  const [slugVal, setSlugVal] = useState(String(product?.slug ?? ''));
  const [slugEdited, setSlugEdited] = useState(!isNew);
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const router = useRouter();

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!slugEdited) setSlugVal(slugify(e.target.value));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    const data = new FormData(e.currentTarget);
    start(async () => {
      try {
        const pid = await upsertProduct(data);
        router.push(`/admin/products/${pid}`);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Save failed — check all required fields.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <input type="hidden" name="id" value={isNew ? '' : id} />

      {/* ── Section: Basic info ── */}
      <div className="admin-card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-line bg-paper/60 px-5 py-3.5">
          <span className="grid h-6 w-6 place-items-center rounded-lg bg-volt text-[11px] font-black text-white">1</span>
          <h3 className="text-[13.5px] font-bold">Basic info</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={lbl}>Product name *</label>
              <input name="name" required onChange={handleNameChange}
                defaultValue={String(product?.name ?? '')}
                placeholder="e.g. Nokia C300 Smartphone"
                className={inp} />
            </div>
            <div>
              <label className={lbl}>URL slug *</label>
              <input name="slug" required value={slugVal}
                onChange={e => { setSlugEdited(true); setSlugVal(e.target.value); }}
                className={inp} />
              <p className="mt-1 text-[11px] text-muted">
                /en/product/<span className="font-semibold text-ink">{slugVal || '…'}</span>
                {!slugEdited && <span className="ml-2 text-volt">auto</span>}
              </p>
            </div>
            <div>
              <label className={lbl}>Brand</label>
              <input name="brand" defaultValue={String(product?.brand ?? '')} placeholder="Nokia" className={inp} />
            </div>
            <div>
              <label className={lbl}>Category</label>
              <select name="category_id" defaultValue={String(product?.category_id ?? '')} className={inp}>
                <option value="">— No category —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Base price (LKR) *</label>
              <input name="base_price" type="number" step="0.01" required
                defaultValue={String(product?.base_price ?? '')} placeholder="45000"
                className={inp} />
            </div>
            <div>
              <label className={lbl}>Warranty</label>
              <WarrantySelect initial={Number(product?.warranty_months ?? 0)} />
            </div>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] font-semibold">
            <input type="checkbox" name="is_active"
              defaultChecked={(product?.is_active as boolean) ?? true}
              className="h-4 w-4 accent-[#1B6FD8]" />
            Visible in store
          </label>
        </div>
      </div>

      {/* ── Section: Description & Specs ── */}
      <div className="admin-card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-line bg-paper/60 px-5 py-3.5">
          <span className="grid h-6 w-6 place-items-center rounded-lg bg-volt text-[11px] font-black text-white">2</span>
          <h3 className="text-[13.5px] font-bold">Description &amp; specs <span className="ml-1 text-[11px] font-normal text-muted">optional</span></h3>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className={lbl}>Description</label>
            <textarea name="description" rows={4}
              defaultValue={String(product?.description ?? '')}
              placeholder="Write a clear description that tells customers what they're getting. Include key features, compatibility, and what's in the box."
              className="w-full resize-y rounded-xl bg-paper p-3.5 text-[13.5px] font-medium outline-none focus:ring-2 focus:ring-volt" />
          </div>
          <div>
            <label className={lbl}>Specs <span className="font-normal normal-case tracking-normal text-muted">— one per line as  Key: Value</span></label>
            <textarea name="specs" rows={6} defaultValue={specsText}
              placeholder={'Display: 6.5" IPS LCD\nRAM: 4 GB\nStorage: 64 GB\nBattery: 4000 mAh\nOS: Android 13\nWarranty: 1 year'}
              className="w-full resize-y rounded-xl bg-paper p-3.5 font-mono text-[12.5px] leading-relaxed outline-none focus:ring-2 focus:ring-volt" />
            <p className="mt-1 text-[11px] text-muted">Each line becomes a row in the product specs table</p>
          </div>
        </div>
      </div>

      {/* Product images now come from the colour photos in the Variants section below.
          (Standalone single-image upload removed — each colour carries its own photo.) */}

      {/* ── Section: Related products ── */}
      {allProducts.length > 0 && (
        <div className="admin-card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-line bg-paper/60 px-5 py-3.5">
            <span className="grid h-6 w-6 place-items-center rounded-lg bg-[#E8ECF2] text-[11px] font-black text-muted">4</span>
            <h3 className="text-[13.5px] font-bold">Related products <span className="ml-1 text-[11px] font-normal text-muted">optional · "You might also like"</span></h3>
          </div>
          <div className="p-5">
            <p className="mb-2.5 text-[11.5px] text-muted">Hold <kbd className="rounded-md border border-line bg-paper px-1.5 py-0.5 text-[10px] font-semibold">Ctrl</kbd> / <kbd className="rounded-md border border-line bg-paper px-1.5 py-0.5 text-[10px] font-semibold">⌘</kbd> to select or deselect multiple.</p>
            <select name="suggested" multiple size={Math.min(6, allProducts.length)} defaultValue={suggested}
              className="w-full rounded-xl bg-paper p-2 text-[12.5px] outline-none focus:ring-2 focus:ring-volt">
              {allProducts.filter(p => p.id !== id).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* ── Section: Variants (colours × RAM/ROM) ── */}
      <div className="admin-card overflow-hidden">
        <div className="border-b border-line px-4 py-3 sm:px-5">
          <h3 className="text-[13px] font-bold uppercase tracking-[0.05em] text-muted">
            Variants — colours & RAM/ROM
          </h3>
        </div>
        <div className="p-4 sm:p-5">
          <VariantBuilder presets={presets} basePrice={Number(product?.base_price ?? 0)} />
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[13px] font-medium text-sale">
          {error}
        </div>
      )}

      {/* Sticky save bar */}
      <div className="sticky bottom-4 z-20">
        <div className="admin-card flex items-center gap-3 px-4 py-3 shadow-lg shadow-black/10">
          <span className="hidden text-[12.5px] text-muted sm:block">
            {isNew ? 'New product — fill in the details above' : String(product?.name ?? '')}
          </span>
          <button disabled={pending}
            className="pressable ml-auto h-10 rounded-xl bg-volt px-6 text-[13px] font-semibold text-white hover:bg-volt-deep disabled:opacity-50">
            {pending ? 'Saving…' : isNew ? '✓ Create product' : '✓ Save changes'}
          </button>
        </div>
      </div>
    </form>
  );
}
