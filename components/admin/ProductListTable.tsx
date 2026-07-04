'use client';

import { useMemo, useState, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { imageUrl } from '@/lib/supabase';
import { formatLKR } from '@/lib/site';
import { bulkSetActive, bulkSetCategory, bulkAdjustPrice, bulkTrash } from '@/app/admin/(panel)/products/bulk-actions';

type Row = {
  id: string; name: string; slug: string; is_active: boolean; category_id: string | null;
  product_variants: { price: number; stock_qty: number; sku: string }[];
  product_images: { storage_path: string }[];
};

function toCsv(rows: Row[], categoryName: (id: string | null) => string): string {
  const header = ['Name', 'Slug', 'Category', 'SKUs', 'Stock', 'Min price', 'Status'];
  const lines = rows.map(p => {
    const stock = p.product_variants.reduce((n, v) => n + v.stock_qty, 0);
    const prices = p.product_variants.map(v => Number(v.price));
    const skus = p.product_variants.map(v => v.sku).join(' | ');
    return [
      p.name, p.slug, categoryName(p.category_id), skus, String(stock),
      prices.length ? String(Math.min(...prices)) : '', p.is_active ? 'Active' : 'Hidden'
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
  });
  return [header.join(','), ...lines].join('\n');
}

export default function ProductListTable({
  products, categories,
}: {
  products: Row[];
  categories: { id: string; name: string }[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const [err, setErr] = useState('');
  const router = useRouter();
  const catName = useMemo(() => {
    const map = new Map(categories.map(c => [c.id, c.name]));
    return (id: string | null) => (id && map.get(id)) || '—';
  }, [categories]);

  const allSelected = products.length > 0 && selected.size === products.length;
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(products.map(p => p.id)));
  const toggleOne = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const run = (fn: () => Promise<void>) =>
    start(async () => {
      setErr('');
      try { await fn(); setSelected(new Set()); router.refresh(); }
      catch (e) { setErr(e instanceof Error ? e.message : 'Failed'); }
    });

  const ids = [...selected];

  const exportCsv = () => {
    const rows = ids.length ? products.filter(p => selected.has(p.id)) : products;
    const blob = new Blob([toCsv(rows, catName)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'products.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Bulk action bar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-[12.5px] font-semibold text-muted">
          <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 rounded accent-volt" />
          {selected.size ? `${selected.size} selected` : 'Select all'}
        </label>

        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <button disabled={pending} onClick={() => run(() => bulkSetActive(ids, true))}
              className="pressable rounded-lg bg-[#E8F7EE] px-3 py-1.5 text-[12px] font-semibold text-ok disabled:opacity-50">
              Publish
            </button>
            <button disabled={pending} onClick={() => run(() => bulkSetActive(ids, false))}
              className="pressable rounded-lg bg-paper px-3 py-1.5 text-[12px] font-semibold text-muted disabled:opacity-50">
              Hide
            </button>

            <select disabled={pending} aria-label="Set category for selected products"
              onChange={e => {
                const v = e.target.value;
                if (v) { run(() => bulkSetCategory(ids, v === '__none__' ? null : v)); e.target.value = ''; }
              }}
              defaultValue=""
              className="h-8 rounded-lg bg-paper px-2 text-[12px] font-semibold text-muted outline-none">
              <option value="" disabled>Set category…</option>
              <option value="__none__">— No category —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <button disabled={pending} onClick={() => {
              const pct = Number(window.prompt('Adjust price by % (e.g. 10 for +10%, -5 for -5%):', '0'));
              if (Number.isFinite(pct) && pct !== 0) run(() => bulkAdjustPrice(ids, pct));
            }} className="pressable rounded-lg bg-paper px-3 py-1.5 text-[12px] font-semibold text-muted disabled:opacity-50">
              Adjust price %
            </button>

            <button disabled={pending} onClick={() => {
              if (window.confirm(`Move ${ids.length} product(s) to Trash?`)) run(() => bulkTrash(ids));
            }} className="pressable rounded-lg border border-sale/40 bg-sale/5 px-3 py-1.5 text-[12px] font-semibold text-sale disabled:opacity-50">
              Trash
            </button>
          </div>
        )}

        <button onClick={exportCsv}
          className="pressable ml-auto rounded-lg border border-line bg-card px-3 py-1.5 text-[12px] font-semibold hover:bg-paper">
          Export CSV{selected.size ? ` (${selected.size})` : ''}
        </button>
      </div>
      {err && <p className="mb-2 text-[12px] font-semibold text-sale">{err}</p>}

      <div className="admin-card overflow-hidden">
        {products.map((p, i) => {
          const stock = p.product_variants.reduce((n, v) => n + v.stock_qty, 0);
          const prices = p.product_variants.map(v => Number(v.price));
          const img = p.product_images[0];
          return (
            <div key={p.id}
              className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-paper ${i ? 'border-t border-line/70' : ''}`}>
              <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)}
                aria-label={`Select ${p.name}`}
                className="h-4 w-4 shrink-0 rounded accent-volt" />
              <Link href={`/admin/products/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3.5">
                <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-[#F0F3F8]">
                  {img && <Image src={imageUrl(img.storage_path)} alt="" fill sizes="44px" className="object-cover" />}
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[13.5px]">{p.name}</b>
                  <span className="text-[11.5px] text-muted">
                    /{p.slug} · {catName(p.category_id)} · {p.product_variants.length} variant{p.product_variants.length === 1 ? '' : 's'}
                  </span>
                </span>
                <span className={`rounded-lg px-2 py-0.5 text-[11px] font-semibold ${stock <= 3 ? 'bg-warn-soft text-warn' : 'bg-paper text-muted'}`}>
                  {stock} in stock
                </span>
                <span className="w-28 text-right text-[13px] font-bold">
                  {prices.length ? formatLKR(Math.min(...prices)) : '—'}
                </span>
                <span className={`h-2 w-2 rounded-full ${p.is_active ? 'bg-ok' : 'bg-line'}`} title={p.is_active ? 'Active' : 'Hidden'} />
              </Link>
            </div>
          );
        })}
        {!products.length && <p className="p-8 text-center text-muted">No products match these filters.</p>}
      </div>
    </div>
  );
}
