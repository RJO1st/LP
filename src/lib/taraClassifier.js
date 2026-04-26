/**
 * taraClassifier.js
 * Intent classification for student input to Tara — two-tier (regex + heuristic).
 *
 * Returns one of: 'on_topic' | 'off_topic_innocent' | 'off_topic_concerning' | 'safeguarding_flag'
 *
 * Designed to complete in <5ms with no async calls or external APIs.
 *
 * Hardening (April 26 2026):
 *  - normalise() strips homoglyphs (@ → a, 3 → e, 0 → o, etc.) and collapses
 *    repeated punctuation/spaces so "k i l l" and "k!ll" both match.
 *  - All patterns run against BOTH the raw-lowercased and normalised forms so
 *    we catch leetspeak, spacing tricks, and common unicode substitutions.
 */

// ─── NORMALISATION ───────────────────────────────────────────────────────────
// Map of common substitution characters → canonical letter.
// Not exhaustive — covers the most common obfuscation used by children.
const HOMOGLYPHS = {
  '@': 'a', '4': 'a', 'á': 'a', 'à': 'a', 'â': 'a', 'ä': 'a',
  '3': 'e', 'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
  '1': 'i', '!': 'i', 'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
  '0': 'o', 'ó': 'o', 'ò': 'o', 'ô': 'o', 'ö': 'o',
  '5': 's', '$': 's',
  '7': 't',
  'ü': 'u', 'ú': 'u', 'û': 'u', 'ù': 'u',
  'ñ': 'n',
  'ç': 'c',
};

const HOMOGLYPH_RE = new RegExp(`[${Object.keys(HOMOGLYPHS).map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('')}]`, 'g');

/**
 * Produce a normalised version of the input:
 *  1. Lowercase
 *  2. Replace homoglyphs with canonical ASCII letters
 *  3. Remove non-alphanumeric characters except spaces (strips punctuation tricks)
 *  4. Collapse runs of whitespace to single space
 */
function normalise(text) {
  return text
    .toLowerCase()
    .replace(HOMOGLYPH_RE, ch => HOMOGLYPHS[ch] ?? ch)
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Produce a compacted version with ALL spaces removed.
 * Catches "k i l l  myself" → "killmyself" and "dr ugs" → "drugs".
 */
function compact(text) {
  return normalise(text).replace(/ /g, '');
}

/**
 * Test a set of patterns against raw-lower, normalised, and space-compacted text.
 * Returns true if any pattern matches any form.
 */
function anyMatch(patterns, lower, norm) {
  const comp = compact(lower);  // lower is already lowercased raw text
  for (const pattern of patterns) {
    if (pattern.test(lower) || pattern.test(norm) || pattern.test(comp)) return true;
  }
  return false;
}

// ─── PATTERN LISTS ───────────────────────────────────────────────────────────

// Crisis patterns — trigger immediate safeguarding response.
// Written to match normalised text (no special chars, spaces compressed).
const CRISIS_PATTERNS = [
  /\bkill\s*my\s*self\b/,
  /\bkms\b/,
  /\bwant\s+to\s+die\b/,
  /\bend\s+my\s+life\b/,
  /\bsuicid/,
  /\bself\s*harm\b/,
  /\bcutting\s+my\s*self\b/,
  /\bhurt\s+my\s*self\b/,
  /\babuse\b/,
  /\bbeing\s+abused\b/,
  /\bsomeone\s+hurts?\s+me\b/,
  /\btouches?\s+me\b/,
  /\brape\b/,
  /\bmolest\b/,
  /\bno\s+reason\s+to\s+live\b/,
  /\bnobody\s+cares\b/,
  /\brun\s+away\s+from\s+home\b/,
];

// Concerning off-topic patterns — not on the learning task AND potentially harmful.
const CONCERNING_PATTERNS = [
  /\bhow\s+to\s+make\b/,
  /\bhow\s+d[o]?\s+i\s+hack\b/,
  /\bhow\s+to\s+get\s+a\s+gun\b/,
  /\bdrugs?\b/,
  /\balcohol\b/,
  /\bporn\b/,
  /\bpornograph/,
  /\bsex\b/,
  /\bnaked\b/,
  /\bkill\s+someone\b/,
  /\bfight\b/,
  /\bcheat\s+on\b/,
  /\b(boy|girl)\s*friend\b/,
  /\bdating\b/,
];

// ─── CLASSIFIER ──────────────────────────────────────────────────────────────

/**
 * Classify the intent of a student's message to Tara.
 *
 * @param {string} text - The student's input text
 * @param {string} topic - The current learning topic (e.g., 'fractions', 'photosynthesis')
 * @param {string} subject - The subject being studied (e.g., 'mathematics', 'science')
 * @returns {string} One of: 'on_topic' | 'off_topic_innocent' | 'off_topic_concerning' | 'safeguarding_flag'
 */
export function classifyIntent(text, topic = '', subject = '') {
  if (!text || typeof text !== 'string') return 'on_topic';

  const lower = text.toLowerCase();
  const norm  = normalise(text);  // homoglyph + punctuation stripped form

  // ── TIER 1: SAFEGUARDING FLAGS (highest priority) ─────────────────────────
  if (anyMatch(CRISIS_PATTERNS, lower, norm)) {
    return 'safeguarding_flag';
  }

  // ── TIER 1: OFF-TOPIC CONCERNING (safety-relevant) ───────────────────────
  if (anyMatch(CONCERNING_PATTERNS, lower, norm)) {
    return 'off_topic_concerning';
  }

  // ── TIER 2: OFF-TOPIC INNOCENT (heuristic redirect) ──────────────────────
  // Check if message contains curriculum-related keywords.
  const curriculumKeywords = [
    'math', 'maths', 'number', 'fraction', 'algebra', 'equation',
    'english', 'grammar', 'spelling', 'punctuation',
    'science', 'biology', 'chemistry', 'physics',
    'history', 'geography', 'computing',
    'verbal', 'reasoning',
  ];

  // Build a keyword set including the current topic and subject
  const keywords = new Set(curriculumKeywords);
  if (topic) {
    keywords.add(topic.toLowerCase());
    keywords.add(topic.toLowerCase().replace(/_/g, ' '));
  }
  if (subject) {
    keywords.add(subject.toLowerCase());
    keywords.add(subject.toLowerCase().replace(/_/g, ' '));
  }

  // Check both raw and normalised text for keyword presence
  const hasKeyword = Array.from(keywords).some(kw => lower.includes(kw) || norm.includes(kw));

  // Heuristic: if no keyword found, message is long-ish, and doesn't end with
  // a question mark, likely off-topic and innocent.
  if (!hasKeyword && text.length > 20 && !lower.trim().endsWith('?')) {
    return 'off_topic_innocent';
  }

  // ── DEFAULT: ON-TOPIC ─────────────────────────────────────────────────────
  return 'on_topic';
}
