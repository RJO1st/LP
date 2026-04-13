'use client'

/**
 * QuestionVisualEnhancer
 *
 * Tier 2 & 3 fallback visual for quiz questions that have no passage and
 * no MathsVisualiser match.
 *
 * Tier 2 — Concept card from DB
 *   Fetches /api/concept-cards?topic_slug=…&curriculum=…&year_band=…&subject=…
 *   Renders a compact inline teaching card: definition, key example, memory hook.
 *
 * Tier 3 — Subject context panel (zero DB calls)
 *   Subject-coloured panel with emoji icon, subject name, and a short
 *   contextual prompt reminding the scholar what they are practising.
 *
 * This component is rendered inside the left panel of the KS1-KS4 quiz shells.
 * It must stay compact — the left panel is ~50% of the split layout on desktop
 * and full-width on mobile.
 */

import React, { useEffect, useRef, useState } from 'react'
import { BookOpen, Lightbulb, Zap, Star } from 'lucide-react'

// ── Comprehensive subject → visual theme map ──────────────────────────────────
// Covers UK National, Nigerian (JSS/SSS/Primary), and Canadian curricula.
const SUBJECT_THEMES = {
  mathematics:         { colour: '#6366f1', accent: '#818cf8', bg: '#eef2ff', icon: '🔢', label: 'Mathematics',          prompt: 'Apply what you know about numbers and equations.' },
  english:             { colour: '#ec4899', accent: '#f472b6', bg: '#fdf2f8', icon: '📚', label: 'English',              prompt: 'Read carefully and think about language choices.' },
  english_language:    { colour: '#ec4899', accent: '#f472b6', bg: '#fdf2f8', icon: '📚', label: 'English Language',     prompt: 'Think about how language is used and structured.' },
  english_studies:     { colour: '#ec4899', accent: '#f472b6', bg: '#fdf2f8', icon: '📖', label: 'English Studies',      prompt: 'Think carefully about meaning and expression.' },
  science:             { colour: '#10b981', accent: '#34d399', bg: '#ecfdf5', icon: '🔬', label: 'Science',              prompt: 'Think about evidence, patterns, and how things work.' },
  basic_science:       { colour: '#10b981', accent: '#34d399', bg: '#ecfdf5', icon: '🔬', label: 'Basic Science',        prompt: 'Think about evidence, patterns, and how things work.' },
  physics:             { colour: '#3b82f6', accent: '#60a5fa', bg: '#eff6ff', icon: '⚡', label: 'Physics',              prompt: 'Think about forces, energy, and how matter behaves.' },
  chemistry:           { colour: '#f59e0b', accent: '#fbbf24', bg: '#fffbeb', icon: '⚗️', label: 'Chemistry',           prompt: 'Think about substances, reactions, and properties.' },
  biology:             { colour: '#22c55e', accent: '#4ade80', bg: '#f0fdf4', icon: '🌿', label: 'Biology',              prompt: 'Think about living organisms and how they function.' },
  history:             { colour: '#a78bfa', accent: '#c4b5fd', bg: '#f5f3ff', icon: '🏛️', label: 'History',            prompt: 'Think about events, causes, and people from the past.' },
  geography:           { colour: '#14b8a6', accent: '#2dd4bf', bg: '#f0fdfa', icon: '🌍', label: 'Geography',           prompt: 'Think about places, environments, and how people use them.' },
  computing:           { colour: '#0ea5e9', accent: '#38bdf8', bg: '#f0f9ff', icon: '💻', label: 'Computing',           prompt: 'Think about how computers process, store, and share data.' },
  basic_technology:    { colour: '#0ea5e9', accent: '#38bdf8', bg: '#f0f9ff', icon: '🔧', label: 'Basic Technology',    prompt: 'Think about how tools and systems are designed and used.' },
  civic_education:     { colour: '#f97316', accent: '#fb923c', bg: '#fff7ed', icon: '🏛️', label: 'Civic Education',   prompt: 'Think about rights, responsibilities, and how society works.' },
  social_studies:      { colour: '#f97316', accent: '#fb923c', bg: '#fff7ed', icon: '🤝', label: 'Social Studies',      prompt: 'Think about communities, culture, and how people interact.' },
  cultural_arts:       { colour: '#d946ef', accent: '#e879f9', bg: '#fdf4ff', icon: '🎨', label: 'Cultural & Creative Arts', prompt: 'Think about expression, creativity, and cultural meaning.' },
  agriculture:         { colour: '#84cc16', accent: '#a3e635', bg: '#f7fee7', icon: '🌾', label: 'Agriculture',         prompt: 'Think about crops, farming, and how food is produced.' },
  commerce:            { colour: '#0891b2', accent: '#22d3ee', bg: '#ecfeff', icon: '💼', label: 'Commerce',            prompt: 'Think about buying, selling, and how businesses operate.' },
  economics:           { colour: '#0891b2', accent: '#22d3ee', bg: '#ecfeff', icon: '📊', label: 'Economics',           prompt: 'Think about supply, demand, and how economies function.' },
  financial_accounting:{ colour: '#0891b2', accent: '#22d3ee', bg: '#ecfeff', icon: '🧾', label: 'Financial Accounting', prompt: 'Think about records, transactions, and financial reporting.' },
  government:          { colour: '#7c3aed', accent: '#8b5cf6', bg: '#f5f3ff', icon: '⚖️', label: 'Government',         prompt: 'Think about how governments are structured and how they work.' },
  literature:          { colour: '#db2777', accent: '#f472b6', bg: '#fdf2f8', icon: '📜', label: 'Literature',          prompt: 'Think about themes, characters, and the author\'s craft.' },
  verbal_reasoning:    { colour: '#4f46e5', accent: '#6366f1', bg: '#eef2ff', icon: '🧠', label: 'Verbal Reasoning',   prompt: 'Think logically about words, patterns, and language rules.' },
  non_verbal_reasoning:{ colour: '#4f46e5', accent: '#6366f1', bg: '#eef2ff', icon: '🔷', label: 'Non-Verbal Reasoning', prompt: 'Look carefully at shapes, patterns, and spatial relationships.' },
  nvr:                 { colour: '#4f46e5', accent: '#6366f1', bg: '#eef2ff', icon: '🔷', label: 'Non-Verbal Reasoning', prompt: 'Look carefully at shapes, patterns, and spatial relationships.' },
  vr:                  { colour: '#4f46e5', accent: '#6366f1', bg: '#eef2ff', icon: '🧠', label: 'Verbal Reasoning',   prompt: 'Think logically about words, patterns, and language rules.' },
  religious_studies:   { colour: '#f59e0b', accent: '#fbbf24', bg: '#fffbeb', icon: '🕌', label: 'Religious Studies',  prompt: 'Think about beliefs, practices, and moral questions.' },
  music:               { colour: '#d946ef', accent: '#e879f9', bg: '#fdf4ff', icon: '🎵', label: 'Music',               prompt: 'Think about rhythm, melody, and how music communicates.' },
  physical_education:  { colour: '#ef4444', accent: '#f87171', bg: '#fef2f2', icon: '🏃', label: 'Physical Education', prompt: 'Think about movement, health, and how the body works.' },
  default:             { colour: '#6366f1', accent: '#818cf8', bg: '#eef2ff', icon: '🌟', label: 'Learning',            prompt: 'Read the question carefully and use what you know.' },
}

// ── Year level → year_band for concept card lookup ───────────────────────────
function getYearBand(yearLevel, curriculum) {
  const y = Number(yearLevel) || 6
  const isNigerian = /^ng_/.test(curriculum || '')
  if (isNigerian) {
    const ng = /ng_sss/.test(curriculum) ? y + 9
             : /ng_jss/.test(curriculum) ? y + 6
             : y
    if (ng <= 2)  return 'ks1'
    if (ng <= 6)  return 'ks2'
    if (ng <= 9)  return 'ks3'
    return 'ks4'
  }
  if (y <= 2)  return 'ks1'
  if (y <= 6)  return 'ks2'
  if (y <= 9)  return 'ks3'
  return 'ks4'
}

// ── Extract a short topic label from the question ────────────────────────────
function getTopicLabel(topic) {
  if (!topic) return 'this topic'
  return topic
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

// ── Tier 3: Subject context panel ────────────────────────────────────────────
function SubjectContextPanel({ subject, yearLevel, question, curriculum }) {
  const theme = SUBJECT_THEMES[subject] || SUBJECT_THEMES.default
  const topicLabel = getTopicLabel(question?.topic)
  const band = getYearBand(yearLevel, curriculum)

  // KS1-appropriate prompts
  const isKS1 = band === 'ks1'
  const prompt = isKS1
    ? `Think about what you know. Give it your best try! 🌟`
    : theme.prompt

  // Contextual hints based on subject + question type
  const qText = (question?.question_text || question?.q || '').toLowerCase()
  const contextClues = []
  if (/formula|equation/i.test(qText)) contextClues.push('Write out the formula first')
  if (/calculate|work out|find/i.test(qText)) contextClues.push('Show your working step by step')
  if (/explain|describe|suggest/i.test(qText)) contextClues.push('Use key terms in your answer')
  if (/compare|contrast/i.test(qText)) contextClues.push('Look for similarities AND differences')
  if (/which|choose|select/i.test(qText)) contextClues.push('Eliminate options you know are wrong first')
  if (/true or false/i.test(qText)) contextClues.push('Think of a clear example to test each statement')

  return (
    <div
      className="flex flex-col gap-3 h-full rounded-xl overflow-hidden border"
      style={{ borderColor: theme.accent + '60', backgroundColor: theme.bg }}
    >
      {/* Header stripe */}
      <div
        className="flex items-center gap-2.5 px-4 py-3"
        style={{ background: `linear-gradient(135deg, ${theme.colour}22 0%, ${theme.accent}18 100%)`, borderBottom: `1px solid ${theme.accent}40` }}
      >
        <span className="text-2xl" role="img" aria-hidden>{theme.icon}</span>
        <div className="min-w-0">
          <p className="text-xs font-black leading-tight" style={{ color: theme.colour }}>
            {theme.label}
          </p>
          {topicLabel !== 'this topic' && (
            <p className="text-[10px] font-bold text-slate-500 truncate">{topicLabel}</p>
          )}
        </div>
        <span
          className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
          style={{ backgroundColor: theme.colour + '20', color: theme.colour }}
        >
          {band.toUpperCase()}
        </span>
      </div>

      {/* Main prompt */}
      <div className="px-4 flex-1 flex flex-col justify-center gap-3">
        <p className="text-sm font-semibold leading-relaxed" style={{ color: theme.colour + 'dd' }}>
          {prompt}
        </p>

        {/* Strategy tips (when applicable) */}
        {contextClues.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {contextClues.slice(0, 2).map((clue, i) => (
              <div key={i} className="flex items-start gap-2">
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{ backgroundColor: theme.colour + '25' }}
                >
                  <span style={{ color: theme.colour, fontSize: '8px', fontWeight: 800 }}>{i + 1}</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">{clue}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="px-4 py-2.5 flex items-center gap-2"
        style={{ borderTop: `1px solid ${theme.accent}30` }}
      >
        <Star size={11} style={{ color: theme.colour }} />
        <p className="text-[10px] text-slate-500 font-semibold">
          You can do this! Every question makes you stronger.
        </p>
      </div>
    </div>
  )
}

// ── Tier 2: Inline concept card (compact version of ConceptCardRenderer) ─────
function InlineConceptCard({ card, subject, band }) {
  const theme = SUBJECT_THEMES[subject] || SUBJECT_THEMES.default
  const labels = band === 'ks1' ? { def: 'What it means 📖', eg: 'Example 👀', hook: 'Remember 💡' }
                                : { def: 'Definition', eg: 'Key example', hook: 'Remember' }

  // Extract worked example context blocks
  const examples = Array.isArray(card?.worked_example)
    ? card.worked_example
    : (card?.worked_example ? [card.worked_example] : [])

  // Pick universal or matching context
  const relevantExample = examples.find(e => e.context === 'universal')
    || examples.find(e => e.context === 'uk')
    || examples[0]

  const steps = relevantExample?.steps || []
  const exampleLabel = relevantExample?.label || labels.eg

  return (
    <div
      className="flex flex-col gap-0 h-full rounded-xl overflow-hidden border"
      style={{ borderColor: theme.accent + '55', backgroundColor: '#0f172a' }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-4 py-2.5"
        style={{ background: `linear-gradient(135deg, ${theme.colour}35 0%, ${theme.accent}20 100%)`, borderBottom: `1px solid ${theme.accent}30` }}
      >
        <span className="text-xl">{theme.icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black text-white leading-tight truncate">
            {card.title || getTopicLabel(card.topic_slug)}
          </p>
          <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: theme.accent }}>
            {theme.label} · {labels.def}
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-y-auto px-4 py-3 gap-3">
        {/* Definition */}
        {card.definition && (
          <div
            className="rounded-lg p-3 border"
            style={{ backgroundColor: theme.colour + '12', borderColor: theme.colour + '30' }}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <BookOpen size={11} style={{ color: theme.accent }} />
              <p className="text-[9px] font-black uppercase tracking-wider" style={{ color: theme.accent }}>
                {labels.def}
              </p>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed font-medium">
              {card.definition}
            </p>
          </div>
        )}

        {/* Worked example */}
        {steps.length > 0 && (
          <div className="rounded-lg p-3 border border-slate-700 bg-slate-800">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Zap size={11} style={{ color: theme.accent }} />
              <p className="text-[9px] font-black uppercase tracking-wider" style={{ color: theme.accent }}>
                {exampleLabel}
              </p>
            </div>
            <div className="flex flex-col gap-1">
              {steps.slice(0, 4).map((step, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                    style={{ backgroundColor: theme.colour + '30' }}
                  >
                    <span style={{ color: theme.accent, fontSize: '8px', fontWeight: 800 }}>{i + 1}</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug font-medium">{step}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Memory hook */}
        {card.memory_hook && (
          <div
            className="rounded-lg px-3 py-2 flex items-start gap-2"
            style={{ backgroundColor: '#fbbf2415', border: '1px solid #fbbf2430' }}
          >
            <Lightbulb size={12} className="shrink-0 mt-0.5" style={{ color: '#fbbf24' }} />
            <p className="text-[11px] text-amber-200 leading-snug font-semibold">
              {card.memory_hook}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function QuestionVisualEnhancer({
  question,
  subject,
  yearLevel,
  curriculum,
  supabase,
}) {
  const [conceptCard, setConceptCard] = useState(null)
  const [fetchState, setFetchState] = useState('idle') // idle | loading | done | error
  const lastTopicRef = useRef(null)

  const topicSlug = question?.topic || question?.topic_slug || null
  const band = getYearBand(yearLevel, curriculum)

  // Fetch concept card whenever topic changes
  useEffect(() => {
    if (!topicSlug) {
      setConceptCard(null)
      setFetchState('done')
      return
    }
    // Same topic as last render — no re-fetch
    if (lastTopicRef.current === topicSlug) return
    lastTopicRef.current = topicSlug

    setFetchState('loading')
    setConceptCard(null)

    const params = new URLSearchParams({
      topic_slug: topicSlug,
      ...(curriculum && { curriculum }),
      ...(band && { year_band: band }),
      ...(subject && { subject }),
    })

    fetch(`/api/concept-cards?${params.toString()}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        // API may return an object with a `card` key or an array
        const card = data?.card || (Array.isArray(data) ? data[0] : null)
        setConceptCard(card || null)
        setFetchState('done')
      })
      .catch(() => {
        setConceptCard(null)
        setFetchState('done')
      })
  }, [topicSlug, curriculum, band, subject])

  // While loading — show a lightweight skeleton so the panel doesn't jump
  if (fetchState === 'loading') {
    const theme = SUBJECT_THEMES[subject] || SUBJECT_THEMES.default
    return (
      <div
        className="flex flex-col gap-3 h-full rounded-xl border overflow-hidden animate-pulse"
        style={{ borderColor: theme.accent + '40', backgroundColor: theme.bg }}
      >
        <div
          className="h-12 w-full"
          style={{ backgroundColor: theme.colour + '18' }}
        />
        <div className="px-4 flex flex-col gap-2">
          <div className="h-3 w-3/4 rounded-full" style={{ backgroundColor: theme.colour + '20' }} />
          <div className="h-3 w-1/2 rounded-full" style={{ backgroundColor: theme.colour + '15' }} />
          <div className="h-3 w-2/3 rounded-full" style={{ backgroundColor: theme.colour + '10' }} />
        </div>
      </div>
    )
  }

  // Tier 2 — concept card found
  if (conceptCard) {
    return (
      <InlineConceptCard
        card={conceptCard}
        subject={subject}
        band={band}
      />
    )
  }

  // Tier 3 — subject context panel (always renders)
  return (
    <SubjectContextPanel
      subject={subject}
      yearLevel={yearLevel}
      question={question}
      curriculum={curriculum}
    />
  )
}
