// Allow POS-served product images (host comes from the POS image URL env).
const posImageHost = (() => {
  try {
    const raw = process.env.NEXT_PUBLIC_POS_IMAGE_URL || process.env.NEXT_PUBLIC_POS_API_URL;
    return raw ? new URL(raw).hostname : null;
  } catch { return null; }
})();

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },     // product images bucket
      { protocol: 'https', hostname: 'images.unsplash.com' }, // demo data only
      { protocol: 'https', hostname: 'technozonelankai.lk' }, // POS product images (default host)
      ...(posImageHost ? [{ protocol: 'https', hostname: posImageHost }, { protocol: 'http', hostname: posImageHost }] : []),
    ],
    formats: ['image/avif', 'image/webp'],
    // Optimize image sizes for common breakpoints
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    // Minimize image transformation time
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },
  // Compress output for faster loading
  compress: true,
  // Enable React strict mode for better optimization
  reactStrictMode: true,
  async headers() {
    // CSP only in production — dev (HMR/eval, websockets) would otherwise break.
    // 'unsafe-inline' is required for Next's inline bootstrap + JSON-LD/theme
    // scripts; the rest of the policy still blocks framing, plugins, base-tag
    // hijacking and off-site form posts (PayHere is explicitly allowed).
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https:",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://*.payhere.lk https://payhere.lk https://*.paykoko.com https://paykoko.com",
      'upgrade-insecure-requests'
    ].join('; ');

    const securityHeaders = [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      // camera=(self) lets the admin IMEI/barcode scanner use the camera
      // (browser still prompts the user); mic + geolocation stay blocked.
      { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      ...(process.env.NODE_ENV === 'production'
        ? [{ key: 'Content-Security-Policy', value: csp }]
        : [])
    ];

    return [{
      source: '/(.*)',
      headers: securityHeaders
    },
    // Cache static assets aggressively
    {
      source: '/icon.png',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }
      ]
    },
    {
      source: '/sw.js',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }
      ]
    }];
  }
};
export default nextConfig;
