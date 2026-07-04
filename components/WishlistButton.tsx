'use client';

import { useWishlist } from '@/lib/wishlist-store';

const HeartIcon = ({ filled }: { filled: boolean }) => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
    <path d="M12 20s-7-4.5-9-9a4.5 4.5 0 0 1 9-2 4.5 4.5 0 0 1 9 2c-2 4.5-9 9-9 9z" />
  </svg>
);

/** Heart toggle for a product. `variant="card"` matches the diamond badge
 *  used on ProductCard; `variant="panel"` matches the product page buttons. */
export default function WishlistButton({ productId, variant = 'card' }:
  { productId: string; variant?: 'card' | 'panel' }) {
  const { has, toggle } = useWishlist();
  const active = has(productId);

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(productId);
  };

  if (variant === 'panel') {
    return (
      <button type="button" onClick={onClick} aria-pressed={active}
        aria-label={active ? 'Remove from wishlist' : 'Add to wishlist'}
        className={`pressable btn-diamond grid h-12 w-12 shrink-0 place-items-center transition-colors ${active ? 'bg-sale/10 text-sale' : 'bg-card text-ink hover:bg-paper'}`}>
        <svg viewBox="0 0 24 24" className="h-[19px] w-[19px]" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20s-7-4.5-9-9a4.5 4.5 0 0 1 9-2 4.5 4.5 0 0 1 9 2c-2 4.5-9 9-9 9z" />
        </svg>
      </button>
    );
  }

  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      aria-label={active ? 'Remove from wishlist' : 'Add to wishlist'}
      className={`btn-diamond pressable absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center border border-line transition-opacity ${active ? 'opacity-100 bg-sale/10 text-sale' : 'bg-card text-ink opacity-0 group-hover:opacity-100'}`}>
      <HeartIcon filled={active} />
    </button>
  );
}
