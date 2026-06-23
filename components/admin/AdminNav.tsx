'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { getBrowserSupabase } from '@/lib/supabase-clients/browser';

export type NavItem = { label: string; href: string };

/** Minimal line icons keyed by route. */
function Icon({ href }: { href: string }) {
  const p = (() => {
    switch (href) {
      case '/admin': return <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>;
      case '/admin/orders': return <><path d="M6 2 4 6v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6l-2-4z" /><path d="M4 6h16M9 10a3 3 0 0 0 6 0" /></>;
      case '/admin/repairs': return <path d="M14.7 6.3a4 4 0 0 0-5.2 5.2L4 17l3 3 5.5-5.5a4 4 0 0 0 5.2-5.2l-2.6 2.6-2.4-.6-.6-2.4z" />;
      case '/admin/shipments': return <><path d="M1 3h13v13H1z" /><path d="M14 8h5l3 3v5h-8z" /><circle cx="6" cy="19" r="2" /><circle cx="18" cy="19" r="2" /></>;
      case '/admin/returns': return <><path d="M3 7v6h6" /><path d="M3.5 13a9 9 0 1 0 2.3-9.3L3 7" /></>;
      case '/admin/warranties': return <path d="M12 2 4 5v6c0 5 3.4 8.5 8 11 4.6-2.5 8-6 8-11V5z" />;
      case '/admin/customers': return <><circle cx="9" cy="8" r="3.2" /><path d="M3 20a6 6 0 0 1 12 0M16 4a3.2 3.2 0 0 1 0 8M21 20a6 6 0 0 0-4-5.6" /></>;
      case '/admin/reviews': return <path d="m12 3 2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.8 6.7 19.4l1.2-6L3.4 9.3l6-.7z" />;
      case '/admin/products': return <><path d="M21 16V8l-9-5-9 5v8l9 5z" /><path d="m3.3 7 8.7 5 8.7-5M12 22V12" /></>;
      case '/admin/discounts': return <><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-7.2-7.2a2 2 0 0 1-.6-1.4V5a2 2 0 0 1 2-2h6.9a2 2 0 0 1 1.4.6l7.5 7.5a2 2 0 0 1 0 2.8z" /><circle cx="7.5" cy="7.5" r="1.5" /></>;
      case '/admin/settings': return <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 6.8 19.7l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 4 12.8H4a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 5.2 6.1l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 11 3.4V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" /></>;
      case '/admin/staff': return <><circle cx="12" cy="8" r="3.4" /><path d="M5 21a7 7 0 0 1 14 0" /></>;
      default: return <circle cx="12" cy="12" r="8" />;
    }
  })();
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {p}
    </svg>
  );
}

function useActive() {
  const pathname = usePathname();
  return (href: string) => href === '/admin'
    ? pathname === '/admin'
    : pathname === href || pathname.startsWith(href + '/');
}

/** Desktop vertical sidebar links. */
export function AdminSidebarNav({ items }: { items: NavItem[] }) {
  const isActive = useActive();
  return (
    <nav className="flex flex-col gap-0.5">
      {items.map(({ label, href }) => (
        <Link key={href} href={href} prefetch className="admin-nav-link" data-active={isActive(href)}>
          <Icon href={href} />{label}
        </Link>
      ))}
    </nav>
  );
}

/** Mobile horizontal pill nav. */
export function AdminMobileNav({ items }: { items: NavItem[] }) {
  const isActive = useActive();
  return (
    <nav className="flex items-center gap-1.5">
      {items.map(({ label, href }) => (
        <Link key={href} href={href} prefetch className="admin-pill" data-active={isActive(href)}>
          <Icon href={href} />{label}
        </Link>
      ))}
    </nav>
  );
}

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const signOut = async () => {
    setBusy(true);
    const supabase = getBrowserSupabase();
    await supabase?.auth.signOut();
    router.push('/admin/login');
    router.refresh();
  };
  return (
    <button onClick={signOut} disabled={busy}
      className="admin-nav-link w-full text-left disabled:opacity-50">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
      </svg>
      {busy ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
