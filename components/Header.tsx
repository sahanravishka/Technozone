'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useCart } from '@/lib/cart-store';
import { useWishlist } from '@/lib/wishlist-store';
import { locales, localeNames, type Locale } from '@/lib/i18n/config';
import type { Dict } from '@/lib/i18n/dictionaries';
import type { Category } from '@/lib/types';
import { SITE, waLink } from '@/lib/site';
import ThemeToggle from './ThemeToggle';
import SearchBox from './SearchBox';

import Image from 'next/image';

// brand logo — reused in header + footer so the logo reads as a real mark
export const BrandMark = ({ className = 'h-8 w-8 rounded-[10px]' }: { className?: string }) => (
  <Image
    src="/icon.png"
    width={48}
    height={48}
    alt={SITE.wordmark.join(' ')}
    className={`shrink-0 object-contain ${className}`}
    priority
  />
);

export const Wordmark = ({ className = 'text-[14px]', mark = false }: { className?: string; mark?: boolean }) => (
  <span className="inline-flex items-center gap-2">
    {mark && <BrandMark className="h-8 w-8" />}
    <span className={`font-extrabold leading-none tracking-[0.05em] ${className}`}>
      {SITE.wordmark[0]}&nbsp;<span className="text-accent">{SITE.wordmark[1]}</span>
    </span>
  </span>
);

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" className="h-[19px] w-[19px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
    <circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/>
  </svg>
);

const BagIcon = () => (
  <svg viewBox="0 0 24 24" className="h-[20px] w-[20px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M6 8h12l1 12a1.6 1.6 0 0 1-1.6 1.7H6.6A1.6 1.6 0 0 1 5 20L6 8Z"/>
    <path d="M9 10V7a3 3 0 0 1 6 0v3"/>
  </svg>
);

export default function Header({ locale, dict, categories }:
  { locale: Locale; dict: Dict; categories: Category[] }) {
  const { count, hydrated } = useCart();
  const { count: wishCount, hydrated: wishHydrated } = useWishlist();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const switchLocale = (l: Locale) =>
    '/' + l + (pathname.replace(/^\/(en|si|ta)(?=\/|$)/, '') || '');

  return (
    <>
      {/* announcement bar — scrolls away, nav below stays sticky */}
      <div className="bg-deep px-4 py-2 text-center text-[12.5px] font-medium text-white/85">
        {dict.home.announce}
      </div>

      <header className="sticky top-0 z-50">
      {/* blur lives ONLY on this bar — backdrop-filter creates a containing block
          that would trap the fixed drawer if it were inside (the old bug) */}
      <div className="border-b border-line bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2.5 px-4 md:px-6">
        <button onClick={() => setOpen(true)} aria-label={dict.nav.menu}
          className="pressable -ml-1 grid h-10 w-10 place-items-center rounded-full bg-card md:hidden">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h10"/>
          </svg>
        </button>

        <Link href={`/${locale}`} className="px-1">
          <Wordmark mark />
        </Link>

        <nav className="ml-5 hidden items-center gap-0.5 md:flex" aria-label="Main navigation">
          {categories.slice(0, 3).map(c => (
            <Link key={c.id} href={`/${locale}/category/${c.slug}`}
              className="btn-tab rounded-full px-3.5 py-2 text-[13.5px] font-medium text-muted transition-colors hover:bg-card hover:text-ink">
              {c.name}
            </Link>
          ))}
          <Link href={`/${locale}/services`}
            className="btn-tab rounded-full px-3.5 py-2 text-[13.5px] font-medium text-muted transition-colors hover:bg-card hover:text-ink">
            {dict.nav.services}
          </Link>
        </nav>

        {/* desktop search — search-as-you-type with product suggestions */}
        <div className="ml-auto mr-2 hidden min-w-0 flex-1 max-w-md md:block">
          <SearchBox locale={locale} placeholder={dict.search.go} />
        </div>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          {/* mobile search icon */}
          <Link href={`/${locale}/search`} aria-label={dict.search.go}
            className="pressable grid h-10 w-10 place-items-center rounded-full bg-card md:hidden">
            <SearchIcon />
          </Link>
          {/* Language switcher — hidden on mobile since it's in the drawer */}
          <div className="hidden rounded-full bg-card p-1 text-[11.5px] font-semibold md:flex">
            {locales.map(l => (
              <Link key={l} href={switchLocale(l)}
                className={`rounded-full px-2.5 py-1 transition-colors ${l === locale ? 'bg-gradient-to-r from-volt to-volt-deep text-white' : 'text-muted hover:text-ink'}`}>
                {localeNames[l]}
              </Link>
            ))}
          </div>

          <div className="hidden md:block">
            <ThemeToggle />
          </div>

          {/* Wishlist */}
          <Link href={`/${locale}/wishlist`} aria-label="Wishlist"
            className="pressable relative hidden h-10 w-10 place-items-center rounded-full bg-card md:grid">
            <svg viewBox="0 0 24 24" className="h-[19px] w-[19px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 20s-7-4.5-9-9a4.5 4.5 0 0 1 9-2 4.5 4.5 0 0 1 9 2c-2 4.5-9 9-9 9z" />
            </svg>
            {wishHydrated && wishCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-[17px] min-w-[17px] place-items-center bg-gradient-to-r from-volt to-accent px-1 text-[10px] font-bold text-white"
                style={{ borderRadius: '30% 70% 70% 30% / 50% 50% 50% 50%' }}>
                {wishCount}
              </span>
            )}
          </Link>
          <Link href={`/${locale}/account`} aria-label="Account"
            className="pressable hidden h-10 w-10 place-items-center rounded-full bg-card md:grid">
            <svg viewBox="0 0 24 24" className="h-[20px] w-[20px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
              <circle cx="12" cy="8" r="3.4"/><path d="M5 19.5c1.3-3 4-4.5 7-4.5s5.7 1.5 7 4.5"/>
            </svg>
          </Link>
          {/* Cart — with organic shape badge */}
          <Link href={`/${locale}/cart`} aria-label={dict.nav.cart}
            className="pressable relative grid h-10 w-10 place-items-center rounded-full bg-card">
            <BagIcon />
            {hydrated && count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-[17px] min-w-[17px] place-items-center bg-gradient-to-r from-volt to-accent px-1 text-[10px] font-bold text-white"
                style={{ borderRadius: '30% 70% 70% 30% / 50% 50% 50% 50%' }}>
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>
      </div>

      {/* mobile drawer — sibling of the blurred bar, topmost layer */}
      <div className={`fixed inset-0 z-[90] md:hidden ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
        <div onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-deep/60 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`} />
        <aside className={`absolute left-0 top-0 flex h-full w-[82%] max-w-xs flex-col bg-card shadow-panel transition-transform duration-300 ease-[cubic-bezier(.22,.8,.3,1)] ${open ? 'translate-x-0' : '-translate-x-full'}`}
          style={{ borderRadius: '0 28px 28px 0' }}>
          <div className="flex h-16 items-center justify-between px-5">
            <Wordmark mark className="text-[13px]" />
            <button onClick={() => setOpen(false)} aria-label="Close"
              className="pressable grid h-9 w-9 place-items-center rounded-full bg-paper">
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg>
            </button>
          </div>

          {/* scrollable middle */}
          <nav className="flex-1 space-y-2 overflow-y-auto px-3 pb-4 pt-1" aria-label="Mobile navigation">
            {categories.map(c => (
              <Link key={c.id} href={`/${locale}/category/${c.slug}`}
                className="flex items-center bg-paper px-5 py-3.5 text-[15.5px] font-semibold transition-colors active:bg-line/60"
                style={{ borderRadius: '16px' }}>
                {c.name}
              </Link>
            ))}
            <Link href={`/${locale}/services`}
              className="flex items-center gap-2.5 bg-paper px-5 py-3.5 text-[15.5px] font-semibold transition-colors active:bg-line/60"
              style={{ borderRadius: '16px' }}>
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] text-volt" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.1-.4-.4-2.1 2.5-2.5Z"/>
              </svg>
              <span>{dict.nav.services}</span>
            </Link>

            <p className="px-2 pb-1 pt-4 text-[11.5px] font-bold uppercase tracking-wide text-muted">{dict.nav.account}</p>
            <Link href={`/${locale}/login`}
              className="btn-pill flex items-center gap-2.5 bg-gradient-to-r from-deep to-deep/90 px-5 py-3.5 text-[15px] font-semibold text-white transition-colors active:bg-deep/90">
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                <circle cx="12" cy="8" r="3.4"/><path d="M5 19.5c1.3-3 4-4.5 7-4.5s5.7 1.5 7 4.5"/>
              </svg>
              <span>{dict.account.signIn}</span>
            </Link>
            <div className="flex gap-2 pt-1">
              <Link href={`/${locale}/account`}
                className="flex flex-1 items-center justify-center rounded-full bg-volt-soft px-4 py-3 text-[14px] font-semibold text-volt">
                {dict.account.orders}
              </Link>
              <Link href={`/${locale}/track`}
                className="flex flex-1 items-center justify-center rounded-full bg-paper px-4 py-3 text-[14px] font-semibold">
                {dict.nav.trackRepair}
              </Link>
            </div>
            <Link href={`/${locale}/wishlist`}
              className="flex items-center justify-center gap-2 rounded-full bg-paper px-4 py-3 text-[14px] font-semibold">
              <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 20s-7-4.5-9-9a4.5 4.5 0 0 1 9-2 4.5 4.5 0 0 1 9 2c-2 4.5-9 9-9 9z" />
              </svg>
              Wishlist{wishHydrated && wishCount > 0 ? ` (${wishCount})` : ''}
            </Link>

            <div className="grid grid-cols-2 gap-x-3 gap-y-1 px-2 pt-4 text-[13.5px]">
              <Link href={`/${locale}/warranty`} className="py-1.5 text-muted transition-colors active:text-ink">{dict.warranty.title}</Link>
              <Link href={`/${locale}/returns`} className="py-1.5 text-muted transition-colors active:text-ink">{dict.returns.title}</Link>
            </div>
          </nav>

          {/* pinned bottom — language + contact, so the panel never looks empty */}
          <div className="border-t border-line px-4 pb-5 pt-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex flex-1 rounded-full bg-paper p-1 text-[12px] font-semibold">
                {locales.map(l => (
                  <Link key={l} href={switchLocale(l)}
                    className={`flex-1 rounded-full py-1.5 text-center transition-colors ${l === locale ? 'bg-gradient-to-r from-volt to-volt-deep text-white' : 'text-muted'}`}>
                    {localeNames[l]}
                  </Link>
                ))}
              </div>
              <ThemeToggle />
            </div>
            <a href={waLink('Hi! I have a question.')} target="_blank" rel="noopener noreferrer"
              className="btn-pill flex items-center justify-center gap-2 bg-[#25D366] px-4 py-3 text-[14px] font-semibold text-white">
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden>
                <path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.5A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.7-.1-.4-.1-.9-.3-1.6-.6-2.8-1.2-4.6-4-4.7-4.2-.1-.2-1.1-1.4-1.1-2.7s.7-1.9.9-2.2c.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2.1.4 0 .5l-.4.6c-.1.2-.3.3-.1.6.1.3.7 1.1 1.4 1.8.9.8 1.7 1 2 1.2.2.1.4.1.5-.1l.7-.8c.2-.2.3-.2.6-.1l1.8.9c.2.1.4.2.5.3.1.2.1.7-.1 1.3Z"/>
              </svg>
              {SITE.name.split(' ')[0]} · WhatsApp
            </a>
          </div>
        </aside>
      </div>
      </header>
    </>
  );
}
