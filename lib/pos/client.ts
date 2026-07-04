// POS API client — thin fetch wrapper the website uses to talk to the TZL POS
// backend (source of truth). Enabled only when NEXT_PUBLIC_POS_API_URL is set;
// callers fall back to Supabase/demo otherwise, so the site never hard-breaks.

import type { MongoDecimal } from './types';

const RAW_BASE = process.env.NEXT_PUBLIC_POS_API_URL || '';
// Normalize: strip trailing slash, ensure it ends at the host (we add /api).
const API_BASE = RAW_BASE.replace(/\/+$/, '');
const IMAGE_BASE = (process.env.NEXT_PUBLIC_POS_IMAGE_URL || RAW_BASE || '').replace(/\/+$/, '');

/** True when the website is configured to read from the POS API. */
export function posEnabled(): boolean {
  return !!API_BASE;
}

/** Resolve a POS image path to an absolute URL the browser can load. */
export function posImageUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:')) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${IMAGE_BASE}${normalized}`;
}

/** Coerce Mongo Decimal128 / string / number to a plain number. */
export function num(v: MongoDecimal | undefined | null): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return Number(v) || 0;
  if (typeof v === 'object' && '$numberDecimal' in v) return Number(v.$numberDecimal) || 0;
  return 0;
}

type FetchOpts = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  token?: string;              // customer Bearer token for authed calls
  revalidate?: number;         // ISR cache seconds for GET (server-side)
  signal?: AbortSignal;
};

/**
 * Low-level POS request. Returns parsed JSON, or throws on a non-2xx.
 * GET catalog calls are cacheable via `revalidate`; authed calls pass a token.
 */
export async function posFetch<T>(path: string, opts: FetchOpts = {}): Promise<T> {
  if (!API_BASE) throw new Error('POS API not configured');
  const url = `${API_BASE}/api${path.startsWith('/') ? path : `/${path}`}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;

  // RequestInit augmented with Next's `next` caching option (server-side only;
  // ignored by the browser fetch on client calls).
  const init: RequestInit & { next?: { revalidate: number } } = {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body != null ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  };
  if (opts.revalidate != null) init.next = { revalidate: opts.revalidate };

  const res = await fetch(url, init);

  if (!res.ok) {
    let message = `POS ${res.status}`;
    try { const j = await res.json(); message = j?.message || j?.error || message; } catch { /* ignore */ }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

/** Unwrap the POS response envelopes ({data}|{products}|{categories}|raw array). */
export function unwrapList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  const p = payload as Record<string, unknown>;
  for (const key of ['data', 'products', 'categories', 'items', 'results']) {
    if (Array.isArray(p?.[key])) return p[key] as T[];
  }
  // Some endpoints nest under data.products
  const data = p?.data as Record<string, unknown> | undefined;
  if (data) {
    for (const key of ['products', 'categories', 'items', 'results']) {
      if (Array.isArray(data[key])) return data[key] as T[];
    }
  }
  return [];
}

/** Unwrap a single-object POS response ({data}|raw). */
export function unwrapOne<T>(payload: unknown): T | null {
  if (!payload) return null;
  const p = payload as Record<string, unknown>;
  if (p.data && typeof p.data === 'object') return p.data as T;
  if (p.product && typeof p.product === 'object') return p.product as T;
  return payload as T;
}
