// ─── Deploy to: src/instrumentation.js ───────────────────────────────────────
// Next.js 14+ instrumentation hook — loads Sentry on server startup
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}
