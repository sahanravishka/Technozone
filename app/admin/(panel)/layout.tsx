import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getStaff } from '@/lib/admin-auth';
import { getServerSupabase } from '@/lib/supabase-clients/server';
import { SITE } from '@/lib/site';

export const dynamic = 'force-dynamic';

const NAV = [
  ['Dashboard', '/admin'],
  ['Orders', '/admin/orders'],
  ['Repairs', '/admin/repairs'],
  ['Shipments', '/admin/shipments'],
  ['Returns', '/admin/returns'],
  ['Warranties', '/admin/warranties'],
  ['Customers', '/admin/customers'],
  ['Reviews', '/admin/reviews'],
  ['Products', '/admin/products'],
  ['Discounts', '/admin/discounts'],
  ['Settings', '/admin/settings'],
  ['Staff', '/admin/staff']
] as const;

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

  return (
    <div className="flex min-h-screen bg-paper">
      {/* dark navy sidebar — Direction B */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col bg-ink p-4 text-white md:flex">
        <p className="px-2 pt-1 text-[13px] font-bold tracking-[0.04em]">
          {SITE.wordmark[0]} <span className="text-accent">{SITE.wordmark[1]}</span>
        </p>
        <p className="px-2 pb-5 pt-0.5 text-[11px] text-white/40">Admin · {staff.full_name} ({staff.role})</p>
        <nav className="flex flex-col gap-1">
          {NAV.map(([label, href]) => (
            <Link key={href} href={href}
              className="rounded-xl px-3.5 py-2.5 text-[13.5px] font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white">
              {label}
            </Link>
          ))}
        </nav>
        <Link href="/en" className="mt-auto rounded-xl px-3.5 py-2.5 text-[12.5px] text-white/40 hover:text-white">
          ← View store
        </Link>
      </aside>

      {/* mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-3 overflow-x-auto bg-ink px-4 text-white md:hidden">
        {NAV.map(([label, href]) => (
          <Link key={href} href={href} className="shrink-0 text-[13px] font-medium text-white/80">{label}</Link>
        ))}
      </div>

      <main className="w-full px-4 pb-12 pt-[72px] md:ml-56 md:px-8 md:pt-8">{children}</main>
    </div>
  );
}
