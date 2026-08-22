/** Small trust badge showing the product's real warranty period. Built from
 *  warranty_months rather than hardcoded text, so it's automatically
 *  accurate for any product — 12 months shows "1 Year", other values show
 *  "X Month(s)" — instead of a blanket claim that might not hold for every
 *  category (e.g. accessories carry 6 months, phones carry 12). */
export default function WarrantyBadge({ months, size = 'sm' }: { months?: number | null; size?: 'sm' | 'md' }) {
  if (!months || months <= 0) return null;
  const label = months % 12 === 0 && months >= 12
    ? `${months / 12} Year${months / 12 > 1 ? 's' : ''} Official Warranty`
    : `${months} Month${months > 1 ? 's' : ''} Official Warranty`;
  const isSm = size === 'sm';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-[#E8F7EE] font-bold text-ok ${
        isSm ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11.5px]'
      }`}>
      <svg viewBox="0 0 24 24" className={isSm ? 'h-3 w-3' : 'h-3.5 w-3.5'} fill="currentColor" aria-hidden>
        <path d="M12 2 4 5v6c0 5 3.4 8.9 8 10 4.6-1.1 8-5 8-10V5l-8-3Zm-1.2 13.4-3.2-3.2 1.4-1.4 1.8 1.8 4.8-4.8 1.4 1.4-6.2 6.2Z" />
      </svg>
      {label}
    </span>
  );
}
