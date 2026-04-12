'use client'

/**
 * ConceptCardRenderer
 *
 * Full-viewport teaching card shown once per topic per session,
 * before the first quiz question. Inspired by Century Tech's concept card
 * architecture but space-themed and age-adaptive.
 *
 * Props:
 *   card        — concept card object from /api/concept-cards
 *   band        — 'ks1' | 'ks2' | 'ks3' | 'ks4' | 'jss' | 'sss'
 *   topicLabel  — human-readable topic name
 *   subject     — e.g. 'mathematics', 'english'
 *   curriculum  — e.g. 'uk_national', 'ng_jss'
 *   onDismiss   — callback when scholar is ready to start questions
 *   onSpeak     — optional(text) → reads text aloud (KS1 auto-read)
 */

import React, { useEffect, useRef, useState } from 'react'
import { BookOpen, Lightbulb, Star, ChevronRight, Volume2 } from 'lucide-react'

// ── Subject colour palette (mirrors REALM_THEMES in QuestOrchestrator) ─────
const SUBJECT_THEMES = {
  mathematics:         { colour: '#6366f1', accent: '#818cf8', icon: '🔢', realm: 'Maths Realm' },
  english:             { colour: '#ec4899', accent: '#f472b6', icon: '📚', realm: 'English Realm' },
  science:             { colour: '#10b981', accent: '#34d399', icon: '🔬', realm: 'Science Realm' },
  basic_science:       { colour: '#10b981', accent: '#34d399', icon: '🔬', realm: 'Science Realm' },
  physics:             { colour: '#3b82f6', accent: '#60a5fa', icon: '⚡', realm: 'Physics Realm' },
  chemistry:           { colour: '#f59e0b', accent: '#fbbf24', icon: '⚗️', realm: 'Chemistry Realm' },
  biology:             { colour: '#22c55e', accent: '#4ade80', icon: '🌿', realm: 'Biology Realm' },
  history:             { colour: '#a78bfa', accent: '#c4b5fd', icon: '🏛️', realm: 'History Realm' },
  geography:           { colour: '#14b8a6', accent: '#2dd4bf', icon: '🌍', realm: 'Geography Realm' },
  default:             { colour: '#6366f1', accent: '#818cf8', icon: '🌟', realm: 'Learning Realm' },
}

// ── KS1 simplified vocabulary for the card sections ─────────────────────────
const KS1_LABELS = {
  hook:        'Did you know? 🤩',
  concept:     'What we are learning today 📖',
  example:     'Let\'s look at an example 👀',
  memoryHook:  'Remember this! 💡',
  cta:         'I\'m ready — let\'s go! 🚀',
}
const DEFAULT_LABELS = {
  hook:        'Opening hook',
  concept:     'Key concept',
  example:     'Worked example',
  memoryHook:  'Remember',
  cta:         'Start questions →',
}

// ── Visual renderers for simple concept visuals ──────────────────────────────

function NumberLineSVG({ data }) {
  const { min = 0, max = 10, start, jump } = data || {}
  const end = (start != null && jump != null) ? start + jump : null
  const range = max - min
  const W = 280, H = 56, padX = 20
  const toX = v => padX + ((v - min) / range) * (W - padX * 2)

  const ticks = []
  for (let i = min; i <= max; i++) {
    const x = toX(i)
    ticks.push(
      <g key={i}>
        <line x1={x} y1={24} x2={x} y2={32} stroke="#64748b" strokeWidth="1.5" />
        <text x={x} y={46} textAnchor="middle" fontSize="9" fill="#94a3b8">{i}</text>
      </g>
    )
  }

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="mx-auto">
      {/* Base line */}
      <line x1={padX} y1={28} x2={W - padX} y2={28} stroke="#475569" strokeWidth="2" />
      {ticks}
      {/* Jump arc */}
      {start != null && end != null && (
        <>
          <path
            d={`M ${toX(start)} 26 Q ${(toX(start) + toX(end)) / 2} ${jump > 0 ? 8 : 44} ${toX(end)} 26`}
            fill="none" stroke="#6366f1" strokeWidth="2" strokeDasharray="3,2"
          />
          <circle cx={toX(start)} cy={28} r={4} fill="#6366f1" />
          <circle cx={toX(end)} cy={28} r={5} fill="#ec4899" />
          <text x={toX(end)} y={18} textAnchor="middle" fontSize="10" fill="#ec4899" fontWeight="bold">
            {end}
          </text>
        </>
      )}
    </svg>
  )
}

function FractionCircleSVG({ data }) {
  const { numerator = 1, denominator = 4 } = data || {}
  const cx = 44, cy = 44, r = 36
  const slices = []
  for (let i = 0; i < denominator; i++) {
    const startAngle = (i / denominator) * 2 * Math.PI - Math.PI / 2
    const endAngle = ((i + 1) / denominator) * 2 * Math.PI - Math.PI / 2
    const x1 = cx + r * Math.cos(startAngle)
    const y1 = cy + r * Math.sin(startAngle)
    const x2 = cx + r * Math.cos(endAngle)
    const y2 = cy + r * Math.sin(endAngle)
    const large = denominator === 1 ? 1 : 0
    const filled = i < numerator
    slices.push(
      <path
        key={i}
        d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`}
        fill={filled ? '#6366f1' : '#1e293b'}
        stroke="#334155"
        strokeWidth="1.5"
      />
    )
  }
  return (
    <svg width={88} height={88} viewBox="0 0 88 88" className="mx-auto">
      <circle cx={cx} cy={cy} r={r + 2} fill="#0f172a" stroke="#334155" strokeWidth="1" />
      {slices}
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize="12" fill="white" fontWeight="bold">
        {numerator}/{denominator}
      </text>
    </svg>
  )
}

function ArraySVG({ data }) {
  const { rows = 3, cols = 4 } = data || {}
  const dotR = 5, gap = 14
  const W = cols * gap + 10, H = rows * gap + 10
  const dots = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      dots.push(
        <circle
          key={`${r}-${c}`}
          cx={8 + c * gap}
          cy={8 + r * gap}
          r={dotR}
          fill="#6366f1"
          opacity="0.85"
        />
      )
    }
  }
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="mx-auto">
      {dots}
    </svg>
  )
}

function PlaceValueSVG({ data }) {
  const cols = []
  const entries = [
    { key: 'hundreds', label: 'H', value: data?.hundreds },
    { key: 'tens',     label: 'T', value: data?.tens },
    { key: 'ones',     label: 'O', value: data?.ones },
    { key: 'tenths',   label: 'Th', value: data?.tenths },
    { key: 'hundredths', label: 'Hth', value: data?.hundredths },
  ].filter(e => e.value != null)

  return (
    <div className="flex items-end justify-center gap-2">
      {entries.map(e => (
        <div key={e.key} className="flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg"
            style={{ background: '#1e293b', border: '1.5px solid #6366f1', color: '#a5b4fc' }}>
            {e.value}
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{e.label}</span>
        </div>
      ))}
    </div>
  )
}

function BarModelSVG({ data }) {
  const { length = 4, width = 3, unit = '' } = data || {}
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="rounded-lg flex items-center justify-center text-white font-black text-sm"
        style={{
          width: Math.min(length * 28, 200),
          height: Math.min(width * 18, 80),
          background: 'linear-gradient(135deg, #6366f1, #7c3aed)',
          minWidth: 60,
        }}
      >
        {length} × {width} {unit && `= ${length * width}${unit}²`}
      </div>
      <div className="flex gap-4 text-xs text-slate-400">
        <span>Length: {length}{unit}</span>
        <span>Width: {width}{unit}</span>
      </div>
    </div>
  )
}

function ConceptVisual({ type, data }) {
  if (!type || !data) return null
  switch (type) {
    case 'number_line':      return <NumberLineSVG data={data} />
    case 'fraction_circle':  return <FractionCircleSVG data={data} />
    case 'array':            return <ArraySVG data={data} />
    case 'place_value_chart': return <PlaceValueSVG data={data} />
    case 'bar_model':        return <BarModelSVG data={data} />
    default: return null
  }
}

// ── Worked example steps renderer ──────────────────────────────────────────

function WorkedExample({ example, band, colour }) {
  if (!example || !example.steps?.length) return null
  const isKS1 = band === 'ks1'

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: `${colour}10`, border: `1.5px solid ${colour}30` }}>
      {example.label && (
        <div className="px-4 py-2 border-b" style={{ borderColor: `${colour}25` }}>
          <span className="text-xs font-black uppercase tracking-widest" style={{ color: colour }}>
            {example.label}
          </span>
        </div>
      )}
      <div className="px-4 py-3 space-y-2">
        {example.steps.map((step, i) => (
          <div key={i} className="flex items-start gap-3">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 font-black text-[10px]"
              style={{ background: colour, color: 'white' }}
            >
              {i + 1}
            </div>
            <p className={`text-slate-200 leading-snug ${isKS1 ? 'text-base' : 'text-sm'}`}>
              {step}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

export default function ConceptCardRenderer({
  card,
  band = 'ks2',
  topicLabel,
  subject = 'mathematics',
  curriculum = 'uk_national',
  onDismiss,
  onSpeak,
}) {
  const isKS1 = band === 'ks1'
  const labels = isKS1 ? KS1_LABELS : DEFAULT_LABELS
  const theme = SUBJECT_THEMES[subject] || SUBJECT_THEMES.default
  const dismissedRef = useRef(false)

  // For KS1: auto-read the hook + key concept aloud after a short delay
  useEffect(() => {
    if (!isKS1 || !onSpeak || !card) return
    const text = [card.hook, card.key_concept, card.memory_hook].filter(Boolean).join('. ')
    const timer = setTimeout(() => onSpeak(text), 800)
    return () => clearTimeout(timer)
  }, [isKS1, card, onSpeak])

  const handleDismiss = () => {
    if (dismissedRef.current) return
    dismissedRef.current = true
    onDismiss?.()
  }

  const handleSpeak = () => {
    if (!onSpeak || !card) return
    const text = [card.hook, card.key_concept, card.memory_hook].filter(Boolean).join('. ')
    onSpeak(text)
  }

  if (!card) return null

  // Pick the best worked example to show
  const bestExample = card.best_example
    || (card.worked_example?.[0] ?? null)

  return (
    <div
      className="fixed inset-0 z-[5500] flex items-center justify-center p-4"
      style={{ background: 'rgba(10, 9, 20, 0.97)' }}
    >
      {/* Background stars */}
      {Array.from({ length: 18 }, (_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white pointer-events-none"
          style={{
            left: `${(i * 19.7) % 100}%`,
            top: `${(i * 31.3) % 100}%`,
            width: 1 + (i % 2),
            height: 1 + (i % 2),
            opacity: 0.15 + (i % 3) * 0.1,
          }}
        />
      ))}

      {/* Card */}
      <div
        className="relative w-full max-w-md rounded-3xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{
          background: 'linear-gradient(160deg, #0f0e1a 0%, #15132b 60%, #0f1625 100%)',
          border: `1.5px solid ${theme.colour}44`,
          boxShadow: `0 0 40px ${theme.colour}18`,
        }}
      >
        {/* Top accent bar */}
        <div
          className="h-1 w-full shrink-0"
          style={{ background: `linear-gradient(90deg, ${theme.colour}, ${theme.accent}, #ec4899)` }}
        />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-xl"
              style={{ background: `${theme.colour}22`, border: `1px solid ${theme.colour}44` }}
            >
              {theme.icon}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: theme.colour }}>
                {theme.realm} · {isKS1 ? 'Let\'s learn!' : 'Concept card'}
              </p>
              <p className="text-white font-black text-base leading-tight">
                {card.title || topicLabel}
              </p>
            </div>
          </div>
          {/* KS1: read aloud button always visible; KS2+: subtle icon */}
          {onSpeak && (
            <button
              onClick={handleSpeak}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
              style={{ background: `${theme.colour}22`, border: `1px solid ${theme.colour}44` }}
              aria-label="Read aloud"
            >
              <Volume2 size={14} style={{ color: theme.colour }} />
            </button>
          )}
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4 min-h-0">

          {/* ① Hook */}
          <div
            className="rounded-2xl px-4 py-3"
            style={{ background: `${theme.colour}14`, border: `1px solid ${theme.colour}28` }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Lightbulb size={12} style={{ color: theme.colour }} />
              <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: theme.colour }}>
                {labels.hook}
              </span>
            </div>
            <p className={`text-slate-100 leading-relaxed ${isKS1 ? 'text-base font-semibold' : 'text-sm'}`}>
              {card.hook}
            </p>
          </div>

          {/* ② Key concept */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BookOpen size={12} className="text-slate-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {labels.concept}
              </span>
            </div>
            <p className={`text-slate-200 leading-relaxed ${isKS1 ? 'text-base' : 'text-sm'}`}>
              {card.key_concept}
            </p>
          </div>

          {/* ③ Visual (if available) */}
          {card.visual_type && card.visual_data && (
            <div
              className="rounded-2xl py-4 px-3 flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <ConceptVisual type={card.visual_type} data={card.visual_data} />
            </div>
          )}

          {/* ④ Worked example */}
          {bestExample && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Star size={12} className="text-slate-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {labels.example}
                </span>
              </div>
              <WorkedExample example={bestExample} band={band} colour={theme.colour} />
            </div>
          )}

          {/* ⑤ Memory hook */}
          {card.memory_hook && (
            <div
              className="rounded-2xl px-4 py-3 flex items-start gap-3"
              style={{ background: '#1a1a2e', border: '1px solid #2d2d4e' }}
            >
              <span className="text-xl shrink-0">💡</span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-1">
                  {labels.memoryHook}
                </p>
                <p className={`text-amber-100 font-semibold leading-snug ${isKS1 ? 'text-base' : 'text-sm'}`}>
                  {card.memory_hook}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* CTA button — always visible, sticky footer */}
        <div className="px-5 pt-3 pb-5 shrink-0 border-t" style={{ borderColor: `${theme.colour}20` }}>
          <button
            onClick={handleDismiss}
            className="w-full py-4 rounded-2xl font-black text-white flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xl"
            style={{
              background: `linear-gradient(135deg, ${theme.colour}, #7c3aed)`,
              fontSize: isKS1 ? '1rem' : '0.875rem',
              boxShadow: `0 4px 20px ${theme.colour}44`,
            }}
          >
            {labels.cta}
            <ChevronRight size={16} />
          </button>
          <p className="text-center text-slate-600 text-[10px] mt-2">
            This card will not appear again for this topic today
          </p>
        </div>
      </div>
    </div>
  )
}
