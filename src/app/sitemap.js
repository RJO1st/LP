/**
 * Dynamic Sitemap — LaunchPard
 * Next.js App Router generates /sitemap.xml from this file at build time.
 * Keep in sync with actual route structure.
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://launchpard.com';

export default function sitemap() {
  const now = new Date().toISOString();

  // ─── Marketing / Public pages ─────────────────────────────────────────────
  const marketingPages = [
    { url: '/', priority: 1.0, changeFrequency: 'weekly' },
    { url: '/login', priority: 0.6, changeFrequency: 'monthly' },
    { url: '/signup', priority: 0.9, changeFrequency: 'monthly' },
    { url: '/subscribe', priority: 0.8, changeFrequency: 'monthly' },
    { url: '/parent/claim', priority: 0.7, changeFrequency: 'monthly' },
  ];

  // ─── Legal / Policy pages ─────────────────────────────────────────────────
  const legalPages = [
    { url: '/privacy-policy', priority: 0.4, changeFrequency: 'yearly' },
    { url: '/terms', priority: 0.4, changeFrequency: 'yearly' },
    { url: '/cookie-policy', priority: 0.3, changeFrequency: 'yearly' },
    { url: '/safeguarding', priority: 0.4, changeFrequency: 'yearly' },
  ];

  // ─── Blog (if it exists) ──────────────────────────────────────────────────
  const blogPages = [
    { url: '/blog', priority: 0.7, changeFrequency: 'weekly' },
  ];

  const allPages = [...marketingPages, ...legalPages, ...blogPages];

  return allPages.map(({ url, priority, changeFrequency }) => ({
    url: `${BASE_URL}${url}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}
