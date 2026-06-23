'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { getBrowserSupabase } from '@/lib/supabase-clients/browser';
import type { Dict } from '@/lib/i18n/dictionaries';
import type { Locale } from '@/lib/i18n/config';

const inputCls = 'h-12 w-full rounded-btn bg-paper px-3.5 text-[14px] font-medium outline-none focus:ring-2 focus:ring-volt';

export default function AuthForm({ dict, locale }: { dict: Dict; locale: Locale }) {
  const supabase = getBrowserSupabase();
  const router = useRouter();
  const sp = useSearchParams();
  // Only allow same-origin relative paths — blocks open-redirect/phishing via
  // ?next=https://evil.com or ?next=//evil.com (CWE-601).
  const rawNext = sp.get('next') || '';
  const next = /^\/(?![/\\])/.test(rawNext) ? rawNext : `/${locale}/account`;
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  if (!supabase) {
    return <p className="rounded-2xl bg-card p-6 text-center text-[14px] text-muted">{dict.account.notConfigured}</p>;
  }

  const go = async () => {
    setBusy(true); setErr('');
    const fn = mode === 'in'
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password });
    const { error } = await fn;
    setBusy(false);
    if (error) { setErr(error.message); return; }
    router.push(next);
    router.refresh();
  };

  const google = () => supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${location.origin}${next}` }
  });

  return (
    <div className="mx-auto max-w-sm rounded-3xl bg-card p-6 md:p-8">
      <h1 className="text-xl font-bold">{mode === 'in' ? dict.account.signIn : dict.account.signUp}</h1>
      <div className="mt-5 space-y-3">
        <input className={inputCls} type="email" placeholder={dict.account.email}
          value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
        <input className={inputCls} type="password" placeholder={dict.account.password}
          value={password} onChange={e => setPassword(e.target.value)}
          autoComplete={mode === 'in' ? 'current-password' : 'new-password'} />
      </div>
      {err && <p className="mt-3 rounded-xl bg-sale/10 p-3 text-[12.5px] font-medium text-sale">{err}</p>}
      <button onClick={go} disabled={busy || !email || !password}
        className="pressable mt-4 flex h-12 w-full items-center justify-center rounded-btn bg-volt font-semibold text-white hover:bg-volt-deep disabled:bg-line disabled:text-muted">
        {mode === 'in' ? dict.account.signIn : dict.account.signUp}
      </button>
      <button onClick={google}
        className="pressable mt-2.5 flex h-12 w-full items-center justify-center gap-2 rounded-btn bg-paper font-semibold hover:bg-line/60">
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden>
          <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.2 3.5-8.8Z"/>
          <path fill="#34A853" d="M12 24c3.2 0 6-1 7.9-2.9l-3.9-3a7.2 7.2 0 0 1-10.8-3.8H1.3v3A12 12 0 0 0 12 24Z"/>
          <path fill="#FBBC05" d="M5.2 14.3a7.2 7.2 0 0 1 0-4.6v-3H1.3a12 12 0 0 0 0 10.7l3.9-3.1Z"/>
          <path fill="#EA4335" d="M12 4.7c1.8 0 3.3.6 4.6 1.8L20 3A12 12 0 0 0 1.3 6.6l3.9 3.1A7.2 7.2 0 0 1 12 4.7Z"/>
        </svg>
        {dict.account.google}
      </button>
      <button onClick={() => setMode(m => m === 'in' ? 'up' : 'in')}
        className="mt-4 w-full text-center text-[13px] font-semibold text-volt hover:underline">
        {mode === 'in' ? dict.account.toSignup : dict.account.toSignin}
      </button>
    </div>
  );
}
