import Image from 'next/image';

/** Just the logo mark, at a size that actually reads — the source file is
 *  a busy patterned graphic that turns to noise below ~28px tall. Used on
 *  its own inside the checkout payment-method selector, which already has
 *  its own layout/label. */
export function KokoBadge({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const h = size === 'sm' ? 22 : 30;
  const w = Math.round(h * (215 / 98));
  return (
    <Image src="/payments/koko-logo.png" alt="Koko" width={w} height={h}
      className="inline-block object-contain" />
  );
}

/** Full "3 x Rs X with [logo]" trust badge for product cards/detail pages
 *  — a solid pill (light purple background, bold dark-purple text, logo
 *  large enough to actually read), not muted inline text easy to miss. */
export default function KokoPriceBadge({ installment, size = 'sm' }: { installment: string; size?: 'sm' | 'md' }) {
  const isSm = size === 'sm';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-[#6D28D9]/[0.08] font-bold text-[#6D28D9] ${
        isSm ? 'px-2.5 py-1 text-[12px]' : 'px-3 py-1.5 text-[13.5px]'
      }`}>
      3 x {installment} with <KokoBadge size={isSm ? 'sm' : 'md'} />
    </span>
  );
}
