"use client";
/**
 * BossBattleUI.jsx — Visual boss battle encounter
 *
 * Renders the boss fight overlay during a weekly boss battle quest.
 * Shows boss HP bar, scholar shields, damage animations, and win/lose states.
 *
 * Props:
 *   battle       — BossBattle instance (from bossBattleEngine.js)
 *   question     — current question object ({ q, opts, a, ... })
 *   onAnswer     — callback(optionIndex) when scholar selects an answer
 *   onComplete   — callback(results) when battle ends
 *   onClose      — close/exit battle
 *   band         — "ks1" | "ks2" | "ks3" | "ks4"
 */

import React, { useState, useEffect, useRef } from "react";
import { calculatePercentage } from "@/lib/calculationUtils";

// ─── SHIELD DISPLAY ──────────────────────────────────────────────────────────

function ShieldBar({ shields, maxShields = 3 }) {
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
      {Array.from({ length: maxShields }).map((_, i) => (
        <div
          key={i}
          style={{
            fontSize: 20,
            opacity: i < shields ? 1 : 0.2,
            transform: i < shields ? "scale(1)" : "scale(0.8)",
            transition: "all 0.4s ease",
            filter: i < shields ? "none" : "grayscale(1)",
          }}
        >
          🛡️
        </div>
      ))}
    </div>
  );
}

// ─── HP BAR ──────────────────────────────────────────────────────────────────

function BossHPBar({ current, max, colour }) {
  const pct = max > 0 ? Math.max(0, (current / max) * 100) : 0;
  const hpColour = pct > 50 ? colour : pct > 25 ? "#f59e0b" : "#ef4444";

  return (
    <div style={{ width: "100%" }}>
      <div style={{
        display: "flex", justifyContent: "space-between",
        fontSize: 11, fontWeight: 700, marginBottom: 4,
      }}>
        <span style={{ color: "rgba(255,255,255,0.6)" }}>HP</span>
        <span style={{ color: hpColour }}>{current} / {max}</span>
      </div>
      <div style={{
        height: 12, borderRadius: 6, background: "rgba(255,255,255,0.1)",
        overflow: "hidden", position: "relative",
      }}>
        <div style={{
          height: "100%", width: `${pct}%`,
          background: `linear-gradient(90deg, ${hpColour}, ${hpColour}cc)`,
          borderRadius: 6, transition: "width 0.6s ease, background 0.4s",
          boxShadow: `0 0 10px ${hpColour}40`,
        }} />
      </div>
    </div>
  );
}

// ─── DAMAGE FLASH ────────────────────────────────────────────────────────────

function DamageFlash({ damage, isWeakness, visible }) {
  if (!visible || !damage) return null;

  return (
    <div style={{
      position: "absolute", top: "30%", left: "50%",
      transform: "translate(-50%, -50%)",
      fontSize: 28, fontWeight: 900,
      color: isWeakness ? "#fbbf24" : "#ef4444",
      textShadow: `0 0 20px ${isWeakness ? "#fbbf24" : "#ef4444"}`,
      animation: "floatUp 1s ease-out forwards",
      pointerEvents: "none", zIndex: 10,
    }}>
      -{damage}{isWeakness ? " 💥" : ""}
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function BossBattleUI({
  battle,
  question,
  onAnswer,
  onComplete,
  onClose,
  band = "ks2",
}) {
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null); // { damage, bossAttack, ... }
  const [showDamage, setShowDamage] = useState(false);
  const [phase, setPhase] = useState("fighting"); // fighting | victory | defeat
  const resultTimerRef = useRef(null);

  // Reset selection when question changes
  useEffect(() => {
    setSelected(null);
    setResult(null);
    setShowDamage(false);
  }, [question?.q]);

  // Cleanup timer on unmount
  useEffect(() => () => clearTimeout(resultTimerRef.current), []);

  if (!battle || !question) return null;

  const bossColour = battle.bossColour || "#6366f1";
  const fontSize = band === "ks1" ? 16 : 14;

  function handleSelect(optionIndex) {
    if (selected !== null) return; // Already answered
    setSelected(optionIndex);

    const isCorrect = optionIndex === question.a;
    const battleResult = battle.processAnswer(
      isCorrect,
      question.difficulty_tier || 3,
      question.subject || ""
    );
    setResult(battleResult);

    if (battleResult.damage > 0) {
      setShowDamage(true);
      setTimeout(() => setShowDamage(false), 1000);
    }

    // Check for battle end
    resultTimerRef.current = setTimeout(() => {
      if (battleResult.isDefeated) {
        setPhase("victory");
        setTimeout(() => onComplete(battle.getResults()), 2500);
      } else if (battleResult.isLost) {
        setPhase("defeat");
        setTimeout(() => onComplete(battle.getResults()), 2500);
      } else {
        // Continue with next question
        onAnswer(optionIndex);
      }
    }, 1500);
  }

  // ── Victory/Defeat screens ─────────────────────────────────────────────

  if (phase === "victory") {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: 32, textAlign: "center", gap: 16,
      }}>
        <div style={{ fontSize: 64 }}>🏆</div>
        <div style={{ fontSize: 24, fontWeight: 900, color: "#fbbf24" }}>
          BOSS DEFEATED!
        </div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)" }}>
          You defeated {battle.bossName}!
        </div>
        <div style={{
          display: "flex", gap: 16, marginTop: 8,
          fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.8)",
        }}>
          <span>⭐ +250 XP</span>
          <span>🪙 +75 Coins</span>
        </div>
      </div>
    );
  }

  if (phase === "defeat") {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: 32, textAlign: "center", gap: 16,
      }}>
        <div style={{ fontSize: 64 }}>💔</div>
        <div style={{ fontSize: 24, fontWeight: 900, color: "#ef4444" }}>
          BATTLE LOST
        </div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)" }}>
          {battle.bossName} was too strong this time. Train harder and try again!
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
          Damage dealt: {battle.totalDamageDealt} / {battle.maxHp}
        </div>
      </div>
    );
  }

  // ── Battle screen ──────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "8px 0" }}>
      {/* Injected CSS for damage animation */}
      <style>{`
        @keyframes floatUp {
          0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -120%) scale(1.3); }
        }
        @keyframes bossShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
      `}</style>

      {/* Boss section */}
      <div style={{
        position: "relative",
        background: `linear-gradient(135deg, ${bossColour}15, ${bossColour}08)`,
        border: `1px solid ${bossColour}30`,
        borderRadius: 16, padding: 16,
      }}>
        <DamageFlash
          damage={result?.damage}
          isWeakness={result?.isWeaknessHit}
          visible={showDamage}
        />

        <div style={{
          display: "flex", alignItems: "center", gap: 12, marginBottom: 10,
          animation: result?.damage ? "bossShake 0.5s ease" : "none",
        }}>
          <div style={{
            fontSize: 36, filter: battle.currentHp <= 0 ? "grayscale(1)" : "none",
            transition: "filter 0.5s",
          }}>
            {battle.bossIcon}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: bossColour }}>
              {battle.bossName}
            </div>
            <BossHPBar
              current={battle.currentHp}
              max={battle.maxHp}
              colour={bossColour}
            />
          </div>
        </div>

        {/* Scholar shields */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)" }}>
            Your Shields
          </span>
          <ShieldBar shields={battle.scholarShields} />
        </div>
      </div>

      {/* Question */}
      <div style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14, padding: 16,
      }}>
        <div style={{
          fontSize, fontWeight: 700, color: "rgba(255,255,255,0.9)",
          lineHeight: 1.5, marginBottom: 12,
        }}>
          {question.q || question.question_text}
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          {(question.opts || []).map((opt, i) => {
            const isSelected = selected === i;
            const isCorrect = i === question.a;
            const showResult = selected !== null;

            let bg = "rgba(255,255,255,0.06)";
            let border = "1px solid rgba(255,255,255,0.1)";
            let textColour = "rgba(255,255,255,0.8)";

            if (showResult) {
              if (isCorrect) {
                bg = "rgba(34,197,94,0.15)";
                border = "1px solid rgba(34,197,94,0.4)";
                textColour = "#22c55e";
              } else if (isSelected && !isCorrect) {
                bg = "rgba(239,68,68,0.15)";
                border = "1px solid rgba(239,68,68,0.4)";
                textColour = "#ef4444";
              }
            }

            return (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                disabled={selected !== null}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px", borderRadius: 10,
                  background: bg, border,
                  color: textColour,
                  fontSize: fontSize - 1, fontWeight: 600,
                  cursor: selected !== null ? "default" : "pointer",
                  textAlign: "left",
                  transition: "all 0.2s",
                }}
              >
                <span style={{
                  width: 24, height: 24, borderRadius: "50%",
                  background: isSelected ? (isCorrect ? "#22c55e" : "#ef4444") : "rgba(255,255,255,0.1)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 800, flexShrink: 0,
                  color: isSelected ? "#fff" : "rgba(255,255,255,0.5)",
                }}>
                  {String.fromCharCode(65 + i)}
                </span>
                {opt}
              </button>
            );
          })}
        </div>

        {/* Battle feedback */}
        {result && (
          <div style={{
            marginTop: 12, padding: "8px 12px", borderRadius: 10,
            fontSize: 12, fontWeight: 700, textAlign: "center",
            background: result.damage > 0 ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
            color: result.damage > 0 ? "#22c55e" : "#ef4444",
          }}>
            {result.damage > 0
              ? `💥 ${result.damage} damage dealt!${result.isWeaknessHit ? " SUPER EFFECTIVE!" : ""}`
              : `${battle.bossIcon} Boss attacks! Shield lost!`}
          </div>
        )}
      </div>

      {/* Exit button */}
      <button
        onClick={onClose}
        style={{
          alignSelf: "center", padding: "6px 16px", borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.1)",
          background: "transparent", color: "rgba(255,255,255,0.3)",
          fontSize: 11, fontWeight: 600, cursor: "pointer",
        }}
      >
        Retreat (save progress)
      </button>
    </div>
  );
}
