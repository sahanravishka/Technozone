'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Dict } from '@/lib/i18n/dictionaries';
import type { Locale } from '@/lib/i18n/config';

type SP = { q?: string; sort?: string; brand?: string; min?: string; max?: string; stock?: string };

export default function SearchControls({ dict, locale, brands, initialQuery, sp }:
  { dict: Dict; locale: Locale; brands: string[]; initialQuery: string; sp: SP }) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [open, setOpen] = useState(false);

  const go = (next: Partial<SP>) => {
    const merged = { ...sp, q, ...next };
    const usp = new URLSearchParams();
    Object.entries(merged).forEach(([k, v]) => { if (v) usp.set(k, String(v)); });
    router.push(`/${locale}/search?${usp.toString()}`);
  };

  const activeFilters = [sp.brand, sp.min, sp.max, sp.stock].filter(Boolean).length;

  return (
    <div className="mb-5">
      <div className="flex gap-2">
        {/* Search input — pill shape */}
        <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && go({})}
          placeholder={dict.search.placeholder} autoFocus
          className="h-12 flex-1 bg-card px-5 text-[15px] outline-none focus:ring-2 focus:ring-volt"
          style={{ borderRadius: '999px' }} />
        {/* Search button — skewed */}
        <button onClick={() => go({})}
          className="btn-skew pressable bg-gradient-to-r from-volt to-volt-deep px-5 text-[14px] font-semibold text-white hover:shadow-lg">
          <span>{dict.search.go}</span>
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {/* Sort — pill shape */}
        <select value={sp.sort ?? ''} onChange={e => go({ sort: e.target.value })}
          className="h-10 rounded-full bg-card px-3.5 text-[13px] font-medium outline-none focus:ring-2 focus:ring-volt">
          <option value="">{dict.search.relevance}</option>
          <option value="price_asc">{dict.search.priceLow}</option>
          <option value="price_desc">{dict.search.priceHigh}</option>
          <option value="rating">{dict.search.topRated}</option>
        </select>
        {/* Filter toggle — organic shape */}
        <button onClick={() => setOpen(o => !o)}
          className={`pressable btn-organic h-10 px-4 text-[13px] font-semibold ${activeFilters ? 'bg-volt-soft text-volt' : 'bg-card'}`}>
          {dict.search.filters}{activeFilters ? ` · ${activeFilters}` : ''}
        </button>
        {activeFilters > 0 && (
          <button onClick={() => go({ brand: '', min: '', max: '', stock: '' })} className="text-[12.5px] font-semibold text-muted hover:text-ink">
            {dict.search.clear}
          </button>
        )}
      </div>

      {open && (
        <div className="card-glass mt-3 grid gap-3 p-4 sm:grid-cols-4" style={{ borderRadius: '20px' }}>
          <select value={sp.brand ?? ''} onChange={e => go({ brand: e.target.value })}
            className="h-10 bg-paper px-3 text-[13px] outline-none" style={{ borderRadius: '14px' }}>
            <option value="">{dict.search.allBrands}</option>
            {brands.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <input defaultValue={sp.min ?? ''} onBlur={e => go({ min: e.target.value })} inputMode="numeric"
            placeholder={dict.search.minPrice} className="h-10 bg-paper px-3 text-[13px] outline-none" style={{ borderRadius: '14px' }} />
          <input defaultValue={sp.max ?? ''} onBlur={e => go({ max: e.target.value })} inputMode="numeric"
            placeholder={dict.search.maxPrice} className="h-10 bg-paper px-3 text-[13px] outline-none" style={{ borderRadius: '14px' }} />
          <label className="flex items-center gap-2 px-1 text-[13px] font-medium">
            <input type="checkbox" defaultChecked={sp.stock === '1'} onChange={e => go({ stock: e.target.checked ? '1' : '' })} />
            {dict.search.inStock}
          </label>
        </div>
      )}
    </div>
  );
}
