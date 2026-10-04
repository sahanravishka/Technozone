'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Sri Lanka is UTC+5:30 all year (no DST), so "midnight" is a fixed offset.
const COLOMBO_OFFSET_MS = 5.5 * 3600 * 1000;
const DAY_MS = 86_400_000;
const msUntilColomboMidnight = () => DAY_MS - ((Date.now() + COLOMBO_OFFSET_MS) % DAY_MS);

interface Props {
  name: string;
  brand: string | null;
  href: string;
  waHref: string;
  imageSrc: string;
  price: string;
  compareAt: string | null;
  installment: string | null;
  labels: { eyebrow: string; sub: string; ends: string; cta: string; wa: string };
}

const Unit = ({ v, u }: { v: string; u: string }) => (
  <span className="inline-flex min-w-[46px] flex-col items-center rounded-xl bg-white/10 px-2 py-1.5 backdrop-blur-sm">
    <span className="text-[18px] font-extrabold tabular-nums leading-none">{v}</span>
    <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/55">{u}</span>
  </span>
);

/** "Pick of the day" — the server picks the product (same all day); this adds
 *  the live countdown to the next pick and refreshes the page when it rolls over. */
export default function DailyPick({ name, brand, href, waHref, imageSrc, price, compareAt, installment, labels }: Props) {
  const router = useRouter();
  const [left, setLeft] = useState<number | null>(null);
  const prev = useRef<number | null>(null);

  useEffect(() => {
    const tick = () => {
      const l = msUntilColomboMidnight();
      // the countdown jumps back up at midnight -> a new pick is due
      if (prev.current !== null && l > prev.current + 5000) router.refresh();
      prev.current = l;
      setLeft(l);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [router]);

  const secs = left === null ? null : Math.floor(left / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const hh = secs === null ? '--' : pad(Math.floor(secs / 3600));
  const mm = secs === null ? '--' : pad(Math.floor((secs % 3600) / 60));
  const ss = secs === null ? '--' : pad(secs % 60);

  return (
    <div className="pick-card">
      <div className="pick-inner grid items-center gap-6 bg-deep p-6 text-white sm:p-8 md:grid-cols-[1fr_1.1fr] md:gap-10 md:p-12">
        {/* Photo — white card so any product shot sits cleanly on the dark panel */}
        <Link href={href} className="pick-photo group relative mx-auto block aspect-square w-full max-w-[340px] overflow-hidden rounded-[28px] bg-white shadow-[0_30px_60px_-20px_rgba(0,0,0,.6)]"
          aria-label={name}>
          <Image src={imageSrc} alt={name} fill sizes="(min-width: 768px) 340px, 80vw"
            className="object-contain p-2 transition-transform duration-500 group-hover:scale-[1.04]" />
          <span className="pick-shine" aria-hidden />
        </Link>

        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-[12px] font-bold uppercase tracking-[0.05em] text-accent">
            <span aria-hidden>✦</span>{labels.eyebrow}
          </span>
          <h2 className="mt-4 text-[1.7rem] font-extrabold leading-[1.06] tracking-[-0.03em] md:text-[2.5rem]">{name}</h2>
          {brand && <p className="mt-1.5 text-[14px] text-white/60">{brand}</p>}
          <p className="mt-3 max-w-md text-[14.5px] text-white/70">{labels.sub}</p>

          <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-[28px] font-extrabold tracking-[-0.02em] md:text-[34px]">{price}</span>
            {compareAt && <span className="text-[15px] text-white/50 line-through">{compareAt}</span>}
          </div>
          {installment && (
            <p className="mt-1 text-[13px] font-semibold text-[#c4b5fd]">3 × {installment} · Koko</p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link href={href}
              className="btn-pill pressable inline-flex h-12 items-center gap-2 bg-gradient-to-r from-volt to-accent px-7 text-[14.5px] font-bold text-white transition-all hover:-translate-y-0.5">
              {labels.cta}
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </Link>
            <a href={waHref} target="_blank" rel="noopener noreferrer"
              className="btn-organic pressable inline-flex h-12 items-center border border-white/25 bg-white/5 px-6 text-[14px] font-bold transition-colors hover:bg-white/10">
              {labels.wa}
            </a>
          </div>

          <div className="mt-6 flex items-center gap-3" aria-live="off">
            <span className="text-[12px] font-semibold uppercase tracking-wide text-white/55">{labels.ends}</span>
            <span className="flex items-center gap-1.5">
              <Unit v={hh} u="h" /><span className="text-white/40">:</span><Unit v={mm} u="m" /><span className="text-white/40">:</span><Unit v={ss} u="s" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
