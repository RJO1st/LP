/** @type {import('next').NextConfig} */
const { withSentryConfig } = require("@sentry/nextjs");

const nextConfig = {
  turbopack: {
    root: ".",
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // NOTE: Content-Security-Policy is set per-request by src/proxy.ts so it
          // can include a fresh nonce and reference 'strict-dynamic'. Keeping a
          // static CSP header here would cause the browser to AND the two
          // policies (intersection), silently blocking our own nonce'd scripts.
          // See tasks/lessons.md — "CSP Two-Stage Nonce Rollout".
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
module.exports = withSentryConfig(nextConfig, {
  silent: true,
  disableLogger: true,
});