'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';

export type CartItem = {
  productId: string; variantId: string; slug: string;
  name: string; variantName: string; sku: string;
  price: number; image: string; qty: number; stock: number;
};

type State = { items: CartItem[]; hydrated: boolean };
type Action =
  | { type: 'hydrate'; items: CartItem[] }
  | { type: 'add'; item: CartItem }
  | { type: 'qty'; variantId: string; qty: number }
  | { type: 'remove'; variantId: string }
  | { type: 'clear' };

const KEY = 'voltlane.cart.v1';

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'hydrate':
      return { items: action.items, hydrated: true };
    case 'add': {
      const existing = state.items.find(i => i.variantId === action.item.variantId);
      const items = existing
        ? state.items.map(i => i.variantId === action.item.variantId
            ? { ...i, qty: Math.min(i.qty + action.item.qty, i.stock) } : i)
        : [...state.items, action.item];
      return { ...state, items };
    }
    case 'qty':
      return {
        ...state,
        items: state.items.map(i => i.variantId === action.variantId
          ? { ...i, qty: Math.max(1, Math.min(action.qty, i.stock)) } : i)
      };
    case 'remove':
      return { ...state, items: state.items.filter(i => i.variantId !== action.variantId) };
    case 'clear':
      return { ...state, items: [] };
  }
}

const CartCtx = createContext<{
  items: CartItem[]; count: number; subtotal: number; hydrated: boolean;
  add: (item: CartItem) => void; setQty: (variantId: string, qty: number) => void;
  remove: (variantId: string) => void; clear: () => void;
} | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { items: [], hydrated: false });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      dispatch({ type: 'hydrate', items: raw ? JSON.parse(raw) : [] });
    } catch { dispatch({ type: 'hydrate', items: [] }); }
  }, []);

  useEffect(() => {
    if (state.hydrated) localStorage.setItem(KEY, JSON.stringify(state.items));
  }, [state.items, state.hydrated]);

  // These must stay referentially stable across renders — dispatch itself
  // never changes (React guarantees that for useReducer), so useCallback
  // with no other deps gives each function a permanent identity. Defining
  // them inline inside the `value` useMemo below (keyed on `state`) was the
  // bug: every dispatch produces a brand-new state object — including
  // `clear` on an already-empty cart, since the reducer always returns a
  // fresh `{...state, items: []}` — so `clear` got a new identity on every
  // call. Anything that calls clear() from a useEffect keyed on it (see
  // ClearCart) would then loop forever: call clear -> new state -> new
  // `value` -> new `clear` reference -> effect's deps changed -> fires
  // again. That's a real infinite-render loop, not just a lint nitpick —
  // it was silently thrashing the page (and starving other event handlers,
  // like a click on a nearby link) every time the order confirmation page
  // rendered with a genuinely paid order.
  const add = useCallback((item: CartItem) => dispatch({ type: 'add', item }), []);
  const setQty = useCallback((variantId: string, qty: number) => dispatch({ type: 'qty', variantId, qty }), []);
  const remove = useCallback((variantId: string) => dispatch({ type: 'remove', variantId }), []);
  const clear = useCallback(() => dispatch({ type: 'clear' }), []);

  const value = useMemo(() => ({
    items: state.items,
    hydrated: state.hydrated,
    count: state.items.reduce((n, i) => n + i.qty, 0),
    subtotal: state.items.reduce((n, i) => n + i.qty * i.price, 0),
    add, setQty, remove, clear
  }), [state, add, setQty, remove, clear]);

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useCart() {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
