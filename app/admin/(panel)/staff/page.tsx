import { getServerSupabase } from '@/lib/supabase-clients/server';
import { getAdminSupabase } from '@/lib/supabase-clients/admin';
import { getStaff } from '@/lib/admin-auth';
import { createStaffAccount } from '@/app/admin/actions';
import PageHeader from '@/components/admin/PageHeader';
import { StaffCard } from '@/components/admin/StaffCard';

export const dynamic = 'force-dynamic';

const inp = 'h-11 w-full rounded-xl bg-paper px-3.5 text-[13px] font-medium outline-none focus:ring-2 focus:ring-volt border border-transparent focus:border-line';
const lbl = 'mb-1.5 block text-[11.5px] font-bold uppercase tracking-[0.05em] text-muted';

const ROLE_DESCRIPTIONS: Record<string, string> = {
  owner:   'Full access — manage staff, settings, and all data.',
  manager: 'Manage orders, products, customers, and reviews.',
  packer:  'Pack orders and scan serials only.',
};

export default async function AdminStaff() {
  const me      = await getStaff();
  const supabase = (await getServerSupabase())!;
  const admin   = getAdminSupabase()!;
  const isOwner = me?.role === 'owner';

  const [{ data: staffRows }, authResult] = await Promise.all([
    supabase
      .from('staff')
      .select('user_id, full_name, is_active, created_at, roles(name)')
      .order('created_at'),
    isOwner
      ? admin.auth.admin.listUsers({ perPage: 1000 })
      : Promise.resolve({ data: { users: [] } }),
  ]);

  const emailMap = new Map(
    (authResult.data?.users ?? []).map(u => [u.id, u.email ?? ''])
  );

  const members = (staffRows ?? []).map(s => ({
    user_id:   s.user_id,
    full_name: s.full_name,
    is_active: s.is_active,
    role:      (s.roles as unknown as { name: string } | null)?.name ?? 'packer',
    email:     emailMap.get(s.user_id),
  }));

  // Summary counts
  const active   = members.filter(m => m.is_active).length;
  const disabled = members.length - active;

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Staff & Accounts" subtitle="Manage team members and their access" />

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-[#E8F7EE] px-3 py-1 text-[12px] font-semibold text-ok">
          {active} active
        </span>
        {disabled > 0 && (
          <span className="rounded-full bg-paper px-3 py-1 text-[12px] font-semibold text-muted">
            {disabled} disabled
          </span>
        )}
      </div>

      {/* ── Create new account (owner only) ── */}
      {isOwner ? (
        <div className="admin-card overflow-hidden">
          <div className="border-b border-line bg-paper/60 px-5 py-4">
            <h3 className="text-[13.5px] font-bold">Add team member</h3>
            <p className="mt-0.5 text-[12px] text-muted">Creates a new login account and staff record in one step.</p>
          </div>
          <form action={createStaffAccount} className="p-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={lbl}>Email</label>
                <input name="email" type="email" required placeholder="staff@example.com" className={inp} />
              </div>
              <div>
                <label className={lbl}>Full name</label>
                <input name="full_name" type="text" required placeholder="Jane Doe" className={inp} />
              </div>
              <div>
                <label className={lbl}>Role</label>
                <select name="role" className={inp}>
                  <option value="packer">Packer</option>
                  <option value="manager">Manager</option>
                  <option value="owner">Owner</option>
                </select>
              </div>
              <div>
                <label className={lbl}>Password</label>
                <input name="password" type="password" required minLength={6} placeholder="Min. 6 characters" className={inp} />
              </div>
            </div>

            {/* Role descriptions */}
            <div className="grid gap-1.5 sm:grid-cols-3">
              {Object.entries(ROLE_DESCRIPTIONS).map(([role, desc]) => (
                <div key={role} className="rounded-xl bg-paper px-3 py-2.5">
                  <span className="block text-[11.5px] font-bold capitalize">{role}</span>
                  <span className="mt-0.5 block text-[11px] leading-[1.5] text-muted">{desc}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-end border-t border-line pt-4">
              <button className="pressable h-10 rounded-xl bg-volt px-6 text-[13px] font-semibold text-white hover:bg-volt-deep">
                Create account
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="admin-card flex items-center gap-3 p-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-paper text-muted">
            <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </span>
          <p className="text-[13px] text-muted">Only owners can create or modify staff accounts.</p>
        </div>
      )}

      {/* ── Staff list ── */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[12px] font-bold uppercase tracking-[0.06em] text-muted">
            Team ({members.length})
          </h3>
        </div>

        {members.length ? (
          <div className="space-y-2.5">
            {members.map(m => (
              <StaffCard
                key={m.user_id}
                member={m}
                isMe={m.user_id === me?.user_id}
                isOwner={isOwner ?? false}
              />
            ))}
          </div>
        ) : (
          <div className="admin-card p-8 text-center text-[13px] text-muted">
            No staff members yet.
          </div>
        )}
      </div>
    </div>
  );
}
