/**
 * taraClassifier.js
 * Intent classification for student input to Tara — two-tier (regex + heuristic).
 *
 * Returns one of: 'on_topic' | 'off_topic_innocent' | 'off_topic_concerning' | 'safeguarding_flag'
 *
 * Designed to complete in <5ms with no async calls or external APIs.
 */

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

  // ── TIER 1: SAFEGUARDING FLAGS (highest priority) ───────────────────────────
  // Crisis keywords that trigger immediate safeguarding response.
  const crisisPatterns = [
    /\bkill\s+myself\b/,
    /\bkms\b/,
    /\bwant\s+to\s+die\b/,
    /\bend\s+my\s+life\b/,
    /\bsuicid/,
    /\bself\s*[-]?harm/,
    /\bcutting\s+myself\b/,
    /\bhurt\s+myself\b/,
    /\babuse|being\s+abused\b/,
    /\bsomeone\s+hurts?\s+me\b/,
    /\btouch(es)?\s+me\b/,
    /\brape|molest/,
    /\bno\s+reason\s+to\s+live\b/,
    /\bnobody\s+cares\b/,
    /\brun\s+away\s+from\s+home\b/,
  ];

  for (const pattern of crisisPatterns) {
    if (pattern.test(lower)) {
      return 'safeguarding_flag';
    }
  }

  // ── TIER 1: OFF-TOPIC CONCERNING (safety-relevant) ──────────────────────────
  // Content that is off-topic AND potentially harmful or inappropriate.
  const concerningPatterns = [
    /\bhow\s+to\s+make\b/,
    /\bhow\s+d[o']?\s+i\s+hack\b/,
    /\bhow\s+to\s+get\s+a\s+gun\b/,
    /\bdrugs?\b/,
    /\balcohol\b/,
    /\bporn|pornograph/,
    /\bsex\b/,
    /\bnaked\b/,
    /\bkill\s+someone\b/,
    /\bfight\b/,
    /\bcheat\s+on\b/,
    /\b(boy|girl)friend\b/,
    /\bdating\b/,
  ];

  for (const pattern of concerningPatterns) {
    if (pattern.test(lower)) {
      return 'off_topic_concerning';
    }
  }

  // ── TIER 1: OFF-TOPIC INNOCENT (heuristic redirect) ───────────────────────
  // Check if message contains curriculum-related keywords.
  const curriculumKeywords = [
    'math', 'maths', 'number', 'fraction', 'algebra', 'equation',
    'english', 'grammar', 'spelling', 'punctuation',
    'science', 'biology', 'chemistry', 'physics',
    'history', 'geography', 'computing',
    'verbal', 'reasoning',
  ];

  // Build a keyword set including topic and subject
  const keywords = new Set(curriculumKeywords);
  if (topic) {
    keywords.add(topic.toLowerCase());
    keywords.add(topic.toLowerCase().replace(/_/g, ' '));
  }
  if (subject) {
    keywords.add(subject.toLowerCase());
    keywords.add(subject.toLowerCase().replace(/_/g, ' '));
  }

  // Check if at least one keyword appears in the text
  const hasKeyword = Array.from(keywords).some(kw => lower.includes(kw));

  // Heuristic: if no keyword found, message is long-ish, and doesn't end with
  // a question mark, likely off-topic and innocent
  if (!hasKeyword && text.length > 20 && !lower.trim().endsWith('?')) {
    return 'off_topic_innocent';
  }

  // ── DEFAULT: ON-TOPIC ────────────────────────────────────────────────────────
  return 'on_topic';
}
