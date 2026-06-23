import type { Dict } from '@/lib/i18n/dictionaries';

export default function StockBadge({ stock, dict, threshold = 5 }:
  { stock: number; dict: Dict; threshold?: number }) {
  if (stock <= 0)
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-deep/10 px-2.5 py-1 text-[12px] font-semibold text-muted">
        <span className="h-1.5 w-1.5 rounded-full bg-muted" aria-hidden />
        {dict.product.outOfStock}
      </span>
    );
  if (stock <= threshold)
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-warn-soft px-2.5 py-1 text-[12px] font-semibold text-warn">
        <span className="h-1.5 w-1.5 rounded-full bg-warn animate-pulse" aria-hidden />
        {stock} {dict.product.lowStock}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F5ED] px-2.5 py-1 text-[12px] font-semibold text-ok">
      <span className="h-1.5 w-1.5 rounded-full bg-ok" aria-hidden />
      {dict.product.inStock}
    </span>
  );
}
