"use client";
/**
 * TaraPanel.jsx — v2
 * Deploy to: src/components/dashboard/TaraPanel.jsx
 *
 * Dedicated AI tutor panel for right sidebar. Auto-speaks for KS1.
 * TTS toggle. Criteria checklist for KS4. Hint input for all bands.
 */

import React, { useState, useCallback, useEffect, useRef } from "react";
import { MIcon } from "./DashboardShell";

const BAND_CONFIG = {
  ks1: { name: "Tara the Star", subtitle: "Your magical guide", gradient: "linear-gradient(135deg, #f59e0b, #fbbf24)",
    icon: "face_retouching_natural", bubbleBg: "rgba(245,158,11,0.06)", bubbleBorder: "rgba(245,158,11,0.15)",
    inputPlaceholder: "Ask Tara for help...", accentColor: "#f59e0b", autoSpeak: true },
  ks2: { name: "Commander Tara", subtitle: "Mission Advisor", gradient: "linear-gradient(135deg, #818cf8, #6366f1)",
    icon: "face_retouching_natural", bubbleBg: "rgba(129,140,248,0.06)", bubbleBorder: "rgba(129,140,248,0.15)",
    inputPlaceholder: "Ask Tara, Commander...", accentColor: "#818cf8", autoSpeak: false },
  ks3: { name: "Tara", subtitle: "Career Advisor", gradient: "linear-gradient(135deg, #0ea5e9, #06b6d4)",
    icon: "psychology", bubbleBg: "rgba(14,165,233,0.04)", bubbleBorder: "rgba(14,165,233,0.12)",
    inputPlaceholder: "Ask Tara for guidance...", accentColor: "#0ea5e9", autoSpeak: false },
  ks4: { name: "AI Assistant Tara", subtitle: "Exam Precision", gradient: "linear-gradient(135deg, #a78bfa, #7c3aed)",
    icon: "face_retouching_natural", bubbleBg: "rgba(167,139,250,0.06)", bubbleBorder: "rgba(167,139,250,0.12)",
    inputPlaceholder: "Ask Tara for a hint...", accentColor: "#a78bfa", autoSpeak: false },
};

const TTS_URL = process.env.NEXT_PUBLIC_TTS_API_URL || "https://launchpard-tts.tim-c31.workers.dev";

export default function TaraPanel({ band = "ks2", message, criteria = [], onSendMessage, isSpeaking: externalSpeaking = false }) {
  const cfg = BAND_CONFIG[band] || BAND_CONFIG.ks2;
  const isDark = band === "ks2" || band === "ks4";
  const [input, setInput] = useState("");
  const [ttsEnabled, setTtsEnabled] = useState(cfg.autoSpeak);
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef(null);
  const lastSpokenRef = useRef("");

  const isSpeaking = externalSpeaking || speaking;

  // Auto-speak message when it changes (KS1 only by default, togglable)
  useEffect(() => {
    if (!ttsEnabled || !message || message === lastSpokenRef.current) return;
    lastSpokenRef.current = message;

    const speak = async () => {
      try {
        setSpeaking(true);
        // Stop any current audio
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }

        const res = await fetch(TTS_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: message, voice: "nova", speed: band === "ks1" ? 0.85 : 1.0 }),
        });

        if (!res.ok) throw new Error("TTS failed");

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;

        audio.onended = () => {
          setSpeaking(false);
          URL.revokeObjectURL(url);
          audioRef.current = null;
        };
        audio.onerror = () => {
          setSpeaking(false);
          audioRef.current = null;
        };

        await audio.play();
      } catch (err) {
        console.warn("[TaraPanel TTS]", err.message);
        setSpeaking(false);
      }
    };

    speak();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [message, ttsEnabled, band]);

  const handleSend = useCallback(() => {
    if (!input.trim()) return;
    onSendMessage?.(input.trim());
    setInput("");
  }, [input, onSendMessage]);

  const toggleTTS = () => {
    if (speaking && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setSpeaking(false);
    }
    setTtsEnabled(!ttsEnabled);
  };

  return (
    <div className="rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: isDark ? "rgba(34,42,61,0.8)" : "rgba(255,255,255,0.9)",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
        backdropFilter: "blur(16px)",
        boxShadow: isDark ? "0 8px 32px rgba(0,0,0,0.3)" : "0 8px 24px rgba(0,0,0,0.04)",
      }}>

      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}`,
          background: isDark ? "rgba(167,139,250,0.04)" : "rgba(14,165,233,0.03)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: cfg.gradient }}>
            <MIcon name={cfg.icon} filled size={20} className="text-white" />
          </div>
          <div>
            <h4 className="text-sm font-bold leading-tight" style={{ color: isDark ? "#fff" : "#1e293b" }}>{cfg.name}</h4>
            <span className="text-[10px] uppercase tracking-[0.12em] font-semibold"
              style={{ color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)" }}>{cfg.subtitle}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* TTS toggle */}
          <button onClick={toggleTTS} title={ttsEnabled ? "Mute Tara" : "Hear Tara speak"}
            className="p-1 rounded-lg transition-opacity hover:opacity-80"
            style={{ color: ttsEnabled ? cfg.accentColor : isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)" }}>
            <MIcon name={ttsEnabled ? "volume_up" : "volume_off"} size={16} />
          </button>
          {/* Speaking indicator */}
          {isSpeaking && (
            <div className="flex gap-0.5 items-center">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-1 rounded-full"
                  style={{ background: cfg.accentColor, height: `${8 + i * 4}px`,
                    animation: `tara-pulse 0.8s ease-in-out ${i * 0.15}s infinite alternate` }} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Message */}
      <div className="px-4 py-4 flex-1 space-y-4">
        {message && (
          <div className="p-3 rounded-xl text-xs leading-relaxed"
            style={{ background: cfg.bubbleBg, border: `1px solid ${cfg.bubbleBorder}`,
              color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)",
              fontStyle: band === "ks4" ? "normal" : "italic" }}>
            {message}
          </div>
        )}

        {/* Criteria (KS4) */}
        {criteria.length > 0 && (
          <div className="space-y-2">
            <h5 className="text-[10px] uppercase tracking-[0.15em] font-bold"
              style={{ color: isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.3)" }}>Criteria Analysis</h5>
            {criteria.map((c, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg text-xs font-semibold"
                style={{ background: c.met ? "rgba(34,197,94,0.06)" : isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                  border: `1px solid ${c.met ? "rgba(34,197,94,0.2)" : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}`,
                  color: isDark ? "#fff" : "#1e293b", opacity: c.met ? 1 : 0.5 }}>
                <MIcon name={c.met ? "check_circle" : "radio_button_unchecked"} size={16} className={c.met ? "text-green-400" : ""} />
                {c.label}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-3 py-3"
        style={{ borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}`,
          background: isDark ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0.02)" }}>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
            border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}` }}>
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder={cfg.inputPlaceholder}
            className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-xs"
            style={{ color: isDark ? "#fff" : "#1e293b", caretColor: cfg.accentColor }} />
          <button onClick={handleSend} className="transition-opacity hover:opacity-80" style={{ color: cfg.accentColor }}>
            <MIcon name="send" size={16} />
          </button>
        </div>
      </div>

      <style>{`@keyframes tara-pulse { from { transform: scaleY(0.6); } to { transform: scaleY(1.4); } }`}</style>
    </div>
  );
}