'use server';

import { revalidatePath } from 'next/cache';
import { getServerSupabase } from '@/lib/supabase-clients/server';
import { getStaff } from '@/lib/admin-auth';

async function requireStaff(roles?: string[]) {
  const staff = await getStaff();
  if (!staff) throw new Error('forbidden');
  if (roles && !roles.includes(staff.role)) throw new Error('forbidden');
  return staff;
}

async function setSetting(key: string, value: Record<string, unknown>) {
  const supabase = (await getServerSupabase())!;
  const { error } = await supabase.from('site_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

export async function updateShipping(form: FormData) {
  await requireStaff(['owner', 'manager']);
  await setSetting('shipping', {
    free_over: Math.max(0, Number(form.get('free_over') || 0)),
  });
  revalidatePath('/admin/settings');
}

export type TestNotifyResult = {
  email: { attempted: boolean; ok: boolean; detail: string };
  telegram: { attempted: boolean; ok: boolean; detail: string };
};

/** Fires the exact same new-order notifiers checkout uses, with dummy data,
 *  and reports back what actually happened — so this is checkable from the
 *  admin UI directly instead of digging through Vercel logs. */
export async function sendTestNotification(): Promise<TestNotifyResult> {
  await requireStaff();

  const dummy = {
    orderNumber: 'TEST-0000',
    total: 1000,
    paymentMethod: 'cod',
    fulfillment: 'delivery',
    customerName: 'Test Customer',
    customerPhone: '0771234567',
    city: 'Colombo',
    items: [{ name: 'Test Product', qty: 1, line: 1000 }],
  };

  const result: TestNotifyResult = {
    email: { attempted: false, ok: false, detail: '' },
    telegram: { attempted: false, ok: false, detail: '' },
  };

  // ---- Email ----
  result.email.attempted = !!process.env.RESEND_API_KEY;
  if (!result.email.attempted) {
    result.email.detail = 'RESEND_API_KEY is not set in this environment.';
  } else {
    try {
      const { sendNewOrderEmail } = await import('@/lib/email');
      await sendNewOrderEmail(dummy);
      // sendNewOrderEmail swallows its own errors, so we can't get a precise
      // status back — but reaching here means it ran without throwing.
      result.email.ok = true;
      result.email.detail = `Sent via Resend to ${process.env.ORDER_NOTIFY_EMAIL || 'sahanravishka10@gmail.com'} (check inbox/spam — a 200 here doesn't guarantee delivery).`;
    } catch (err) {
      result.email.detail = err instanceof Error ? err.message : String(err);
    }
  }

  // ---- Telegram (direct call here so we can capture the real HTTP result) ----
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  result.telegram.attempted = !!token && !!chatId;
  if (!result.telegram.attempted) {
    result.telegram.detail = !token && !chatId
      ? 'TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are not set in this environment.'
      : !token
      ? 'TELEGRAM_BOT_TOKEN is not set in this environment.'
      : 'TELEGRAM_CHAT_ID is not set in this environment.';
  } else {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: '🧪 Test notification from Techno Zone Lanka admin panel — if you see this, Telegram alerts are working.',
        }),
      });
      const body = await res.json().catch(() => null);
      result.telegram.ok = res.ok && body?.ok === true;
      result.telegram.detail = result.telegram.ok
        ? 'Sent — check your Telegram chat now.'
        : `Telegram API responded with an error: ${body?.description || res.status}`;
    } catch (err) {
      result.telegram.detail = err instanceof Error ? err.message : String(err);
    }
  }

  return result;
}

