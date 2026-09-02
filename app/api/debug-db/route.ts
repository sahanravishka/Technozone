import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-clients/admin';

export async function GET() {
  const admin = getAdminSupabase();
  if (!admin) return new NextResponse('no db');
  const { data } = await admin.from('payment_events').select('*').order('created_at', { ascending: false }).limit(5);
  return NextResponse.json(data);
}
