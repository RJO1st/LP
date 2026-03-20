// ─── Deploy to: sentry.client.config.js (project root) ──────────────────────
// Client-side Sentry initialization
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://28d07e017a606c34355c5dfc8674120b@o4511077208293376.ingest.de.sentry.io/4511077210718288",
  
  // Performance: sample 20% of transactions in production, 100% in dev
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

  // Session replay: capture 10% of sessions, 100% of error sessions
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Only send errors in production
  enabled: process.env.NODE_ENV === "production",

  // Filter noisy errors
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    "Non-Error promise rejection captured",
    "Load failed",
    "Failed to fetch",
    "AbortError",
  ],

  // Tag all events with environment
  environment: process.env.NODE_ENV,

  // Integrations
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,      // GDPR: mask all text in replays (children's data)
      blockAllMedia: true,    // Don't capture images/videos
    }),
  ],
});
