'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { Locale } from '@/lib/i18n/config';
import { formatLKR } from '@/lib/site';

type Suggestion = {
  slug: string; name: string; brand: string | null;
  price: number; inStock: boolean; image: string | null;
};

/**
 * Search-as-you-type box for the header. Debounced fetch to /api/suggest,
 * keyboard navigable (↑/↓/Enter/Esc), Enter with no selection goes to the
 * full search page. Renders nothing heavy until the user types.
 */
export default function SearchBox({ locale, placeholder, compact = false }:
  { locale: Locale; placeholder: string; compact?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Debounced suggestion fetch
  useEffect(() => {
    if (q.trim().length < 2) { setItems([]); setOpen(false); return; }
    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(q.trim())}`, { signal: ctrl.signal });
        const data = await res.json();
        setItems(data.items ?? []);
        setOpen(true);
        setActive(-1);
      } catch { /* aborted or offline — keep previous state */ }
      finally { setLoading(false); }
    }, 220);
    return () => clearTimeout(t);
  }, [q]);

  // Close on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const goSearch = () => {
    if (!q.trim()) return;
    setOpen(false);
    router.push(`/${locale}/search?q=${encodeURIComponent(q.trim())}`);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (!open || items.length === 0) {
      if (e.key === 'Enter') goSearch();
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => (a + 1) % items.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => (a - 1 + items.length) % items.length); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (active >= 0) { setOpen(false); router.push(`/${locale}/product/${items[active].slug}`); }
      else goSearch();
    }
    else if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div ref={boxRef} className={`relative ${compact ? 'w-full' : 'w-full max-w-md'}`}>
      <div className="flex items-center gap-2 rounded-full border border-line bg-paper px-4 py-2">
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
        </svg>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          onFocus={() => items.length > 0 && setOpen(true)}
          onKeyDown={onKey}
          placeholder={placeholder}
          aria-label={placeholder}
          role="combobox"
          aria-expanded={open}
          className="w-full bg-transparent text-[13px] outline-none placeholder:text-muted"
        />
        {loading && <span className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-line border-t-volt" aria-hidden />}
      </div>

      {open && items.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-line bg-card shadow-xl">
          <ul role="listbox">
            {items.map((it, i) => (
              <li key={it.slug} role="option" aria-selected={i === active}>
                <Link
                  href={`/${locale}/product/${it.slug}`}
                  onClick={() => setOpen(false)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex items-center gap-3 px-3 py-2.5 text-[13px] transition-colors ${i === active ? 'bg-paper' : ''}`}>
                  {it.image
                    ? <Image src={it.image} alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                    : <span className="h-10 w-10 shrink-0 rounded-lg bg-paper" aria-hidden />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{it.name}</span>
                    <span className="block text-[11px] text-muted">{it.brand ?? ''}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-bold">{formatLKR(it.price)}</span>
                    {!it.inStock && <span className="block text-[11px] text-warn">Out of stock</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <button onClick={goSearch}
            className="block w-full border-t border-line px-3 py-2.5 text-center text-[12px] font-semibold text-volt hover:bg-paper">
            See all results for &ldquo;{q.trim()}&rdquo;
          </button>
        </div>
      )}
    </div>
  );
}
