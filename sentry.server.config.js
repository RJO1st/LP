// ─── Deploy to: sentry.server.config.js (project root) ──────────────────────
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://28d07e017a606c34355c5dfc8674120b@o4511077208293376.ingest.de.sentry.io/4511077210718288",
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
  enabled: process.env.NODE_ENV === "production",
  environment: process.env.NODE_ENV,
});
