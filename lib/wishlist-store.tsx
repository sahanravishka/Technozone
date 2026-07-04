'use client';

import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { getBrowserSupabase } from './supabase-clients/browser';

type State = { ids: Set<string>; hydrated: boolean };
type Action =
  | { type: 'hydrate'; ids: string[] }
  | { type: 'add'; id: string }
  | { type: 'remove'; id: string };

const KEY = 'voltlane.wishlist.v1';

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'hydrate':
      return { ids: new Set(action.ids), hydrated: true };
    case 'add': {
      const ids = new Set(state.ids); ids.add(action.id);
      return { ...state, ids };
    }
    case 'remove': {
      const ids = new Set(state.ids); ids.delete(action.id);
      return { ...state, ids };
    }
  }
}

const WishlistCtx = createContext<{
  ids: Set<string>; hydrated: boolean; count: number;
  has: (id: string) => boolean; toggle: (id: string) => void;
} | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { ids: new Set<string>(), hydrated: false });

  // Load local ids, then merge in the server-synced list for a signed-in customer.
  useEffect(() => {
    let local: string[] = [];
    try {
      const raw = localStorage.getItem(KEY);
      local = raw ? JSON.parse(raw) : [];
    } catch { local = []; }
    dispatch({ type: 'hydrate', ids: local });

    (async () => {
      const sb = getBrowserSupabase();
      if (!sb) return;
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      const { data } = await sb.from('wishlists').select('product_id').eq('customer_id', user.id);
      const serverIds = (data ?? []).map(r => r.product_id as string);
      const merged = new Set([...local, ...serverIds]);
      dispatch({ type: 'hydrate', ids: [...merged] });
      // push any local-only favorites (added while signed out) up to the server
      const toPush = local.filter(id => !serverIds.includes(id));
      if (toPush.length) {
        await sb.from('wishlists').upsert(
          toPush.map(product_id => ({ customer_id: user.id, product_id })),
          { onConflict: 'customer_id,product_id' }
        );
      }
    })();
  }, []);

  useEffect(() => {
    if (state.hydrated) localStorage.setItem(KEY, JSON.stringify([...state.ids]));
  }, [state.ids, state.hydrated]);

  const value = useMemo(() => ({
    ids: state.ids,
    hydrated: state.hydrated,
    count: state.ids.size,
    has: (id: string) => state.ids.has(id),
    toggle: (id: string) => {
      const adding = !state.ids.has(id);
      dispatch(adding ? { type: 'add', id } : { type: 'remove', id });
      (async () => {
        const sb = getBrowserSupabase();
        if (!sb) return;
        const { data: { user } } = await sb.auth.getUser();
        if (!user) return;
        if (adding) await sb.from('wishlists').upsert({ customer_id: user.id, product_id: id }, { onConflict: 'customer_id,product_id' });
        else await sb.from('wishlists').delete().eq('customer_id', user.id).eq('product_id', id);
      })();
    }
  }), [state]);

  return <WishlistCtx.Provider value={value}>{children}</WishlistCtx.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistCtx);
  if (!ctx) throw new Error('useWishlist must be used inside <WishlistProvider>');
  return ctx;
}
