// ─── Deploy to: src/app/global-error.jsx ─────────────────────────────────────
// Catches unhandled errors in the root layout and reports to Sentry
// Uses 404-astronaut Lottie animation for visual delight
"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect, useState } from "react";

function AstronautAnimation() {
  const [LottieComp, setLottieComp] = useState(null);
  const [animData, setAnimData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [mod, resp] = await Promise.all([
          import("lottie-react"),
          fetch("/lottie/404-astronaut.json"),
        ]);
        if (cancelled) return;
        const data = await resp.json();
        setLottieComp(() => mod.default);
        setAnimData(data);
      } catch (_) { /* Lottie unavailable — fallback emoji shown */ }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!LottieComp || !animData) {
    return <div style={{ fontSize: 100, marginBottom: 16, animation: "errFloat 4s ease-in-out infinite" }}>🧑‍🚀</div>;
  }

  return (
    <div style={{
      width: 320, maxWidth: "70vw", aspectRatio: "1 / 1", marginBottom: 8,
      animation: "errFloat 4s ease-in-out infinite",
      filter: "drop-shadow(0 16px 48px rgba(99,102,241,0.3))",
    }}>
      <LottieComp animationData={animData} loop autoplay style={{ width: "100%", height: "100%" }} />
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
