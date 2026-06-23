import { formatLKR } from '@/lib/site';

export default function PriceTag({ price, compareAt, size = 'md' }:
  { price: number; compareAt?: number | null; size?: 'md' | 'lg' }) {
  return (
    <span className="inline-flex items-baseline gap-2">
      <span className={size === 'lg' ? 'text-2xl font-bold md:text-[1.7rem]' : 'text-[14.5px] font-bold'}>
        {formatLKR(price)}
      </span>
      {compareAt && (
        <span className={`font-normal text-muted line-through ${size === 'lg' ? 'text-sm' : 'text-[11px]'}`}>
          {formatLKR(compareAt)}
        </span>
      )}
    </span>
  );
}
