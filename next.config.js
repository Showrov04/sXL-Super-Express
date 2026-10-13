/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.alias['@'] = __dirname;
    return config;
  },

  // G.26 — Security headers
  async headers() {
    // Soft Content-Security-Policy:
    //  - Blocks the dangerous stuff (iframe embedding, form hijacking,
    //    <base> tag hijacking, Flash/object embedding)
    //  - Allows what Next.js + inline React styles need to function
    //  - Broad `img-src https:` and `connect-src *.supabase.co` so
    //    nothing breaks for uploads / tracking QR / etc.
    const CSP_POLICY = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://vercel.live",
      "frame-src 'self' https://vercel.live",
      "frame-ancestors 'self'",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
      "upgrade-insecure-requests",
    ].join('; ');

    return [
      {
        source: '/:path*',
        headers: [
          // Clickjacking protection — prevents your site being embedded in an iframe
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // MIME sniffing protection
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Referrer policy — controls what info is sent to other sites
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Restrict browser features
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
          // Force HTTPS for 2 years (includes subdomains)
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          // Enable DNS prefetching for performance
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          // Content Security Policy — soft policy (see comment above)
          { key: 'Content-Security-Policy', value: CSP_POLICY },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
