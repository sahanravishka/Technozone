import { redirect } from 'next/navigation';
import { getStaff } from '@/lib/admin-auth';
import { getServerSupabase } from '@/lib/supabase-clients/server';
import { AdminShell, type NavItem } from '@/components/admin/AdminNav';

export const dynamic = 'force-dynamic';

const NAV: NavItem[] = [
  { label: 'Dashboard',  href: '/admin' },
  { label: 'Orders',     href: '/admin/orders' },
  { label: 'Repairs',    href: '/admin/repairs' },
  { label: 'Returns',    href: '/admin/returns' },
  { label: 'Warranties', href: '/admin/warranties' },
  { label: 'Customers',  href: '/admin/customers' },
  { label: 'Reviews',    href: '/admin/reviews' },
  { label: 'Products',   href: '/admin/products' },
  { label: 'Discounts',  href: '/admin/discounts' },
  { label: 'Settings',   href: '/admin/settings' },
  { label: 'Staff',      href: '/admin/staff' },
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

  return (
    <AdminShell staff={staff} nav={NAV}>
      {children}
    </AdminShell>
  );
}
