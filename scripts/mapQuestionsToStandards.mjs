#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════════
// LAUNCHPARD — QUESTION-TO-STANDARD MAPPING ENGINE
// ═══════════════════════════════════════════════════════════════════════════════
// Maps existing questions in question_bank to curriculum_standards entries.
// Populates: topic_standard_mapping, question_standard_mapping, curriculum_coverage_stats
//
// Usage:
//   node scripts/mapQuestionsToStandards.mjs                    # full run
//   node scripts/mapQuestionsToStandards.mjs --dry-run          # preview only
//   node scripts/mapQuestionsToStandards.mjs --curriculum uk_national
//   node scripts/mapQuestionsToStandards.mjs --phase 1          # topic mapping only
//   node scripts/mapQuestionsToStandards.mjs --phase 2          # question mapping only
//   node scripts/mapQuestionsToStandards.mjs --phase 3          # coverage stats only
//
// Env vars needed (in .env.local):
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// ═══════════════════════════════════════════════════════════════════════════════

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Load env ────────────────────────────────────────────────────────────────
try {
  const envPath = resolve(__dirname, "..", ".env.local");
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
} catch { /* env loaded from system */ }

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase env vars — set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ─── CLI args ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const CURRICULUM_FILTER = args.includes("--curriculum")
  ? args[args.indexOf("--curriculum") + 1]
  : null;
const PHASE_FILTER = args.includes("--phase")
  ? parseInt(args[args.indexOf("--phase") + 1], 10)
  : null; // null = run all phases

// ═══════════════════════════════════════════════════════════════════════════════
// KEYWORD MAP — Expanded from learningPathEngine._mapStandardsToTopics()
// Bidirectional: used for both topic→standard AND question→standard matching.
// Keys are topic_slugs matching question_bank.topic values.
// Values are arrays of keyword fragments matched against standard statements.
// ═══════════════════════════════════════════════════════════════════════════════

const TOPIC_KEYWORDS = {
  // ── Mathematics ─────────────────────────────────────────────────────────
  place_value: ['place value', 'numeral', 'count', 'number system', 'read and write numbers', 'order numbers', 'compare numbers', 'number line'],
  number_bonds: ['number bond', 'pairs', 'complement', 'fact families', 'related fact'],
  addition: ['add', 'sum', 'plus', 'addition', 'total'],
  subtraction: ['subtract', 'minus', 'difference', 'subtraction', 'take away'],
  multiplication: ['multipl', 'times', 'product', 'times table', 'factor'],
  division: ['divid', 'quotient', 'division', 'remainder', 'share equally'],
  fractions: ['fraction', 'numerator', 'denominator', 'half', 'quarter', 'third', 'equivalent fraction', 'improper fraction', 'mixed number'],
  decimals: ['decimal', 'tenth', 'hundredth', 'decimal place', 'decimal point'],
  percentages: ['percent', '%', 'percentage'],
  ratio_and_proportion: ['ratio', 'proportion', 'scale', 'unitary method', 'direct proportion'],
  algebra_basics: ['algebra', 'variable', 'expression', 'simplif', 'substitute', 'formulae', 'unknown'],
  linear_equations: ['linear equation', 'solve.*equation', 'simultaneous.*linear', 'inequality', 'inequalities'],
  area_and_perimeter: ['area', 'perimeter', 'surface area', 'volume', 'capacity'],
  angles_and_shapes: ['angle', 'triangle', 'polygon', 'shape', 'quadrilateral', 'parallel', 'perpendicular', 'symmetry', 'congruent', 'similar'],
  data_handling: ['data', 'chart', 'graph', 'tally', 'pictograph', 'bar chart', 'pie chart', 'histogram', 'frequency', 'table', 'interpret'],
  probability: ['probability', 'chance', 'likely', 'certain', 'impossible', 'event', 'outcome', 'random'],
  pythagoras_theorem: ['pythagoras', 'hypotenuse'],
  trigonometry: ['trigonometr', 'sine', 'cosine', 'tangent', 'sin', 'cos', 'tan', 'soh.*cah'],
  quadratic_equations: ['quadratic', 'factoris', 'completing the square'],
  simultaneous_equations: ['simultaneous', 'two variables'],
  circle_theorems: ['circle theorem', 'tangent.*circle', 'cyclic', 'arc', 'sector', 'circumference', 'radius', 'diameter', 'chord'],
  vectors: ['vector', 'magnitude', 'direction', 'scalar product', 'column vector'],
  statistics: ['standard deviation', 'cumulative frequency', 'quartile', 'interquartile', 'mean', 'median', 'mode', 'average', 'range'],
  calculus: ['differenti', 'integrat', 'gradient.*curve', 'rate of change', 'area under'],
  measurement: ['measure', 'length', 'mass', 'weight', 'capacity', 'litre', 'kilogram', 'metre', 'centimetre', 'millimetre', 'time', 'clock', 'hour', 'minute', 'money', 'coin', 'note', 'pound', 'pence', 'naira', 'kobo', 'dollar', 'cent'],
  number_patterns: ['pattern', 'sequence', 'term', 'nth term', 'arithmetic sequence', 'geometric sequence'],
  indices_and_surds: ['index', 'indices', 'power', 'exponent', 'surd', 'root', 'standard form', 'scientific notation'],
  transformations: ['transform', 'rotation', 'reflection', 'translation', 'enlargement', 'scale factor'],
  sets: ['set', 'venn diagram', 'union', 'intersection', 'complement', 'element', 'subset'],
  matrices: ['matrix', 'matrices', 'determinant', 'inverse matrix'],
  logarithms: ['logarithm', 'log', 'natural log', 'exponential'],

  // ── English / Language ──────────────────────────────────────────────────
  phonics: ['phonics', 'phonic', 'letter sound', 'decode', 'blend', 'digraph', 'grapheme', 'phoneme'],
  spelling: ['spell', 'spelling', 'word list', 'prefix', 'suffix'],
  grammar: ['grammar', 'tense', 'noun', 'verb', 'adjective', 'adverb', 'concord', 'clause', 'parts of speech', 'subject', 'predicate', 'preposition', 'conjunction', 'determiner', 'pronoun', 'article'],
  punctuation: ['punctuat', 'comma', 'full stop', 'apostrophe', 'semicolon', 'colon', 'capital letter', 'question mark', 'exclamation mark', 'speech marks', 'inverted comma'],
  vocabulary: ['vocabular', 'word meaning', 'synonym', 'antonym', 'word class', 'prefix', 'suffix', 'root word'],
  sentence_structure: ['sentence', 'clause', 'phrase', 'complex sentence', 'compound sentence', 'simple sentence', 'subordinate', 'main clause', 'relative clause'],
  comprehension: ['comprehension', 'passage', 'summary', 'inference', 'cloze', 'retrieve', 'deduce', 'explain', 'reading'],
  creative_writing: ['creative writing', 'narrative', 'descriptive', 'story writing', 'fiction', 'character', 'setting', 'plot'],
  essay_writing: ['essay', 'argumentative', 'expository', 'persuasive writing', 'discursive', 'formal writing'],
  literary_devices: ['literary device', 'metaphor', 'simile', 'alliteration', 'personification', 'imagery', 'irony', 'onomatopoeia', 'hyperbole', 'oxymoron'],
  poetry_analysis: ['poetry', 'poem', 'verse', 'stanza', 'rhyme', 'rhythm', 'meter', 'sonnet', 'ballad'],
  critical_analysis: ['critical analysis', 'evaluate', 'compare', 'contrast', 'comment', 'effect on reader', 'writer\'s purpose', 'language analysis'],
  text_types: ['text type', 'non-fiction', 'recount', 'report', 'instruction', 'explanation', 'biography', 'autobiography', 'diary', 'letter'],
  oral_english: ['oral', 'spoken', 'speech', 'presentation', 'debate', 'discussion', 'pronunciation', 'articulation', 'diction', 'intonation'],
  handwriting: ['handwriting', 'letter formation', 'cursive', 'legible', 'joined writing'],
  reading_fluency: ['fluency', 'fluent', 'read aloud', 'expression', 'pace', 'accuracy'],

  // ── Science ─────────────────────────────────────────────────────────────
  living_organisms: ['living', 'organism', 'classify', 'classification', 'vertebrate', 'invertebrate', 'microorganism'],
  plants_and_animals: ['plant', 'animal', 'habitat', 'life cycle', 'growth', 'seed', 'germination', 'flower', 'pollination'],
  food_chains: ['food chain', 'food web', 'predator', 'prey', 'producer', 'consumer', 'decomposer', 'ecosystem'],
  materials: ['material', 'property', 'hard', 'soft', 'transparent', 'opaque', 'flexible', 'rigid', 'magnetic', 'absorbent'],
  states_of_matter: ['states of matter', 'solid', 'liquid', 'gas', 'particle', 'melting', 'boiling', 'evaporat', 'condens', 'freez'],
  forces_basics: ['force', 'push', 'pull', 'friction', 'gravity', 'magnet', 'air resistance', 'water resistance', 'upthrust'],
  cells_and_tissues: ['cell', 'tissue', 'organelle', 'nucleus', 'membrane', 'mitosis', 'cytoplasm', 'chloroplast', 'vacuole'],
  human_body: ['human body', 'organ', 'skeleton', 'digestion', 'circulation', 'respiration', 'muscle', 'blood', 'heart', 'lung', 'digestive system', 'nervous system', 'reproductive'],
  electricity: ['electric', 'circuit', 'current', 'voltage', 'resistance', 'ohm', 'battery', 'bulb', 'switch', 'series', 'parallel'],
  light_and_sound: ['light', 'shadow', 'reflect', 'refract', 'sound', 'vibrat', 'spectrum', 'lens', 'mirror', 'prism'],
  chemical_reactions: ['chemical reaction', 'reactant', 'product', 'equation', 'exothermic', 'endothermic', 'acid', 'alkali', 'pH', 'neutrali', 'oxidation', 'reduction', 'combustion'],
  earth_and_space: ['earth', 'space', 'planet', 'solar system', 'rock', 'weathering', 'moon', 'sun', 'orbit', 'season', 'day and night', 'rotation'],
  genetics: ['genetic', 'gene', 'dna', 'heredit', 'inherit', 'allele', 'dominant', 'recessive', 'genotype', 'phenotype', 'mutation', 'chromosome'],
  evolution: ['evolution', 'natural selection', 'adaptation', 'species', 'fossil', 'darwin', 'extinction', 'biodiversity'],
  atomic_structure: ['atom', 'proton', 'neutron', 'electron', 'element', 'periodic table', 'isotope', 'ion', 'atomic number', 'mass number', 'electron configuration'],
  ecology: ['ecology', 'ecosystem', 'biodiversity', 'conservation', 'population', 'sustainability', 'biome', 'abiotic', 'biotic'],
  waves: ['wave', 'frequency', 'amplitude', 'wavelength', 'electromagnetic', 'transverse', 'longitudinal', 'hertz'],
  forces_and_motion: ['motion', 'velocity', 'acceleration', 'momentum', 'newton', 'speed', 'distance', 'displacement', 'inertia'],
  thermodynamics: ['thermodynamic', 'heat transfer', 'conduction', 'convection', 'radiation', 'entropy', 'thermal', 'temperature', 'specific heat'],
  energy: ['energy', 'kinetic', 'potential', 'gravitational', 'elastic', 'chemical energy', 'thermal energy', 'nuclear energy', 'renewable energy', 'conservation of energy'],
  reproduction: ['reproduction', 'fertilisation', 'puberty', 'menstrual', 'gestation', 'embryo', 'fetus', 'sexual reproduction', 'asexual reproduction'],
  photosynthesis: ['photosynthesis', 'chlorophyll', 'carbon dioxide', 'glucose', 'starch', 'stomata', 'xylem', 'phloem'],
  respiration: ['respiration', 'aerobic', 'anaerobic', 'glucose', 'oxygen', 'carbon dioxide', 'ATP', 'fermentation'],
  acids_and_bases: ['acid', 'base', 'alkali', 'pH', 'indicator', 'litmus', 'neutral', 'titration', 'salt'],
  organic_chemistry: ['organic', 'hydrocarbon', 'alkane', 'alkene', 'alkyne', 'polymer', 'ethanol', 'ester', 'carboxylic', 'homologous'],
  radioactivity: ['radioactiv', 'alpha', 'beta', 'gamma', 'half-life', 'decay', 'nuclear', 'isotope', 'radiation'],
  separation_techniques: ['separati', 'filtration', 'distillation', 'chromatography', 'evaporation', 'crystallisation', 'mixture', 'pure substance'],

  // ── History ─────────────────────────────────────────────────────────────
  ancient_civilisations: ['ancient', 'civilisation', 'civilization', 'egypt', 'rome', 'greece', 'mesopotamia', 'pharaoh', 'pyramid'],
  empire_and_colonialism: ['empire', 'colonial', 'imperialism', 'slave trade', 'colonisation', 'british empire', 'independence'],
  world_war_1: ['world war 1', 'world war i', 'wwi', 'first world war', 'trench', '1914', '1918'],
  world_war_2: ['world war 2', 'world war ii', 'wwii', 'second world war', 'holocaust', '1939', '1945'],
  cold_war: ['cold war', 'soviet', 'berlin wall', 'cuban missile', 'iron curtain'],
  civil_rights: ['civil rights', 'segregation', 'apartheid', 'equality', 'suffrage', 'discrimination'],
  nigerian_history: ['nigeria', 'nigerian', 'amalgamation', 'lugard', 'independence 1960', 'biafra', 'civil war nigeria', 'pre-colonial'],
  british_history: ['tudor', 'stuart', 'victorian', 'industrial revolution', 'magna carta', 'anglo-saxon', 'norman conquest', 'great fire', 'plague'],
  african_history: ['african history', 'scramble for africa', 'trans-saharan', 'benin kingdom', 'oyo empire', 'songhai', 'mali empire', 'great zimbabwe'],
  medieval: ['medieval', 'feudal', 'knight', 'castle', 'crusade', 'monastery'],

  // ── Geography ───────────────────────────────────────────────────────────
  weather_and_climate: ['weather', 'climate', 'temperature', 'rainfall', 'season', 'cloud', 'precipitation', 'humidity'],
  physical_geography: ['physical geography', 'volcano', 'earthquake', 'tectonic', 'erosion', 'river', 'mountain', 'coast', 'glacier', 'rock cycle', 'landform'],
  human_geography: ['human geography', 'settlement', 'migration', 'urban', 'rural', 'population', 'census', 'urbanisation'],
  environmental_issues: ['environment', 'pollution', 'climate change', 'deforestation', 'renewable', 'sustainability', 'greenhouse', 'carbon'],
  globalisation: ['globali', 'trade', 'international', 'import', 'export', 'economic development', 'developing country'],
  map_skills: ['map', 'compass', 'grid reference', 'scale', 'contour', 'ordnance survey', 'latitude', 'longitude', 'coordinates', 'atlas'],
  natural_resources: ['natural resource', 'mineral', 'fossil fuel', 'oil', 'gas', 'coal', 'mining', 'water resource'],

  // ── Civic Education / Social Studies ────────────────────────────────────
  citizenship: ['citizen', 'nationality', 'civic duty', 'belong', 'right and responsibilit'],
  human_rights: ['human rights', 'fundamental rights', 'freedom', 'dignity', 'discrimination', 'child rights'],
  democracy_and_governance: ['democracy', 'govern', 'constitution', 'parliament', 'legislature', 'executive', 'judiciary', 'arm of government'],
  rule_of_law: ['rule of law', 'justice', 'court', 'legal', 'law enforcement', 'crime', 'punishment'],
  national_values: ['national value', 'integrity', 'patriotism', 'unity', 'national anthem', 'national symbol', 'coat of arms', 'pledge'],
  conflict_resolution: ['conflict', 'peace', 'mediation', 'reconciliation', 'dispute', 'negotiation'],
  electoral_process: ['election', 'vote', 'ballot', 'campaign', 'political party', 'candidate', 'INEC', 'electoral'],
  community_development: ['community', 'development', 'social welfare', 'infrastructure', 'self-help'],
  family_and_society: ['family', 'marriage', 'kinship', 'socialisation', 'social institution', 'culture', 'tradition', 'custom'],
  drug_abuse: ['drug', 'substance abuse', 'addiction', 'narcotic', 'alcohol', 'tobacco', 'harmful substance'],
  hiv_aids: ['hiv', 'aids', 'sexually transmitted', 'STI', 'STD'],

  // ── Computing / Digital Literacy ────────────────────────────────────────
  programming_basics: ['program', 'coding', 'algorithm', 'debug', 'loop', 'variable', 'function', 'sequence', 'selection', 'iteration', 'pseudocode'],
  cybersecurity: ['cybersecurity', 'online safety', 'password', 'phishing', 'data protection', 'privacy', 'encryption', 'firewall'],
  computer_hardware: ['hardware', 'CPU', 'RAM', 'input', 'output', 'storage', 'processor', 'peripheral', 'motherboard'],
  software_and_os: ['software', 'operating system', 'application', 'browser', 'word processor', 'spreadsheet'],
  networks: ['network', 'internet', 'LAN', 'WAN', 'router', 'server', 'protocol', 'TCP', 'IP address', 'bandwidth'],
  data_representation: ['binary', 'bit', 'byte', 'ASCII', 'hexadecimal', 'data representation', 'image representation', 'sound representation'],

  // ── Business / Commerce / Economics ─────────────────────────────────────
  demand_and_supply: ['demand', 'supply', 'equilibrium', 'price', 'market'],
  trade_and_commerce: ['trade', 'commerce', 'import', 'export', 'balance of trade', 'tariff', 'quota'],
  banking_and_finance: ['bank', 'finance', 'interest', 'loan', 'credit', 'debit', 'savings', 'investment'],
  business_organisations: ['business', 'sole trader', 'partnership', 'limited company', 'co-operative', 'enterprise', 'entrepreneur'],
  accounting_basics: ['account', 'ledger', 'journal', 'trial balance', 'balance sheet', 'profit and loss', 'debit', 'credit', 'asset', 'liability'],
  production: ['production', 'factors of production', 'land', 'labour', 'capital', 'division of labour', 'specialisation'],
  inflation_and_employment: ['inflation', 'deflation', 'unemployment', 'employment', 'GDP', 'national income', 'fiscal policy', 'monetary policy'],
  insurance: ['insurance', 'premium', 'policy', 'underwriting', 'indemnity', 'insurable interest'],
  marketing: ['marketing', 'advertising', 'brand', 'promotion', 'distribution', 'consumer', 'market research'],

  // ── Religious Studies ───────────────────────────────────────────────────
  christianity: ['christian', 'bible', 'church', 'jesus', 'gospel', 'parable', 'baptism', 'easter', 'christmas', 'prayer christian'],
  islam: ['islam', 'muslim', 'quran', 'mosque', 'muhammad', 'ramadan', 'hajj', 'salat', 'zakat', 'shahada'],
  traditional_religion: ['traditional religion', 'indigenous religion', 'african traditional', 'ancestor', 'deity', 'shrine', 'oracle', 'divination'],
  moral_values: ['moral', 'ethics', 'honesty', 'truthfulness', 'obedience', 'respect', 'forgiveness', 'compassion', 'charity', 'stewardship'],

  // ── Creative Arts ───────────────────────────────────────────────────────
  visual_arts: ['visual art', 'drawing', 'painting', 'sculpture', 'colour theory', 'sketch', 'art', 'design', 'craft'],
  music: ['music', 'melody', 'rhythm', 'harmony', 'instrument', 'tempo', 'scale', 'musical notation'],
  drama: ['drama', 'play', 'act', 'theatre', 'performance', 'mime', 'improvisation', 'monologue', 'dialogue'],
  dance: ['dance', 'choreography', 'movement', 'cultural dance', 'traditional dance'],

  // ── Vocational / Technology ─────────────────────────────────────────────
  technical_drawing: ['technical drawing', 'geometric construction', 'projection', 'isometric', 'orthographic', 'plan', 'elevation'],
  woodwork: ['woodwork', 'carpentry', 'timber', 'joint', 'chisel', 'saw', 'lathe'],
  metalwork: ['metalwork', 'welding', 'forging', 'casting', 'filing', 'drilling', 'alloy'],
  home_economics: ['home economics', 'nutrition', 'diet', 'cooking', 'food preparation', 'textile', 'clothing', 'sewing'],
  food_and_nutrition: ['food group', 'balanced diet', 'nutrient', 'vitamin', 'mineral', 'protein', 'carbohydrate', 'fat', 'calorie'],
};

// ─── Topic name tokenisation for direct matching ─────────────────────────────
// Many question_bank.topic values are slug-form of the concept.
// e.g. "addition_of_fractions" should match standard "Add fractions..."
function tokeniseTopic(topicSlug) {
  return topicSlug
    .replace(/_/g, ' ')
    .replace(/\band\b/g, '')
    .replace(/\bof\b/g, '')
    .replace(/\bthe\b/g, '')
    .replace(/\bin\b/g, '')
    .replace(/\bto\b/g, '')
    .replace(/\bfor\b/g, '')
    .replace(/\bwith\b/g, '')
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 2);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 1: TOPIC → STANDARD MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

async function phase1_TopicStandardMapping() {
  console.log("\n═══ PHASE 1: Topic → Standard Mapping ═══\n");

  // 1. Fetch all standards with strand info
  console.log("  Fetching curriculum standards...");
  const { data: standards, error: stdErr } = await supabase
    .from("curriculum_standards")
    .select("id, curriculum_id, subject, year_level, standard_code, statement, strand_id, curriculum_strands!inner(strand_name)")
    .order("curriculum_id")
    .order("subject")
    .order("year_level");

  if (stdErr) { console.error("  ✗ Failed to fetch standards:", stdErr.message); return; }
  console.log(`  ✓ ${standards.length} standards loaded`);

  // 2. Fetch all distinct (curriculum, subject, topic) combos from question_bank
  console.log("  Fetching distinct question topics...");
  const { data: topicCombos, error: topicErr } = await supabase
    .rpc('get_distinct_question_topics');

  let topics;
  if (topicErr) {
    // Fallback: manual query
    console.log("  ⚠ RPC not available, using manual query...");
    const { data: rawTopics, error: rawErr } = await supabase
      .from("question_bank")
      .select("curriculum, subject, topic, year_level")
      .eq("is_active", true);

    if (rawErr) { console.error("  ✗ Failed to fetch topics:", rawErr.message); return; }

    // Deduplicate
    const seen = new Set();
    topics = [];
    for (const row of rawTopics) {
      const key = `${row.curriculum}|${row.subject}|${row.topic}`;
      if (!seen.has(key)) {
        seen.add(key);
        topics.push({ curriculum: row.curriculum, subject: row.subject, topic: row.topic });
      }
    }
  } else {
    topics = topicCombos;
  }
  console.log(`  ✓ ${topics.length} distinct topic combos found`);

  // 3. Build the mapping
  // Group standards by curriculum + subject for efficient matching
  const standardsByCS = new Map();
  for (const std of standards) {
    const key = `${std.curriculum_id}|${std.subject}`;
    if (!standardsByCS.has(key)) standardsByCS.set(key, []);
    standardsByCS.get(key).push(std);
  }

  // Subject alias map: question_bank subject → curriculum_standards subject
  const SUBJECT_ALIASES = {
    maths: 'mathematics',
    math: 'mathematics',
    basic_science: 'science',
    english_studies: 'english',
    english_language: 'english',
    nvr: 'non_verbal_reasoning',
  };

  const mappings = [];
  let matchedTopics = 0;
  let unmatchedTopics = 0;

  for (const { curriculum, subject, topic } of topics) {
    if (!curriculum || !subject || !topic) continue;
    if (CURRICULUM_FILTER && curriculum !== CURRICULUM_FILTER) continue;

    const dbSubject = SUBJECT_ALIASES[subject] || subject;
    const csKey = `${curriculum}|${dbSubject}`;
    const candidateStandards = standardsByCS.get(csKey) || [];

    if (candidateStandards.length === 0) continue;

    // Strategy A: keyword match from TOPIC_KEYWORDS
    const keywordEntry = TOPIC_KEYWORDS[topic];
    const topicTokens = tokeniseTopic(topic);

    const matched = [];

    for (const std of candidateStandards) {
      const stmtLower = (std.statement || '').toLowerCase();
      let score = 0;

      // Strategy A: keyword match
      if (keywordEntry) {
        for (const kw of keywordEntry) {
          if (kw.includes('.*')) {
            if (new RegExp(kw, 'i').test(stmtLower)) { score += 3; break; }
          } else if (stmtLower.includes(kw)) {
            score += 3;
            break;
          }
        }
      }

      // Strategy B: direct topic token match against statement
      if (score === 0 && topicTokens.length > 0) {
        let tokenMatches = 0;
        for (const token of topicTokens) {
          if (stmtLower.includes(token)) tokenMatches++;
        }
        const tokenRatio = topicTokens.length > 0 ? tokenMatches / topicTokens.length : 0;
        if (tokenRatio >= 0.5 && tokenMatches >= 2) {
          score = 2;
        } else if (tokenRatio >= 0.6 && tokenMatches >= 1) {
          score = 1;
        }
      }

      // Strategy C: strand name match
      if (score === 0) {
        const strandName = (std.curriculum_strands?.strand_name || '').toLowerCase();
        if (strandName) {
          let strandTokenMatches = 0;
          for (const token of topicTokens) {
            if (strandName.includes(token)) strandTokenMatches++;
          }
          if (strandTokenMatches >= 2 || (topicTokens.length <= 2 && strandTokenMatches >= 1)) {
            score = 1;
          }
        }
      }

      if (score > 0) {
        matched.push({
          topic_slug: topic,
          curriculum_id: curriculum,
          subject: dbSubject,
          standard_id: std.id,
          is_primary: score >= 3,
          relevance: score,
        });
      }
    }

    if (matched.length > 0) {
      matchedTopics++;
      // Limit to top 10 standards per topic (sorted by relevance)
      matched.sort((a, b) => b.relevance - a.relevance);
      const top = matched.slice(0, 10);
      // Mark highest relevance as primary
      if (top.length > 0) top[0].is_primary = true;
      mappings.push(...top);
    } else {
      unmatchedTopics++;
    }
  }

  console.log(`\n  Results:`);
  console.log(`    Matched topics: ${matchedTopics}`);
  console.log(`    Unmatched topics: ${unmatchedTopics}`);
  console.log(`    Total mappings: ${mappings.length}`);

  if (DRY_RUN) {
    console.log("  [DRY RUN] Skipping database write");
    // Show sample
    console.log("  Sample mappings:");
    for (const m of mappings.slice(0, 5)) {
      console.log(`    ${m.curriculum_id}/${m.subject}/${m.topic_slug} → ${m.standard_id} (relevance: ${m.relevance})`);
    }
    return mappings;
  }

  // 4. Upsert to topic_standard_mapping
  console.log(`\n  Writing ${mappings.length} topic_standard_mapping rows...`);

  // Clear existing rows for curricula we're processing
  const curricula = [...new Set(mappings.map(m => m.curriculum_id))];
  for (const cur of curricula) {
    const { error: delErr } = await supabase
      .from("topic_standard_mapping")
      .delete()
      .eq("curriculum_id", cur);
    if (delErr) console.warn(`  ⚠ Delete failed for ${cur}: ${delErr.message}`);
  }

  // Batch insert (500 at a time)
  const BATCH_SIZE = 500;
  let inserted = 0;
  for (let i = 0; i < mappings.length; i += BATCH_SIZE) {
    const batch = mappings.slice(i, i + BATCH_SIZE).map(m => ({
      id: crypto.randomUUID(),
      curriculum_id: m.curriculum_id,
      subject: m.subject,
      topic_slug: m.topic_slug,
      standard_id: m.standard_id,
      is_primary: m.is_primary,
    }));

    const { error: insErr } = await supabase
      .from("topic_standard_mapping")
      .insert(batch);

    if (insErr) {
      console.error(`  ✗ Insert batch ${i}–${i + batch.length} failed: ${insErr.message}`);
    } else {
      inserted += batch.length;
    }
  }

  console.log(`  ✓ ${inserted} topic_standard_mapping rows inserted`);
  return mappings;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 2: QUESTION → STANDARD MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

async function phase2_QuestionStandardMapping() {
  console.log("\n═══ PHASE 2: Question → Standard Mapping ═══\n");

  // Strategy: Join questions to standards via topic_standard_mapping bridge
  // Match on: curriculum + subject + topic → standard, filtered by year_level ±1

  // 1. Fetch topic_standard_mapping
  console.log("  Fetching topic_standard_mapping...");
  let allTSM = [];
  let offset = 0;
  const PAGE_SIZE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from("topic_standard_mapping")
      .select("topic_slug, curriculum_id, subject, standard_id, is_primary")
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) { console.error("  ✗ TSM fetch failed:", error.message); return; }
    allTSM.push(...data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  console.log(`  ✓ ${allTSM.length} topic_standard_mapping rows`);

  if (allTSM.length === 0) {
    console.error("  ✗ No topic_standard_mapping rows — run Phase 1 first");
    return;
  }

  // 2. Fetch standard year_levels for filtering
  console.log("  Fetching standard year_levels...");
  const standardIds = [...new Set(allTSM.map(t => t.standard_id))];
  const stdYearMap = new Map();

  for (let i = 0; i < standardIds.length; i += 500) {
    const batch = standardIds.slice(i, i + 500);
    const { data, error } = await supabase
      .from("curriculum_standards")
      .select("id, year_level")
      .in("id", batch);
    if (error) { console.error("  ✗ Standard year fetch failed:", error.message); continue; }
    for (const s of data) stdYearMap.set(s.id, s.year_level);
  }

  // Build TSM lookup: curriculum|subject|topic → [{standard_id, year_level, is_primary}]
  const tsmLookup = new Map();
  for (const row of allTSM) {
    const key = `${row.curriculum_id}|${row.subject}|${row.topic_slug}`;
    if (!tsmLookup.has(key)) tsmLookup.set(key, []);
    tsmLookup.get(key).push({
      standard_id: row.standard_id,
      year_level: stdYearMap.get(row.standard_id),
      is_primary: row.is_primary,
    });
  }

  // 3. Fetch questions in batches and map
  console.log("  Processing questions...");

  const SUBJECT_ALIASES = {
    maths: 'mathematics',
    math: 'mathematics',
    basic_science: 'science',
    english_studies: 'english',
    english_language: 'english',
    nvr: 'non_verbal_reasoning',
  };

  // Get curricula we have standards for
  const validCurricula = [...new Set(allTSM.map(t => t.curriculum_id))];
  console.log(`  Processing curricula: ${validCurricula.join(', ')}`);

  let totalMapped = 0;
  let totalQuestions = 0;
  let totalUnmapped = 0;
  const allMappings = [];

  for (const curriculum of validCurricula) {
    if (CURRICULUM_FILTER && curriculum !== CURRICULUM_FILTER) continue;

    let qOffset = 0;
    const Q_PAGE = 2000;
    let curriculumMapped = 0;
    let curriculumTotal = 0;

    while (true) {
      const { data: questions, error: qErr } = await supabase
        .from("question_bank")
        .select("id, curriculum, subject, topic, year_level")
        .eq("is_active", true)
        .eq("curriculum", curriculum)
        .range(qOffset, qOffset + Q_PAGE - 1);

      if (qErr) { console.error(`  ✗ Q fetch failed for ${curriculum}: ${qErr.message}`); break; }
      if (!questions || questions.length === 0) break;

      for (const q of questions) {
        curriculumTotal++;
        const dbSubject = SUBJECT_ALIASES[q.subject] || q.subject;
        const lookupKey = `${q.curriculum}|${dbSubject}|${q.topic}`;
        const candidates = tsmLookup.get(lookupKey);

        if (!candidates || candidates.length === 0) continue;

        // Filter by year_level: standard year should be within ±1 of question year
        const yearFiltered = candidates.filter(c =>
          c.year_level && q.year_level &&
          Math.abs(c.year_level - q.year_level) <= 1
        );

        // If no year-filtered matches, use all (broader match)
        const finalCandidates = yearFiltered.length > 0 ? yearFiltered : candidates;

        for (const c of finalCandidates) {
          allMappings.push({
            question_id: q.id,
            standard_id: c.standard_id,
            is_primary: c.is_primary && (yearFiltered.length > 0),
            relevance: yearFiltered.length > 0 ? 1.0 : 0.5,
          });
        }
        curriculumMapped++;
      }

      qOffset += Q_PAGE;
      if (questions.length < Q_PAGE) break;
    }

    console.log(`  ${curriculum}: ${curriculumMapped}/${curriculumTotal} questions mapped`);
    totalMapped += curriculumMapped;
    totalQuestions += curriculumTotal;
  }

  totalUnmapped = totalQuestions - totalMapped;
  console.log(`\n  Results:`);
  console.log(`    Total questions processed: ${totalQuestions}`);
  console.log(`    Questions mapped: ${totalMapped} (${(totalMapped/totalQuestions*100).toFixed(1)}%)`);
  console.log(`    Questions unmapped: ${totalUnmapped}`);
  console.log(`    Total mapping rows: ${allMappings.length}`);

  if (DRY_RUN) {
    console.log("  [DRY RUN] Skipping database write");
    return;
  }

  // 4. Clear and insert question_standard_mapping
  console.log(`\n  Clearing existing question_standard_mapping...`);
  // Delete in batches by curriculum (via standards)
  const { error: clearErr } = await supabase
    .from("question_standard_mapping")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000"); // delete all

  if (clearErr) console.warn(`  ⚠ Clear failed: ${clearErr.message}, continuing...`);

  console.log(`  Writing ${allMappings.length} question_standard_mapping rows...`);

  const BATCH_SIZE = 500;
  let inserted = 0;
  for (let i = 0; i < allMappings.length; i += BATCH_SIZE) {
    const batch = allMappings.slice(i, i + BATCH_SIZE).map(m => ({
      id: crypto.randomUUID(),
      question_id: m.question_id,
      standard_id: m.standard_id,
      is_primary: m.is_primary,
      relevance: m.relevance,
      tagged_by: 'auto_mapper_v1',
    }));

    const { error: insErr } = await supabase
      .from("question_standard_mapping")
      .insert(batch);

    if (insErr) {
      console.error(`  ✗ Insert batch ${i}–${i + batch.length} failed: ${insErr.message}`);
    } else {
      inserted += batch.length;
      if (inserted % 5000 === 0) {
        process.stdout.write(`  ... ${inserted}/${allMappings.length}\r`);
      }
    }
  }

  console.log(`  ✓ ${inserted} question_standard_mapping rows inserted`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 3: CURRICULUM COVERAGE STATS
// ═══════════════════════════════════════════════════════════════════════════════

async function phase3_CoverageStats() {
  console.log("\n═══ PHASE 3: Curriculum Coverage Stats ═══\n");

  // For each standard, count how many questions map to it, broken down by tier and type
  console.log("  Computing coverage stats from question_standard_mapping...");

  // 1. Fetch all standards
  const { data: standards, error: stdErr } = await supabase
    .from("curriculum_standards")
    .select("id, curriculum_id, subject, year_level");

  if (stdErr) { console.error("  ✗ Failed to fetch standards:", stdErr.message); return; }

  // 2. Fetch question_standard_mapping with question details
  // We need question_bank.difficulty_tier and question_type for the breakdown
  // Do this via a joined query approach: fetch QSM, then batch-fetch question details

  console.log("  Fetching question_standard_mapping...");
  let allQSM = [];
  let offset = 0;
  const PAGE_SIZE = 2000;
  while (true) {
    const { data, error } = await supabase
      .from("question_standard_mapping")
      .select("question_id, standard_id")
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) { console.error("  ✗ QSM fetch failed:", error.message); break; }
    allQSM.push(...data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  console.log(`  ✓ ${allQSM.length} QSM rows loaded`);

  if (allQSM.length === 0) {
    console.error("  ✗ No question_standard_mapping rows — run Phase 2 first");
    return;
  }

  // 3. Group by standard_id
  const byStandard = new Map();
  for (const row of allQSM) {
    if (!byStandard.has(row.standard_id)) byStandard.set(row.standard_id, []);
    byStandard.get(row.standard_id).push(row.question_id);
  }

  // 4. Fetch question details for tier/type breakdown
  const uniqueQIds = [...new Set(allQSM.map(r => r.question_id))];
  console.log(`  Fetching details for ${uniqueQIds.length} unique questions...`);

  const qDetails = new Map();
  for (let i = 0; i < uniqueQIds.length; i += 500) {
    const batch = uniqueQIds.slice(i, i + 500);
    const { data, error } = await supabase
      .from("question_bank")
      .select("id, difficulty_tier, question_type")
      .in("id", batch);
    if (error) continue;
    for (const q of data) qDetails.set(q.id, { tier: q.difficulty_tier, type: q.question_type });
  }

  // 5. Build coverage stats
  const standardMap = new Map();
  for (const std of standards) standardMap.set(std.id, std);

  const coverageRows = [];

  for (const std of standards) {
    const qIds = byStandard.get(std.id) || [];
    const totalQuestions = qIds.length;

    // Break down by tier and type
    const byTier = {};
    const byType = {};
    for (const qId of qIds) {
      const detail = qDetails.get(qId);
      if (detail) {
        const tier = detail.tier || 'unknown';
        const type = detail.type || 'unknown';
        byTier[tier] = (byTier[tier] || 0) + 1;
        byType[type] = (byType[type] || 0) + 1;
      }
    }

    // Calculate coverage score: 0-1 based on question count and diversity
    let coverageScore = 0;
    if (totalQuestions >= 20) coverageScore = 1.0;
    else if (totalQuestions >= 10) coverageScore = 0.8;
    else if (totalQuestions >= 5) coverageScore = 0.6;
    else if (totalQuestions >= 1) coverageScore = 0.3;

    // Bonus for tier diversity
    const tierCount = Object.keys(byTier).length;
    if (tierCount >= 3) coverageScore = Math.min(1.0, coverageScore + 0.1);

    // Gap severity
    let gapSeverity = 'none';
    if (totalQuestions === 0) gapSeverity = 'critical';
    else if (totalQuestions < 5) gapSeverity = 'high';
    else if (totalQuestions < 10) gapSeverity = 'medium';
    else if (totalQuestions < 20) gapSeverity = 'low';

    coverageRows.push({
      id: crypto.randomUUID(),
      curriculum_id: std.curriculum_id,
      subject: std.subject,
      year_level: std.year_level,
      standard_id: std.id,
      total_questions: totalQuestions,
      questions_by_tier: byTier,
      questions_by_type: byType,
      coverage_score: coverageScore,
      gap_severity: gapSeverity,
      last_calculated: new Date().toISOString(),
    });
  }

  // Summary
  const critical = coverageRows.filter(r => r.gap_severity === 'critical').length;
  const high = coverageRows.filter(r => r.gap_severity === 'high').length;
  const medium = coverageRows.filter(r => r.gap_severity === 'medium').length;
  const low = coverageRows.filter(r => r.gap_severity === 'low').length;
  const none = coverageRows.filter(r => r.gap_severity === 'none').length;

  console.log(`\n  Coverage Summary (${coverageRows.length} standards):`);
  console.log(`    Critical (0 questions):   ${critical}`);
  console.log(`    High (1-4 questions):     ${high}`);
  console.log(`    Medium (5-9 questions):   ${medium}`);
  console.log(`    Low (10-19 questions):    ${low}`);
  console.log(`    Covered (20+ questions):  ${none}`);

  if (DRY_RUN) {
    console.log("  [DRY RUN] Skipping database write");
    return coverageRows;
  }

  // 6. Clear and insert
  console.log(`\n  Clearing existing curriculum_coverage_stats...`);
  const { error: clearErr } = await supabase
    .from("curriculum_coverage_stats")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (clearErr) console.warn(`  ⚠ Clear failed: ${clearErr.message}`);

  console.log(`  Writing ${coverageRows.length} coverage stats rows...`);
  const BATCH_SIZE = 500;
  let inserted = 0;
  for (let i = 0; i < coverageRows.length; i += BATCH_SIZE) {
    const batch = coverageRows.slice(i, i + BATCH_SIZE);
    const { error: insErr } = await supabase
      .from("curriculum_coverage_stats")
      .insert(batch);

    if (insErr) {
      console.error(`  ✗ Insert batch ${i}–${i + batch.length} failed: ${insErr.message}`);
    } else {
      inserted += batch.length;
    }
  }

  console.log(`  ✓ ${inserted} curriculum_coverage_stats rows inserted`);
  return coverageRows;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║  LAUNCHPARD — Question-to-Standard Mapping Engine           ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝");
  if (DRY_RUN) console.log("  ⚠ DRY RUN MODE — no database writes\n");
  if (CURRICULUM_FILTER) console.log(`  ⚠ Filtering to curriculum: ${CURRICULUM_FILTER}\n`);

  const startTime = Date.now();

  try {
    if (!PHASE_FILTER || PHASE_FILTER === 1) {
      await phase1_TopicStandardMapping();
    }
    if (!PHASE_FILTER || PHASE_FILTER === 2) {
      await phase2_QuestionStandardMapping();
    }
    if (!PHASE_FILTER || PHASE_FILTER === 3) {
      await phase3_CoverageStats();
    }
  } catch (err) {
    console.error("\n✗ Fatal error:", err.message);
    console.error(err.stack);
    process.exit(1);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✓ Done in ${elapsed}s`);
}

main();
