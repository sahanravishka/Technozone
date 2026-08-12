import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Locale } from '@/lib/i18n/config';
import { getDict } from '@/lib/i18n/dictionaries';
import { getServerSupabase } from '@/lib/supabase-clients/server';
import { formatLKR } from '@/lib/site';
import { signOut } from './actions';

export const metadata: Metadata = { title: 'My account', robots: { index: false } };
export const dynamic = 'force-dynamic';

const STATUS_TINT: Record<string, string> = {
  pending: 'bg-paper text-muted', paid: 'bg-volt-soft text-volt',
  packed: 'bg-warn-soft text-warn', dispatched: 'bg-[#E8F7EE] text-ok',
  cancelled: 'bg-sale/10 text-sale', refunded: 'bg-sale/10 text-sale'
};

export default async function AccountPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const dict = getDict(locale);
  const supabase = await getServerSupabase();
  if (!supabase) notFound();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/account`);

  const { data: orders } = await supabase.from('orders')
    .select('id, order_number, status, total, created_at, order_items(qty)')
    .order('created_at', { ascending: false }).limit(30);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-12">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{dict.account.title}</h1>
          <p className="mt-0.5 text-[13px] text-muted">{user.email}</p>
        </div>
        <form action={signOut.bind(null, locale)}>
          <button className="pressable h-10 rounded-full bg-card px-4 text-[13px] font-semibold hover:bg-line/60">
            {dict.account.signOut}
          </button>
        </form>
      </div>

      <h2 className="mb-3 text-[15px] font-bold">{dict.account.orders}</h2>
      {!orders?.length ? (
        <div className="rounded-3xl bg-card p-10 text-center text-muted">{dict.account.none}</div>
      ) : (
        <ul className="space-y-2.5">
          {orders.map(o => (
            <li key={o.id}>
              <Link href={`/${locale}/order/${o.id}`}
                className="card-soft flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-bold">{o.order_number}</p>
                  <p className="mt-0.5 text-[12px] text-muted">
                    {new Date(o.created_at).toLocaleDateString('en-GB')} · {o.order_items.reduce((n, i) => n + i.qty, 0)} {dict.order.items.toLowerCase()}
                  </p>
                </div>
                <span className={`rounded-lg px-2.5 py-1 text-[11.5px] font-semibold ${STATUS_TINT[o.status] ?? 'bg-paper'}`}>
                  {dict.status[o.status as keyof typeof dict.status]}
                </span>
                <span className="text-[14px] font-bold">{formatLKR(o.total)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
