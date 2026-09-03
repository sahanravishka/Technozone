import Link from 'next/link';

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"
    strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

/**
 * Section header with the lead word in a marker block.
 *
 * `title` is split on the first space so the highlight lands on word one and
 * the rest runs plain — a single dictionary string still works in every
 * locale, including the ones where the first word isn't English.
 */
export default function SectionHeading({ title, sub, href, cta }:
  { title: string; sub?: string; href?: string; cta?: string }) {
  const [lead, ...tail] = title.trim().split(' ');
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-[1.35rem] font-extrabold uppercase tracking-[-0.02em] md:text-[1.75rem]">
          <span className="mark-highlight">{lead}</span>
          {/* A real space, not just a margin — otherwise the accessible name
              and the text Google indexes both come out as "Shopby category". */}
          {tail.length > 0 && <> <span>{tail.join(' ')}</span></>}
        </h2>
        {sub && <p className="mt-2 text-[14px] text-muted md:text-[15px]">{sub}</p>}
      </div>
      {href && cta && (
        <Link href={href}
          className="pressable hidden shrink-0 items-center gap-1.5 text-[13.5px] font-bold text-volt hover:underline sm:inline-flex">
          {cta} <ArrowIcon />
        </Link>
      )}
    </div>
  );
}
