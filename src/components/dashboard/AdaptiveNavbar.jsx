"use client";
/**
 * AdaptiveNavbar.jsx
 * Deploy to: src/components/dashboard/AdaptiveNavbar.jsx
 */
import React, { useState } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";

export default function AdaptiveNavbar({ xp = 0, coins = 0, todayQCount = 0, effectiveTier = "pro", onAvatar, onSignOut }) {
  const { band, theme: t } = useTheme();
  const isDark = band === "ks2" || band === "ks4";
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  return (
    <>
    <div style={{
      padding: "12px 20px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottom: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.06)",
    }}>
      {/* Logo + metaphor */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 34, height: 34, borderRadius: band === "ks1" ? 14 : 10,
          background: `linear-gradient(135deg, ${t.colours.accent}, ${t.colours.accentDark})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 15, color: "#fff",
        }}>
          {t.mascot}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: t.fontWeight.black, color: t.colours.text, fontFamily: t.fonts.display }}>
            LaunchPard
          </div>
          <div style={{ fontSize: 10, color: t.colours.textMuted, fontWeight: 500, fontFamily: t.fonts.body }}>
            {t.metaphor}
          </div>
        </div>
      </div>

      {/* Right controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* Free tier counter — only show for free plan */}
        {effectiveTier === "free" && (
          <div style={{
            display: "flex", alignItems: "center", gap: 4,
            background: t.colours.accentLight, padding: "4px 10px",
            borderRadius: 999, fontSize: 11, fontWeight: 700,
            color: t.colours.accent,
          }}>
            📝 {todayQCount}/10 <span style={{ fontSize: 9, opacity: 0.7, marginLeft: 2 }}>today</span>
          </div>
        )}

        {/* Coins */}
        <div style={{
          display: "flex", alignItems: "center", gap: 4,
          background: isDark ? "rgba(255,255,255,0.06)" : "#fef9c3",
          padding: "4px 10px", borderRadius: 999,
          fontSize: 12, fontWeight: 700,
          color: isDark ? "#fbbf24" : "#92400e",
          border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #fde68a",
        }}>
          🪙 {coins}
        </div>

        {/* XP */}
        <div style={{
          display: "flex", alignItems: "center", gap: 4,
          background: t.colours.accentLight, padding: "4px 12px",
          borderRadius: 999, fontSize: 12, fontWeight: t.fontWeight.bold,
          color: t.colours.accent, fontFamily: t.fonts.display,
        }}>
          {t.xpIcon} {xp.toLocaleString()} {t.xpName}
        </div>

        {/* Avatar */}
        <button onClick={onAvatar} style={{
          display: "flex", alignItems: "center", gap: 4,
          background: isDark ? "rgba(255,255,255,0.06)" : "#f5f3ff",
          padding: "6px 10px", borderRadius: 10, border: "none", cursor: "pointer",
          color: t.colours.text, fontSize: 12, fontWeight: 700,
        }}>
          👤 Avatar
        </button>

        {/* Logout — red warning action, always last */}
        <button onClick={() => setShowLogoutConfirm(true)} style={{
          background: "none", border: "none", cursor: "pointer",
          fontSize: 11, fontWeight: 700, color: "#ef4444",
          padding: "6px 10px", borderRadius: 8,
          textTransform: "uppercase", letterSpacing: "0.05em",
        }}>
          Logout
        </button>
      </div>
    </div>

    {/* Logout Confirmation Modal */}
    {showLogoutConfirm && (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
        onClick={(e) => { if (e.target === e.currentTarget) setShowLogoutConfirm(false); }}>
        <div style={{
          background: isDark ? "#1e1b4b" : "#fff",
          borderRadius: 20, padding: "28px 24px", maxWidth: 340, width: "100%",
          boxShadow: "0 25px 50px rgba(0,0,0,0.3)",
          border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.08)",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🚪</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: isDark ? "#fff" : "#1e293b", marginBottom: 8 }}>
            Leaving so soon?
          </div>
          <div style={{ fontSize: 13, color: isDark ? "rgba(255,255,255,0.6)" : "#64748b", marginBottom: 24, lineHeight: 1.5 }}>
            Your progress is saved, but any active quest will be paused. Are you sure you want to sign out?
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setShowLogoutConfirm(false)} style={{
              flex: 1, padding: "12px 16px", borderRadius: 12, border: "none", cursor: "pointer",
              fontSize: 14, fontWeight: 800,
              background: isDark ? "rgba(255,255,255,0.1)" : "#f1f5f9",
              color: isDark ? "#fff" : "#475569",
            }}>
              Stay
            </button>
            <button onClick={() => { setShowLogoutConfirm(false); onSignOut?.(); }} style={{
              flex: 1, padding: "12px 16px", borderRadius: 12, border: "none", cursor: "pointer",
              fontSize: 14, fontWeight: 800,
              background: "#ef4444", color: "#fff",
            }}>
              Sign Out
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
