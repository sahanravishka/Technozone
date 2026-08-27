/** Koko (BNPL) payment badge. A custom wordmark using their real brand
 *  purple (visually matched from their app/site — swap for the exact
 *  brand-kit hex or their official logo file if we get it). */
export default function KokoBadge({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const isSm = size === 'sm';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-[#6D28D9] font-extrabold italic text-white ${
        isSm ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-[13px]'
      }`}>
      koko
    </span>
  );
}
