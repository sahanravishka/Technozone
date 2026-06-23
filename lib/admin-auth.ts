import 'server-only';
import { getServerSupabase } from './supabase-clients/server';

export type Staff = { user_id: string; full_name: string; role: string };

/** Server-side staff check. Returns null unless the signed-in user has an
 *  active staff row (RLS lets staff read their own record). */
export async function getStaff(): Promise<Staff | null> {
  const supabase = await getServerSupabase();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('staff')
    .select('user_id, full_name, is_active, roles(name)')
    .eq('user_id', user.id).maybeSingle();
  if (!data?.is_active) return null;
  const role = (data.roles as unknown as { name: string } | null)?.name ?? '';
  return { user_id: data.user_id, full_name: data.full_name, role };
}
