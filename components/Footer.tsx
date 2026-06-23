import Link from 'next/link';
import { BrandMark } from './Header';
import { SITE, waLink } from '@/lib/site';
import type { Dict } from '@/lib/i18n/dictionaries';
import type { Category } from '@/lib/types';
import type { Locale } from '@/lib/i18n/config';

export default function Footer({ dict, categories, locale }:
  { dict: Dict; categories: Category[]; locale: Locale }) {
  const linkCls = 'text-white/60 transition-colors hover:text-white';
  return (
    <footer className="mt-20 bg-deep text-white" role="contentinfo">
      {/* Wave separator at top */}
      <div className="relative -mb-1 h-8 bg-paper">
        <svg viewBox="0 0 1440 48" preserveAspectRatio="none" className="absolute bottom-0 left-0 h-8 w-full" fill="var(--deep)" aria-hidden>
          <path d="M0 48h1440V24c-240 16-480 24-720 24S240 40 0 24v24Z" />
        </svg>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <div className="grid gap-10 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
          {/* brand */}
          <div>
            <div className="flex items-center gap-3">
              <BrandMark className="h-12 w-12 rounded-[15px]" />
              <p className="text-[15px] font-extrabold tracking-[0.05em]">
                {SITE.wordmark[0]}&nbsp;<span className="text-accent">{SITE.wordmark[1]}</span>
              </p>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/55">{dict.footer.built}</p>
            <a href={waLink('Hi! I have a question.')} target="_blank" rel="noopener noreferrer"
              className="btn-pill mt-5 inline-flex items-center gap-2 bg-white/10 px-4 py-2.5 text-[13.5px] font-bold text-white transition-colors hover:bg-white/15">
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden>
                <path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.5A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.7-.1-.4-.1-.9-.3-1.6-.6-2.8-1.2-4.6-4-4.7-4.2-.1-.2-1.1-1.4-1.1-2.7s.7-1.9.9-2.2c.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2.1.4 0 .5l-.4.6c-.1.2-.3.3-.1.6.1.3.7 1.1 1.4 1.8.9.8 1.7 1 2 1.2.2.1.4.1.5-.1l.7-.8c.2-.2.3-.2.6-.1l1.8.9c.2.1.4.2.5.3.1.2.1.7-.1 1.3Z" />
              </svg>
              +{SITE.whatsapp}
            </a>
          </div>

          {/* shop */}
          <nav aria-label="Shop categories">
            <h5 className="mb-4 text-[12px] font-bold uppercase tracking-[0.06em] text-white/40">{dict.nav.categories}</h5>
            <ul className="flex flex-col gap-3 text-sm font-semibold">
              {categories.map(c => (
                <li key={c.id}><Link href={`/${locale}/category/${c.slug}`} className={linkCls}>{c.name}</Link></li>
              ))}
            </ul>
          </nav>

          {/* support */}
          <nav aria-label="Support links">
            <h5 className="mb-4 text-[12px] font-bold uppercase tracking-[0.06em] text-white/40">{dict.nav.services}</h5>
            <ul className="flex flex-col gap-3 text-sm font-semibold">
              <li><Link href={`/${locale}/services`} className={linkCls}>{dict.services.bookCta}</Link></li>
              <li><Link href={`/${locale}/track`} className={linkCls}>{dict.nav.trackRepair}</Link></li>
              <li><Link href={`/${locale}/warranty`} className={linkCls}>{dict.warranty.title}</Link></li>
              <li><Link href={`/${locale}/returns`} className={linkCls}>{dict.returns.title}</Link></li>
            </ul>
          </nav>

          {/* account */}
          <nav aria-label="Account links">
            <h5 className="mb-4 text-[12px] font-bold uppercase tracking-[0.06em] text-white/40">{dict.nav.account}</h5>
            <ul className="flex flex-col gap-3 text-sm font-semibold">
              <li><Link href={`/${locale}/account`} className={linkCls}>{dict.account.orders}</Link></li>
              <li><Link href={`/${locale}/login`} className={linkCls}>{dict.account.signIn}</Link></li>
              <li><Link href={`/${locale}/search`} className={linkCls}>{dict.search.go}</Link></li>
              <li><Link href={`/${locale}/cart`} className={linkCls}>{dict.cart.title}</Link></li>
            </ul>
          </nav>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-[12.5px] font-semibold text-white/45 sm:flex-row">
          <span>© {new Date().getFullYear()} {SITE.name} · {dict.footer.rights}</span>
          <span>{SITE.tagline}</span>
        </div>
      </div>
    </footer>
  );
}
