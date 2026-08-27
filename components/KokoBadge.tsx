/** Koko (BNPL) payment badge. A custom wordmark, not their official logo
 *  file — swap in the real asset if/when we have their brand kit. */
export default function KokoBadge({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const isSm = size === 'sm';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#EC4899] font-extrabold italic text-white ${
        isSm ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-[13px]'
      }`}>
      koko
    </span>
  );
}
