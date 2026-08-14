import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { locales, defaultLocale } from './lib/i18n/config';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // /admin and /order-form (Facebook lead form) live outside locale routing
  const needsLocale =
    !pathname.startsWith('/admin') &&
    !pathname.startsWith('/order-form') &&
    !locales.some(l => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (needsLocale) {
    const url = req.nextUrl.clone();
    url.pathname = `/${defaultLocale}${pathname === '/' ? '' : pathname}`;
    return NextResponse.redirect(url);
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
