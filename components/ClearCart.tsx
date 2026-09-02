'use client';
import { useEffect } from 'react';
import { useCart } from '@/lib/cart-store';

export default function ClearCart() {
  const { clear } = useCart();
  useEffect(() => {
    clear();
  }, [clear]);
  return null;
}
