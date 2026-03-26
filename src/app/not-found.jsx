"use client";
/**
 * not-found.jsx — 404 page with floating astronaut Lottie
 * Deploy to: src/app/not-found.jsx
 *
 * Shown when a route doesn't match. Uses the 404-astronaut.json Lottie
 * animation with a space-themed design consistent with the platform.
 */

import { useEffect, useState } from "react";
import Link from "next/link";

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
      } catch (_) { /* fallback below */ }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!LottieComp || !animData) {
    return <div style={{ fontSize: 120, marginBottom: 16, animation: "notFoundFloat 4s ease-in-out infinite" }}>🧑‍🚀</div>;
  }

  return (
    <div style={{
      width: 380, maxWidth: "80vw", aspectRatio: "1 / 1", marginBottom: 12,
      animation: "notFoundFloat 4s ease-in-out infinite",
      filter: "drop-shadow(0 20px 60px rgba(99,102,241,0.35))",
    }}>
      <LottieComp animationData={animData} loop autoplay style={{ width: "100%", height: "100%" }} />
    </div>
  );
}

export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", fontFamily: "system-ui",
      padding: 32, textAlign: "center",
      background: "linear-gradient(160deg, #06041a 0%, #0d0b2e 40%, #0a1628 70%, #050d1a 100%)",
      color: "white", position: "relative", overflow: "hidden",
    }}>
      {/* Nebula glow blobs */}
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "10%", left: "15%", width: 350, height: 350, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)", filter: "blur(60px)" }} />
        <div style={{ position: "absolute", bottom: "15%", right: "10%", width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, rgba(192,132,252,0.1) 0%, transparent 70%)", filter: "blur(50px)" }} />
        <div style={{ position: "absolute", top: "55%", left: "60%", width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle, rgba(56,189,248,0.08) 0%, transparent 70%)", filter: "blur(40px)" }} />
      </div>

      {/* Decorative stars */}
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {Array.from({ length: 80 }, (_, i) => (
          <div key={i} style={{
            position: "absolute",
            left: `${((i * 97 + 11) % 100)}%`,
            top: `${((i * 67 + 43) % 100)}%`,
            width: i % 7 === 0 ? 2.8 : i % 3 === 0 ? 1.8 : 1,
            height: i % 7 === 0 ? 2.8 : i % 3 === 0 ? 1.8 : 1,
            borderRadius: "50%",
            background: "#fff",
            opacity: 0.06 + (i % 8) * 0.035,
            animation: i % 7 === 0 ? `notFoundTwinkle ${2 + (i % 3)}s ease-in-out infinite ${(i * 0.3) % 2}s` : "none",
          }} />
        ))}
      </div>

      <div style={{ position: "relative", zIndex: 2 }}>
        <AstronautAnimation />

        <h1 style={{
          fontSize: 56, fontWeight: 900, marginBottom: 4,
          background: "linear-gradient(135deg, #818cf8, #c084fc)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          lineHeight: 1.1,
        }}>
          404
        </h1>
        <p style={{
          fontSize: 18, fontWeight: 700, color: "rgba(255,255,255,0.85)",
          marginBottom: 8,
        }}>
          This part of space hasn't been charted yet
        </p>
        <p style={{
          fontSize: 14, color: "#94a3b8", marginBottom: 28, maxWidth: 380,
          lineHeight: 1.6,
        }}>
          The page you're looking for drifted beyond our galaxy.
          Let's get you back to mission control.
        </p>

        <Link
          href="/dashboard"
          style={{
            display: "inline-block",
            padding: "12px 32px", borderRadius: 12,
            background: "linear-gradient(135deg, #6366f1, #7c3aed)",
            color: "white", fontWeight: 700, fontSize: 14,
            textDecoration: "none",
            boxShadow: "0 4px 20px rgba(99,102,241,0.4)",
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
          }}
        >
          Back to Dashboard
        </Link>
      </div>

      <style>{`
        @keyframes notFoundFloat {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-14px); }
        }
        @keyframes notFoundTwinkle {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50%      { opacity: 0.6; transform: scale(1.4); }
        }
      `}</style>
    </div>
  );
}
