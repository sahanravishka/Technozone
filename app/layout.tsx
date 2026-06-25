import './globals.css';
import type { ReactNode } from 'react';

const FONTS =
  'https://fonts.googleapis.com/css2?' +
  'family=Manrope:wght@400;500;600;700;800&' +
  'family=Plus+Jakarta+Sans:wght@400;500;600;700&' +
  'family=Noto+Sans+Sinhala:wght@400;500;600;700&' +
  'family=Noto+Sans+Tamil:wght@400;500;600;700&display=swap';

// runs before paint: applies the saved theme so there is no light/dark flash
const THEME_INIT =
  "(function(){try{var t=localStorage.getItem('tz-theme');" +
  "document.documentElement.setAttribute('data-theme', t==='dark'?'dark':'light');}" +
  "catch(e){document.documentElement.setAttribute('data-theme','light');}" +
  "requestAnimationFrame(function(){document.documentElement.classList.add('theme-ready');});})();";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        {/* Preconnect for faster font loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Preload critical font (Manrope) for LCP improvement */}
        <link rel="preload" as="style" href={FONTS} />
        <link rel="stylesheet" href={FONTS} />
        <meta name="theme-color" content="#0B1526" />
        {/* Favicons — explicit declarations for browser + Google search result icon */}
        <link rel="icon" href="/favicon.ico" sizes="48x48" />
        <link rel="icon" href="/icon.png" type="image/png" sizes="512x512" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
        {/* DNS prefetch for external resources */}
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        {/* Viewport meta for better mobile rendering */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        {/* Additional SEO meta tags */}
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body>{children}</body>
    </html>
  );
}
