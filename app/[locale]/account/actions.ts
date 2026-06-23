'use server';
import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase-clients/server';

export async function signOut(locale: string) {
  const supabase = await getServerSupabase();
  await supabase?.auth.signOut();
  redirect(`/${locale}`);
}
