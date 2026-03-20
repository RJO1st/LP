/** @type {import('next').NextConfig} */
const { withSentryConfig } = require("@sentry/nextjs");
const nextConfig = {
  turbopack: {
    root: ".",
  },
};

module.exports = nextConfig;
module.exports = withSentryConfig(nextConfig, {
  silent: true,
  disableLogger: true,
});