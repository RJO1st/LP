"use client";
/**
 * not-found.jsx — Custom 404 page with pure SVG/CSS space animation
 * No Lottie dependency — lightweight, instant-loading, blends perfectly
 * with the dark space background.
 *
 * Scene: A lost astronaut floating past a ringed planet with orbiting
 * particles, shooting stars, and a tethered cable drifting away.
 */

import Link from "next/link";

// ─── SVG Astronaut — hand-crafted, self-contained ──────────────────────────
function SpaceScene() {
  return (
    <div style={{
      width: 320, maxWidth: "85vw", aspectRatio: "1 / 1",
      position: "relative", margin: "0 auto 20px",
    }}>
      <svg
        viewBox="0 0 400 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: "100%", height: "100%", overflow: "visible" }}
      >
        <defs>
          {/* Planet gradient */}
          <radialGradient id="planetGrad" cx="0.35" cy="0.3" r="0.65">
            <stop offset="0%" stopColor="#4338ca" />
            <stop offset="50%" stopColor="#312e81" />
            <stop offset="100%" stopColor="#1e1b4b" />
          </radialGradient>
          {/* Planet ring gradient */}
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(129,140,248,0)" />
            <stop offset="30%" stopColor="rgba(129,140,248,0.4)" />
            <stop offset="50%" stopColor="rgba(196,181,253,0.6)" />
            <stop offset="70%" stopColor="rgba(129,140,248,0.4)" />
            <stop offset="100%" stopColor="rgba(129,140,248,0)" />
          </linearGradient>
          {/* Helmet visor gradient */}
          <linearGradient id="visorGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="50%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>
          {/* Suit gradient */}
          <linearGradient id="suitGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>
          {/* Glow filter */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── Planet (bottom-right) ─────────────────────────────────── */}
        <g className="nf-planet">
          {/* Planet atmosphere glow */}
          <circle cx="310" cy="310" r="105" fill="rgba(99,102,241,0.08)" filter="url(#glow)" />
          {/* Planet body */}
          <circle cx="310" cy="310" r="80" fill="url(#planetGrad)" />
          {/* Planet surface details */}
          <ellipse cx="290" cy="295" rx="25" ry="10" fill="rgba(129,140,248,0.15)" transform="rotate(-15 290 295)" />
          <ellipse cx="330" cy="325" rx="18" ry="7" fill="rgba(99,102,241,0.12)" transform="rotate(10 330 325)" />
          <ellipse cx="305" cy="340" rx="12" ry="5" fill="rgba(139,92,246,0.1)" />
          {/* Planet ring — behind planet top half */}
          <ellipse cx="310" cy="310" rx="120" ry="22" fill="none" stroke="url(#ringGrad)" strokeWidth="5" opacity="0.7" />
          {/* Tiny ring particles */}
          <circle cx="210" cy="302" r="2" fill="rgba(196,181,253,0.6)">
            <animateTransform attributeName="transform" type="rotate" from="0 310 310" to="360 310 310" dur="20s" repeatCount="indefinite" />
          </circle>
          <circle cx="400" cy="318" r="1.5" fill="rgba(129,140,248,0.5)">
            <animateTransform attributeName="transform" type="rotate" from="0 310 310" to="360 310 310" dur="25s" repeatCount="indefinite" />
          </circle>
        </g>

        {/* ── Shooting Stars ────────────────────────────────────────── */}
        <g className="nf-shootingStars">
          <line x1="50" y1="40" x2="90" y2="60" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round">
            <animate attributeName="opacity" values="0;0.8;0" dur="3s" repeatCount="indefinite" begin="0s" />
            <animateTransform attributeName="transform" type="translate" values="0,0;60,30" dur="3s" repeatCount="indefinite" begin="0s" />
          </line>
          <line x1="300" y1="20" x2="330" y2="35" stroke="rgba(255,255,255,0.5)" strokeWidth="1" strokeLinecap="round">
            <animate attributeName="opacity" values="0;0.7;0" dur="4s" repeatCount="indefinite" begin="1.5s" />
            <animateTransform attributeName="transform" type="translate" values="0,0;50,25" dur="4s" repeatCount="indefinite" begin="1.5s" />
          </line>
          <line x1="160" y1="80" x2="185" y2="92" stroke="rgba(196,181,253,0.5)" strokeWidth="1" strokeLinecap="round">
            <animate attributeName="opacity" values="0;0.6;0" dur="5s" repeatCount="indefinite" begin="3s" />
            <animateTransform attributeName="transform" type="translate" values="0,0;40,20" dur="5s" repeatCount="indefinite" begin="3s" />
          </line>
        </g>

        {/* ── Floating Astronaut ────────────────────────────────────── */}
        <g className="nf-astronaut" filter="url(#softGlow)">
          {/* Tether cable — drifting away */}
          <path
            d="M 165 230 Q 140 270, 100 290 Q 70 310, 50 340"
            stroke="rgba(148,163,184,0.35)"
            strokeWidth="2"
            strokeDasharray="6,4"
            fill="none"
            strokeLinecap="round"
          >
            <animate attributeName="d"
              values="M 165 230 Q 140 270, 100 290 Q 70 310, 50 340;M 165 230 Q 130 260, 95 285 Q 65 305, 45 345;M 165 230 Q 140 270, 100 290 Q 70 310, 50 340"
              dur="6s" repeatCount="indefinite" />
          </path>

          {/* Backpack / life support */}
          <rect x="142" y="165" width="36" height="45" rx="6" fill="#94a3b8" />
          <rect x="147" y="170" width="10" height="8" rx="2" fill="#64748b" />
          <rect x="162" y="170" width="10" height="8" rx="2" fill="#64748b" />
          <circle cx="152" cy="190" r="2" fill="#22c55e" opacity="0.8">
            <animate attributeName="opacity" values="0.8;0.3;0.8" dur="2s" repeatCount="indefinite" />
          </circle>

          {/* Body / suit torso */}
          <rect x="148" y="160" width="44" height="55" rx="14" fill="url(#suitGrad)" />

          {/* Suit stripe */}
          <rect x="164" y="165" width="12" height="45" rx="4" fill="rgba(99,102,241,0.25)" />

          {/* Left arm — waving */}
          <g>
            <rect x="115" y="170" width="38" height="14" rx="7" fill="#e2e8f0" transform="rotate(-25 134 177)">
              <animateTransform attributeName="transform" type="rotate"
                values="-25 134 177;-40 134 177;-25 134 177" dur="3s" repeatCount="indefinite" />
            </rect>
            {/* Glove */}
            <circle cx="118" cy="162" r="7" fill="#cbd5e1">
              <animateTransform attributeName="transform" type="translate"
                values="0,0;-4,-6;0,0" dur="3s" repeatCount="indefinite" />
            </circle>
          </g>

          {/* Right arm */}
          <rect x="187" y="172" width="34" height="13" rx="6.5" fill="#e2e8f0" transform="rotate(15 204 178)" />
          <circle cx="218" cy="180" r="7" fill="#cbd5e1" />

          {/* Legs */}
          <rect x="152" y="208" width="15" height="32" rx="6" fill="#e2e8f0" transform="rotate(5 160 224)" />
          <rect x="172" y="208" width="15" height="32" rx="6" fill="#e2e8f0" transform="rotate(-8 180 224)" />
          {/* Boots */}
          <rect x="149" y="234" width="18" height="10" rx="5" fill="#94a3b8" transform="rotate(5 158 239)" />
          <rect x="171" y="234" width="18" height="10" rx="5" fill="#94a3b8" transform="rotate(-8 180 239)" />

          {/* Helmet */}
          <circle cx="170" cy="148" r="28" fill="#f1f5f9" />
          {/* Helmet rim */}
          <circle cx="170" cy="148" r="28" fill="none" stroke="#cbd5e1" strokeWidth="2.5" />
          {/* Visor */}
          <ellipse cx="170" cy="150" rx="20" ry="17" fill="url(#visorGrad)" opacity="0.85" />
          {/* Visor reflection */}
          <ellipse cx="162" cy="144" rx="7" ry="5" fill="rgba(255,255,255,0.25)" transform="rotate(-15 162 144)" />
          {/* Visor secondary reflection */}
          <ellipse cx="178" cy="155" rx="4" ry="3" fill="rgba(255,255,255,0.12)" />
          {/* Antenna */}
          <line x1="170" y1="120" x2="170" y2="108" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
          <circle cx="170" cy="105" r="4" fill="#ef4444" opacity="0.9">
            <animate attributeName="opacity" values="0.9;0.4;0.9" dur="1.5s" repeatCount="indefinite" />
          </circle>
        </g>

        {/* ── Small floating debris / space particles ───────────────── */}
        <circle cx="60" cy="130" r="3" fill="rgba(148,163,184,0.4)">
          <animateTransform attributeName="transform" type="translate" values="0,0;8,-12;0,0" dur="7s" repeatCount="indefinite" />
        </circle>
        <circle cx="250" cy="90" r="2" fill="rgba(129,140,248,0.5)">
          <animateTransform attributeName="transform" type="translate" values="0,0;-6,10;0,0" dur="9s" repeatCount="indefinite" />
        </circle>
        <rect x="340" cy="150" width="4" height="4" rx="1" fill="rgba(196,181,253,0.3)" transform="rotate(45 342 152)">
          <animateTransform attributeName="transform" type="rotate" from="45 342 152" to="405 342 152" dur="12s" repeatCount="indefinite" />
        </rect>
        <circle cx="90" cy="280" r="1.5" fill="rgba(251,191,36,0.4)">
          <animateTransform attributeName="transform" type="translate" values="0,0;5,8;0,0" dur="8s" repeatCount="indefinite" />
        </circle>

        {/* ── Distant stars ─────────────────────────────────────────── */}
        {[
          [25, 60], [380, 50], [50, 180], [370, 170], [200, 30],
          [30, 350], [280, 380], [120, 50], [350, 260], [80, 380],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={i % 3 === 0 ? 1.5 : 0.8}
            fill="white" opacity={0.15 + (i % 5) * 0.08}>
            {i % 2 === 0 && (
              <animate attributeName="opacity"
                values={`${0.1 + (i % 4) * 0.05};${0.4 + (i % 3) * 0.1};${0.1 + (i % 4) * 0.05}`}
                dur={`${3 + i % 4}s`} repeatCount="indefinite" begin={`${i * 0.4}s`} />
            )}
          </circle>
        ))}
      </svg>
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

      {/* Decorative background stars */}
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
            animation: i % 7 === 0 ? `nfTwinkle ${2 + (i % 3)}s ease-in-out infinite ${(i * 0.3) % 2}s` : "none",
          }} />
        ))}
      </div>

      <div style={{ position: "relative", zIndex: 2 }}>
        {/* Floating astronaut scene */}
        <div className="nf-float">
          <SpaceScene />
        </div>

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
          Lost in space...
        </p>
        <p style={{
          fontSize: 14, color: "#94a3b8", marginBottom: 28, maxWidth: 380,
          lineHeight: 1.6, margin: "0 auto 28px",
        }}>
          This part of the galaxy hasn't been explored yet.
          Let's get you back to mission control.
        </p>

        <Link
          href="/dashboard"
          className="nf-btn"
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
          Back to Mission Control
        </Link>
      </div>

      <style>{`
        .nf-float {
          animation: nfFloat 6s ease-in-out infinite;
        }
        .nf-astronaut {
          animation: nfDrift 8s ease-in-out infinite;
        }
        .nf-planet {
          animation: nfPlanetBob 10s ease-in-out infinite;
        }
        .nf-btn:hover {
          transform: translateY(-2px) scale(1.04) !important;
          box-shadow: 0 8px 32px rgba(99,102,241,0.5) !important;
        }
        @keyframes nfFloat {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25%      { transform: translateY(-10px) rotate(1deg); }
          50%      { transform: translateY(-6px) rotate(-0.5deg); }
          75%      { transform: translateY(-14px) rotate(0.5deg); }
        }
        @keyframes nfDrift {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33%      { transform: translate(4px, -3px) rotate(3deg); }
          66%      { transform: translate(-3px, 2px) rotate(-2deg); }
        }
        @keyframes nfPlanetBob {
          0%, 100% { transform: translate(0, 0); }
          50%      { transform: translate(-3px, 4px); }
        }
        @keyframes nfTwinkle {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50%      { opacity: 0.6; transform: scale(1.4); }
        }
      `}</style>
    </div>
  );
}
