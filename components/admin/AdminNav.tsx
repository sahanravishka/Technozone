'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getBrowserSupabase } from '@/lib/supabase-clients/browser';
import { SITE } from '@/lib/site';

import AdminSearch from './AdminSearch';

export type NavItem = { label: string; href: string; group?: string };

function Icon({ href }: { href: string }) {
  const p = (() => {
    switch (href) {
      case '/admin':          return <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>;
      case '/admin/orders':   return <><path d="M6 2 4 6v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6l-2-4z" /><path d="M4 6h16M9 10a3 3 0 0 0 6 0" /></>;
      case '/admin/abandoned-carts': return <><path d="M6 8h12l1 12a1.6 1.6 0 0 1-1.6 1.7H6.6A1.6 1.6 0 0 1 5 20L6 8Z" /><path d="M9 10V7a3 3 0 0 1 6 0v3" /><path d="m9.5 22 5-5" /></>;
      case '/admin/repairs':  return <path d="M14.7 6.3a4 4 0 0 0-5.2 5.2L4 17l3 3 5.5-5.5a4 4 0 0 0 5.2-5.2l-2.6 2.6-2.4-.6-.6-2.4z" />;
      case '/admin/returns':  return <><path d="M3 7v6h6" /><path d="M3.5 13a9 9 0 1 0 2.3-9.3L3 7" /></>;
      case '/admin/warranties': return <path d="M12 2 4 5v6c0 5 3.4 8.5 8 11 4.6-2.5 8-6 8-11V5z" />;
      case '/admin/stock-alerts': return <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></>;
      case '/admin/customers': return <><circle cx="9" cy="8" r="3.2" /><path d="M3 20a6 6 0 0 1 12 0M16 4a3.2 3.2 0 0 1 0 8M21 20a6 6 0 0 0-4-5.6" /></>;
      case '/admin/reviews':  return <path d="m12 3 2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.8 6.7 19.4l1.2-6L3.4 9.3l6-.7z" />;
      case '/admin/products': return <><path d="M21 16V8l-9-5-9 5v8l9 5z" /><path d="m3.3 7 8.7 5 8.7-5M12 22V12" /></>;
      case '/admin/categories': return <><rect x="3" y="3" width="8" height="8" rx="2" /><rect x="13" y="3" width="8" height="8" rx="2" /><rect x="3" y="13" width="8" height="8" rx="2" /><path d="M17 13v8M13 17h8" /></>;
      case '/admin/discounts': return <><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-7.2-7.2a2 2 0 0 1-.6-1.4V5a2 2 0 0 1 2-2h6.9a2 2 0 0 1 1.4.6l7.5 7.5a2 2 0 0 1 0 2.8z" /><circle cx="7.5" cy="7.5" r="1.5" /></>;
      case '/admin/banners': return <><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="m2.5 15.5 5-5 4 4 3-3 6 6" /><circle cx="8" cy="9.5" r="1.5" /></>;
      case '/admin/settings': return <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 6.8 19.7l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 4 12.8H4a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 5.2 6.1l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 11 3.4V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" /></>;
      case '/admin/staff':    return <><circle cx="12" cy="8" r="3.4" /><path d="M5 21a7 7 0 0 1 14 0" /></>;
      default:                return <circle cx="12" cy="12" r="8" />;
    }
  })();
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px] shrink-0" aria-hidden>
      {p}
    </svg>
  );
}

/** Nav list with small group headings ("Selling", "My shop", …). */
function GroupedNav({ nav, isActive, collapsed = false, onNavigate }:
  { nav: NavItem[]; isActive: (h: string) => boolean; collapsed?: boolean; onNavigate?: () => void }) {
  let lastGroup: string | undefined;
  return (
    <>
      {nav.map(({ label, href, group }) => {
        const heading = group && group !== lastGroup ? group : null;
        lastGroup = group ?? lastGroup;
        return (
          <span key={href} className="contents">
            {heading && !collapsed && (
              <span className="mt-3 mb-1 block px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-white/30 first:mt-0">
                {heading}
              </span>
            )}
            {heading && collapsed && <span className="my-1.5 block h-px bg-white/10" aria-hidden />}
            <Link href={href} prefetch onClick={onNavigate}
              data-active={isActive(href)}
              title={collapsed ? label : undefined}
              className={`admin-nav-link${collapsed ? ' justify-center' : ''}`}>
              <Icon href={href} />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          </span>
        );
      })}
    </>
  );
}

function useActive() {
  const pathname = usePathname();
  return (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(href + '/');
}

const GlobeIcon = () => (
  <svg viewBox="0 0 24 24" className="h-[17px] w-[17px] shrink-0" fill="none"
    stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18" />
  </svg>
);

const SignOutIcon = () => (
  <svg viewBox="0 0 24 24" className="h-[17px] w-[17px] shrink-0" fill="none"
    stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
  </svg>
);

export function AdminShell({
  staff,
  nav,
  children,
}: {
  staff: { full_name: string; role: string };
  nav: NavItem[];
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const isActive = useActive();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    try { setCollapsed(localStorage.getItem('admin-sidebar') === 'collapsed'); } catch {}
  }, []);

  // Close mobile drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  const toggleCollapse = () => {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem('admin-sidebar', next ? 'collapsed' : 'expanded'); } catch {}
      return next;
    });
  };

  const signOut = async () => {
    setSigningOut(true);
    const sb = getBrowserSupabase();
    await sb?.auth.signOut();
    router.push('/admin/login');
    router.refresh();
  };

  const initials = staff.full_name.split(/\s+/).map((s: string) => s[0]).slice(0, 2).join('').toUpperCase() || 'A';
  const isCollapsed = mounted && collapsed;

  return (
    <div className="flex min-h-screen bg-paper">

      {/* ===== Mobile Overlay Backdrop ===== */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] transition-opacity duration-200 md:hidden ${drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden
      />

      {/* ===== Mobile Slide Drawer ===== */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col bg-ink text-white transition-transform duration-[220ms] ease-in-out md:hidden ${drawerOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}
      >
        <div className="flex shrink-0 items-center justify-between px-4 pt-5 pb-4">
          <Link href="/admin" onClick={() => setDrawerOpen(false)} className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-volt text-[13px] font-black text-white">
              {SITE.wordmark[0]?.[0] ?? 'T'}
            </span>
            <span className="text-[13.5px] font-bold tracking-[0.03em]">
              {SITE.wordmark[0]} <span className="text-accent">{SITE.wordmark[1]}</span>
            </span>
          </Link>
          <button onClick={() => setDrawerOpen(false)}
            className="grid h-8 w-8 place-items-center rounded-xl bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Close menu">
            <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mx-4 mb-3 flex items-center gap-2.5 rounded-2xl bg-white/5 p-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-volt to-accent text-[12px] font-bold">
            {initials}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[12.5px] font-semibold">{staff.full_name}</span>
            <span className="block text-[10.5px] capitalize text-white/45">{staff.role}</span>
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto px-2.5 py-1 flex flex-col gap-0.5">
          <div className="mb-2 px-0.5"><AdminSearch variant="dark" /></div>
          <GroupedNav nav={nav} isActive={isActive} onNavigate={() => setDrawerOpen(false)} />
        </nav>

        <div className="shrink-0 border-t border-white/10 px-2.5 pt-3 pb-6 space-y-0.5">
          <Link href="/en" onClick={() => setDrawerOpen(false)} className="admin-nav-link">
            <GlobeIcon /><span>View store</span>
          </Link>
          <button onClick={signOut} disabled={signingOut}
            className="admin-nav-link w-full text-left disabled:opacity-50">
            <SignOutIcon /><span>{signingOut ? 'Signing out…' : 'Sign out'}</span>
          </button>
        </div>
      </aside>

      {/* ===== Desktop Sidebar ===== */}
      <aside className={`hidden md:flex fixed inset-y-0 left-0 z-40 flex-col bg-ink text-white overflow-x-hidden transition-[width] duration-200 ease-in-out ${isCollapsed ? 'w-16' : 'w-60'}`}>

        {/* Logo + collapse toggle */}
        <div className={`flex shrink-0 items-center gap-2 px-3 pt-4 pb-3 ${isCollapsed ? 'flex-col' : 'px-3.5'}`}>
          <Link href="/admin" className="flex items-center gap-2.5 flex-1 min-w-0">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-volt text-[13px] font-black text-white">
              {SITE.wordmark[0]?.[0] ?? 'T'}
            </span>
            {!isCollapsed && (
              <span className="text-[13.5px] font-bold tracking-[0.03em] whitespace-nowrap overflow-hidden">
                {SITE.wordmark[0]} <span className="text-accent">{SITE.wordmark[1]}</span>
              </span>
            )}
          </Link>
          <button onClick={toggleCollapse}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-white/5 text-white/40 hover:bg-white/10 hover:text-white transition-colors">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              {isCollapsed ? <path d="M9 18l6-6-6-6" /> : <path d="M15 18l-6-6 6-6" />}
            </svg>
          </button>
        </div>

        {/* User card */}
        <div className={`mx-2.5 mb-3 shrink-0 flex items-center rounded-2xl bg-white/5 ${isCollapsed ? 'justify-center p-2' : 'gap-2.5 p-2.5'}`}>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-volt to-accent text-[12px] font-bold">
            {initials}
          </span>
          {!isCollapsed && (
            <span className="min-w-0">
              <span className="block truncate text-[12.5px] font-semibold">{staff.full_name}</span>
              <span className="block text-[10.5px] capitalize text-white/45">{staff.role}</span>
            </span>
          )}
        </div>

        {/* Global search — or press Ctrl+K anywhere */}
        <div className="mx-2.5 mb-2 shrink-0">
          <AdminSearch variant="dark" iconOnly={isCollapsed} />
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2.5 flex flex-col gap-0.5">
          <GroupedNav nav={nav} isActive={isActive} collapsed={isCollapsed} />
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-white/10 px-2.5 pt-3 pb-4 space-y-0.5">
          <Link href="/en" title={isCollapsed ? 'View store' : undefined}
            className={`admin-nav-link${isCollapsed ? ' justify-center' : ''}`}>
            <GlobeIcon />
            {!isCollapsed && <span>View store</span>}
          </Link>
          <button onClick={signOut} disabled={signingOut}
            title={isCollapsed ? (signingOut ? 'Signing out…' : 'Sign out') : undefined}
            className={`admin-nav-link w-full text-left disabled:opacity-50${isCollapsed ? ' justify-center' : ''}`}>
            <SignOutIcon />
            {!isCollapsed && <span>{signingOut ? 'Signing out…' : 'Sign out'}</span>}
          </button>
        </div>
      </aside>

      {/* ===== Mobile Top Bar ===== */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-card/95 px-4 shadow-sm backdrop-blur-md md:hidden">
        <button onClick={() => setDrawerOpen(true)}
          className="grid h-9 w-9 place-items-center rounded-xl bg-paper hover:bg-line transition-colors"
          aria-label="Open menu">
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
        <Link href="/admin" className="font-bold text-[15px] tracking-[-0.01em] text-ink">
          {SITE.wordmark[0]} <span className="text-accent">{SITE.wordmark[1]}</span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <AdminSearch />
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-volt to-accent text-[11px] font-bold text-white">
            {initials}
          </div>
        </div>
      </header>


      {/* ===== Mobile Bottom Tab Bar — thumb-reach nav for the 4 daily jobs ===== */}
      <nav className="admin-bottom-nav md:hidden" aria-label="Quick navigation">
        {([
          { label: 'Home', href: '/admin' },
          { label: 'Orders', href: '/admin/orders' },
          { label: 'Products', href: '/admin/products' },
          { label: 'Repairs', href: '/admin/repairs' }
        ] as const).map(t => (
          <Link key={t.href} href={t.href} prefetch data-active={isActive(t.href)} className="admin-tab">
            <Icon href={t.href} />
            <span>{t.label}</span>
          </Link>
        ))}
        <button onClick={() => setDrawerOpen(true)} className="admin-tab" aria-label="More menu">
          <svg viewBox="0 0 24 24" className="h-[17px] w-[17px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden>
            <circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" />
          </svg>
          <span>More</span>
        </button>
      </nav>

      {/* ===== Main Content ===== */}
      <main className={`w-full transition-[margin-left] duration-200 ease-in-out pt-14 pb-20 px-4 sm:px-6 md:pt-8 md:pb-14 md:px-8 ${isCollapsed ? 'md:ml-16' : 'md:ml-60'}`}>
        {children}
      </main>

    </div>
  );
}

// Backward-compat stubs (layout.tsx no longer uses these)
export function AdminSidebarNav() { return null; }
export function AdminMobileNav() { return null; }
export function SignOutButton() { return null; }
