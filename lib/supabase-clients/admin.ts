import 'server-only';
import { createClient } from '@supabase/supabase-js';

/** SERVICE ROLE client — bypasses RLS. Server code only, never imported
 *  by client components ('server-only' enforces this at build time). */
export function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}
