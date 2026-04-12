'use client'

/**
 * NPSPrompt.jsx
 *
 * Appears after every 5th quest completion for scholars with ≥5 completed quests.
 * Asks "How likely are you to recommend LaunchPard?" (0–10 scale).
 * On submit: POSTs to /api/nps, calls onDismiss(), persists dismissal in localStorage
 * so the prompt doesn't reappear for 30 days regardless of reload.
 *
 * Props:
 *   scholarId  (string)   — UUID of the current scholar
 *   curriculum (string)   — e.g. 'ng_jss', 'uk_national'
 *   onDismiss  (function) — called after submit or skip
 */

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '@/lib/apiFetch'

const STORAGE_KEY = 'lp_nps_last_shown'
const COOLDOWN_DAYS = 30

/** True when the cooldown has NOT expired (prompt was shown recently). */
function isOnCooldown() {
  if (typeof window === 'undefined') return true
  const last = localStorage.getItem(STORAGE_KEY)
  if (!last) return false
  const diffMs = Date.now() - parseInt(last, 10)
  return diffMs < COOLDOWN_DAYS * 24 * 60 * 60 * 1000
}

function markShown() {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, String(Date.now()))
  }
}

// Maps NPS score → short sentiment label shown below the scale
const SENTIMENT = (score) => {
  if (score === null) return ''
  if (score <= 3)  return '😕  Not likely at all'
  if (score <= 6)  return '😐  Maybe'
  if (score <= 8)  return '🙂  Probably'
  return '🤩  Definitely!'
}

export default function NPSPrompt({ scholarId, curriculum, onDismiss }) {
  const [score, setScore]         = useState(null)   // 0-10 | null
  const [comment, setComment]     = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [visible, setVisible]     = useState(false)

  // Animate in after mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(t)
  }, [])

  const dismiss = useCallback(() => {
    setVisible(false)
    setTimeout(() => onDismiss?.(), 300) // wait for fade-out
  }, [onDismiss])

  const handleSubmit = useCallback(async () => {
    if (score === null) return
    setSubmitting(true)
    try {
      await apiFetch('/api/nps', {
        method: 'POST',
        body: JSON.stringify({ scholarId, curriculum, score, comment: comment.trim() || undefined }),
      })
    } catch (e) {
      // Non-critical — never block the scholar
      console.warn('[NPSPrompt] submit failed:', e?.message)
    } finally {
      markShown()
      setSubmitting(false)
      setSubmitted(true)
      setTimeout(() => dismiss(), 1800) // show thank-you briefly then close
    }
  }, [score, comment, scholarId, curriculum, dismiss])

  // Don't render during cooldown (parent should also gate, but double-check)
  if (isOnCooldown()) return null

  const isNg = curriculum?.startsWith('ng_')

  return (
    <div
      aria-modal="true"
      role="dialog"
      aria-label="Rate LaunchPard"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '0 0 24px 0',
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(3px)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease',
        pointerEvents: visible ? 'auto' : 'none',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) dismiss() }}
    >
      <div
        style={{
          background: 'linear-gradient(160deg, #0f172a 0%, #1e1b4b 100%)',
          border: '1px solid rgba(139,92,246,0.35)',
          borderRadius: 20,
          boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
          padding: '28px 28px 24px',
          width: '100%',
          maxWidth: 440,
          position: 'relative',
          transform: visible ? 'translateY(0)' : 'translateY(40px)',
          transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        {/* Close button */}
        <button
          aria-label="Skip survey"
          onClick={dismiss}
          style={{
            position: 'absolute', top: 14, right: 14,
            background: 'rgba(255,255,255,0.06)',
            border: 'none', borderRadius: 8,
            color: '#94a3b8', cursor: 'pointer',
            width: 28, height: 28, fontSize: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ×
        </button>

        {submitted ? (
          /* Thank-you state */
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🚀</div>
            <p style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 17, margin: 0 }}>
              Thanks, Mission Commander!
            </p>
            <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 6 }}>
              Your feedback shapes LaunchPard{isNg ? ' for Nigeria' : ''}.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ color: '#a78bfa', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
                Quick Mission Debrief
              </p>
              <h2 style={{ color: '#f8fafc', fontSize: 18, fontWeight: 800, margin: '6px 0 0', lineHeight: 1.3 }}>
                How likely are you to recommend LaunchPard{isNg ? ' to a friend?' : '?'}
              </h2>
              <p style={{ color: '#64748b', fontSize: 12, margin: '4px 0 0' }}>
                0 = Not at all · 10 = Absolutely!
              </p>
            </div>

            {/* Score buttons 0-10 */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
              {Array.from({ length: 11 }, (_, i) => (
                <button
                  key={i}
                  aria-label={`Score ${i}`}
                  aria-pressed={score === i}
                  onClick={() => setScore(i)}
                  style={{
                    flex: '1 0 calc(9% - 4px)',
                    minWidth: 30,
                    height: 36,
                    borderRadius: 8,
                    border: score === i ? '2px solid #a78bfa' : '1px solid rgba(255,255,255,0.1)',
                    background: score === i
                      ? (i >= 9 ? 'rgba(16,185,129,0.25)' : i >= 7 ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)')
                      : 'rgba(255,255,255,0.04)',
                    color: score === i ? '#f1f5f9' : '#94a3b8',
                    fontWeight: score === i ? 700 : 400,
                    fontSize: 14,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {i}
                </button>
              ))}
            </div>

            {/* Sentiment label */}
            <div style={{ height: 20, marginBottom: 16, color: '#cbd5e1', fontSize: 13, textAlign: 'center' }}>
              {SENTIMENT(score)}
            </div>

            {/* Optional comment */}
            <textarea
              aria-label="Additional comments"
              placeholder="Any thoughts? (optional)"
              value={comment}
              onChange={e => setComment(e.target.value)}
              maxLength={500}
              rows={2}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10,
                color: '#e2e8f0',
                fontSize: 13,
                padding: '10px 12px',
                resize: 'none',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                marginBottom: 16,
              }}
            />

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={dismiss}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 10,
                  color: '#64748b',
                  cursor: 'pointer',
                  fontSize: 13,
                  padding: '9px 18px',
                }}
              >
                Skip
              </button>
              <button
                onClick={handleSubmit}
                disabled={score === null || submitting}
                style={{
                  background: score === null
                    ? 'rgba(139,92,246,0.3)'
                    : 'linear-gradient(135deg, #7c3aed, #a78bfa)',
                  border: 'none',
                  borderRadius: 10,
                  color: '#fff',
                  cursor: score === null ? 'not-allowed' : 'pointer',
                  fontSize: 13,
                  fontWeight: 700,
                  padding: '9px 22px',
                  opacity: submitting ? 0.7 : 1,
                  transition: 'all 0.2s',
                }}
              >
                {submitting ? 'Sending…' : 'Send Feedback'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/**
 * Hook: useNPSPrompt
 *
 * Call after each quest completes. Returns `{ shouldShow, markCompleted }`.
 * The parent renders <NPSPrompt> when shouldShow is true.
 *
 * Usage:
 *   const { shouldShow, markCompleted } = useNPSPrompt(scholarId)
 *   // After quest finishes:
 *   markCompleted()
 *   // In JSX:
 *   {shouldShow && <NPSPrompt scholarId={...} curriculum={...} onDismiss={() => markCompleted(false)} />}
 */
const NPS_COUNT_KEY = 'lp_quest_count_since_nps'
const NPS_TRIGGER_EVERY = 5   // show after every 5th completion
const NPS_MIN_TOTAL    = 5   // don't show until scholar has done at least 5 quests

export function useNPSPrompt() {
  const [shouldShow, setShouldShow] = useState(false)

  const markCompleted = useCallback((showIfDue = true) => {
    if (typeof window === 'undefined') return

    const current = parseInt(localStorage.getItem(NPS_COUNT_KEY) || '0', 10)
    const next = current + 1
    localStorage.setItem(NPS_COUNT_KEY, String(next))

    if (
      showIfDue &&
      !isOnCooldown() &&
      next >= NPS_MIN_TOTAL &&
      next % NPS_TRIGGER_EVERY === 0
    ) {
      setShouldShow(true)
    }
  }, [])

  const dismiss = useCallback(() => {
    setShouldShow(false)
  }, [])

  return { shouldShow, markCompleted, dismiss }
}
