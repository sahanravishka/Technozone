'use client';

import { useState, useTransition } from 'react';
import { sendTestNotification, type TestNotifyResult } from '@/app/admin/(panel)/settings/actions';

export default function TestNotifications() {
  const [result, setResult] = useState<TestNotifyResult | null>(null);
  const [pending, start] = useTransition();

  function run() {
    setResult(null);
    start(async () => {
      const r = await sendTestNotification();
      setResult(r);
    });
  }

  return (
    <div className="admin-card p-5">
      <p className="mb-3 text-[12.5px] text-muted">
        Sends a dummy new-order alert through the exact same email + Telegram code checkout uses.
        Use this to check your setup without placing a real order.
      </p>
      <button onClick={run} disabled={pending}
        className="pressable h-11 rounded-xl bg-volt px-6 text-[13px] font-semibold text-white hover:bg-volt-deep disabled:opacity-50">
        {pending ? 'Sending…' : 'Send Test Notification'}
      </button>

      {result && (
        <div className="mt-4 space-y-2.5">
          <ResultRow label="📧 Email" r={result.email} />
          <ResultRow label="📨 Telegram" r={result.telegram} />
        </div>
      )}
    </div>
  );
}

function ResultRow({ label, r }: { label: string; r: TestNotifyResult['email'] }) {
  const status = !r.attempted ? 'skip' : r.ok ? 'ok' : 'fail';
  const cls = status === 'ok' ? 'bg-[#E8F7EE] text-ok' : status === 'fail' ? 'bg-sale/10 text-sale' : 'bg-paper text-muted';
  const badge = status === 'ok' ? '✓ Sent' : status === 'fail' ? '✕ Failed' : '— Not configured';
  return (
    <div className={`rounded-xl px-3.5 py-3 text-[12.5px] ${cls}`}>
      <div className="flex items-center justify-between gap-2">
        <b className="text-[13px]">{label}</b>
        <span className="shrink-0 font-bold">{badge}</span>
      </div>
      <p className="mt-1 opacity-80">{r.detail}</p>
    </div>
  );
}
