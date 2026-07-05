import Link from 'next/link';
import type { Locale } from '@/lib/i18n/config';

export type PolicySection = { heading: string; body: React.ReactNode };

/**
 * Shared layout for legal/policy pages — Terms, Warranty, Returns, Privacy.
 * Clean readable prose, a quick-jump list on long pages, and cross-links
 * between the policies at the bottom.
 */
export default function PolicyArticle({ locale, title, intro, updated, sections, crossLinks }: {
  locale: Locale;
  title: string;
  intro: string;
  updated: string;
  sections: PolicySection[];
  crossLinks: { label: string; href: string }[];
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-14">
      <nav className="breadcrumb mb-4" aria-label="Breadcrumb">
        <Link href={`/${locale}`}>Home</Link>
        <span className="sep" aria-hidden>/</span>
        <span className="text-ink font-semibold">{title}</span>
      </nav>

      <h1 className="text-2xl font-extrabold tracking-[-0.02em] md:text-3xl">{title}</h1>
      <p className="mt-1 text-[12.5px] text-muted">Last updated: {updated}</p>
      <p className="mt-4 text-[14.5px] leading-relaxed text-muted">{intro}</p>

      {/* Quick jump */}
      <div className="rail mt-6 flex gap-2 overflow-x-auto pb-1">
        {sections.map((s, i) => (
          <a key={i} href={`#s${i + 1}`}
            className="pressable shrink-0 rounded-full bg-paper px-3.5 py-1.5 text-[12px] font-semibold text-muted hover:text-ink">
            {s.heading}
          </a>
        ))}
      </div>

      <div className="mt-8 space-y-8">
        {sections.map((s, i) => (
          <section key={i} id={`s${i + 1}`} className="scroll-mt-24">
            <h2 className="text-[17px] font-extrabold tracking-[-0.01em]">
              {i + 1}. {s.heading}
            </h2>
            <div className="mt-2.5 space-y-3 text-[14px] leading-relaxed text-muted [&_b]:text-ink [&_b]:font-semibold">
              {s.body}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-12 rounded-2xl border border-line bg-paper p-5">
        <p className="text-[13px] font-bold">Related policies</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {crossLinks.map(l => (
            <Link key={l.href} href={`/${locale}${l.href}`}
              className="pressable rounded-full bg-card px-3.5 py-1.5 text-[12.5px] font-semibold text-volt hover:underline">
              {l.label} →
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
