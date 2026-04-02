/**
 * markingEngine.js — Exam paper marking engine with 3-tier architecture
 *
 * Evaluates scholar answers against mark schemes using:
 * - Tier 1: Deterministic marking (no AI) for MCQ, simple short answers, calculation (40-50%)
 * - Tier 2: Rule-based marking with fuzzy matching for method marks, multi-form answers (25-30%)
 * - Tier 3: AI marking with RAG for extended responses, essays, complex explanations (20-30%)
 *
 * Database tables:
 *   - exam_questions: question data with mark scheme
 *   - exam_answers: scholar responses per question per sitting
 *   - exam_sittings: overall exam sitting metadata
 *   - exam_analytics: per-question stats and marking audit trail
 *
 * Integration:
 *   POST /api/mark-sitting → calls markSitting(sittingId, options)
 *   Updates exam_answers.marks_awarded, exam_sittings.total_score/percentage
 *
 * Usage:
 *   import { markAnswer, markSitting } from '@/lib/markingEngine';
 *   const result = await markAnswer(question, scholarAnswer, scholarAnswerData, options);
 *   const sitting = await markSitting(sittingId, options);
 */

import OpenAI from 'openai'
import { calculatePercentage } from './calculationUtils'
import { getMarkSchemeContext } from './examRAG'

// ─── CONSTANTS ──────────────────────────────────────────────────────────────

const LEVENSHTEIN_THRESHOLD = 1 // Allow 1 char difference for typo tolerance
const NUMERIC_TOLERANCE = 0.005 // ±0.5% for numeric answers
const CONFIDENCE_THRESHOLD = 0.7 // Flag AI markings below this confidence for review
const AI_MAX_RETRIES = 2 // Number of retries for failed AI calls
const AI_TIMEOUT_MS = 30000 // 30s timeout for OpenAI calls

const MARK_TIERS = {
  DETERMINISTIC: 'deterministic',
  RULE_BASED: 'rule_based',
  AI_MARKING: 'ai_marking'
}

const QUESTION_TYPES = {
  MCQ: 'mcq',
  NUMERIC: 'numeric',
  SHORT_ANSWER: 'short_answer',
  CALCULATION: 'calculation',
  DATA_INTERPRETATION: 'data_interpretation',
  ESSAY: 'essay',
  EXTENDED_RESPONSE: 'extended_response',
  GRAPH_SKETCH: 'graph_sketch',
  DIAGRAM: 'diagram'
}

// ─── TIER 1: DETERMINISTIC MARKING ──────────────────────────────────────────

/**
 * Levenshtein distance helper — minimum edits to transform a into b.
 * @param {string} a
 * @param {string} b
 * @returns {number} Minimum edit distance
 */
export function levenshtein(a, b) {
  const m = a.length
  const n = b.length
  const dp = Array(m + 1)
    .fill(0)
    .map(() => Array(n + 1).fill(0))

  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      }
    }
  }
  return dp[m][n]
}

/**
 * Normalize answer text for comparison:
 * - Lowercase, trim, remove extra spaces
 * - Remove common punctuation variations
 * - Stem common suffixes (ed, ing, s)
 * @param {string} text
 * @returns {string} Normalized text
 */
export function normalizeAnswer(text) {
  if (!text || typeof text !== 'string') return ''
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[,.!?;:]/g, '') // Remove common punctuation
    .replace(/\s+and\s+/g, ' and ')
}

/**
 * Parse numeric value from text — handles fractions, percentages, scientific notation.
 * Examples: "3.5", "7/2", "35%", "1.5e3", "1.5×10²"
 * @param {string} text
 * @returns {number|null} Parsed number or null if not parseable
 */
export function parseNumericAnswer(text) {
  if (!text || typeof text !== 'string') return null

  // Trim and lowercase
  text = text.trim().toLowerCase()

  // Try direct parse first
  let num = parseFloat(text)
  if (!Number.isNaN(num) && Number.isFinite(num)) return num

  // Handle percentage (e.g., "35%")
  if (text.endsWith('%')) {
    num = parseFloat(text.slice(0, -1))
    if (!Number.isNaN(num)) return num / 100
  }

  // Handle fraction (e.g., "7/2")
  const fractionMatch = text.match(/^([\d.]+)\s*\/\s*([\d.]+)$/)
  if (fractionMatch) {
    const numerator = parseFloat(fractionMatch[1])
    const denominator = parseFloat(fractionMatch[2])
    if (!Number.isNaN(numerator) && !Number.isNaN(denominator) && denominator !== 0) {
      return numerator / denominator
    }
  }

  // Handle scientific notation (e.g., "1.5e3", "1.5×10²")
  const scientificMatch = text.match(/^([\d.]+)\s*[e×x]\s*([\d.+-]+|\^[\d.]+)$/)
  if (scientificMatch) {
    const mantissa = parseFloat(scientificMatch[1])
    let exponent = scientificMatch[2]
    if (exponent.startsWith('^')) exponent = exponent.slice(1)
    exponent = parseFloat(exponent)
    if (!Number.isNaN(mantissa) && !Number.isNaN(exponent)) {
      return mantissa * Math.pow(10, exponent)
    }
  }

  return null
}

/**
 * Check if a scholar's numeric answer matches expected value within tolerance.
 * @param {number} schollarValue — parsed from scholar answer
 * @param {number} expectedValue — from mark scheme
 * @param {number} tolerance — ±fraction (0.005 = ±0.5%)
 * @returns {boolean}
 */
export function isNumericMatch(schollarValue, expectedValue, tolerance = NUMERIC_TOLERANCE) {
  if (!Number.isFinite(schollarValue) || !Number.isFinite(expectedValue)) return false
  if (expectedValue === 0) return schollarValue === 0 // Exact match for zero
  const allowedError = Math.abs(expectedValue * tolerance)
  return Math.abs(schollarValue - expectedValue) <= allowedError
}

/**
 * Check significant figures in a numeric answer.
 * Counts non-zero leading digits and trailing zeros in decimal part.
 * @param {string} text — raw answer text (e.g., "0.00345", "12300")
 * @param {number} required — required sig figs
 * @returns {number} Actual sig figs
 */
function countSigFigs(text) {
  if (!text) return 0
  // Remove spaces and units
  text = text.trim().replace(/\s+[a-z%]/gi, '').replace(/\s+/g, '')
  // Remove leading zeros and decimal point
  const withoutLeadingZeros = text.replace(/^0+\.?0*/, '')
  // Count all remaining digits
  const digits = (withoutLeadingZeros.match(/\d/g) || []).length
  return Math.max(1, digits)
}

/**
 * Tier 1 marking — Deterministic logic for MCQ, simple short answers, simple calculations.
 * No AI, no fuzzy matching.
 * @param {Object} question — from exam_questions table
 * @param {string} scholarAnswer — text answer from scholar
 * @param {Object} scholarAnswerData — { mcqSelectedIndex, ... }
 * @returns {Object} { marks_awarded, marks_possible, is_correct, details }
 */
export function markDeterministic(question, scholarAnswer, scholarAnswerData = {}) {
  const result = {
    marks_awarded: 0,
    marks_possible: question.marks || 0,
    is_correct: false,
    marking_tier: MARK_TIERS.DETERMINISTIC,
    details: {},
    reason: ''
  }

  // Validate question has marking data (acceptable_answers or mark_breakdown are direct DB columns)
  if (!question.acceptable_answers && !question.mark_breakdown && question.correct_mcq_index == null) {
    result.reason = 'No mark scheme available'
    return result
  }

  const aa = question.acceptable_answers || {}
  const type = question.question_type || QUESTION_TYPES.SHORT_ANSWER

  // ─── MCQ MARKING ────────────────────────────────────────────────────────
  if (type === QUESTION_TYPES.MCQ) {
    if (question.correct_mcq_index == null) {
      result.reason = 'Malformed MCQ mark scheme'
      return result
    }
    // MCQ index may come from scholarAnswerData.mcqSelectedIndex or from scholarAnswer (string index from ExamRunner)
    let selectedIndex = scholarAnswerData?.mcqSelectedIndex
    if (selectedIndex == null && scholarAnswer != null) {
      const parsed = parseInt(scholarAnswer, 10)
      if (!isNaN(parsed)) selectedIndex = parsed
    }
    if (selectedIndex === question.correct_mcq_index) {
      result.marks_awarded = result.marks_possible
      result.is_correct = true
      result.details.method = 'MCQ exact match'
    } else {
      result.details.method = `MCQ mismatch: selected ${selectedIndex}, correct is ${question.correct_mcq_index}`
    }
    return result
  }

  // ─── NUMERIC ANSWER MARKING ─────────────────────────────────────────────
  if (type === QUESTION_TYPES.NUMERIC || type === QUESTION_TYPES.CALCULATION) {
    const scholarNum = parseNumericAnswer(scholarAnswer)
    if (scholarNum === null) {
      result.reason = 'Non-numeric answer to numeric question'
      return result
    }

    // Check against acceptable_answers (supports both .exact and .primary/.alternatives shapes)
    const numericAcceptable = aa.exact || aa.primary || []
    const numericAlternatives = aa.alternatives || []
    const allNumericAcceptable = [...(Array.isArray(numericAcceptable) ? numericAcceptable : [numericAcceptable]), ...(Array.isArray(numericAlternatives) ? numericAlternatives : [])]
    if (allNumericAcceptable.length > 0) {
      for (const expected of allNumericAcceptable) {
        if (isNumericMatch(scholarNum, expected)) {
          result.marks_awarded = result.marks_possible
          result.is_correct = true
          result.details.method = `Numeric exact match: ${scholarNum}`
          return result
        }
      }
    }

    // Check against acceptable_answers.range
    if (aa && aa.range) {
      const { min, max } = aa.range
      if (scholarNum >= min && scholarNum <= max) {
        result.marks_awarded = result.marks_possible
        result.is_correct = true
        result.details.method = `Numeric range match: ${scholarNum} in [${min}, ${max}]`
        return result
      }
    }

    // Check sig figs if specified
    if (aa.sig_figs && aa.sig_figs > 0) {
      const actualSigFigs = countSigFigs(scholarAnswer)
      if (actualSigFigs !== aa.sig_figs) {
        result.details.sig_figs_error = `${actualSigFigs} sig figs given, ${aa.sig_figs} required`
      }
    }

    result.reason = 'Numeric answer outside acceptable range'
    return result
  }

  // ─── SHORT TEXT ANSWER MARKING ──────────────────────────────────────────
  if (type === QUESTION_TYPES.SHORT_ANSWER) {
    // Supports both .exact and .primary/.alternatives shapes
    const primaryAnswers = aa.exact || aa.primary || []
    const altAnswers = aa.alternatives || []
    const allAcceptable = [...(Array.isArray(primaryAnswers) ? primaryAnswers : [primaryAnswers]), ...(Array.isArray(altAnswers) ? altAnswers : [])]
    if (allAcceptable.length === 0) {
      result.reason = 'No acceptable answers defined'
      return result
    }

    const normalizedScholar = normalizeAnswer(scholarAnswer)

    for (const acceptableExact of allAcceptable) {
      const normalizedExpected = normalizeAnswer(acceptableExact)

      // Exact match
      if (normalizedScholar === normalizedExpected) {
        result.marks_awarded = result.marks_possible
        result.is_correct = true
        result.details.method = 'Exact match'
        return result
      }

      // Levenshtein for typo tolerance (only on longer answers >4 chars)
      if (normalizedScholar.length > 4) {
        const distance = levenshtein(normalizedScholar, normalizedExpected)
        if (distance <= LEVENSHTEIN_THRESHOLD) {
          result.marks_awarded = result.marks_possible
          result.is_correct = true
          result.details.method = `Typo tolerance (distance=${distance})`
          return result
        }
      }
    }

    result.reason = 'Answer does not match acceptable responses'
    result.details.attempted = normalizedScholar
    return result
  }

  // All other types → cannot mark deterministically
  result.reason = `Question type '${type}' requires Tier 2 or Tier 3 marking`
  return result
}

// ─── TIER 2: RULE-BASED MARKING ─────────────────────────────────────────────

/**
 * Extract keywords from a mark breakdown description (e.g., method step).
 * @param {string} description
 * @returns {string[]} Array of keywords
 */
function extractKeywords(description) {
  if (!description) return []
  return description
    .toLowerCase()
    .split(/[,;.]/)
    .map(s => s.trim())
    .filter(s => s.length > 2)
}

/**
 * Check if scholar's answer contains required keywords (case-insensitive, stem-aware).
 * Allows partial word matches and ordering flexibility.
 * @param {string} scholarAnswer
 * @param {string[]} keywords
 * @returns {boolean}
 */
function containsKeywords(scholarAnswer, keywords) {
  if (!keywords.length) return true
  if (!scholarAnswer) return false

  const normalized = scholarAnswer.toLowerCase()
  const foundCount = keywords.filter(kw => {
    // Try substring match
    if (normalized.includes(kw)) return true
    // Try word-stem match (first 5 chars)
    const stem = kw.slice(0, 5)
    return normalized.includes(stem)
  }).length

  return foundCount >= Math.ceil(keywords.length / 2) // Need at least 50%
}

/**
 * Tier 2 marking — Rule-based with fuzzy matching.
 * Handles method marks (M/P), accuracy marks (A), B marks.
 * @param {Object} question — from exam_questions table
 * @param {string} scholarAnswer — text answer from scholar
 * @returns {Object} { marks_awarded, marks_possible, is_correct, marking_tier, details, feedback }
 */
export function markRuleBased(question, scholarAnswer) {
  const result = {
    marks_awarded: 0,
    marks_possible: question.marks || 0,
    is_correct: false,
    marking_tier: MARK_TIERS.RULE_BASED,
    details: { method_marks: [], accuracy_marks: [], b_marks: [] },
    feedback: []
  }

  if (!question.mark_breakdown) {
    result.feedback.push('No detailed mark scheme available')
    return result
  }

  // Normalise mark_breakdown to array format
  // DB stores flat object: {"M1": "desc", "A1": "desc"} — convert to [{code, marks, description}]
  let breakdown = question.mark_breakdown
  if (!Array.isArray(breakdown)) {
    if (typeof breakdown === 'object' && breakdown !== null) {
      breakdown = Object.entries(breakdown).map(([code, description]) => ({
        code,
        marks: 1,
        description: typeof description === 'string' ? description : JSON.stringify(description)
      }))
    } else {
      result.feedback.push('Invalid mark breakdown structure')
      return result
    }
  }

  let methodMarksAwarded = 0
  const methodMarksChecked = {}

  // First pass: Check all method/process marks (M)
  for (const mark of breakdown) {
    if (!mark.code) continue

    if (mark.code.startsWith('M') || mark.code.startsWith('P')) {
      // Method/Process mark
      const keywords = extractKeywords(mark.description)
      if (containsKeywords(scholarAnswer, keywords)) {
        methodMarksAwarded += mark.marks || 1
        methodMarksChecked[mark.code] = true
        result.details.method_marks.push({
          code: mark.code,
          marks: mark.marks || 1,
          awarded: true,
          description: mark.description
        })
      } else {
        result.details.method_marks.push({
          code: mark.code,
          marks: mark.marks || 1,
          awarded: false,
          description: mark.description
        })
      }
    }
  }

  // Second pass: Check accuracy/answer marks (A)
  let accuracyMarksAwarded = 0
  for (const mark of breakdown) {
    if (!mark.code || !mark.code.startsWith('A')) continue

    // Check if prerequisite method mark was awarded (unless follow_through = true)
    const prerequisiteMethod = mark.requires_method
    const followThrough = mark.follow_through === true

    let canAwardAccuracy = true
    if (prerequisiteMethod && !followThrough) {
      canAwardAccuracy = methodMarksChecked[prerequisiteMethod] === true
    }

    if (canAwardAccuracy) {
      // Check if final answer is acceptable
      const numAnswer = parseNumericAnswer(scholarAnswer)
      if (numAnswer !== null && mark.acceptable_range) {
        const { min, max } = mark.acceptable_range
        if (numAnswer >= min && numAnswer <= max) {
          accuracyMarksAwarded += mark.marks || 1
          result.details.accuracy_marks.push({
            code: mark.code,
            marks: mark.marks || 1,
            awarded: true
          })
        } else {
          result.details.accuracy_marks.push({
            code: mark.code,
            marks: mark.marks || 1,
            awarded: false
          })
        }
      }
    }
  }

  // Third pass: Check B marks (unconditional)
  let bMarksAwarded = 0
  for (const mark of breakdown) {
    if (!mark.code || !mark.code.startsWith('B')) continue

    const keywords = extractKeywords(mark.description)
    if (containsKeywords(scholarAnswer, keywords)) {
      bMarksAwarded += mark.marks || 1
      result.details.b_marks.push({
        code: mark.code,
        marks: mark.marks || 1,
        awarded: true
      })
    } else {
      result.details.b_marks.push({
        code: mark.code,
        marks: mark.marks || 1,
        awarded: false
      })
    }
  }

  result.marks_awarded = methodMarksAwarded + accuracyMarksAwarded + bMarksAwarded
  result.is_correct = result.marks_awarded === result.marks_possible
  result.feedback.push(
    `Method: ${methodMarksAwarded}/${breakdown.filter(m => m.code?.startsWith('M')).reduce((s, m) => s + (m.marks || 1), 0)}`
  )
  result.feedback.push(
    `Accuracy: ${accuracyMarksAwarded}/${breakdown.filter(m => m.code?.startsWith('A')).reduce((s, m) => s + (m.marks || 1), 0)}`
  )

  return result
}

// ─── TIER 3: AI MARKING ─────────────────────────────────────────────────────

/**
 * Build a structured prompt for AI marking.
 * @param {Object} question
 * @param {string} scholarAnswer
 * @param {string} ragContext — Optional RAG-retrieved mark scheme context
 * @returns {string} Structured prompt
 */
function buildAIMarkingPrompt(question, scholarAnswer, ragContext = '') {
  const aa = question.acceptable_answers || {}
  const descriptors = aa.band_descriptors || question.mark_breakdown || []

  let prompt = `You are an expert exam marker. Mark the following answer according to the mark scheme.

QUESTION:
${question.question_text || question.stem || ''}

`

  // Include RAG context if available
  if (ragContext && ragContext.trim().length > 0) {
    prompt += `${ragContext}

`
  }

  prompt += `MARK SCHEME:
${
  Array.isArray(descriptors)
    ? descriptors
        .map(d => `- ${d.band || d.code || ''}: ${d.description || ''}${d.marks ? ` (${d.marks} marks)` : ''}`)
        .join('\n')
    : JSON.stringify(descriptors, null, 2)
}

MODEL ANSWER:
${aa.model_answer || '(Not provided)'}

SCHOLAR'S ANSWER:
${scholarAnswer}

Provide a JSON response with:
{
  "marks_awarded": <number>,
  "marks_possible": ${question.marks || 0},
  "band_level": "<if band descriptors, which band>",
  "correct_elements": [<list of what was correct>],
  "missing_elements": [<list of what was missed>],
  "errors": [<list of specific errors or misconceptions>],
  "feedback": "<detailed feedback for the scholar>",
  "confidence": <0.0-1.0, how confident you are in this mark>
}

Be thorough and fair. Award partial credit where appropriate. Consider the scholar's working and reasoning, not just the final answer.`

  return prompt
}

/**
 * Tier 3 marking — AI-powered with structured output and confidence scoring.
 * For extended responses, essays, complex explanations.
 * Integrates RAG (Retrieval-Augmented Generation) for mark scheme context.
 * @param {Object} question
 * @param {string} scholarAnswer
 * @param {Object} options — { openaiApiKey, retries, supabase, questionId }
 * @returns {Promise<Object>} { marks_awarded, marks_possible, marking_tier, ai_confidence, ai_feedback, needs_human_review, details }
 */
export async function markWithAI(question, scholarAnswer, options = {}) {
  const { openaiApiKey, retries = 0, supabase = null, questionId = null } = options

  const result = {
    marks_awarded: 0,
    marks_possible: question.marks || 0,
    marking_tier: MARK_TIERS.AI_MARKING,
    ai_confidence: 0,
    ai_feedback: '',
    needs_human_review: false,
    is_correct: false,
    details: {},
    error: null,
    rag_context_used: false
  }

  // Validate OpenAI key
  if (!openaiApiKey) {
    result.error = 'No OpenAI API key provided'
    result.needs_human_review = true
    return result
  }

  try {
    const client = new OpenAI({ apiKey: openaiApiKey })

    // Retrieve RAG context (non-blocking)
    let ragContext = ''
    if (supabase && questionId && question.question_text) {
      try {
        ragContext = await getMarkSchemeContext(
          supabase,
          questionId,
          question.question_text,
          question.marks || 0
        )
        if (ragContext && ragContext.trim().length > 0) {
          result.rag_context_used = true
        }
      } catch (ragErr) {
        console.warn('RAG context retrieval failed (non-blocking):', ragErr.message)
        // Gracefully continue — RAG is optional
      }
    }

    const prompt = buildAIMarkingPrompt(question, scholarAnswer, ragContext)

    const response = await Promise.race([
      client.chat.completions.create({
        model: 'gpt-4o-mini', // Use mini for cost efficiency
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2, // Low temperature for consistency
        response_format: { type: 'json_object' },
        max_tokens: 1000
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI marking timeout')), AI_TIMEOUT_MS)
      )
    ])

    const content = response.choices[0]?.message?.content
    if (!content) {
      result.error = 'Empty response from AI'
      result.needs_human_review = true
      return result
    }

    const parsed = JSON.parse(content)

    result.marks_awarded = Math.min(parsed.marks_awarded || 0, result.marks_possible)
    result.is_correct = result.marks_awarded === result.marks_possible
    result.ai_confidence = Math.min(1, Math.max(0, parsed.confidence || 0))
    result.ai_feedback = parsed.feedback || ''
    result.details = {
      band_level: parsed.band_level,
      correct_elements: parsed.correct_elements || [],
      missing_elements: parsed.missing_elements || [],
      errors: parsed.errors || []
    }

    // Flag for review if confidence is low
    if (result.ai_confidence < CONFIDENCE_THRESHOLD) {
      result.needs_human_review = true
    }
  } catch (err) {
    console.error('AI marking error:', err.message)

    if (retries < AI_MAX_RETRIES) {
      // Retry once
      return markWithAI(question, scholarAnswer, {
        ...options,
        retries: retries + 1
      })
    }

    result.error = `AI marking failed: ${err.message}`
    result.needs_human_review = true
  }

  return result
}

// ─── MAIN MARKING ORCHESTRATOR ──────────────────────────────────────────────

/**
 * Select appropriate marking tier based on question type and marks.
 * @param {Object} question
 * @returns {string} MARK_TIERS constant
 */
function selectMarkingTier(question) {
  const type = question.question_type
  const marks = question.marks || 0

  // Tier 1: Deterministic
  if (type === QUESTION_TYPES.MCQ) return MARK_TIERS.DETERMINISTIC
  if (type === QUESTION_TYPES.SHORT_ANSWER && marks <= 1) return MARK_TIERS.DETERMINISTIC
  if (type === QUESTION_TYPES.CALCULATION && marks <= 2) return MARK_TIERS.DETERMINISTIC

  // Tier 2: Rule-based
  if (type === QUESTION_TYPES.CALCULATION) return MARK_TIERS.RULE_BASED
  if (type === QUESTION_TYPES.DATA_INTERPRETATION && marks <= 4) return MARK_TIERS.RULE_BASED
  if (type === QUESTION_TYPES.SHORT_ANSWER) return MARK_TIERS.RULE_BASED

  // Tier 3: AI
  return MARK_TIERS.AI_MARKING
}

/**
 * Mark a single answer using appropriate tier.
 * This is the main entry point for marking individual questions.
 *
 * @param {Object} question — from exam_questions table
 * @param {string} scholarAnswer — raw text answer
 * @param {Object} scholarAnswerData — structured answer (e.g., { mcqSelectedIndex: 1 })
 * @param {Object} options — { supabase, openaiApiKey, paperId, questionId }
 * @returns {Promise<Object>} { marks_awarded, marks_possible, is_correct, marking_tier, ai_confidence, ai_feedback, needs_human_review, details, rag_context_used }
 */
export async function markAnswer(
  question,
  scholarAnswer,
  scholarAnswerData = {},
  options = {}
) {
  const { openaiApiKey, supabase = null, questionId = null } = options

  // Determine which tier to use
  const tier = selectMarkingTier(question)

  // Empty answer → 0 marks
  if (!scholarAnswer || (typeof scholarAnswer === 'string' && !scholarAnswer.trim())) {
    return {
      marks_awarded: 0,
      marks_possible: question.marks || 0,
      is_correct: false,
      marking_tier: tier,
      ai_confidence: 1,
      ai_feedback: 'No answer provided',
      needs_human_review: false,
      details: { reason: 'blank_answer' },
      rag_context_used: false
    }
  }

  // Tier 1
  if (tier === MARK_TIERS.DETERMINISTIC) {
    return markDeterministic(question, scholarAnswer, scholarAnswerData)
  }

  // Tier 2
  if (tier === MARK_TIERS.RULE_BASED) {
    return markRuleBased(question, scholarAnswer)
  }

  // Tier 3: Pass RAG options
  return markWithAI(question, scholarAnswer, { openaiApiKey, supabase, questionId })
}

// ─── SITTING-LEVEL MARKING ──────────────────────────────────────────────────

/**
 * Mark all answers for a completed exam sitting.
 * Updates exam_answers rows with marks_awarded, updates sitting with total_score/percentage.
 * Creates exam_analytics entry for statistics.
 *
 * @param {string} sittingId — exam_sittings.id
 * @param {Object} options — { supabase, openaiApiKey }
 * @returns {Promise<Object>} { total_score, max_possible, percentage, results, errors }
 */
export async function markSitting(sittingId, options = {}) {
  const { supabase, openaiApiKey } = options

  const result = {
    total_score: 0,
    max_possible: 0,
    percentage: 0,
    results: [], // Per-question marking results
    errors: [],
    marked_at: new Date().toISOString()
  }

  if (!supabase) {
    result.errors.push('No Supabase client provided')
    return result
  }

  try {
    // 1. Fetch the exam sitting
    const { data: sitting, error: sittingError } = await supabase
      .from('exam_sittings')
      .select('id, scholar_id, exam_paper_id')
      .eq('id', sittingId)
      .single()

    if (sittingError || !sitting) {
      result.errors.push(`Sitting not found: ${sittingError?.message}`)
      return result
    }

    // 2. Fetch exam paper and questions
    const { data: paper, error: paperError } = await supabase
      .from('exam_papers')
      .select('id, total_marks, subject')
      .eq('id', sitting.exam_paper_id)
      .single()

    if (paperError || !paper) {
      result.errors.push(`Paper not found: ${paperError?.message}`)
      return result
    }

    const { data: questions, error: questionsError } = await supabase
      .from('exam_questions')
      .select('id, marks, question_type, mark_breakdown, acceptable_answers, question_text, answer_input_type, mcq_options, correct_mcq_index, marking_difficulty')
      .eq('exam_paper_id', sitting.exam_paper_id)

    if (questionsError || !questions) {
      result.errors.push(`Questions not found: ${questionsError?.message}`)
      return result
    }

    // 3. Fetch scholar answers
    const { data: answers, error: answersError } = await supabase
      .from('exam_answers')
      .select('id, question_id, scholar_answer, scholar_working')
      .eq('sitting_id', sittingId)

    if (answersError || !answers) {
      result.errors.push(`Answers not found: ${answersError?.message}`)
      return result
    }

    // 4. Mark each answer
    const updateOps = []
    const markedAnswers = []

    for (const answer of answers) {
      const question = questions.find(q => q.id === answer.question_id)
      if (!question) {
        result.errors.push(`Question ${answer.question_id} not found`)
        continue
      }

      try {
        const markingResult = await markAnswer(
          question,
          answer.scholar_answer,
          answer.scholar_working || {},
          { openaiApiKey, supabase, questionId: answer.question_id }
        )

        result.total_score += markingResult.marks_awarded
        result.max_possible += markingResult.marks_possible

        markedAnswers.push({
          answerId: answer.id,
          questionId: answer.question_id,
          marks_awarded: markingResult.marks_awarded,
          marks_possible: markingResult.marks_possible,
          is_correct: markingResult.is_correct,
          marking_tier: markingResult.marking_tier,
          ai_confidence: markingResult.ai_confidence || null,
          ai_feedback: markingResult.ai_feedback || null,
          needs_human_review: markingResult.needs_human_review || false,
          rag_context_used: markingResult.rag_context_used || false
        })

        result.results.push(markingResult)
      } catch (err) {
        result.errors.push(`Error marking answer ${answer.id}: ${err.message}`)
        result.total_score += 0
        result.max_possible += (question.marks || 0)
      }
    }

    // 5. Calculate percentage
    result.percentage =
      result.max_possible > 0
        ? calculatePercentage(result.total_score, result.max_possible)
        : 0

    // 6. Update exam_answers with marks
    for (const marked of markedAnswers) {
      updateOps.push(
        supabase
          .from('exam_answers')
          .update({
            marks_awarded: marked.marks_awarded,
            marking_tier: marked.marking_tier,
            ai_confidence: marked.ai_confidence,
            ai_feedback: marked.ai_feedback,
            needs_human_review: marked.needs_human_review
          })
          .eq('id', marked.answerId)
      )
    }

    // Execute all updates in parallel
    if (updateOps.length > 0) {
      const updateResults = await Promise.all(updateOps)
      const updateErrors = updateResults.filter(r => r.error)
      if (updateErrors.length > 0) {
        result.errors.push(
          `${updateErrors.length} answer updates failed: ${updateErrors[0].error.message}`
        )
      }
    }

    // 7. Update exam_sitting with totals
    const { error: sittingUpdateError } = await supabase
      .from('exam_sittings')
      .update({
        total_score: result.total_score,
        total_marks_available: result.max_possible,
        percentage: result.percentage,
        status: 'marked'
      })
      .eq('id', sittingId)

    if (sittingUpdateError) {
      result.errors.push(`Failed to update sitting totals: ${sittingUpdateError.message}`)
    }

    // 8. Log marking stats (analytics computed on-demand via /api/exam-analytics)
    const needsReviewCount = markedAnswers.filter(m => m.needs_human_review).length
    console.log(`[markSitting] ${sittingId}: ${result.total_score}/${result.max_possible} (${result.percentage}%), ${markedAnswers.length} questions, ${needsReviewCount} need review`)
  } catch (err) {
    result.errors.push(`Unexpected error in markSitting: ${err.message}`)
  }

  return result
}

export { MARK_TIERS, QUESTION_TYPES }
