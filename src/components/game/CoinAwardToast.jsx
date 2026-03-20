"use client";
// src/components/game/CoinAwardToast.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Shown on the quiz results screen after coins are awarded.
// Pass the result of awardCoinsForQuiz() as the `award` prop.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";

export default function CoinAwardToast({ award, onClose }) {
  const [visible, setVisible] = useState(true);
  if (!visible || !award || award.awarded === 0) return null;

  const handleClose = () => {
    setVisible(false);
    onClose?.();
  };

  return (
    <div style={{
      position:"fixed", bottom:28, right:24,
      background:"#fffbeb", border:"2px solid #d97706",
      borderRadius:16, padding:"14px 18px",
      boxShadow:"0 8px 32px rgba(0,0,0,.14)",
      zIndex:9999, maxWidth:280,
      animation:"slideIn .25s cubic-bezier(.34,1.56,.64,1)",
    }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
        <div style={{ display:"flex", alignItems:"center", gap:7 }}>
          <span style={{ fontSize:22 }}>🪙</span>
          <span style={{ fontSize:17, fontWeight:900, color:"#92400e" }}>
            +{award.awarded} coins!
          </span>
        </div>
        <button
          onClick={handleClose}
          style={{
            background:"none", border:"none", cursor:"pointer",
            fontSize:16, color:"#92400e", opacity:.6, lineHeight:1,
          }}
        >
          ✕
        </button>
      </div>

      {/* Breakdown */}
      <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
        {(award.breakdown || []).map((line, i) => (
          <div key={i} style={{
            fontSize:11, color:"#78350f", fontWeight:600,
            display:"flex", alignItems:"center", gap:4,
          }}>
            <span style={{ opacity:.5 }}>•</span>
            {line}
          </div>
        ))}
      </div>

      {/* Balance after */}
      {award.balanceAfter != null && (
        <div style={{
          marginTop:10, paddingTop:8,
          borderTop:"1.5px solid #fde68a",
          fontSize:11, color:"#78350f", fontWeight:700,
          display:"flex", justifyContent:"space-between",
        }}>
          <span>Your balance:</span>
          <span>🪙 {award.balanceAfter}</span>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { opacity:0; transform:translateY(16px) scale(.96); }
          to   { opacity:1; transform:translateY(0) scale(1);      }
        }
      `}</style>
    </div>
  );
}