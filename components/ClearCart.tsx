'use client';
import { useEffect } from 'react';
import { useCart } from '@/lib/cart-store';

/** Clears the cart only once the order is actually confirmed paid. Landing on
 *  the order page also happens on a failed/still-pending Koko or PayHere
 *  attempt (both bounce back through the same _returnUrl) — clearing
 *  unconditionally there would wipe the customer's cart for a payment that
 *  never went through, with no way to just retry. */
export default function ClearCart({ when = true }: { when?: boolean }) {
  const { clear } = useCart();
  useEffect(() => {
    if (when) clear();
  }, [when, clear]);
  return null;
}
