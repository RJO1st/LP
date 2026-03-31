// ─── Deploy to: src/app/global-error.jsx ─────────────────────────────────────
// Catches unhandled errors in the root layout and reports to Sentry
// Lightweight space-themed error page — no Lottie dependency
"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

function AstronautAnimation() {
  return (
    <div style={{
      width: 200, maxWidth: "50vw", aspectRatio: "1 / 1", marginBottom: 16,
      animation: "errFloat 4s ease-in-out infinite",
      filter: "drop-shadow(0 16px 48px rgba(99,102,241,0.3))",
      position: "relative",
    }}>
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }}>
        {/* Stars */}
        <circle cx="20" cy="30" r="1.5" fill="white" opacity="0.8"><animate attributeName="opacity" values="0.8;0.2;0.8" dur="2s" repeatCount="indefinite" /></circle>
        <circle cx="170" cy="50" r="1" fill="white" opacity="0.6"><animate attributeName="opacity" values="0.6;0.1;0.6" dur="3s" repeatCount="indefinite" /></circle>
        <circle cx="40" cy="160" r="1.2" fill="white" opacity="0.7"><animate attributeName="opacity" values="0.7;0.15;0.7" dur="2.5s" repeatCount="indefinite" /></circle>
        <circle cx="160" cy="140" r="1" fill="white" opacity="0.5"><animate attributeName="opacity" values="0.5;0.1;0.5" dur="1.8s" repeatCount="indefinite" /></circle>
        {/* Helmet */}
        <circle cx="100" cy="75" r="32" fill="#1e293b" stroke="#94a3b8" strokeWidth="3" />
        <ellipse cx="100" cy="75" rx="22" ry="20" fill="#0f172a" opacity="0.9" />
        <ellipse cx="92" cy="70" rx="6" ry="8" fill="rgba(99,102,241,0.3)" rx="6" transform="rotate(-15 92 70)" />
        {/* Body */}
        <rect x="78" y="105" width="44" height="40" rx="8" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" />
        <rect x="88" y="112" width="24" height="12" rx="3" fill="#6366f1" opacity="0.6" />
        {/* Arms */}
        <rect x="55" y="108" width="25" height="12" rx="6" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5">
          <animateTransform attributeName="transform" type="rotate" values="-5 68 114;10 68 114;-5 68 114" dur="3s" repeatCount="indefinite" />
        </rect>
        <rect x="120" y="108" width="25" height="12" rx="6" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5">
          <animateTransform attributeName="transform" type="rotate" values="5 132 114;-10 132 114;5 132 114" dur="3.5s" repeatCount="indefinite" />
        </rect>
        {/* Legs */}
        <rect x="82" y="143" width="14" height="22" rx="5" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
        <rect x="104" y="143" width="14" height="22" rx="5" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
        {/* Boots */}
        <rect x="79" y="160" width="18" height="10" rx="4" fill="#475569" />
        <rect x="103" y="160" width="18" height="10" rx="4" fill="#475569" />
        {/* Backpack */}
        <rect x="120" y="108" width="10" height="28" rx="4" fill="#94a3b8" opacity="0.5" />
        {/* Tether line drifting */}
        <path d="M130 130 Q150 120 160 135 Q170 150 165 170" fill="none" stroke="#64748b" strokeWidth="1.5" strokeDasharray="4 3">
          <animate attributeName="d" values="M130 130 Q150 120 160 135 Q170 150 165 170;M130 130 Q155 115 165 130 Q175 145 168 165;M130 130 Q150 120 160 135 Q170 150 165 170" dur="4s" repeatCount="indefinite" />
        </path>
      </svg>
    </div>
  );
}

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
          padding: 32, textAlign: "center",
          background: "linear-gradient(160deg, #06041a 0%, #0d0b2e 40%, #0a1628 70%, #050d1a 100%)",
          color: "white", position: "relative", overflow: "hidden",
        }}>
          {/* Nebula glow */}
          <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            <div style={{ position: "absolute", top: "20%", left: "20%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)", filter: "blur(50px)" }} />
            <div style={{ position: "absolute", bottom: "20%", right: "15%", width: 250, height: 250, borderRadius: "50%", background: "radial-gradient(circle, rgba(192,132,252,0.08) 0%, transparent 70%)", filter: "blur(40px)" }} />
          </div>
          <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <AstronautAnimation />
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>
            Oops — lost in space!
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
          <style>{`
            @keyframes errFloat {
              0%, 100% { transform: translateY(0); }
              50%      { transform: translateY(-12px); }
            }
          `}</style>
        </div>
      </body>
    </html>
  );
}
