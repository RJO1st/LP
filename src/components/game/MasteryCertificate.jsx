"use client";
/**
 * MasteryCertificate.jsx
 * Deploy to: src/components/game/MasteryCertificate.jsx
 *
 * Shown when a scholar hits ≥90% accuracy (Distinction grade).
 * Features:
 *   - Animated certificate with space/mission theme
 *   - Confetti burst on mount
 *   - Print / Save as PDF (native browser print dialog, print-optimised CSS)
 *   - Share via Web Share API (falls back to clipboard copy)
 *   - Dismissible — calls onClose when done
 *
 * Usage (from EngineFinished in QuizShell.jsx):
 *   import MasteryCertificate from "./MasteryCertificate";
 *
 *   {showCert && (
 *     <MasteryCertificate
 *       scholarName="Amara"
 *       subject="Maths"
 *       topic="Fractions"
 *       accuracy={94}
 *       xpEarned={120}
 *       date={new Date()}
 *       onClose={() => setShowCert(false)}
 *     />
 *   )}
 */

import React, { useEffect, useRef, useState } from "react";
import { X, Download, Share2, Star, Rocket, Zap, Award, CheckCircle } from "lucide-react";

// ─── CONFETTI ────────────────────────────────────────────────────────────────
function Confetti({ active }) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const particles = useRef([]);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    canvas.width  = W;
    canvas.height = H;

    const COLORS = ["#6366f1","#a855f7","#ec4899","#f59e0b","#10b981","#3b82f6","#f97316"];
    const COUNT  = 120;

    particles.current = Array.from({ length: COUNT }, () => ({
      x:     Math.random() * W,
      y:     -10 - Math.random() * 60,
      w:     6 + Math.random() * 8,
      h:     10 + Math.random() * 8,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      vx:    (Math.random() - 0.5) * 3,
      vy:    2 + Math.random() * 4,
      angle: Math.random() * 360,
      spin:  (Math.random() - 0.5) * 6,
      opacity: 1,
    }));

    let frame = 0;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      frame++;
      particles.current.forEach(p => {
        p.x     += p.vx;
        p.y     += p.vy;
        p.angle += p.spin;
        if (frame > 90) p.opacity = Math.max(0, p.opacity - 0.012);
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
        ctx.rotate((p.angle * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (particles.current.some(p => p.opacity > 0)) {
        animRef.current = requestAnimationFrame(draw);
      }
    };
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 10 }}
    />
  );
}

// ─── STAR FIELD ──────────────────────────────────────────────────────────────
const STARS = Array.from({ length: 28 }, (_, i) => ({
  x:    `${5 + (i * 17.3) % 90}%`,
  y:    `${3 + (i * 23.7) % 90}%`,
  size: 1 + (i % 3),
  delay: `${(i * 0.3) % 2}s`,
}));

// ─── SUBJECT COLOURS ─────────────────────────────────────────────────────────
const SUBJECT_THEME = {
  maths:             { from: "#4f46e5", to: "#7c3aed", label: "Mathematics",      icon: "🔢" },
  english:           { from: "#0891b2", to: "#0e7490", label: "English",           icon: "📖" },
  verbal_reasoning:  { from: "#7c3aed", to: "#6d28d9", label: "Verbal Reasoning",  icon: "🧩" },
  nvr:               { from: "#b45309", to: "#92400e", label: "Non-Verbal Reasoning", icon: "🔷" },
  science:           { from: "#059669", to: "#047857", label: "Science",           icon: "🔬" },
  physics:           { from: "#1d4ed8", to: "#1e40af", label: "Physics",           icon: "⚡" },
  chemistry:         { from: "#dc2626", to: "#b91c1c", label: "Chemistry",         icon: "⚗️" },
  biology:           { from: "#16a34a", to: "#15803d", label: "Biology",           icon: "🌿" },
  history:           { from: "#92400e", to: "#78350f", label: "History",           icon: "🏛️" },
  geography:         { from: "#065f46", to: "#064e3b", label: "Geography",         icon: "🌍" },
  default:           { from: "#4f46e5", to: "#7c3aed", label: "Subject",           icon: "⭐" },
};

function subjectTheme(subject) {
  const key = (subject || "").toLowerCase().replace(/\s+/g, "_");
  return SUBJECT_THEME[key] || SUBJECT_THEME.default;
}

// ─── FORMAT DATE ─────────────────────────────────────────────────────────────
function fmtDate(d) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  }).format(d instanceof Date ? d : new Date(d));
}

// ─── CERTIFICATE ID ──────────────────────────────────────────────────────────
function certId(scholarName, subject, topic, date) {
  const seed = `${scholarName}${subject}${topic}${date.getFullYear()}`;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  return `LP-${Math.abs(h).toString(16).toUpperCase().slice(0, 8)}`;
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function MasteryCertificate({
  scholarName = "Cadet",
  subject     = "Maths",
  topic       = "Topic",
  accuracy    = 100,
  xpEarned    = 0,
  date        = new Date(),
  onClose,
}) {
  const theme     = subjectTheme(subject);
  const certRef   = useRef(null);
  const [copied,  setCopied]  = useState(false);
  const [visible, setVisible] = useState(false);
  const id = certId(scholarName, subject, topic, date instanceof Date ? date : new Date(date));

  useEffect(() => {
    // Stagger entrance
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  // ── Print / Save as PDF ──────────────────────────────────────────────────
  const handlePrint = () => {
    // Add print-only styles then trigger print dialog
    const styleId = "cert-print-style";
    if (!document.getElementById(styleId)) {
      const s = document.createElement("style");
      s.id = styleId;
      s.textContent = `
        @media print {
          body > * { display: none !important; }
          #launchpard-cert-printroot { display: flex !important; }
          #launchpard-cert-printroot .no-print { display: none !important; }
          @page { margin: 0; size: A4 landscape; }
        }
      `;
      document.head.appendChild(s);
    }
    // Mark the cert root for print targeting
    if (certRef.current) certRef.current.id = "launchpard-cert-printroot";
    window.print();
  };

  // ── Share ────────────────────────────────────────────────────────────────
  const shareText = `🚀 ${scholarName} just achieved MASTERY in ${topic} (${theme.label}) on LaunchPard! Accuracy: ${accuracy}% — Certificate ID: ${id}`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "LaunchPard Mastery Certificate", text: shareText });
        return;
      } catch {}
    }
    await navigator.clipboard.writeText(shareText).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* Print-safe global style */}
      <style>{`
        @keyframes certFloat {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-6px); }
        }
        @keyframes certGlow {
          0%, 100% { box-shadow: 0 0 24px 4px rgba(99,102,241,0.35); }
          50%       { box-shadow: 0 0 48px 12px rgba(168,85,247,0.55); }
        }
        @keyframes certStarPulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.4); }
        }
        @keyframes certSlideIn {
          from { opacity: 0; transform: translateY(32px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
        @keyframes certBadgeSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .cert-star { animation: certStarPulse var(--d, 2s) ease-in-out infinite; }
        .cert-float { animation: certFloat 4s ease-in-out infinite; }
        .cert-glow  { animation: certGlow  3s ease-in-out infinite; }
        .cert-slide { animation: certSlideIn 0.55s cubic-bezier(.22,.68,0,1.2) forwards; }
      `}</style>

      {/* Overlay */}
      <div
        ref={certRef}
        className="fixed inset-0 z-[9000] flex items-center justify-center p-4"
        style={{
          background: "radial-gradient(ellipse at 50% 30%, #1e1b4b 0%, #0f0e1a 60%, #000 100%)",
        }}
      >
        <Confetti active={visible} />

        {/* Stars bg */}
        {STARS.map((s, i) => (
          <div
            key={i}
            className="cert-star absolute rounded-full bg-white pointer-events-none"
            style={{
              left: s.x, top: s.y,
              width: s.size, height: s.size,
              "--d": `${1.2 + i * 0.15}s`,
              animationDelay: s.delay,
            }}
          />
        ))}

        {/* Close button — top right of overlay */}
        <button
          onClick={onClose}
          className="no-print absolute top-5 right-5 z-20 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
        >
          <X size={18} />
        </button>

        {/* Certificate card */}
        <div
          className={`cert-float cert-glow relative z-10 w-full rounded-3xl overflow-hidden
            ${visible ? "cert-slide" : "opacity-0"}`}
          style={{
            maxWidth: 680,
            background: "linear-gradient(135deg, #1e1b4b 0%, #0f172a 50%, #1e1b4b 100%)",
            border: "2px solid rgba(99,102,241,0.4)",
          }}
        >
          {/* Top gradient bar */}
          <div
            className="h-2 w-full"
            style={{ background: `linear-gradient(90deg, ${theme.from}, ${theme.to}, #ec4899, #f59e0b)` }}
          />

          {/* Inner gold border frame */}
          <div className="m-4 rounded-2xl p-1" style={{
            background: "linear-gradient(135deg, rgba(251,191,36,0.5), rgba(167,139,250,0.3), rgba(251,191,36,0.5))",
          }}>
            <div className="rounded-xl overflow-hidden" style={{ background: "#0f0e1a" }}>

              {/* Header */}
              <div className="px-8 pt-7 pb-4 text-center relative" style={{
                background: `linear-gradient(180deg, ${theme.from}22 0%, transparent 100%)`,
              }}>
                {/* Logo row */}
                <div className="flex items-center justify-center gap-3 mb-4">
                  <Rocket size={20} className="text-indigo-400" />
                  <span className="text-indigo-300 text-sm font-black tracking-[0.25em] uppercase">
                    LaunchPard
                  </span>
                  <Rocket size={20} className="text-indigo-400 scale-x-[-1]" />
                </div>

                {/* "Certificate of Mastery" */}
                <p className="text-amber-400 text-xs font-black tracking-[0.3em] uppercase mb-1">
                  Certificate of Mastery
                </p>
                <div className="w-24 h-px mx-auto mb-4" style={{
                  background: "linear-gradient(90deg, transparent, #f59e0b, transparent)",
                }} />

                {/* Cadet name */}
                <p className="text-slate-400 text-sm mb-1">This certifies that</p>
                <h1
                  className="font-black text-white mb-1 leading-tight"
                  style={{
                    fontSize: "clamp(1.6rem, 4vw, 2.8rem)",
                    textShadow: `0 0 32px ${theme.from}aa`,
                    fontFamily: "'Georgia', serif",
                    letterSpacing: "0.02em",
                  }}
                >
                  {scholarName}
                </h1>
                <p className="text-slate-400 text-sm mb-4">has achieved mastery in</p>

                {/* Subject + Topic badge */}
                <div className="inline-flex flex-col items-center gap-2 mb-4">
                  <div
                    className="px-8 py-3 rounded-2xl"
                    style={{
                      background: `linear-gradient(135deg, ${theme.from}33, ${theme.to}55)`,
                      border: `1px solid ${theme.from}66`,
                    }}
                  >
                    <p className="text-2xl mb-1">{theme.icon}</p>
                    <p className="text-white font-black text-xl leading-tight">{topic}</p>
                    <p style={{ color: `${theme.from}` }} className="text-sm font-bold mt-0.5">
                      {theme.label}
                    </p>
                  </div>
                </div>
              </div>

              {/* Stats row */}
              <div
                className="mx-6 mb-5 rounded-2xl p-4 grid grid-cols-3 gap-3 text-center"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <div>
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <CheckCircle size={12} className="text-emerald-400" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Accuracy</span>
                  </div>
                  <p className="text-2xl font-black text-emerald-400">{accuracy}%</p>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Award size={12} className="text-amber-400" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Grade</span>
                  </div>
                  <p className="text-2xl font-black text-amber-400">
                    {accuracy >= 95 ? "⭐ Star" : "Distinction"}
                  </p>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Zap size={12} className="text-purple-400" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Stardust</span>
                  </div>
                  <p className="text-2xl font-black text-purple-400">+{xpEarned}</p>
                </div>
              </div>

              {/* Date + cert ID */}
              <div className="px-6 pb-5 flex items-end justify-between">
                <div>
                  <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-0.5">Awarded</p>
                  <p className="text-slate-400 text-sm font-bold">{fmtDate(date)}</p>
                </div>

                {/* Seal */}
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <div
                    className="absolute inset-0 rounded-full opacity-30"
                    style={{
                      background: `conic-gradient(${theme.from}, ${theme.to}, #f59e0b, ${theme.from})`,
                      animation: "certBadgeSpin 8s linear infinite",
                    }}
                  />
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center z-10"
                    style={{ background: `linear-gradient(135deg, ${theme.from}, ${theme.to})` }}
                  >
                    <Star size={18} className="text-white fill-white" />
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-0.5">Certificate ID</p>
                  <p className="text-slate-500 text-xs font-mono">{id}</p>
                </div>
              </div>

              {/* Bottom bar */}
              <div
                className="h-1 w-full"
                style={{ background: `linear-gradient(90deg, ${theme.from}, ${theme.to}, #ec4899)` }}
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="no-print px-6 pb-6 pt-2 flex gap-3">
            {/* Print / Save PDF */}
            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-sm text-white transition-all active:scale-95"
              style={{ background: `linear-gradient(135deg, ${theme.from}, ${theme.to})` }}
            >
              <Download size={15} />
              Save as PDF
            </button>

            {/* Share */}
            <button
              onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-sm transition-all active:scale-95"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: copied ? "#10b981" : "white",
              }}
            >
              <Share2 size={15} />
              {copied ? "Copied! ✓" : "Share"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}