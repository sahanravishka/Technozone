import Image from 'next/image';

/** Koko (BNPL) payment badge — their real logo (confirmed from an actual
 *  Koko promotional graphic, not a guess). */
export default function KokoBadge({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const h = size === 'sm' ? 18 : 24;
  const w = Math.round(h * (215 / 98));
  return (
    <Image src="/payments/koko-logo.png" alt="Koko" width={w} height={h}
      className="inline-block object-contain" />
  );
}
