'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getBrowserSupabase } from '@/lib/supabase-clients/browser';
import { SITE } from '@/lib/site';

export default function AdminLogin() {
  const supabase = getBrowserSupabase();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const go = async () => {
    if (!supabase) { setErr('Supabase not configured'); return; }
    setBusy(true); setErr('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    router.push('/admin');
    router.refresh();
  };

  return (
    <div className="grid min-h-screen place-items-center bg-ink p-4">
      <div className="w-full max-w-sm rounded-3xl bg-card p-7">
        <p className="text-[13px] font-bold tracking-[0.04em]">
          {SITE.wordmark[0]} <span className="text-accent">{SITE.wordmark[1]}</span>
        </p>
        <h1 className="mt-1 text-xl font-bold">Staff sign in</h1>
        <div className="mt-5 space-y-3">
          <input className="h-12 w-full rounded-btn bg-paper px-3.5 text-[14px] font-medium outline-none focus:ring-2 focus:ring-volt"
            type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <input className="h-12 w-full rounded-btn bg-paper px-3.5 text-[14px] font-medium outline-none focus:ring-2 focus:ring-volt"
            type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && go()} />
        </div>
        {err && <p className="mt-3 rounded-xl bg-sale/10 p-3 text-[12.5px] font-medium text-sale">{err}</p>}
        <button onClick={go} disabled={busy || !email || !password}
          className="pressable mt-4 flex h-12 w-full items-center justify-center rounded-btn bg-volt font-semibold text-white hover:bg-volt-deep disabled:bg-line disabled:text-muted">
          Sign in
        </button>
      </div>
    </div>
  );
}
