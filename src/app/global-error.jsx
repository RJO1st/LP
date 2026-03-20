// ─── Deploy to: src/app/global-error.jsx ─────────────────────────────────────
// Catches unhandled errors in the root layout and reports to Sentry
"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{
          minHeight: "100vh", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", fontFamily: "system-ui",
          padding: 32, textAlign: "center", background: "#0f0e1a", color: "white",
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🚀</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>
            Houston, we have a problem
          </h1>
          <p style={{ fontSize: 14, color: "#94a3b8", marginBottom: 24, maxWidth: 400 }}>
            Something unexpected happened. Our mission control has been notified
            and is working on a fix.
          </p>
          <button
            onClick={reset}
            style={{
              padding: "12px 32px", borderRadius: 12, border: "none",
              background: "linear-gradient(135deg, #6366f1, #7c3aed)",
              color: "white", fontWeight: 700, fontSize: 14, cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
