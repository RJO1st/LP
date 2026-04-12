/**
 * visualDetectors.js — Pure-JS visual option detection (NO React)
 *
 * Extracted from VisualOptionDetectors.jsx so that:
 *  - Browser components (KS1QuizShell, KS2QuizShell, VisualOptionDetectors.jsx)
 *    import detection logic from here
 *  - Node.js scripts (generateQuestionsV2.mjs, backfillVisualHints.mjs)
 *    can import the same functions without pulling in React
 *
 * Detection types:
 *   clock    — "3:15", "half past 2", "quarter to 6"
 *   fraction — "3/4", "1 1/2", "three quarters"
 *   money    — "£1.50", "50p", "₦200", "$5"
 *   shape    — "triangle", "hexagon", "a rectangle"
 *
 * resolveVisualType(options) is the top-level entry point.
 */

/* ──────────────────────────────────────────
   §0  UTILITY
   ────────────────────────────────────────── */
const optText = (o) =>
  typeof o === "string" ? o : o?.text || String(o || "");

/* ──────────────────────────────────────────
   §1  CLOCK / TIME
   ────────────────────────────────────────── */
function parseTimeOption(str) {
  if (!str || typeof str !== "string") return null;
  const s = str.trim().toLowerCase();
  const colon = s.match(/^(\d{1,2}):(\d{2})$/);
  if (colon)
    return {
      hours: parseInt(colon[1], 10) % 12,
      minutes: parseInt(colon[2], 10),
    };
  const half = s.match(/half\s+past\s+(\d{1,2})/);
  if (half) return { hours: parseInt(half[1], 10) % 12, minutes: 30 };
  const qPast = s.match(/quarter\s+past\s+(\d{1,2})/);
  if (qPast) return { hours: parseInt(qPast[1], 10) % 12, minutes: 15 };
  const qTo = s.match(/quarter\s+to\s+(\d{1,2})/);
  if (qTo) {
    const h = parseInt(qTo[1], 10);
    return { hours: (h - 1 + 12) % 12, minutes: 45 };
  }
  const oc = s.match(/(\d{1,2})\s+o'?clock/);
  if (oc) return { hours: parseInt(oc[1], 10) % 12, minutes: 0 };
  const named = s.match(
    /(\d{1,2})\s+(thirty|fifteen|forty[\s-]five|twenty|ten|five|fifty|fifty[\s-]five)/
  );
  if (named) {
    const mins = {
      thirty: 30,
      fifteen: 15,
      "forty-five": 45,
      "forty five": 45,
      twenty: 20,
      ten: 10,
      five: 5,
      fifty: 50,
      "fifty-five": 55,
      "fifty five": 55,
    };
    return {
      hours: parseInt(named[1], 10) % 12,
      minutes: mins[named[2].replace(/\s+/g, " ")] || 0,
    };
  }
  return null;
}

function isTimeOptions(options) {
  if (!Array.isArray(options) || options.length < 2) return false;
  return options.filter((o) => parseTimeOption(optText(o))).length >= 2;
}

/* ──────────────────────────────────────────
   §2  FRACTIONS
   ────────────────────────────────────────── */
const WORD_FRACS = {
  "one half": [1, 2],
  "a half": [1, 2],
  half: [1, 2],
  "one quarter": [1, 4],
  "a quarter": [1, 4],
  quarter: [1, 4],
  "three quarters": [3, 4],
  "one third": [1, 3],
  "a third": [1, 3],
  "two thirds": [2, 3],
  "one fifth": [1, 5],
  "two fifths": [2, 5],
  "three fifths": [3, 5],
  "four fifths": [4, 5],
  "one sixth": [1, 6],
  "one eighth": [1, 8],
  "three eighths": [3, 8],
  "five eighths": [5, 8],
  "seven eighths": [7, 8],
  "one tenth": [1, 10],
  "three tenths": [3, 10],
  "seven tenths": [7, 10],
  "nine tenths": [9, 10],
};

function parseFractionOption(str) {
  if (!str || typeof str !== "string") return null;
  const s = str.trim();
  // "3/4", "1/2"
  const simple = s.match(/^(\d{1,3})\s*\/\s*(\d{1,3})$/);
  if (simple) {
    const num = parseInt(simple[1], 10);
    const den = parseInt(simple[2], 10);
    if (den > 0 && den <= 100 && num >= 0 && num <= den * 3)
      return { numerator: num, denominator: den };
  }
  // "1 3/4", "2 1/2"
  const mixed = s.match(/^(\d{1,2})\s+(\d{1,3})\s*\/\s*(\d{1,3})$/);
  if (mixed) {
    const whole = parseInt(mixed[1], 10);
    const num = parseInt(mixed[2], 10);
    const den = parseInt(mixed[3], 10);
    if (den > 0 && den <= 100)
      return {
        numerator: whole * den + num,
        denominator: den,
        whole,
        partNum: num,
      };
  }
  // Word fractions
  const lower = s.toLowerCase();
  if (WORD_FRACS[lower])
    return {
      numerator: WORD_FRACS[lower][0],
      denominator: WORD_FRACS[lower][1],
    };
  return null;
}

function isFractionOptions(options) {
  if (!Array.isArray(options) || options.length < 2) return false;
  return options.filter((o) => parseFractionOption(optText(o))).length >= 2;
}

/* ──────────────────────────────────────────
   §3  MONEY / CURRENCY
   ────────────────────────────────────────── */
const CURRENCY_REGEX = [
  { pattern: /^£\s*(\d{1,6}(?:\.\d{1,2})?)$/, currency: "GBP" },
  { pattern: /^(\d{1,4})p$/, currency: "GBP_PENCE" },
  {
    pattern: /^[₦N]\s*(\d{1,8}(?:[,]\d{3})*(?:\.\d{1,2})?)$/,
    currency: "NGN",
  },
  { pattern: /^\$\s*(\d{1,6}(?:\.\d{1,2})?)$/, currency: "USD" },
];

function parseMoneyOption(str) {
  if (!str || typeof str !== "string") return null;
  const s = str.trim();
  for (const { pattern, currency } of CURRENCY_REGEX) {
    const m = s.match(pattern);
    if (m) {
      const raw = m[1].replace(/,/g, "");
      const value = parseFloat(raw);
      if (isNaN(value)) continue;
      if (currency === "GBP_PENCE")
        return { currency: "GBP", value: value / 100, label: s, isPence: true };
      return { currency, value, label: s };
    }
  }
  return null;
}

function isMoneyOptions(options) {
  if (!Array.isArray(options) || options.length < 2) return false;
  return options.filter((o) => parseMoneyOption(optText(o))).length >= 2;
}

/* ──────────────────────────────────────────
   §4  GEOMETRY SHAPES
   ────────────────────────────────────────── */
const SHAPE_MAP = {
  circle: "circle",
  oval: "oval",
  ellipse: "oval",
  triangle: "triangle",
  equilateral: "triangle",
  square: "square",
  rectangle: "rectangle",
  oblong: "rectangle",
  pentagon: "pentagon",
  hexagon: "hexagon",
  heptagon: "heptagon",
  septagon: "heptagon",
  octagon: "octagon",
  nonagon: "nonagon",
  decagon: "decagon",
  rhombus: "rhombus",
  diamond: "rhombus",
  parallelogram: "parallelogram",
  trapezium: "trapezium",
  trapezoid: "trapezium",
  kite: "kite",
  star: "star",
  heart: "heart",
  cube: "cube",
  sphere: "sphere",
  cylinder: "cylinder",
  cone: "cone",
  pyramid: "pyramid",
  prism: "prism",
  semicircle: "semicircle",
  "semi-circle": "semicircle",
  arrow: "arrow",
  cross: "cross",
};

function parseShapeOption(str) {
  if (!str || typeof str !== "string") return null;
  const s = str.trim().toLowerCase();
  if (SHAPE_MAP[s]) return { shape: SHAPE_MAP[s], label: str.trim() };
  const article = s.match(/^(?:a|an)\s+(.+)$/);
  if (article && SHAPE_MAP[article[1]])
    return { shape: SHAPE_MAP[article[1]], label: str.trim() };
  return null;
}

function isShapeOptions(options) {
  if (!Array.isArray(options) || options.length < 2) return false;
  return options.filter((o) => parseShapeOption(optText(o))).length >= 2;
}

/* ──────────────────────────────────────────
   §5  PLACE VALUE (question-level)
   ────────────────────────────────────────── */
function parsePlaceValueQuestion(questionText) {
  if (!questionText || typeof questionText !== "string") return null;
  const s = questionText.toLowerCase();
  const digitInNum = s.match(
    /(?:digit|number)\s+['"]?(\d)['"]?\s+(?:in|of)\s+(?:the\s+number\s+)?['"]?(\d[\d,]*)/
  );
  if (digitInNum)
    return {
      targetDigit: parseInt(digitInNum[1], 10),
      number: parseInt(digitInNum[2].replace(/,/g, ""), 10),
    };
  const breakdown = s.match(
    /(?:break\s+down|represent|show|expand|partition)\s+['"]?(\d[\d,]*)['"]?/
  );
  if (breakdown)
    return { number: parseInt(breakdown[1].replace(/,/g, ""), 10) };
  const compose = s.match(
    /(\d+)\s+hundreds?.*?(\d+)\s+tens?.*?(\d+)\s+(?:ones?|units?)/
  );
  if (compose)
    return {
      number:
        parseInt(compose[1], 10) * 100 +
        parseInt(compose[2], 10) * 10 +
        parseInt(compose[3], 10),
    };
  return null;
}

/* ──────────────────────────────────────────
   §6  MASTER RESOLVER
   ────────────────────────────────────────── */

/**
 * resolveVisualType(options) → "clock" | "fraction" | "money" | "shape" | null
 *
 * Returns a plain string (not an object) for DB storage / comparison.
 * Priority: time > fraction > money > shape
 */
function resolveVisualType(options) {
  if (isTimeOptions(options)) return "clock";
  if (isFractionOptions(options)) return "fraction";
  if (isMoneyOptions(options)) return "money";
  if (isShapeOptions(options)) return "shape";
  return null;
}

/**
 * resolveVisualOptions(options) → { type } | null
 * Kept for backward-compat with VisualOptionDetectors.jsx API shape.
 */
function resolveVisualOptions(options) {
  const type = resolveVisualType(options);
  return type ? { type } : null;
}

/* ──────────────────────────────────────────
   §7  EXPORTS
   ────────────────────────────────────────── */

// ESM-style named exports (works in both .mjs scripts and Next.js)
export {
  optText,
  // Clock
  parseTimeOption,
  isTimeOptions,
  // Fraction
  WORD_FRACS,
  parseFractionOption,
  isFractionOptions,
  // Money
  CURRENCY_REGEX,
  parseMoneyOption,
  isMoneyOptions,
  // Shape
  SHAPE_MAP,
  parseShapeOption,
  isShapeOptions,
  // Place value
  parsePlaceValueQuestion,
  // Master resolvers
  resolveVisualType,
  resolveVisualOptions,
};
