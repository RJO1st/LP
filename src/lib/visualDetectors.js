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
 *
 *  OPTION-LEVEL (based on MCQ option text — original 4):
 *   clock      — "3:15", "half past 2", "quarter to 6"
 *   fraction   — "3/4", "1 1/2", "three quarters"
 *   money      — "£1.50", "50p", "₦200", "$5"
 *   shape      — "triangle", "hexagon", "a rectangle"
 *
 *  QUESTION-TEXT-LEVEL (based on question stem — 15 new categories):
 *   number_line    — number lines, placing values, rounding on a line
 *   bar_chart      — bar charts, pictograms, tally charts, frequency tables
 *   angle          — angles, protractors, acute/obtuse/reflex
 *   coordinates    — coordinate grids, plotting points, x/y-axis
 *   probability    — probability scales, likelihood, chance
 *   circle         — circle theorems, radius, diameter, chord, arc
 *   right_triangle — Pythagoras, hypotenuse, SOH-CAH-TOA, sin/cos/tan
 *   triangle       — triangle area, properties, angles
 *   area_perimeter — area/perimeter of 2D shapes
 *   symmetry       — lines of symmetry, reflective/rotational symmetry
 *   sequence       — number sequences, nth term, term-to-term rules
 *   venn           — Venn diagrams, sets, intersections
 *   place_value    — place value, digit positions, expanded form
 *   3d_shape       — volume/surface area of 3D shapes, nets
 *   array          — multiplication arrays, repeated addition grids (KS1/KS2)
 *
 * resolveVisualType(options, questionText) is the top-level entry point.
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
   §6  QUESTION-TEXT VISUAL DETECTION
   ────────────────────────────────────────── */

/**
 * detectQuestionVisual(questionText)
 * → visual type string | null
 *
 * Analyses the question stem to infer which visual aid would best
 * accompany the question in the UI.  Priority order matches the
 * specificity of the match (most-specific first).
 *
 * Returns one of:
 *   "number_line" | "bar_chart" | "angle" | "coordinates" |
 *   "probability" | "circle" | "right_triangle" | "triangle" |
 *   "area_perimeter" | "symmetry" | "sequence" | "venn" |
 *   "place_value" | "3d_shape" | "array" | null
 */
function detectQuestionVisual(questionText) {
  if (!questionText || typeof questionText !== "string") return null;
  const s = questionText.toLowerCase();

  // ── Probability ──────────────────────────────────────────────
  // Check early — "chance", "likely" etc. are unambiguous
  if (
    /\bprobabilit(?:y|ies)\b/.test(s) ||
    /\blikelihood\b/.test(s) ||
    /\bchance\s+of\b/.test(s) ||
    /\bhow\s+likely\b/.test(s) ||
    /\bprobability\s+scale\b/.test(s) ||
    /\bprobability\s+of\b/.test(s) ||
    /\bimpossible\b.*\bcertain\b/.test(s) ||
    /\bcertain\b.*\bimpossible\b/.test(s) ||
    (/\bfair\s+(?:dice|coin|spinner)\b/.test(s) && /\bprobab/.test(s))
  ) {
    return "probability";
  }

  // ── Venn diagram ─────────────────────────────────────────────
  if (
    /\bvenn\s+diagram\b/.test(s) ||
    /\bin\s+(?:the\s+)?(?:both|all)\s+(?:circles?|sets?|groups?)\b/.test(s) ||
    /\bintersection\b/.test(s) ||
    /\bunion\s+of\s+(?:the\s+)?sets?\b/.test(s)
  ) {
    return "venn";
  }

  // ── Coordinates / coordinate grid ────────────────────────────
  if (
    /\bcoordinates?\b/.test(s) ||
    /\bcoordinate\s+(?:grid|plane|axis|axes)\b/.test(s) ||
    /\bplot\s+(?:the\s+)?point/.test(s) ||
    /\bx[-\s]?axis\b/.test(s) ||
    /\by[-\s]?axis\b/.test(s) ||
    /\bgrid\s+reference\b/.test(s) ||
    /\b\(\s*-?\d+\s*,\s*-?\d+\s*\)/.test(s) ||   // literal (x, y) in text
    /\bpoint\s+[a-z]\s+(?:is\s+at|at\s+point|on\s+(?:the\s+)?grid)\b/.test(s)
  ) {
    return "coordinates";
  }

  // ── Number line ───────────────────────────────────────────────
  if (
    /\bnumber\s+line\b/.test(s) ||
    /\bplace\s+(?:it\s+on|on\s+(?:the\s+)?(?:a\s+)?number)/.test(s) ||
    /\bmark(?:ed)?\s+on\s+(?:the\s+)?(?:a\s+)?number\s+line\b/.test(s) ||
    /\bshow\s+(?:this\s+)?(?:on\s+)?a\s+number\s+line\b/.test(s) ||
    /\bround(?:ing|ed)?\s+.{0,30}\bnearest\b/.test(s) ||   // "rounding to the nearest" often uses number line
    /\bcount(?:ing)?\s+(?:on|back|forward|up|down)\s+(?:a\s+)?number\s+line\b/.test(s)
  ) {
    return "number_line";
  }

  // ── Bar chart / pictogram / tally ─────────────────────────────
  if (
    /\bbar\s+(?:chart|graph)\b/.test(s) ||
    /\bpictogram\b/.test(s) ||
    /\btally\s+(?:chart|mark|table)\b/.test(s) ||
    /\bfrequency\s+(?:table|diagram|chart)\b/.test(s) ||
    /\bpie\s+chart\b/.test(s) ||
    /\bline\s+graph\b/.test(s) ||
    /\bscatter\s+(?:graph|diagram|plot)\b/.test(s) ||
    /\bstem[\s-]and[\s-]leaf\b/.test(s) ||
    /\bhistogram\b/.test(s) ||
    /\bwaffle\s+(?:chart|diagram)\b/.test(s) ||
    /\bblock\s+(?:graph|diagram)\b/.test(s)
  ) {
    return "bar_chart";
  }

  // ── Right triangle / trigonometry / Pythagoras ───────────────
  if (
    /\bpythagoras\b/.test(s) ||
    /\bhypotenuse\b/.test(s) ||
    /\bsoh[\s-]?cah[\s-]?toa\b/.test(s) ||
    /\bsin(?:e)?\s*[=(]/.test(s) ||
    /\bcos(?:ine)?\s*[=(]/.test(s) ||
    /\btan(?:gent)?\s*[=(]/.test(s) ||
    /\bright[\s-]angled?\s+triangle\b/.test(s) ||
    /\bopposite\s+side\b.*\badjacent\b/.test(s) ||
    /\badjacent\b.*\bopposite\s+side\b/.test(s) ||
    /\btrigonometr/.test(s)
  ) {
    return "right_triangle";
  }

  // ── Circle / circle theorems ─────────────────────────────────
  if (
    /\bcircle\s+theorem\b/.test(s) ||
    /\bradius\b/.test(s) ||
    /\bdiameter\b/.test(s) ||
    /\bcircumference\b/.test(s) ||
    /\bchord\b/.test(s) ||
    /\bsector\b/.test(s) ||
    /\barc\s+(?:length|of\s+a\s+circle|ab|pq)\b/.test(s) ||
    /\bangle\s+(?:at\s+the\s+)?(?:centre|center|circumference)\b/.test(s) ||
    /\bangle\s+in\s+(?:a\s+)?(?:semi)?circle\b/.test(s) ||
    /\btangent\s+(?:to|from)\s+(?:a\s+)?circle\b/.test(s)
  ) {
    return "circle";
  }

  // ── Angle / protractor ────────────────────────────────────────
  if (
    /\bangle\b/.test(s) ||
    /\bprotractor\b/.test(s) ||
    /\bacute\s+angle\b/.test(s) ||
    /\bobtuse\s+angle\b/.test(s) ||
    /\breflex\s+angle\b/.test(s) ||
    /\bright\s+angle\b/.test(s) ||
    /\bstraight\s+(?:line\s+)?angle\b/.test(s) ||
    /\bdegrees?\s+in\s+(?:a\s+)?(?:triangle|quadrilateral|polygon)\b/.test(s) ||
    /\bsum\s+of\s+(?:the\s+)?(?:interior\s+)?angles?\b/.test(s) ||
    /\bexterior\s+angle\b/.test(s) ||
    /\bparallel\s+lines?\b/.test(s) ||
    /\bcorresponding\s+angles?\b/.test(s) ||
    /\balternate\s+angles?\b/.test(s) ||
    /\bco[\s-]?interior\s+angles?\b/.test(s) ||
    /\bvertically\s+opposite\b/.test(s) ||
    /\bbearing\b/.test(s)
  ) {
    return "angle";
  }

  // ── 3D shapes / volume / surface area ────────────────────────
  if (
    /\bvolume\s+of\s+(?:a\s+)?(?:cube|cuboid|cylinder|cone|sphere|prism|pyramid)\b/.test(s) ||
    /\bsurface\s+area\b/.test(s) ||
    /\bnet\s+of\s+(?:a\s+)?(?:cube|cuboid|cylinder|cone|prism|pyramid)\b/.test(s) ||
    /\bcuboid\b/.test(s) ||
    /\b3[\s-]?d\s+(?:shape|object|solid)\b/.test(s) ||
    /\bthree[\s-]?dimensional\b/.test(s) ||
    /\bfaces?,\s*edges?\s+and\s+vertices\b/.test(s) ||
    /\bfaces?\b.*\bedges?\b.*\bvertices\b/.test(s) ||
    /\beulerian\b/.test(s)
  ) {
    return "3d_shape";
  }

  // ── Area / perimeter ─────────────────────────────────────────
  if (
    /\barea\s+of\s+(?:a\s+|the\s+)?(?:triangle|rectangle|square|circle|parallelogram|trapezium|trapezoid|rhombus|kite|polygon|shape)\b/.test(s) ||
    /\bperimeter\s+of\b/.test(s) ||
    /\bfind\s+(?:the\s+)?(?:area|perimeter)\b/.test(s) ||
    /\bcalculate\s+(?:the\s+)?(?:area|perimeter)\b/.test(s) ||
    (/\barea\b/.test(s) && /\bcm[²2]|m[²2]|mm[²2]\b/.test(s)) ||
    (/\bperimeter\b/.test(s) && /\bcm\b|mm\b|km\b/.test(s))
  ) {
    return "area_perimeter";
  }

  // ── Triangle (non-right) ──────────────────────────────────────
  if (
    /\bisoceles?\s+triangle\b/.test(s) ||
    /\bscalene\s+triangle\b/.test(s) ||
    /\bequilateral\s+triangle\b/.test(s) ||
    /\btriangle\s+abc\b/.test(s) ||
    /\bangle\s+[abc]\s+of\s+(?:a\s+)?triangle\b/.test(s) ||
    (/\btriangle\b/.test(s) && /\barea\s*=/.test(s)) ||
    /\bcongruent\s+triangles?\b/.test(s) ||
    /\bsimilar\s+triangles?\b/.test(s)
  ) {
    return "triangle";
  }

  // ── Symmetry ─────────────────────────────────────────────────
  if (
    /\bline\s+of\s+symmetry\b/.test(s) ||
    /\blines?\s+of\s+symmetr/.test(s) ||
    /\breflective\s+symmetry\b/.test(s) ||
    /\brotational\s+symmetry\b/.test(s) ||
    /\border\s+of\s+(?:rotational\s+)?symmetry\b/.test(s) ||
    /\bsymmetrical\b/.test(s) ||
    /\breflect(?:ion|ed)?\s+(?:the\s+)?shape\b/.test(s) ||
    /\bmirror\s+line\b/.test(s)
  ) {
    return "symmetry";
  }

  // ── Sequence / pattern ────────────────────────────────────────
  if (
    /\bnext\s+(?:term|number|shape|pattern)\b/.test(s) ||
    /\bnth\s+term\b/.test(s) ||
    /\bterm[-\s]to[-\s]term\s+rule\b/.test(s) ||
    /\bcomplete\s+(?:the\s+)?(?:sequence|pattern|series)\b/.test(s) ||
    /\barithmetic\s+sequence\b/.test(s) ||
    /\bgeometric\s+sequence\b/.test(s) ||
    /\bfibonacci\b/.test(s) ||
    /\bsequence\s+(?:is|has|of\s+numbers)\b/.test(s) ||
    /\bfind\s+(?:the\s+)?(?:next|missing)\s+(?:number|term)\b/.test(s) ||
    (/\bpattern\b/.test(s) && /\bcontinue\b/.test(s))
  ) {
    return "sequence";
  }

  // ── Place value ───────────────────────────────────────────────
  // (also catches parsePlaceValueQuestion hits)
  if (
    parsePlaceValueQuestion(questionText) !== null ||
    /\bplace\s+value\b/.test(s) ||
    /\b(?:tens?|hundreds?|thousands?|ten[\s-]thousands?)\s+(?:and\s+)?(?:ones?|units?)\b/.test(s) ||
    /\bdigit\s+in\s+the\s+(?:tens?|hundreds?|thousands?|ones?|units?|tenths?|hundredths?)\s+(?:column|place)\b/.test(s) ||
    /\bexpanded\s+(?:form|notation)\b/.test(s) ||
    /\bpartition(?:ing)?\s+(?:the\s+)?number\b/.test(s) ||
    /\bvalue\s+of\s+(?:the\s+)?digit\b/.test(s) ||
    /\bcolumn\s+value\b/.test(s)
  ) {
    return "place_value";
  }

  // ── Array / multiplication array ─────────────────────────────
  if (
    /\bmultiplication\s+array\b/.test(s) ||
    /\barray\s+(?:to\s+)?(?:show|represent|model)\b/.test(s) ||
    /\brows?\s+(?:and|of)\s+columns?\b/.test(s) ||
    /\bcolumns?\s+(?:and|of)\s+rows?\b/.test(s) ||
    /\b(\d+)\s+rows?\s+(?:and|with|of)\s+(\d+)\s+(?:in\s+each|columns?)\b/.test(s) ||
    (/\barray\b/.test(s) && /\bmultipl/.test(s))
  ) {
    return "array";
  }

  return null;
}

/* ──────────────────────────────────────────
   §7  MASTER RESOLVER
   ────────────────────────────────────────── */

/**
 * resolveVisualType(options, questionText) → visual type string | null
 *
 * Priority:
 *   1. Option-level: time → fraction → money → shape
 *   2. Question-text-level: detectQuestionVisual()
 *
 * Returns a plain string for DB storage / comparison.
 */
function resolveVisualType(options, questionText = "") {
  // Option-level detection (original 4 types — highest specificity)
  if (isTimeOptions(options)) return "clock";
  if (isFractionOptions(options)) return "fraction";
  if (isMoneyOptions(options)) return "money";
  if (isShapeOptions(options)) return "shape";

  // Question-text-level detection (15 new types)
  const textType = detectQuestionVisual(questionText);
  if (textType) return textType;

  return null;
}

/**
 * resolveVisualOptions(options, questionText) → { type } | null
 * Kept for backward-compat with VisualOptionDetectors.jsx API shape.
 */
function resolveVisualOptions(options, questionText = "") {
  const type = resolveVisualType(options, questionText);
  return type ? { type } : null;
}

/* ──────────────────────────────────────────
   §8  EXPORTS
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
  // Question-text detection
  detectQuestionVisual,
  // Master resolvers
  resolveVisualType,
  resolveVisualOptions,
};
