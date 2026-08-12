import { redirect } from 'next/navigation';
import { getStaff } from '@/lib/admin-auth';
import { getServerSupabase } from '@/lib/supabase-clients/server';
import { AdminShell, type NavItem } from '@/components/admin/AdminNav';

export const dynamic = 'force-dynamic';

// Grouped in the order of a shop day: sell -> manage the shelf -> help
// customers -> people -> shop setup. Plain words so anyone can find things.
const NAV: NavItem[] = [
  { group: 'Selling',   label: 'Home',            href: '/admin' },
  { group: 'Selling',   label: 'Orders',          href: '/admin/orders' },
  { group: 'Selling',   label: 'Invoices',        href: '/admin/invoices' },
  { group: 'Selling',   label: 'Abandoned carts', href: '/admin/abandoned-carts' },
  { group: 'My shop',   label: 'Products',        href: '/admin/products' },
  { group: 'My shop',   label: 'Categories',      href: '/admin/categories' },
  { group: 'My shop',   label: 'Discounts',       href: '/admin/discounts' },
  { group: 'My shop',   label: 'Homepage banners', href: '/admin/banners' },
  { group: 'My shop',   label: 'Stock alerts',    href: '/admin/stock-alerts' },
  { group: 'Customer care', label: 'Repairs',     href: '/admin/repairs' },
  { group: 'Customer care', label: 'Returns',     href: '/admin/returns' },
  { group: 'Customer care', label: 'Warranties',  href: '/admin/warranties' },
  { group: 'Customer care', label: 'Reviews',     href: '/admin/reviews' },
  { group: 'People',    label: 'Customers',       href: '/admin/customers' },
  { group: 'People',    label: 'Staff',           href: '/admin/staff' },
  { group: 'Setup',     label: 'Settings',        href: '/admin/settings' },
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
