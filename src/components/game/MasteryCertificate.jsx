"use client";
/**
 * MasteryCertificate.jsx — Stage-gated topic mastery certificate
 * Deploy to: src/components/game/MasteryCertificate.jsx
 *
 * Awarded per TOPIC at each mastery stage (not per quest score):
 *   Stage 1 "Building"  — P(mastery) first crosses 0.55 (developing tier)
 *   Stage 2 "On Track"  — P(mastery) first crosses 0.70 (expected tier)
 *   Stage 3 "Stellar"   — P(mastery) first crosses 0.80 (exceeding tier)
 *
 * Props:
 *   scholarName  {string}
 *   subject      {string}  — e.g. "maths"
 *   topic        {string}  — e.g. "2D Shapes"
 *   masteryTier  {string}  — "developing" | "expected" | "exceeding"
 *   masteryScore {number}  — 0–1 BKT probability (displayed as %)
 *   accuracy     {number}  — session accuracy % (shown as supporting info)
 *   xpEarned     {number}
 *   date         {Date}
 *   onClose      {fn}
 */

import React, { useEffect, useRef, useState } from "react";
import { X, Download, Share2, Star, Rocket, Award, CheckCircle, Trophy, Sparkles } from "lucide-react";

// ── STAGE CONFIG ──────────────────────────────────────────────────────────────
const MASTERY_STAGES = {
  developing: {
    label:    "Building",
    stageNum: 1,
    emoji:    "🌱",
    starCount: 1,
    accent:   "#0891b2",
    accentLight: "#ecfeff",
    gradient: "linear-gradient(135deg, #06b6d4 0%, #0891b2 50%, #0369a1 100%)",
    tagline:  "You're building real skills in this topic!",
    medal:    "🥉",
  },
  expected: {
    label:    "On Track",
    stageNum: 2,
    emoji:    "⭐",
    starCount: 2,
    accent:   "#7c3aed",
    accentLight: "#f5f3ff",
    gradient: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%)",
    tagline:  "Solid understanding — you're on track for mastery!",
    medal:    "🥈",
  },
  exceeding: {
    label:    "Stellar",
    stageNum: 3,
    emoji:    "🏆",
    starCount: 3,
    accent:   "#d97706",
    accentLight: "#fffbeb",
    gradient: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 40%, #d97706 100%)",
    tagline:  "Outstanding — you've mastered this topic completely!",
    medal:    "🥇",
  },
};

// ── SUBJECT THEME ─────────────────────────────────────────────────────────────
const SUBJECT_THEMES = {
  maths:          { icon: "🔢", color: "#4f46e5" },
  english:        { icon: "📚", color: "#0891b2" },
  science:        { icon: "🔬", color: "#059669" },
  verbal:         { icon: "💬", color: "#7c3aed" },
  verbal_reasoning: { icon: "💬", color: "#7c3aed" },
  nvr:            { icon: "🔷", color: "#ec4899" },
  history:        { icon: "🏛️", color: "#92400e" },
  geography:      { icon: "🌍", color: "#065f46" },
  biology:        { icon: "🧬", color: "#059669" },
  chemistry:      { icon: "⚗️", color: "#d97706" },
  physics:        { icon: "⚡", color: "#2563eb" },
};
const subjectTheme = (s) => SUBJECT_THEMES[s?.toLowerCase()] || { icon: "🚀", color: "#4f46e5" };

// ── CERT ID ───────────────────────────────────────────────────────────────────
function certId(name, subject, topic, tier, date) {
  const seed = `${name}${subject}${topic}${tier}${date.getFullYear()}`;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  return `LP-${Math.abs(h).toString(16).slice(0,3).toUpperCase()}-${date.getFullYear()}`;
}

// ── CONFETTI ──────────────────────────────────────────────────────────────────
function Confetti({ active, stageNum }) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.offsetWidth, H = canvas.offsetHeight;
    canvas.width = W; canvas.height = H;

    const COLORS = stageNum >= 3
      ? ["#fbbf24","#f59e0b","#ec4899","#6366f1","#10b981","#3b82f6"]
      : stageNum >= 2
      ? ["#8b5cf6","#6366f1","#3b82f6","#06b6d4","#10b981"]
      : ["#06b6d4","#0891b2","#3b82f6","#6366f1","#10b981"];

    const parts = Array.from({ length: stageNum >= 3 ? 80 : stageNum >= 2 ? 55 : 35 }, () => ({
      x: Math.random() * W,
      y: -10,
      w: Math.random() * 8 + 3,
      h: Math.random() * 4 + 2,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      vy: Math.random() * 2 + 1.5,
      vx: (Math.random() - 0.5) * 2,
      rot: Math.random() * 360,
      drot: (Math.random() - 0.5) * 6,
      life: 1,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      let alive = false;
      parts.forEach(p => {
        p.y += p.vy; p.x += p.vx; p.rot += p.drot; p.life -= 0.008;
        if (p.life <= 0 || p.y > H) return;
        alive = true;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
        ctx.restore();
      });
      if (alive) animRef.current = requestAnimationFrame(draw);
    };
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [active, stageNum]);

  return (
    <canvas ref={canvasRef} className="pointer-events-none"
      style={{ position:"absolute", inset:0, width:"100%", height:"100%", zIndex:10 }}/>
  );
}

// ── STAR ROW ──────────────────────────────────────────────────────────────────
function StarRow({ filled, total = 3, color }) {
  return (
    <div style={{ display:"flex", gap:6, justifyContent:"center" }}>
      {Array.from({ length: total }, (_, i) => (
        <Star key={i} size={22}
          fill={i < filled ? color : "transparent"}
          stroke={i < filled ? color : "#cbd5e1"}
          strokeWidth={1.5}/>
      ))}
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function MasteryCertificate({
  scholarName  = "Cadet",
  subject      = "Maths",
  topic        = "Topic",
  masteryTier  = "exceeding",
  masteryScore = 0.85,
  accuracy     = 100,
  xpEarned     = 0,
  date         = new Date(),
  onClose,
}) {
  const stage     = MASTERY_STAGES[masteryTier] || MASTERY_STAGES.exceeding;
  const subj      = subjectTheme(subject);
  const certDate  = date instanceof Date ? date : new Date(date);
  const id        = certId(scholarName, subject, topic, masteryTier, certDate);
  const certRef   = useRef(null);
  const [visible, setVisible] = useState(false);
  const [copied,  setCopied]  = useState(false);

  const dateStr = certDate.toLocaleDateString("en-GB", {
    day:"numeric", month:"long", year:"numeric"
  });

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  const handlePrint = () => {
    const styleId = "cert-print-style";
    if (!document.getElementById(styleId)) {
      const s = document.createElement("style");
      s.id = styleId;
      s.textContent = `@media print {
        body > *:not(#cert-print-root) { display:none!important; }
        #cert-print-root { position:fixed!important; inset:0!important; z-index:99999!important; }
        .no-print { display:none!important; }
      }`;
      document.head.appendChild(s);
    }
    const el = certRef.current;
    const prev = el?.id;
    if (el) el.id = "cert-print-root";
    window.print();
    if (el && prev !== undefined) el.id = prev || "";
  };

  const handleShare = async () => {
    const text = `🚀 ${scholarName} earned a ${stage.label} mastery certificate in ${topic} on LaunchPard! ${stage.emoji} Certificate ID: ${id}`;
    try {
      if (navigator.share) await navigator.share({ title: "LaunchPard Certificate", text });
      else { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2500); }
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4"
      style={{ background:"rgba(15,23,42,0.85)", backdropFilter:"blur(16px)" }}>

      {/* Confetti */}
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", overflow:"hidden" }}>
        <Confetti active={visible} stageNum={stage.stageNum} />
      </div>

      {/* Certificate card */}
      <div ref={certRef}
        style={{
          background: "#ffffff",
          borderRadius: 24,
          maxWidth: 440,
          width: "100%",
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: `0 25px 60px rgba(0,0,0,0.4), 0 0 0 2px ${stage.accent}40`,
          transform: visible ? "scale(1)" : "scale(0.92)",
          opacity: visible ? 1 : 0,
          transition: "all 0.35s cubic-bezier(0.34,1.56,0.64,1)",
          position: "relative",
          zIndex: 20,
        }}>

        {/* ── HERO BANNER ── */}
        <div style={{
          background: stage.gradient,
          borderRadius: "24px 24px 0 0",
          padding: "28px 24px 24px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Decorative dots */}
          <div style={{ position:"absolute", top:8, left:12, fontSize:18, opacity:0.3 }}>✦</div>
          <div style={{ position:"absolute", top:16, right:20, fontSize:14, opacity:0.3 }}>✦</div>
          <div style={{ position:"absolute", bottom:8, left:"40%", fontSize:10, opacity:0.2 }}>✦</div>

          {/* Stage badge */}
          <div style={{
            display:"inline-flex", alignItems:"center", gap:6,
            background:"rgba(255,255,255,0.2)", borderRadius:999,
            padding:"4px 14px", marginBottom:12,
          }}>
            <span style={{ fontSize:14 }}>{stage.medal}</span>
            <span style={{ color:"white", fontWeight:800, fontSize:11, letterSpacing:"0.1em", textTransform:"uppercase" }}>
              Stage {stage.stageNum} — {stage.label}
            </span>
          </div>

          {/* Big emoji */}
          <div style={{ fontSize:52, marginBottom:8, lineHeight:1 }}>{stage.emoji}</div>

          {/* Stars */}
          <div style={{ marginBottom:12 }}>
            <StarRow filled={stage.starCount} total={3} color="rgba(255,255,255,0.9)" />
          </div>

          {/* Title */}
          <h1 style={{
            color:"white", fontWeight:900, fontSize:20,
            lineHeight:1.2, margin:0, textShadow:"0 2px 8px rgba(0,0,0,0.2)",
          }}>
            Mastery Certificate
          </h1>
          <p style={{ color:"rgba(255,255,255,0.85)", fontSize:12, fontWeight:600, margin:"4px 0 0" }}>
            {stage.tagline}
          </p>
        </div>

        {/* ── CERTIFICATE BODY ── */}
        <div style={{ padding:"24px 24px 20px" }}>

          {/* Scholar info */}
          <div style={{ textAlign:"center", marginBottom:20 }}>
            <p style={{ color:"#64748b", fontSize:11, fontWeight:700, letterSpacing:"0.08em",
              textTransform:"uppercase", margin:"0 0 4px" }}>This certifies that</p>
            <p style={{
              color:"#1e293b", fontSize:24, fontWeight:900,
              margin:"0 0 2px", letterSpacing:"-0.02em",
            }}>{scholarName}</p>
            <p style={{ color:"#64748b", fontSize:11, fontWeight:600, margin:0 }}>
              has demonstrated <strong style={{ color: stage.accent }}>{stage.label}</strong> mastery in
            </p>
          </div>

          {/* Topic block */}
          <div style={{
            background: stage.accentLight,
            border: `2px solid ${stage.accent}40`,
            borderRadius: 16,
            padding: "16px 20px",
            textAlign: "center",
            marginBottom: 16,
          }}>
            <div style={{ fontSize:28, marginBottom:6 }}>{subj.icon}</div>
            <p style={{
              color:"#1e293b", fontSize:18, fontWeight:900,
              margin:"0 0 2px", letterSpacing:"-0.01em",
            }}>{topic}</p>
            <p style={{ color:"#64748b", fontSize:12, fontWeight:600, margin:0, textTransform:"capitalize" }}>
              {subject.replace(/_/g," ")}
            </p>
          </div>

          {/* Stats row */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:16 }}>
            {[
              { label:"Mastery", value:`${Math.round(masteryScore * 100)}%`, icon:"🧠" },
              { label:"Accuracy", value:`${accuracy}%`, icon:"🎯" },
              { label:"XP Earned", value:`+${xpEarned}`, icon:"⭐" },
            ].map(({ label, value, icon }) => (
              <div key={label} style={{
                background:"#f8fafc", borderRadius:12, padding:"10px 8px",
                textAlign:"center", border:"1px solid #e2e8f0",
              }}>
                <div style={{ fontSize:16, marginBottom:2 }}>{icon}</div>
                <p style={{ color:"#1e293b", fontWeight:900, fontSize:14, margin:"0 0 1px" }}>{value}</p>
                <p style={{ color:"#94a3b8", fontSize:9, fontWeight:700, textTransform:"uppercase",
                  letterSpacing:"0.06em", margin:0 }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Stage progression bar */}
          <div style={{ marginBottom:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
              {["Building","On Track","Stellar"].map((s, i) => (
                <div key={s} style={{ textAlign:"center", flex:1 }}>
                  <div style={{
                    width:24, height:24, borderRadius:"50%",
                    background: i < stage.stageNum ? stage.accent : "#e2e8f0",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    margin:"0 auto 2px", fontSize:11, color:"white", fontWeight:800,
                  }}>{i < stage.stageNum ? "✓" : i+1}</div>
                  <p style={{
                    fontSize:9, fontWeight:700, color: i < stage.stageNum ? stage.accent : "#94a3b8",
                    textTransform:"uppercase", letterSpacing:"0.05em", margin:0,
                  }}>{s}</p>
                </div>
              ))}
            </div>
            <div style={{ height:4, background:"#e2e8f0", borderRadius:99, position:"relative" }}>
              <div style={{
                height:"100%", borderRadius:99, background: stage.gradient,
                width: stage.stageNum === 1 ? "33%" : stage.stageNum === 2 ? "66%" : "100%",
                transition:"width 1s ease",
              }}/>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            borderTop:"1px solid #e2e8f0", paddingTop:12, marginBottom:16,
            display:"flex", justifyContent:"space-between", alignItems:"center",
          }}>
            <div>
              <p style={{ color:"#94a3b8", fontSize:9, fontWeight:700, textTransform:"uppercase",
                letterSpacing:"0.06em", margin:"0 0 1px" }}>Issued by LaunchPard</p>
              <p style={{ color:"#64748b", fontSize:11, fontWeight:600, margin:0 }}>{dateStr}</p>
            </div>
            <div style={{ textAlign:"right" }}>
              <p style={{ color:"#94a3b8", fontSize:9, fontWeight:700, textTransform:"uppercase",
                letterSpacing:"0.06em", margin:"0 0 1px" }}>Certificate ID</p>
              <p style={{ color:"#64748b", fontSize:11, fontWeight:800, fontFamily:"monospace", margin:0 }}>{id}</p>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display:"flex", gap:10 }}>
            <button
              onClick={handlePrint}
              style={{
                flex:1, padding:"12px 0", borderRadius:14, border:"none",
                background: stage.gradient, color:"white", fontWeight:800, fontSize:13,
                cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6,
              }}>
              <Download size={15}/> Save PDF
            </button>
            <button
              onClick={handleShare}
              style={{
                flex:1, padding:"12px 0", borderRadius:14, border:"2px solid #e2e8f0",
                background:"white", color:"#334155", fontWeight:800, fontSize:13,
                cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6,
              }}>
              <Share2 size={15}/> {copied ? "Copied!" : "Share"}
            </button>
          </div>

          {/* Next stage hint */}
          {stage.stageNum < 3 && (
            <div style={{
              marginTop:12, background:"#f8fafc", borderRadius:12,
              padding:"10px 14px", textAlign:"center",
            }}>
              <p style={{ color:"#64748b", fontSize:11, fontWeight:700, margin:0 }}>
                🎯 Keep practising {topic} to unlock Stage {stage.stageNum + 1} —{" "}
                <strong style={{ color: stage.accent }}>
                  {stage.stageNum === 1 ? "On Track" : "Stellar"}
                </strong>
                !
              </p>
            </div>
          )}
        </div>

        {/* Close */}
        <button onClick={onClose} className="no-print"
          style={{
            position:"absolute", top:12, right:12, zIndex:30,
            width:32, height:32, borderRadius:"50%", border:"none",
            background:"rgba(255,255,255,0.25)", color:"white",
            display:"flex", alignItems:"center", justifyContent:"center",
            cursor:"pointer", backdropFilter:"blur(4px)",
          }}>
          <X size={16}/>
        </button>
      </div>
    </div>
  );
}