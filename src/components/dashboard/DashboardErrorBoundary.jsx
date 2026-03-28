"use client";
/**
 * DashboardErrorBoundary.jsx — Graceful error boundary for dashboard sections
 * Two components:
 *   1. DashboardErrorBoundary — React class error boundary wrapping entire dashboards
 *   2. SectionErrorFallback — Inline fallback for individual sections that fail
 */

import React from "react";

// ── Band-aware styling ─────────────────────────────────────────────────────
const BAND_COLORS = {
  ks1: { accent: "#f59e0b", bg: "#fffbeb", border: "rgba(245,158,11,0.2)", text: "#92400e", radius: 28 },
  ks2: { accent: "#6366f1", bg: "#eef2ff", border: "rgba(99,102,241,0.2)", text: "#3730a3", radius: 16 },
  ks3: { accent: "#0ea5e9", bg: "#f0f9ff", border: "rgba(14,165,233,0.2)", text: "#0c4a6e", radius: 12 },
  ks4: { accent: "#7c3aed", bg: "#f5f3ff", border: "rgba(124,58,237,0.2)", text: "#4c1d95", radius: 12 },
};

// ── Section-level error fallback ───────────────────────────────────────────
export function SectionErrorFallback({ band = "ks3", title = "This section", onRetry }) {
  const c = BAND_COLORS[band] || BAND_COLORS.ks3;
  return (
    <div
      className="flex flex-col items-center justify-center py-8 px-6 text-center"
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: c.radius,
      }}
      role="alert"
    >
      <span
        className="material-symbols-outlined mb-3"
        style={{ fontSize: 32, color: c.accent, opacity: 0.6 }}
      >
        cloud_off
      </span>
      <p className="text-sm font-semibold mb-1" style={{ color: c.text }}>
        {title} couldn't load
      </p>
      <p className="text-xs mb-4" style={{ color: `${c.text}99` }}>
        Something went wrong, but your progress is safe.
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 rounded-lg text-xs font-bold text-white transition-transform active:scale-95"
          style={{ background: c.accent }}
        >
          Try Again
        </button>
      )}
    </div>
  );
}

// ── Full dashboard error boundary (class component) ────────────────────────
export default class DashboardErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[DashboardErrorBoundary] Caught:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const band = this.props.band || "ks3";
      const c = BAND_COLORS[band] || BAND_COLORS.ks3;
      const isDark = band === "ks4";

      return (
        <div
          className="min-h-screen flex items-center justify-center p-6"
          style={{
            background: isDark
              ? "linear-gradient(165deg, #0b1326 0%, #131b2e 100%)"
              : c.bg,
            fontFamily: band === "ks1" ? "Fredoka, sans-serif" : band === "ks2" ? "Nunito, sans-serif" : "DM Sans, sans-serif",
          }}
        >
          <div
            className="max-w-md w-full text-center p-8"
            style={{
              background: isDark ? "rgba(68,65,115,0.25)" : "#fff",
              border: `1px solid ${c.border}`,
              borderRadius: c.radius,
              backdropFilter: isDark ? "blur(16px)" : "none",
            }}
          >
            <span
              className="material-symbols-outlined block mx-auto mb-4"
              style={{ fontSize: 48, color: c.accent, opacity: 0.7 }}
            >
              {band === "ks1" ? "sentiment_sad" : band === "ks2" ? "rocket" : "warning"}
            </span>
            <h2
              className="text-xl font-bold mb-2"
              style={{ color: isDark ? "#fff" : c.text }}
            >
              {band === "ks1"
                ? "Oops! Something went wrong"
                : band === "ks2"
                ? "Houston, we have a problem"
                : "Something went wrong"}
            </h2>
            <p
              className="text-sm mb-6"
              style={{ color: isDark ? "rgba(255,255,255,0.5)" : `${c.text}99` }}
            >
              {band === "ks1"
                ? "Don't worry — your stars and progress are all safe! Let's try again."
                : "Your progress is safely saved. Try refreshing the dashboard."}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-transform active:scale-95"
                style={{ background: c.accent }}
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 rounded-xl text-sm font-bold transition-transform active:scale-95"
                style={{
                  background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
                  color: isDark ? "rgba(255,255,255,0.6)" : c.text,
                }}
              >
                Refresh Page
              </button>
            </div>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mt-4 text-left">
                <summary
                  className="text-[10px] cursor-pointer"
                  style={{ color: isDark ? "rgba(255,255,255,0.3)" : "#94a3b8" }}
                >
                  Error details (dev only)
                </summary>
                <pre
                  className="mt-2 text-[10px] p-3 rounded-lg overflow-auto max-h-32"
                  style={{
                    background: isDark ? "rgba(0,0,0,0.3)" : "#f8fafc",
                    color: isDark ? "rgba(255,255,255,0.4)" : "#64748b",
                  }}
                >
                  {this.state.error.message}
                  {"\n"}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
