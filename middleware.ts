import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { locales, defaultLocale } from './lib/i18n/config';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // /admin lives outside locale routing
  const needsLocale =
    !pathname.startsWith('/admin') &&
    !locales.some(l => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (needsLocale) {
    const url = req.nextUrl.clone();
    url.pathname = `/${defaultLocale}${pathname === '/' ? '' : pathname}`;
    return NextResponse.redirect(url);
  }

  // Refresh the Supabase session cookie on every request (if configured)
  let res = NextResponse.next({ request: req });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key) {
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
    await supabase.auth.getUser();
  }
  return res;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icon.png|manifest.webmanifest|robots.txt|sitemap.xml|sw.js|.*\\..*).*)']
};
