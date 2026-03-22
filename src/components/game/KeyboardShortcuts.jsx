"use client";
/**
 * KeyboardShortcuts.jsx
 * Deploy to: src/components/game/KeyboardShortcuts.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Keyboard navigation for KS3/KS4 scholars during quests.
 * Attach as a wrapper around the quiz component.
 *
 * Shortcuts:
 *   1-4       Select option A-D
 *   C / Enter Check answer (when option selected)
 *   N / →     Next question (when answer revealed)
 *   Esc       Close quiz
 *
 * Only active for KS3+ (year_level >= 7). Younger scholars use tap/click only.
 *
 * USAGE:
 *   <KeyboardShortcuts
 *     yearLevel={student.year_level}
 *     onSelectOption={(idx) => setSelected(idx)}
 *     onCheck={handleCheck}
 *     onNext={handleNext}
 *     onClose={onClose}
 *     canCheck={selected !== null && !revealed}
 *     canNext={revealed}
 *   >
 *     <QuizContent ... />
 *   </KeyboardShortcuts>
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useCallback } from "react";
import { getAgeBand } from "@/lib/ageBandConfig";

export default function KeyboardShortcuts({
  yearLevel,
  onSelectOption,
  onCheck,
  onNext,
  onClose,
  canCheck = false,
  canNext = false,
  disabled = false,
  children,
}) {
  const band = getAgeBand(yearLevel);
  const active = band === "ks3" || band === "ks4";

  const handleKey = useCallback(
    (e) => {
      if (!active || disabled) return;
      // Don't intercept if typing in an input/textarea (e.g. Tara EIB)
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

      const key = e.key;

      // 1-4: Select option
      if (["1", "2", "3", "4"].includes(key)) {
        e.preventDefault();
        onSelectOption?.(parseInt(key, 10) - 1);
        return;
      }

      // C or Enter: Check answer
      if ((key === "c" || key === "C" || key === "Enter") && canCheck) {
        e.preventDefault();
        onCheck?.();
        return;
      }

      // N or ArrowRight: Next question
      if ((key === "n" || key === "N" || key === "ArrowRight") && canNext) {
        e.preventDefault();
        onNext?.();
        return;
      }

      // Escape: Close quiz
      if (key === "Escape") {
        e.preventDefault();
        onClose?.();
        return;
      }
    },
    [active, disabled, canCheck, canNext, onSelectOption, onCheck, onNext, onClose]
  );

  useEffect(() => {
    if (!active) return;
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [active, handleKey]);

  // Show shortcut hints for KS4 (inline, minimal)
  if (!active) return <>{children}</>;

  return (
    <div style={{ position: "relative" }}>
      {children}
      {band === "ks4" && (
        <div
          style={{
            position: "fixed",
            bottom: 12,
            right: 12,
            display: "flex",
            gap: 6,
            opacity: 0.4,
            fontSize: 10,
            fontFamily: "'DM Mono', monospace",
            color: "#94a3b8",
            zIndex: 50,
          }}
        >
          {["1-4 select", "C check", "N next", "Esc close"].map((hint) => (
            <span
              key={hint}
              style={{
                padding: "3px 7px",
                background: "rgba(255,255,255,0.04)",
                borderRadius: 4,
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {hint}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}