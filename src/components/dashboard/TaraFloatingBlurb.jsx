"use client";
/**
 * TaraFloatingBlurb.jsx — v2 (Toggle Button + 2-Exchange Limit)
 * Deploy to: src/components/dashboard/TaraFloatingBlurb.jsx
 *
 * A floating toggle button that opens a quick-ask panel.
 * The scholar can type a question and Tara responds with a single answer.
 * Max 2 exchanges per open (1 question → 1 answer, then 1 follow-up → 1 answer).
 * After 2 exchanges the panel auto-closes with a "See you later!" message.
 * Adapts visually per KS band theme.
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";

// Pre-canned quick answers — a lightweight client-side fallback.
// In production this would call an AI endpoint; for now we give helpful nudges.
const QUICK_ANSWERS = {
  ks1: [
    "Great question! Try breaking it into smaller parts — you can do this! 🌟",
    "Think about what you already know, then take your best guess! 🧠",
    "That's a super question! Ask your teacher if you need more help! 📖",
    "You're so curious — I love it! Keep exploring! 🔭",
  ],
  ks2: [
    "Good thinking, Commander! Try re-reading the question carefully. 🚀",
    "Think about the key words in the question — they'll guide you! 🔑",
    "Try working backwards from the answer choices — eliminate wrong ones! 🎯",
    "Great question! Sometimes drawing it out helps. Give it a try! ✏️",
  ],
  ks3: [
    "Smart question! Break it down: what do you already know about this topic? 📋",
    "Try looking at it from a different angle — what's the core concept? 💡",
    "Good thinking! Review your notes on this topic, then give it another shot. 📖",
    "Focus on understanding the 'why', not just the 'what'. You'll get there! 🎯",
  ],
  ks4: [
    "Good question. Start with the mark scheme criteria for this topic. 📝",
    "Think about the command word — it tells you exactly what's expected. 🎯",
    "Try doing a timed practice question on this topic to build confidence. ⏱️",
    "Review the examiner's report for common pitfalls on this topic type. 📊",
  ],
};

const FAREWELL = {
  ks1: "Bye for now, little star! You're doing great! 🌟",
  ks2: "Mission complete, Commander! Catch you later! 🚀",
  ks3: "Good chat! Keep building those skills! 💪",
  ks4: "Session done. Stay focused — you've got this! 🎯",
};

export default function TaraFloatingBlurb({ scholarName }) {
  const { band, theme: t, isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [exchanges, setExchanges] = useState([]); // [{role:"user"|"tara", text}]
  const [input, setInput] = useState("");
  const [isClosing, setIsClosing] = useState(false);
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  const avatar = band === "ks1" ? "🧚" : band === "ks2" ? "🤖" : band === "ks3" ? "🎯" : "🧠";
  const accentColor = t.colours.accent;
  const maxExchanges = 2; // 2 user messages max

  const getAnswer = useCallback(() => {
    const pool = QUICK_ANSWERS[band] || QUICK_ANSWERS.ks2;
    return pool[Math.floor(Math.random() * pool.length)];
  }, [band]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  const handleSend = useCallback(() => {
    const q = input.trim();
    if (!q) return;

    const userCount = exchanges.filter(e => e.role === "user").length;
    if (userCount >= maxExchanges) return; // already at limit

    const newExchanges = [...exchanges, { role: "user", text: q }];

    // Simulate Tara's response
    const answer = getAnswer();
    newExchanges.push({ role: "tara", text: answer });

    setExchanges(newExchanges);
    setInput("");

    // Check if we've hit the limit
    const newUserCount = newExchanges.filter(e => e.role === "user").length;
    if (newUserCount >= maxExchanges) {
      // Auto-close after showing farewell
      setTimeout(() => {
        const farewell = FAREWELL[band] || FAREWELL.ks2;
        setExchanges(prev => [...prev, { role: "tara", text: farewell }]);
        setTimeout(() => {
          setIsClosing(true);
          setTimeout(() => {
            setIsOpen(false);
            setIsClosing(false);
            setExchanges([]);
          }, 300);
        }, 2500);
      }, 1200);
    }
  }, [input, exchanges, getAnswer, band, maxExchanges]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleToggle = () => {
    if (isOpen) {
      setIsOpen(false);
      setExchanges([]);
      setInput("");
    } else {
      setIsOpen(true);
    }
  };

  const userMsgCount = exchanges.filter(e => e.role === "user").length;
  const canStillAsk = userMsgCount < maxExchanges;

  return (
    <div style={{
      position: "fixed", bottom: 80, right: 16, zIndex: 45,
      display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8,
    }}>
      {/* Chat panel */}
      {isOpen && (
        <div
          ref={panelRef}
          style={{
            width: 300,
            maxHeight: 380,
            borderRadius: band === "ks1" ? 20 : 14,
            background: isDark ? "rgba(18,24,44,0.95)" : "rgba(255,255,255,0.96)",
            backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
            border: `1px solid ${isDark ? `${accentColor}20` : `${accentColor}15`}`,
            boxShadow: `0 12px 40px ${isDark ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.12)"}`,
            animation: isClosing ? "taraSlideOut 0.3s ease-in forwards" : "taraSlideIn 0.3s ease-out",
            display: "flex", flexDirection: "column", overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{
            padding: "10px 14px",
            borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>{avatar}</span>
              <div>
                <div style={{
                  fontSize: 12, fontWeight: 800, color: accentColor,
                  fontFamily: t.fonts.display, letterSpacing: "0.04em",
                }}>
                  Ask Tara
                </div>
                <div style={{
                  fontSize: 9, fontWeight: 700,
                  color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
                  textTransform: "uppercase", letterSpacing: "0.08em",
                }}>
                  {canStillAsk ? `${maxExchanges - userMsgCount} question${maxExchanges - userMsgCount !== 1 ? "s" : ""} left` : "session complete"}
                </div>
              </div>
            </div>
            <button
              onClick={handleToggle}
              style={{
                width: 24, height: 24, borderRadius: 8,
                background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.3)",
                fontSize: 14,
              }}
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: "auto", padding: "10px 14px",
            display: "flex", flexDirection: "column", gap: 8,
          }}>
            {exchanges.length === 0 && (
              <div style={{
                textAlign: "center", padding: "20px 10px",
                color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.25)",
                fontSize: 12, fontWeight: 600, fontFamily: t.fonts.body,
              }}>
                {band === "ks1" ? "Hi! What would you like to know? 🌈" :
                 band === "ks2" ? "Commander, what's your question? 🛸" :
                 band === "ks3" ? "What can I help you with? 💡" :
                 "What topic do you need help with? 📝"}
              </div>
            )}
            {exchanges.map((ex, i) => (
              <div
                key={i}
                style={{
                  alignSelf: ex.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                  padding: "8px 12px",
                  borderRadius: ex.role === "user"
                    ? (band === "ks1" ? "16px 16px 4px 16px" : "12px 12px 4px 12px")
                    : (band === "ks1" ? "16px 16px 16px 4px" : "12px 12px 12px 4px"),
                  background: ex.role === "user"
                    ? `${accentColor}18`
                    : (isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)"),
                  border: ex.role === "user"
                    ? `1px solid ${accentColor}25`
                    : `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"}`,
                }}
              >
                {ex.role === "tara" && (
                  <span style={{ fontSize: 10, marginRight: 4 }}>{avatar}</span>
                )}
                <span style={{
                  fontSize: band === "ks1" ? 12 : 11,
                  fontWeight: 600, lineHeight: 1.5,
                  color: isDark ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.65)",
                  fontFamily: t.fonts.body,
                }}>
                  {ex.text}
                </span>
              </div>
            ))}
          </div>

          {/* Input */}
          {canStillAsk && (
            <div style={{
              padding: "8px 10px",
              borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
              display: "flex", gap: 6, alignItems: "center",
            }}>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={band === "ks1" ? "Ask me anything..." : "Type your question..."}
                style={{
                  flex: 1, padding: "8px 12px",
                  borderRadius: band === "ks1" ? 16 : 10,
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
                  background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                  color: isDark ? "#e0e6f0" : "#1a1d2e",
                  fontSize: 12, fontWeight: 600, fontFamily: t.fonts.body,
                  outline: "none",
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                style={{
                  width: 32, height: 32, borderRadius: band === "ks1" ? 12 : 8,
                  background: input.trim() ? accentColor : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"),
                  border: "none", cursor: input.trim() ? "pointer" : "default",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: input.trim() ? "#fff" : (isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"),
                  fontSize: 14, transition: "all 0.2s",
                }}
              >
                ↑
              </button>
            </div>
          )}
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={handleToggle}
        style={{
          width: band === "ks1" ? 52 : 46,
          height: band === "ks1" ? 52 : 46,
          borderRadius: band === "ks1" ? "50%" : 14,
          background: isOpen
            ? accentColor
            : (isDark
              ? `linear-gradient(135deg, ${accentColor}30, ${accentColor}15)`
              : `linear-gradient(135deg, ${accentColor}20, ${accentColor}10)`),
          border: `2px solid ${accentColor}${isOpen ? "" : "40"}`,
          boxShadow: isOpen
            ? `0 4px 24px ${accentColor}40`
            : `0 4px 20px ${accentColor}25`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: band === "ks1" ? 24 : 20,
          cursor: "pointer",
          transition: "all 0.2s",
          color: isOpen ? "#fff" : undefined,
        }}
        title={isOpen ? "Close Tara" : "Ask Tara a question"}
      >
        {isOpen ? "✕" : avatar}
      </button>

      <style>{`
        @keyframes taraSlideIn {
          from { opacity: 0; transform: translateY(8px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes taraSlideOut {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to { opacity: 0; transform: translateY(8px) scale(0.95); }
        }
      `}</style>
    </div>
  );
}
