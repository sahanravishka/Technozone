import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

/** Cookie-session client: queries run AS the signed-in user, so RLS applies. */
export async function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const store = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (toSet) => {
        try { toSet.forEach(({ name, value, options }) => store.set(name, value, options)); }
        catch { /* called from a Server Component — middleware refreshes instead */ }
      }
    }
  });
}
