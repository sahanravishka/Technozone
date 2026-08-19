import './globals.css';
import type { ReactNode } from 'react';
import { Manrope, Plus_Jakarta_Sans, Noto_Sans_Sinhala, Noto_Sans_Tamil } from 'next/font/google';

// Self-hosted at build time by Next.js — no external request to
// fonts.googleapis.com/fonts.gstatic.com, no render-blocking stylesheet,
// and font-display: swap is applied automatically. This alone was the
// single biggest render-blocking cost on the site (~750ms).
const manrope = Manrope({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-manrope', display: 'swap' });
const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-plus-jakarta', display: 'swap' });
const notoSinhala = Noto_Sans_Sinhala({ subsets: ['sinhala'], weight: ['400', '500', '600', '700'], variable: '--font-noto-sinhala', display: 'swap' });
const notoTamil = Noto_Sans_Tamil({ subsets: ['tamil'], weight: ['400', '500', '600', '700'], variable: '--font-noto-tamil', display: 'swap' });
const fontVars = `${manrope.variable} ${plusJakarta.variable} ${notoSinhala.variable} ${notoTamil.variable}`;

// runs before paint: applies the saved theme so there is no light/dark flash
const THEME_INIT =
  "(function(){try{var t=localStorage.getItem('tz-theme');" +
  "document.documentElement.setAttribute('data-theme', t==='dark'?'dark':'light');}" +
  "catch(e){document.documentElement.setAttribute('data-theme','light');}" +
  "requestAnimationFrame(function(){document.documentElement.classList.add('theme-ready');});})();";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning className={fontVars}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        <meta name="theme-color" content="#0B1526" />
        {/* Favicons — explicit declarations for browser + Google search result icon */}
        <link rel="icon" href="/favicon.ico" sizes="48x48" />
        <link rel="icon" href="/icon.png" type="image/png" sizes="512x512" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
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
