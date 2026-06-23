import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getStaff } from '@/lib/admin-auth';
import { getServerSupabase } from '@/lib/supabase-clients/server';
import { SITE } from '@/lib/site';
import { AdminSidebarNav, AdminMobileNav, SignOutButton, type NavItem } from '@/components/admin/AdminNav';

export const dynamic = 'force-dynamic';

const NAV: NavItem[] = [
  { label: 'Dashboard', href: '/admin' },
  { label: 'Orders', href: '/admin/orders' },
  { label: 'Repairs', href: '/admin/repairs' },
  { label: 'Shipments', href: '/admin/shipments' },
  { label: 'Returns', href: '/admin/returns' },
  { label: 'Warranties', href: '/admin/warranties' },
  { label: 'Customers', href: '/admin/customers' },
  { label: 'Reviews', href: '/admin/reviews' },
  { label: 'Products', href: '/admin/products' },
  { label: 'Discounts', href: '/admin/discounts' },
  { label: 'Settings', href: '/admin/settings' },
  { label: 'Staff', href: '/admin/staff' }
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getServerSupabase();
  if (!supabase) {
    return (
      <div className="grid min-h-screen place-items-center bg-paper p-6 text-center">
        <p className="max-w-sm rounded-3xl bg-card p-8 text-[14px] text-muted">
          Connect Supabase (env vars) to activate the admin panel.
        </p>
      </div>
    );
  }
  const staff = await getStaff();
  if (!staff) redirect('/admin/login');

  const initials = staff.full_name.split(/\s+/).map(s => s[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="flex min-h-screen bg-paper">
      {/* ---------- desktop sidebar ---------- */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col bg-ink px-3.5 py-4 text-white md:flex">
        <Link href="/admin" className="flex items-center gap-2 px-2 pt-1">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-volt text-[13px] font-black">
            {SITE.wordmark[0]?.[0] ?? 'T'}
          </span>
          <span className="text-[13.5px] font-bold tracking-[0.03em]">
            {SITE.wordmark[0]} <span className="text-accent">{SITE.wordmark[1]}</span>
          </span>
        </Link>

        <div className="mt-4 flex items-center gap-2.5 rounded-2xl bg-white/5 p-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-volt to-accent text-[12px] font-bold">
            {initials || 'A'}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[12.5px] font-semibold">{staff.full_name}</span>
            <span className="block text-[10.5px] capitalize text-white/45">{staff.role}</span>
          </span>
        </div>

        <div className="mt-4 flex-1 overflow-y-auto">
          <AdminSidebarNav items={NAV} />
        </div>

        <div className="mt-3 space-y-0.5 border-t border-white/10 pt-3">
          <Link href="/en" className="admin-nav-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18" />
            </svg>
            View store
          </Link>
          <SignOutButton />
        </div>
      </aside>

      {/* ---------- mobile top bar ---------- */}
      <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-ink text-white md:hidden">
        <div className="flex items-center justify-between px-4 py-2.5">
          <Link href="/admin" className="text-[13px] font-bold tracking-[0.03em]">
            {SITE.wordmark[0]} <span className="text-accent">{SITE.wordmark[1]}</span>
          </Link>
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold capitalize">{staff.role}</span>
        </div>
        <div className="rail flex gap-1.5 overflow-x-auto px-3 pb-2.5">
          <AdminMobileNav items={NAV} />
        </div>
      </header>

      <main className="w-full px-4 pb-16 pt-[104px] md:ml-60 md:px-8 md:pt-8">{children}</main>
    </div>
  );
}
