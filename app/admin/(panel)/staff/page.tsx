import { getServerSupabase } from '@/lib/supabase-clients/server';
import { getStaff } from '@/lib/admin-auth';
import { addStaff, toggleStaff } from '@/app/admin/actions';
import PageHeader from '@/components/admin/PageHeader';

export const dynamic = 'force-dynamic';

const input = 'h-11 rounded-xl bg-paper px-3.5 text-[13px] font-medium outline-none focus:ring-2 focus:ring-volt';
const label = 'mb-1 block text-[12px] font-semibold text-[#3D4A60]';

export default async function AdminStaff() {
  const me = await getStaff();
  const supabase = (await getServerSupabase())!;
  const { data: staff } = await supabase.from('staff')
    .select('user_id, full_name, is_active, created_at, roles(name)')
    .order('created_at');
  const isOwner = me?.role === 'owner';

  return (
    <div className="max-w-2xl">
      <PageHeader title="Staff" subtitle="Team accounts and roles" />
      {isOwner ? (
        <form action={addStaff} className="admin-card mb-4 grid items-end gap-2.5 p-4 sm:grid-cols-[1fr_1fr_130px_auto]">
          <div><span className={label}>Email (must have an account)</span>
            <input name="email" type="email" className={`${input} w-full`} required /></div>
          <div><span className={label}>Name</span><input name="full_name" className={`${input} w-full`} /></div>
          <div><span className={label}>Role</span>
            <select name="role" className={`${input} w-full`}>
              <option value="packer">Packer</option>
              <option value="manager">Manager</option>
              <option value="owner">Owner</option>
            </select></div>
          <button className="pressable h-11 rounded-btn bg-volt px-5 text-[13px] font-semibold text-white hover:bg-volt-deep">Add</button>
        </form>
      ) : (
        <p className="admin-card mb-4 p-4 text-[13px] text-muted">Only the owner can manage staff.</p>
      )}
      <div className="admin-card overflow-hidden">
        {(staff ?? []).map((s, i) => (
          <div key={s.user_id} className={`flex items-center gap-3 px-4 py-3.5 text-[13px] ${i ? 'border-t border-line/70' : ''}`}>
            <b>{s.full_name}</b>
            <span className="rounded-lg bg-paper px-2 py-0.5 text-[11px] font-semibold capitalize text-muted">
              {(s.roles as unknown as { name: string } | null)?.name}
            </span>
            {isOwner && s.user_id !== me?.user_id && (
              <form action={toggleStaff.bind(null, s.user_id, !s.is_active)} className="ml-auto">
                <button className={`pressable rounded-lg px-3 py-1.5 text-[11.5px] font-semibold ${s.is_active ? 'bg-[#E8F7EE] text-ok' : 'bg-paper text-muted'}`}>
                  {s.is_active ? 'Active' : 'Disabled'}
                </button>
              </form>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
