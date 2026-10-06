/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.alias['@'] = __dirname;
    return config;
  },

  // G.26 — Security headers
  async headers() {
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
        ],
      },
    ];
  },
};

module.exports = nextConfig;
