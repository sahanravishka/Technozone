'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toggleStaff, deleteStaff, resetStaffPassword } from '@/app/admin/actions';

export interface StaffMember {
  user_id: string;
  full_name: string;
  is_active: boolean;
  role: string;
  email?: string;
}

const ROLE_BADGE: Record<string, string> = {
  owner:   'bg-[#FEF3C7] text-[#92400E]',
  manager: 'bg-volt-soft text-volt',
  packer:  'bg-paper text-muted',
};

export function StaffCard({
  member, isMe, isOwner,
}: {
  member: StaffMember;
  isMe: boolean;
  isOwner: boolean;
}) {
  const [showReset, setShowReset]         = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy]                   = useState(false);
  const [err, setErr]                     = useState('');
  const router = useRouter();

  const initials = member.full_name.split(/\s+/).map(s => s[0]).slice(0, 2).join('').toUpperCase() || '?';

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setBusy(true); setErr('');
    try {
      await deleteStaff(member.user_id);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Delete failed');
      setBusy(false); setConfirmDelete(false);
    }
  };

  return (
    <div className="admin-card p-4 transition-shadow hover:shadow-md">
      <div className="flex flex-wrap items-start gap-3">

        {/* Avatar with status dot */}
        <div className="relative shrink-0">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-volt to-accent text-[13px] font-bold text-white select-none">
            {initials}
          </span>
          <span
            title={member.is_active ? 'Active' : 'Disabled'}
            className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${member.is_active ? 'bg-ok' : 'bg-[#D1D5DB]'}`}
          />
        </div>

        {/* Name / email */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-[13.5px]">{member.full_name}</span>
            {isMe && <span className="text-[11px] text-muted">(you)</span>}
            <span className={`rounded-lg px-2 py-0.5 text-[11px] font-semibold capitalize ${ROLE_BADGE[member.role] ?? 'bg-paper text-muted'}`}>
              {member.role}
            </span>
            <span className={`text-[11px] font-medium ${member.is_active ? 'text-ok' : 'text-muted'}`}>
              {member.is_active ? '● Active' : '○ Disabled'}
            </span>
          </div>
          {member.email && (
            <p className="mt-0.5 text-[12px] text-muted truncate">{member.email}</p>
          )}
        </div>

        {/* Action buttons — owner only, not self */}
        {isOwner && !isMe && (
          <div className="flex flex-wrap items-center gap-1.5 ml-auto">
            {/* Toggle active */}
            <form action={toggleStaff.bind(null, member.user_id, !member.is_active)}>
              <button className={`pressable rounded-lg px-3 py-1.5 text-[11.5px] font-semibold transition-colors ${member.is_active ? 'bg-[#E8F7EE] text-ok hover:bg-[#d5f0e2]' : 'bg-paper text-muted hover:bg-line'}`}>
                {member.is_active ? 'Active' : 'Disabled'}
              </button>
            </form>

            {/* Reset password toggle */}
            <button
              onClick={() => { setShowReset(r => !r); setConfirmDelete(false); setErr(''); }}
              className={`pressable rounded-lg px-3 py-1.5 text-[11.5px] font-semibold transition-colors ${showReset ? 'bg-volt text-white' : 'bg-paper text-muted hover:bg-line'}`}
            >
              Reset PW
            </button>

            {/* Delete */}
            <button
              onClick={handleDelete}
              disabled={busy}
              onBlur={() => !busy && setConfirmDelete(false)}
              className={`pressable rounded-lg px-3 py-1.5 text-[11.5px] font-semibold transition-colors disabled:opacity-40 ${confirmDelete ? 'bg-[#FEE2E2] text-sale' : 'bg-paper text-muted hover:bg-line'}`}
            >
              {busy ? '…' : confirmDelete ? 'Confirm?' : 'Delete'}
            </button>
          </div>
        )}
      </div>

      {/* Inline reset password form */}
      {showReset && (
        <form
          action={resetStaffPassword}
          onSubmit={() => setShowReset(false)}
          className="mt-3 flex items-center gap-2 border-t border-line pt-3"
        >
          <input type="hidden" name="user_id" value={member.user_id} />
          <input
            name="new_password"
            type="password"
            placeholder="New password (min 6 chars)"
            minLength={6}
            required
            autoFocus
            className="h-9 flex-1 min-w-0 rounded-xl bg-paper px-3 text-[13px] font-medium outline-none focus:ring-2 focus:ring-volt"
          />
          <button className="pressable h-9 rounded-xl bg-volt px-4 text-[12.5px] font-semibold text-white hover:bg-volt-deep shrink-0">
            Set password
          </button>
          <button type="button" onClick={() => setShowReset(false)} className="h-9 px-2 text-[12.5px] text-muted hover:text-ink shrink-0">
            Cancel
          </button>
        </form>
      )}

      {/* Error message */}
      {err && <p className="mt-2 rounded-lg bg-[#FEE2E2] px-3 py-2 text-[12px] font-medium text-sale">{err}</p>}
    </div>
  );
}
