"use client";
/**
 * DashboardSkeleton.jsx — Shared loading skeleton system
 * Provides band-aware shimmer skeletons for all four KS dashboards.
 * Uses CSS animations only — no JS runtime overhead.
 */

import React from "react";

// ── Shimmer keyframe injector (singleton) ──────────────────────────────────
const SHIMMER_CSS = `
@keyframes skeleton-shimmer {
  0% { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}
`;

let injected = false;
function injectShimmerCSS() {
  if (injected || typeof document === "undefined") return;
  const style = document.createElement("style");
  style.textContent = SHIMMER_CSS;
  document.head.appendChild(style);
  injected = true;
}

// ── Band-specific skeleton configs ─────────────────────────────────────────
const BAND_STYLES = {
  ks1: {
    cardBg: "rgba(245,158,11,0.04)",
    shimmerBg: "linear-gradient(90deg, rgba(245,158,11,0.04) 0%, rgba(245,158,11,0.08) 50%, rgba(245,158,11,0.04) 100%)",
    borderRadius: 28,
    border: "2px solid rgba(245,158,11,0.08)",
  },
  ks2: {
    cardBg: "rgba(129,140,248,0.04)",
    shimmerBg: "linear-gradient(90deg, rgba(129,140,248,0.04) 0%, rgba(129,140,248,0.08) 50%, rgba(129,140,248,0.04) 100%)",
    borderRadius: 16,
    border: "1px solid rgba(129,140,248,0.08)",
  },
  ks3: {
    cardBg: "rgba(14,165,233,0.03)",
    shimmerBg: "linear-gradient(90deg, rgba(14,165,233,0.03) 0%, rgba(14,165,233,0.06) 50%, rgba(14,165,233,0.03) 100%)",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.05)",
  },
  ks4: {
    cardBg: "rgba(167,139,250,0.04)",
    shimmerBg: "linear-gradient(90deg, rgba(167,139,250,0.04) 0%, rgba(167,139,250,0.08) 50%, rgba(167,139,250,0.04) 100%)",
    borderRadius: 12,
    border: "1px solid rgba(167,139,250,0.08)",
  },
};

// ── Base skeleton block ────────────────────────────────────────────────────
function SkeletonBlock({ width = "100%", height = 16, rounded = 8, band = "ks3", className = "" }) {
  const cfg = BAND_STYLES[band] || BAND_STYLES.ks3;
  return (
    <div
      className={className}
      style={{
        width, height, borderRadius: rounded,
        background: cfg.shimmerBg,
        backgroundSize: "800px 100%",
        animation: "skeleton-shimmer 1.6s ease-in-out infinite",
      }}
      aria-hidden="true"
    />
  );
}

// ── Skeleton card container ────────────────────────────────────────────────
function SkeletonCard({ band = "ks3", children, className = "" }) {
  const cfg = BAND_STYLES[band] || BAND_STYLES.ks3;
  return (
    <div
      className={className}
      style={{
        background: cfg.cardBg,
        border: cfg.border,
        borderRadius: cfg.borderRadius,
        padding: "20px",
      }}
      aria-hidden="true"
    >
      {children}
    </div>
  );
}

// ── Full dashboard skeleton (used during initial load) ─────────────────────
export default function DashboardSkeleton({ band = "ks3" }) {
  React.useEffect(() => { injectShimmerCSS(); }, []);

  return (
    <div className="space-y-5 max-w-4xl animate-pulse" role="status" aria-label="Loading dashboard">
      {/* Hero skeleton */}
      <SkeletonCard band={band}>
        <div className="flex items-center gap-4">
          <SkeletonBlock band={band} width={56} height={56} rounded={16} />
          <div className="flex-1 space-y-2">
            <SkeletonBlock band={band} width="60%" height={20} rounded={6} />
            <SkeletonBlock band={band} width="80%" height={14} rounded={4} />
          </div>
          <SkeletonBlock band={band} width={120} height={40} rounded={12} />
        </div>
      </SkeletonCard>

      {/* Stats row skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonCard key={i} band={band}>
            <SkeletonBlock band={band} width={20} height={20} rounded={6} />
            <div className="mt-3 space-y-1.5">
              <SkeletonBlock band={band} width="50%" height={24} rounded={6} />
              <SkeletonBlock band={band} width="70%" height={10} rounded={4} />
            </div>
          </SkeletonCard>
        ))}
      </div>

      {/* Skills section skeleton */}
      <SkeletonCard band={band}>
        <SkeletonBlock band={band} width="30%" height={18} rounded={6} className="mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <SkeletonBlock band={band} width={44} height={44} rounded={12} />
              <div className="flex-1 space-y-1.5">
                <SkeletonBlock band={band} width="40%" height={14} rounded={4} />
                <SkeletonBlock band={band} width="100%" height={6} rounded={3} />
              </div>
            </div>
          ))}
        </div>
      </SkeletonCard>

      {/* Activity section skeleton */}
      <SkeletonCard band={band}>
        <SkeletonBlock band={band} width="25%" height={18} rounded={6} className="mb-4" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <SkeletonBlock band={band} width={40} height={40} rounded={10} />
              <div className="flex-1 space-y-1.5">
                <SkeletonBlock band={band} width="55%" height={14} rounded={4} />
                <SkeletonBlock band={band} width="35%" height={10} rounded={4} />
              </div>
              <SkeletonBlock band={band} width={60} height={24} rounded={12} />
            </div>
          ))}
        </div>
      </SkeletonCard>

      <span className="sr-only">Loading your dashboard...</span>
    </div>
  );
}

// ── Sidebar skeleton ───────────────────────────────────────────────────────
export function SidebarSkeleton({ band = "ks3" }) {
  React.useEffect(() => { injectShimmerCSS(); }, []);

  return (
    <div className="space-y-5" aria-hidden="true">
      {/* Tara panel skeleton */}
      <SkeletonCard band={band}>
        <div className="flex items-center gap-3 mb-3">
          <SkeletonBlock band={band} width={36} height={36} rounded={18} />
          <SkeletonBlock band={band} width="50%" height={14} rounded={4} />
        </div>
        <div className="space-y-2">
          <SkeletonBlock band={band} width="90%" height={12} rounded={4} />
          <SkeletonBlock band={band} width="70%" height={12} rounded={4} />
        </div>
      </SkeletonCard>

      {/* Goals/stats skeleton */}
      <SkeletonCard band={band}>
        <SkeletonBlock band={band} width="40%" height={14} rounded={4} className="mb-3" />
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i}>
              <div className="flex justify-between mb-1">
                <SkeletonBlock band={band} width="40%" height={10} rounded={4} />
                <SkeletonBlock band={band} width="15%" height={10} rounded={4} />
              </div>
              <SkeletonBlock band={band} width="100%" height={6} rounded={3} />
            </div>
          ))}
        </div>
      </SkeletonCard>

      {/* Leaderboard skeleton */}
      <SkeletonCard band={band}>
        <SkeletonBlock band={band} width="35%" height={14} rounded={4} className="mb-3" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-2 p-2">
              <SkeletonBlock band={band} width={16} height={16} rounded={4} />
              <SkeletonBlock band={band} width={28} height={28} rounded={14} />
              <SkeletonBlock band={band} width="40%" height={12} rounded={4} />
              <div className="flex-1" />
              <SkeletonBlock band={band} width={40} height={10} rounded={4} />
            </div>
          ))}
        </div>
      </SkeletonCard>
    </div>
  );
}

export { SkeletonBlock, SkeletonCard };
