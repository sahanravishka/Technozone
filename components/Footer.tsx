import type { ReactElement } from 'react';
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
        <div className="grid gap-10 md:grid-cols-[1.6fr_3fr]">
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
            {(() => {
              const socials: [string, string, ReactElement][] = [
                ['Facebook', SITE.social.facebook, <path key="f" d="M13.5 9H16V6h-2.5C11.6 6 10 7.6 10 9.5V11H8v3h2v6h3v-6h2.2l.4-3H13V9.6c0-.3.2-.6.5-.6Z" fill="currentColor" stroke="none" />],
                ['Instagram', SITE.social.instagram, <g key="i"><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="3.6" /><circle cx="17" cy="7" r="1.1" fill="currentColor" stroke="none" /></g>],
                ['YouTube', SITE.social.youtube, <g key="y"><rect x="2.5" y="5.5" width="19" height="13" rx="4" /><path d="M10 9.4l5 2.6-5 2.6z" fill="currentColor" stroke="none" /></g>],
                ['X', SITE.social.x, <path key="x" d="M4 4l16 16M20 4L4 20" />],
                ['LinkedIn', SITE.social.linkedin, <g key="l"><rect x="3.5" y="3.5" width="17" height="17" rx="3" /><path d="M8 10.5V16M8 7.2v.01M12 16v-3.4a1.6 1.6 0 0 1 3.2 0V16" /></g>]
              ];
              const active = socials.filter(([, url]) => url);
              return active.length ? (
                <div className="mt-5 flex gap-2">
                  {active.map(([name, url, icon]) => (
                    <a key={name} href={url} target="_blank" rel="noopener noreferrer" aria-label={name}
                      className="grid h-9 w-9 place-items-center rounded-full bg-white/10 transition-colors hover:bg-white/15">
                      <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{icon}</svg>
                    </a>
                  ))}
                </div>
              ) : null;
            })()}
          </div>

          {/* link columns — side by side on mobile too */}
          <div className="grid grid-cols-3 gap-x-4 gap-y-8 sm:gap-x-8">
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
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-[12.5px] font-semibold text-white/45 sm:flex-row">
          <span>© {new Date().getFullYear()} {SITE.name} · {dict.footer.rights}</span>
          <span>{SITE.tagline}</span>
        </div>
      </div>
    </footer>
  );
}
