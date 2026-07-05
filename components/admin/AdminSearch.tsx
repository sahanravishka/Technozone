'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { adminGlobalSearch, type AdminHit } from '@/app/admin/actions';

const KIND_BADGE: Record<AdminHit['kind'], { label: string; cls: string }> = {
  order: { label: 'Order', cls: 'bg-volt-soft text-volt' },
  product: { label: 'Product', cls: 'bg-[#E8F7EE] text-ok' },
  customer: { label: 'Customer', cls: 'bg-warn-soft text-warn' }
};

/**
 * Global admin search: press Ctrl+K (or ⌘K) anywhere in the panel, or tap the
 * search button, and jump straight to any order, product (by name or SKU) or
 * customer. Runs through a staff-gated server action.
 */
export default function AdminSearch({ variant = 'light', iconOnly = false }:
  { variant?: 'light' | 'dark'; iconOnly?: boolean } = {}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<AdminHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global keyboard shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      } else if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else { setQ(''); setHits([]); setActive(-1); }
  }, [open]);

  // Debounced server search
  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try { setHits(await adminGlobalSearch(q)); setActive(-1); }
      catch { setHits([]); }
      finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (hits.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => (a + 1) % hits.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => (a - 1 + hits.length) % hits.length); }
    else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      window.location.href = hits[active].href;
    }
  };

  return (
    <>
      <button onClick={() => setOpen(true)}
        className={`pressable flex h-9 items-center gap-2 rounded-xl px-3 text-[12.5px] font-semibold transition-colors ${
          variant === 'dark'
            ? 'w-full bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
            : 'bg-paper text-muted hover:text-ink'
        } ${iconOnly ? 'justify-center px-0' : ''}`}
        title={iconOnly ? 'Search (Ctrl+K)' : undefined}
        aria-label="Search everything (Ctrl+K)">
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
        </svg>
        {!iconOnly && <span className="hidden sm:inline">Search anything</span>}
        {!iconOnly && <kbd className={`ml-auto hidden rounded-md px-1.5 py-0.5 text-[10px] font-bold lg:inline ${variant === 'dark' ? 'border border-white/15 text-white/40' : 'border border-line bg-card text-muted'}`}>Ctrl K</kbd>}
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/50 p-4 pt-[12vh] backdrop-blur-[2px]"
          onClick={() => setOpen(false)}>
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-card shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-line px-4 py-3">
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
              </svg>
              <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} onKeyDown={onKeyDown}
                placeholder="Order number, product, SKU, customer, phone…"
                className="w-full bg-transparent text-[14px] outline-none placeholder:text-muted" />
              {loading && <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-line border-t-volt" aria-hidden />}
            </div>

            <div className="max-h-[50vh] overflow-y-auto">
              {q.trim().length >= 2 && !loading && hits.length === 0 && (
                <p className="p-6 text-center text-[13px] text-muted">Nothing found for &ldquo;{q.trim()}&rdquo;</p>
              )}
              {hits.map((h, i) => (
                <Link key={h.kind + h.href + h.title + i} href={h.href} onClick={() => setOpen(false)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex items-center gap-3 px-4 py-3 text-[13px] ${i === active ? 'bg-paper' : ''}`}>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold ${KIND_BADGE[h.kind].cls}`}>
                    {KIND_BADGE[h.kind].label}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{h.title}</span>
                    <span className="block truncate text-[11.5px] text-muted">{h.sub}</span>
                  </span>
                  <span className="shrink-0 text-[12px] text-muted">↵</span>
                </Link>
              ))}
              {q.trim().length < 2 && (
                <p className="p-6 text-center text-[12.5px] text-muted">
                  Type at least 2 characters — search orders, products, SKUs and customers.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
