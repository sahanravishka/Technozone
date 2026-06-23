import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getAdminSupabase } from '@/lib/supabase-clients/admin';

// Constant-time bearer-token check (avoids leaking the secret via response timing).
function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = req.headers.get('authorization') ?? '';
  const want = `Bearer ${secret}`;
  const a = Buffer.from(got);
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  if (!authorized(req))
    return new NextResponse('unauthorized', { status: 401 });
  const admin = getAdminSupabase();
  if (!admin) return new NextResponse('not configured', { status: 503 });
  const { data, error } = await admin.rpc('release_expired_reservations');
  if (error) return new NextResponse(error.message, { status: 500 });
  return NextResponse.json({ released: data });
}
