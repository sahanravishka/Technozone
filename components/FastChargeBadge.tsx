/** Small animated badge for chargers/cables that support fast charging.
 *  Shown wherever `product.specs["Fast Charging"]` is set. The bolt icon
 *  has a subtle pulse so it reads as "active/charging" rather than a
 *  static label. */
export default function FastChargeBadge({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const isSm = size === 'sm';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-volt to-accent font-bold text-white shadow-sm ${
        isSm ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11.5px]'
      }`}>
      <svg viewBox="0 0 24 24" className={isSm ? 'h-3 w-3 animate-bolt-pulse' : 'h-3.5 w-3.5 animate-bolt-pulse'}
        fill="currentColor" aria-hidden>
        <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />
      </svg>
      Fast Charging
    </span>
  );
}
