import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { locales, defaultLocale } from './lib/i18n/config';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Consolidate to the apex domain. Without this, www.technozonelanka.com
  // served the entire site independently (its own self-referencing
  // canonical, its own hreflang) — full duplicate content, and the direct
  // cause of the hreflang conflict/mismatch errors: hreflang tags always
  // point at the apex domain, so pages actually served on www looked
  // inconsistent with their own alternates to every crawler.
  const host = req.headers.get('host') || '';
  if (host.startsWith('www.')) {
    const url = req.nextUrl.clone();
    url.host = host.slice(4);
    return NextResponse.redirect(url, 308);
  }

  // /admin and /order-form (Facebook lead form) live outside locale routing
  const needsLocale =
    !pathname.startsWith('/admin') &&
    !pathname.startsWith('/order-form') &&
    !locales.some(l => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (needsLocale) {
    const url = req.nextUrl.clone();
    url.pathname = `/${defaultLocale}${pathname === '/' ? '' : pathname}`;
    // 308 (permanent) rather than the default 307 — this redirect is always
    // the same for a given path (no content negotiation happening), so a
    // temporary redirect just confuses crawlers and dilutes link equity.
    return NextResponse.redirect(url, 308);
  }

  // Keep the Supabase session cookie fresh — but only when there's actually a
  // logged-in session to refresh. Anonymous storefront traffic (the vast
  // majority) skips the auth call entirely, and we use getSession() (refreshes
  // tokens only when expired) instead of getUser() (a network round-trip on
  // every request). Real authorization is still validated downstream with
  // getUser() in the admin layout / server actions, so this stays secure.
  let res = NextResponse.next({ request: req });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const hasAuthCookie = req.cookies.getAll().some(c => /^sb-.*-auth-token/.test(c.name));
  if (url && key && hasAuthCookie) {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          toSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        }
      }
    });
    await supabase.auth.getSession();
  }
  return res;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icon.png|manifest.webmanifest|robots.txt|sitemap.xml|sw.js|.*\\..*).*)']
};
