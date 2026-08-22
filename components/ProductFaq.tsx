'use client';

import { useState } from 'react';

export default function ProductFaq({ faqs }: { faqs: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  if (!faqs?.length) return null;

  return (
    <section className="mt-6 border-t border-line pt-5">
      <h2 className="mb-3 text-[15px] font-bold">Frequently Asked Questions</h2>
      <div className="divide-y divide-line rounded-2xl border border-line">
        {faqs.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={i}>
              <button type="button" onClick={() => setOpen(isOpen ? null : i)}
                className="pressable flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
                aria-expanded={isOpen}>
                <span className="text-[13.5px] font-semibold">{f.q}</span>
                <span className={`shrink-0 text-[12px] text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
              </button>
              {isOpen && (
                <p className="px-4 pb-3.5 text-[13.5px] leading-relaxed text-muted">{f.a}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
