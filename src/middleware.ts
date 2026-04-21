// middleware.ts — re-exports proxy as the Next.js middleware entry point.
// Next.js only auto-discovers files named middleware.ts/.js (in root or src/).
// proxy.ts contains the full implementation: rate limiting, CSRF, geo cookie,
// auth guard, and trial enforcement.
export { proxy as default, config } from './proxy';
