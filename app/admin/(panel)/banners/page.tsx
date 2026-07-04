import { getServerSupabase } from '@/lib/supabase-clients/server';
import { upsertBanner } from './actions';
import PageHeader from '@/components/admin/PageHeader';
import BannerRow from '@/components/admin/BannerRow';

export const dynamic = 'force-dynamic';

const inp = 'h-11 w-full rounded-xl bg-paper px-3.5 text-[13px] font-medium outline-none focus:ring-2 focus:ring-volt';
const lbl = 'mb-1.5 block text-[11.5px] font-bold uppercase tracking-[0.05em] text-muted';

export default async function AdminBanners() {
  const supabase = (await getServerSupabase())!;
  const { data: banners } = await supabase.from('homepage_banners')
    .select('id, title, subtitle, badge_text, link_url, image_path, is_active')
    .order('sort_order');
  const rows = banners ?? [];

  return (
    <div className="max-w-3xl">
      <PageHeader title="Homepage banners" subtitle="Promo cards shown on the storefront homepage" />

      <div className="admin-card mb-6 overflow-hidden">
        <form action={upsertBanner} className="p-5">
          <p className="mb-4 text-[12.5px] text-muted">Add a promo banner. Leave it hidden to prepare it ahead of time.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={lbl} htmlFor="ban-title">Title</label>
              <input id="ban-title" name="title" required placeholder="e.g. Avurudu Sale" className={inp} />
            </div>
            <div>
              <label className={lbl} htmlFor="ban-badge">Badge (small tag, optional)</label>
              <input id="ban-badge" name="badge_text" placeholder="e.g. Limited time" className={inp} />
            </div>
            <div className="sm:col-span-2">
              <label className={lbl} htmlFor="ban-subtitle">Subtitle</label>
              <input id="ban-subtitle" name="subtitle" placeholder="e.g. Up to 20% off selected phones" className={inp} />
            </div>
            <div>
              <label className={lbl} htmlFor="ban-link">Link URL (optional)</label>
              <input id="ban-link" name="link_url" placeholder="/en/category/smartphones" className={inp} />
            </div>
            <div>
              <label className={lbl} htmlFor="ban-image">Image</label>
              <input id="ban-image" name="image" type="file" accept="image/*" className={`${inp} pt-2`} />
            </div>
          </div>
          <label className="mt-3 flex items-center gap-2 text-[12.5px] font-medium">
            <input type="checkbox" name="is_active" defaultChecked className="h-4 w-4 rounded accent-volt" />
            Visible on the homepage
          </label>
          <div className="mt-4 flex justify-end">
            <button className="pressable h-10 rounded-xl bg-volt px-6 text-[13px] font-semibold text-white hover:bg-volt-deep">
              + Add banner
            </button>
          </div>
        </form>
      </div>

      <div className="admin-card overflow-hidden">
        {rows.length ? rows.map((b, i) => (
          <BannerRow key={b.id} banner={b} isFirst={i === 0} isLast={i === rows.length - 1} />
        )) : (
          <p className="p-8 text-center text-[13px] text-muted">No banners yet — the homepage shows its default promos until you add one.</p>
        )}
      </div>
    </div>
  );
}
