/**
 * SEO Year-Specific Landing Pages (Enhanced)
 * Deploy to: src/app/learn/[slug]/page.jsx
 *
 * Each page has:
 *   1. Compelling hero with curriculum context + trust badges
 *   2. 3 interactive sample questions for that subject/year
 *   3. Curriculum guide ("What your child learns in...")
 *   4. Features + social proof + CTA
 *
 * Statically generated at build time for SEO.
 * Requires SampleQuiz.jsx in the same directory (client component).
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import SampleQuiz from "../SampleQuiz";

// ─── SUBJECT DISPLAY NAMES ────────────────────────────────────────────────────
const SD = {
  mathematics: "Maths", english: "English", science: "Science",
  english_studies: "English Studies", basic_science: "Basic Science",
  basic_technology: "Basic Technology", social_studies: "Social Studies",
  civic_education: "Civic Education", business_education: "Business Studies",
  cultural_and_creative_arts: "Creative Arts", pre_vocational_studies: "Pre-Vocational Studies",
  basic_digital_literacy: "Digital Literacy", religious_studies: "Religious Studies",
  agricultural_science: "Agricultural Science", digital_technologies: "Digital Technologies",
  verbal_reasoning: "Verbal Reasoning", nvr: "Non-Verbal Reasoning",
  hass: "HASS", history: "History", geography: "Geography",
  computing: "Computing", physics: "Physics", chemistry: "Chemistry", biology: "Biology",
  economics: "Economics", government: "Government",
};

// ─── SAMPLE QUESTIONS ─────────────────────────────────────────────────────────
const SQ = {
  "mathematics-1": [
    { q: "What is 5 + 3?", opts: ["7","8","9","6"], a: 1, exp: "Count on from 5: six, seven, eight. 5 + 3 = 8." },
    { q: "Which number is bigger: 14 or 41?", opts: ["14","41","They're the same","Can't tell"], a: 1, exp: "41 has 4 tens. 14 has 1 ten. 41 is bigger." },
    { q: "What shape has 3 sides?", opts: ["Square","Circle","Triangle","Rectangle"], a: 2, exp: "A triangle has 3 sides and 3 corners. 'Tri' means three." },
  ],
  "mathematics-2": [
    { q: "What is 36 + 25?", opts: ["51","61","62","71"], a: 1, exp: "Add ones: 6+5=11 (carry 1). Add tens: 3+2+1=6. Answer: 61." },
    { q: "What is half of 18?", opts: ["6","8","9","12"], a: 2, exp: "Half means dividing by 2. 18 ÷ 2 = 9." },
    { q: "A pencil costs 15p. How much do 3 pencils cost?", opts: ["30p","35p","45p","55p"], a: 2, exp: "3 × 15p = 45p." },
  ],
  "mathematics-3": [
    { q: "What is 47 + 36?", opts: ["73","83","82","84"], a: 1, exp: "47 + 36: ones 7+6=13 (carry 1), tens 4+3+1=8. Answer: 83." },
    { q: "Which fraction is larger: ½ or ¼?", opts: ["½","¼","Equal","Can't tell"], a: 0, exp: "½ is 1 out of 2 parts. ¼ is 1 out of 4. Half is larger than a quarter." },
    { q: "A rectangle is 6cm × 3cm. What is the perimeter?", opts: ["9cm","18cm","12cm","24cm"], a: 1, exp: "Perimeter = 2 × (6+3) = 2 × 9 = 18cm." },
  ],
  "mathematics-4": [
    { q: "Round 4,567 to the nearest thousand.", opts: ["4,000","5,000","4,500","4,600"], a: 1, exp: "Hundreds digit is 5. Since 5 ≥ 5, round up. 4,567 → 5,000." },
    { q: "What is ¾ of 24?", opts: ["16","18","12","20"], a: 1, exp: "¾ of 24: ÷4 = 6, ×3 = 18." },
    { q: "How many minutes in 2½ hours?", opts: ["120","130","150","180"], a: 2, exp: "2 hours = 120 min. Half hour = 30 min. Total = 150." },
  ],
  "mathematics-5": [
    { q: "What is 3.6 × 4?", opts: ["12.4","14.4","13.6","15.6"], a: 1, exp: "36 × 4 = 144. Place decimal: 14.4." },
    { q: "Simplify 12/16.", opts: ["3/4","6/8","2/3","4/5"], a: 0, exp: "12÷4=3, 16÷4=4. Answer: ¾." },
    { q: "Probability of picking blue from 3 red, 5 blue, 2 green?", opts: ["3/10","5/10","2/10","5/8"], a: 1, exp: "Total=10. Blue=5. P=5/10=½." },
  ],
  "mathematics-6": [
    { q: "What is 15% of 80?", opts: ["8","10","12","15"], a: 2, exp: "10%=8, 5%=4. 15%=8+4=12." },
    { q: "Solve: 3x + 7 = 22", opts: ["x=3","x=5","x=7","x=15"], a: 1, exp: "3x=15, x=5." },
    { q: "Ratio boys:girls is 3:5 out of 40. How many girls?", opts: ["15","20","25","30"], a: 2, exp: "8 parts. 40÷8=5. Girls=5×5=25." },
  ],
  "english-3": [
    { q: "Which word is a verb?", opts: ["happy","running","table","blue"], a: 1, exp: "A verb is an action word. 'Running' is the action." },
    { q: "What is the plural of 'child'?", opts: ["childs","children","childrens","child's"], a: 1, exp: "'Child' has an irregular plural: 'children'." },
    { q: "Correct use of apostrophe?", opts: ["The dog's bone","The dogs' bone's","The dog,s bone","The dogs bone"], a: 0, exp: "The dog's bone — apostrophe shows possession." },
  ],
  "english-5": [
    { q: "Synonym for 'enormous'?", opts: ["tiny","huge","quiet","fast"], a: 1, exp: "'Huge' means the same as 'enormous'." },
    { q: "Which word is an adverb?", opts: ["quickly","quick","quickness","quicken"], a: 0, exp: "Adverbs describe how — often ending in '-ly'." },
    { q: "'The wind howled.' What technique?", opts: ["Simile","Metaphor","Personification","Alliteration"], a: 2, exp: "Personification gives human qualities to non-human things." },
  ],
  "science-4": [
    { q: "How do plants make food?", opts: ["Respiration","Photosynthesis","Germination","Pollination"], a: 1, exp: "Photosynthesis uses sunlight, water, and CO₂ to make glucose." },
    { q: "Good conductor of electricity?", opts: ["Wood","Rubber","Copper","Plastic"], a: 2, exp: "Copper is a metal — metals conduct electricity." },
    { q: "Fixed shape AND volume?", opts: ["Solid","Liquid","Gas","Plasma"], a: 0, exp: "Solids have fixed shape and volume." },
  ],
  "verbal_reasoning-5": [
    { q: "Hot is to cold as fast is to ___?", opts: ["quick","slow","speed","run"], a: 1, exp: "Hot/cold are opposites. Fast/slow are opposites." },
    { q: "If A=1, B=2, C=3... value of CAT?", opts: ["24","22","27","21"], a: 0, exp: "C=3, A=1, T=20. Total=24." },
    { q: "Odd one out: apple, banana, carrot, grape", opts: ["apple","banana","carrot","grape"], a: 2, exp: "Carrot is a vegetable. The rest are fruits." },
  ],
  "nvr-5": [
    { q: "△ □ △ □ △ ? — what comes next?", opts: ["△","□","○","◇"], a: 1, exp: "Alternating pattern: triangle, square, triangle, square..." },
    { q: "Reflected in a vertical mirror, which letter stays the same?", opts: ["d","A","b","p"], a: 1, exp: "A is symmetrical about its vertical axis." },
    { q: "How many faces does a cube have?", opts: ["4","6","8","12"], a: 1, exp: "A cube has 6 faces: top, bottom, front, back, left, right." },
  ],
  "english_studies-1": [
    { q: "What letter comes after M?", opts: ["L","N","O","K"], a: 1, exp: "...L, M, N, O... N comes after M." },
    { q: "Which word rhymes with 'cat'?", opts: ["dog","bat","cup","run"], a: 1, exp: "'Cat' and 'bat' both end with '-at'." },
    { q: "Correct sentence?", opts: ["She go to school","She goes to school","She going school","She gone to school"], a: 1, exp: "With she/he/it, the verb takes 's' in present tense." },
  ],
  "basic_science-2": [
    { q: "Which is a living thing?", opts: ["Stone","Flower","Water","Table"], a: 1, exp: "A flower grows, needs water and sunlight, and can reproduce." },
    { q: "What do we use our nose for?", opts: ["Seeing","Hearing","Smelling","Tasting"], a: 2, exp: "Our nose is the sense organ for smelling." },
    { q: "Where does the sun rise?", opts: ["West","East","North","South"], a: 1, exp: "The sun rises in the East and sets in the West." },
  ],
};

// ─── CURRICULUM GUIDES ────────────────────────────────────────────────────────
const CG = {
  "uk_national-mathematics": {
    1: { topics: "Counting to 100, addition & subtraction within 20, recognising shapes, measuring length & weight, telling time to the hour", skills: "Number bonds to 10 and 20, counting in 2s/5s/10s, recognising coins" },
    2: { topics: "Place value to 100, addition & subtraction with regrouping, ×2/×5/×10, fractions (½, ¼, ⅓), time to 5 minutes", skills: "Mental addition/subtraction, times tables for 2, 5, and 10" },
    3: { topics: "Place value to 1,000, column addition & subtraction, ×3/×4/×8, unit fractions, perimeter, time to the minute", skills: "Column methods, fraction understanding, 3×/4×/8× tables" },
    4: { topics: "Place value to 10,000, all times tables to 12×12, equivalent fractions, decimals, area & perimeter, angles, coordinates", skills: "All times tables fluency, fraction equivalence, 2D shape properties" },
    5: { topics: "Place value to 1,000,000, long multiplication & division, fractions/decimals/percentages, volume, translation & reflection", skills: "Multiplying 4-digit by 2-digit, converting fractions to decimals" },
    6: { topics: "Ratio & proportion, algebra, long division, fraction arithmetic, percentage of amounts, area of triangles, mean average, pie charts", skills: "Multi-step problem-solving, algebraic thinking, SATs preparation" },
    7: { topics: "Negative numbers, algebraic expressions, equations, ratio, coordinates in 4 quadrants, transformations, probability, statistics", skills: "Forming and solving equations, working with directed numbers" },
    8: { topics: "Standard form, surds intro, linear graphs, simultaneous equations intro, Pythagoras' theorem, compound measures", skills: "Graph interpretation, algebraic manipulation, geometric reasoning" },
    9: { topics: "Quadratics, trigonometry intro, compound interest, similarity & congruence, vectors, cumulative frequency", skills: "GCSE foundation preparation, proof and reasoning, exam technique" },
  },
  "uk_national-english": {
    3: { topics: "Expanded noun phrases, conjunctions (when, if, because), prefixes & suffixes, speech marks, paragraphing", skills: "Using subordinate clauses, spelling patterns, reading comprehension" },
    4: { topics: "Fronted adverbials, paragraphs with topic sentences, possessive apostrophes, homophones, reading for inference", skills: "Organising writing, understanding character motivation, dictionary use" },
    5: { topics: "Relative clauses, modal verbs, parenthesis, cohesive devices, word families, debate & discussion", skills: "Inference and deduction, summarising, formal vs informal register" },
    6: { topics: "Subjunctive mood, active/passive voice, semi-colons, colons, dashes, sophisticated vocabulary, SATs reading comprehension", skills: "Analysing author's intent, evaluating texts, crafting arguments" },
  },
  "uk_national-science": {
    3: { topics: "Plants (requirements for growth), animals including humans (nutrition, skeleton), rocks, light, forces & magnets", skills: "Setting up simple practical enquiries, recording findings" },
    4: { topics: "Living things & habitats, states of matter, sound, electricity, teeth & digestion", skills: "Fair tests, recording in tables, classification keys" },
    5: { topics: "Living things & life cycles, properties of materials, Earth & space, forces", skills: "Planning different types of enquiries, controlling variables" },
    6: { topics: "Living things & classification, animals including humans (circulatory system), evolution & inheritance, light, electricity", skills: "Identifying scientific evidence, drawing conclusions, presenting findings" },
  },
  "uk_11plus-verbal_reasoning": {
    5: { topics: "Letter sequences, number codes, word analogies, hidden words, odd-one-out, compound words, synonyms & antonyms, logical deduction", skills: "Pattern recognition, timed pressure, vocabulary breadth" },
  },
  "uk_11plus-nvr": {
    5: { topics: "Shape sequences, rotations & reflections, matrices, codes, nets of 3D shapes, odd-one-out, shape analogies", skills: "Spatial reasoning, identifying transformation rules, speed under exam conditions" },
  },
  "ng_jss-mathematics": {
    1: { topics: "Number bases, fractions/decimals/percentages, basic algebra, geometry (angles, triangles), statistics, sets", skills: "Converting number bases, solving simple equations, drawing bar charts" },
    2: { topics: "Algebraic expressions, simultaneous equations (simple), geometry (circles), mensuration, trigonometry basics", skills: "Expanding brackets, factorisation, area of compound shapes" },
    3: { topics: "BECE preparation: all JSS topics, problem-solving, exam technique, speed & accuracy", skills: "Multi-step word problems, graph interpretation, time management" },
  },
  "ng_jss-english_studies": {
    1: { topics: "Parts of speech, tenses, comprehension passages, essay writing (narrative & descriptive), oral English, vocabulary", skills: "Identifying parts of speech, constructing correct sentences" },
    2: { topics: "Clauses & phrases, active/passive voice, direct/indirect speech, summary writing, letter writing, literary appreciation", skills: "Sentence transformation, structured essays, comprehension inference" },
    3: { topics: "BECE preparation: grammar consolidation, comprehension strategies, essay types, oral English practice", skills: "Exam technique, time management, clear written expression" },
  },
  "ng_sss-mathematics": {
    3: { topics: "WAEC: logarithms, indices, surds, quadratics, matrices, trigonometry, coordinate geometry, statistics, probability", skills: "Solving WAEC-style problems under timed conditions, showing working" },
  },
};

// ─── PAGE DEFINITIONS ─────────────────────────────────────────────────────────
const PAGES = [
  // UK National Y1-9
  ...([1,2,3,4,5,6,7,8,9].flatMap(y => {
    const ks = y <= 2 ? "KS1" : y <= 6 ? "KS2" : "KS3";
    return ["mathematics","english","science"].map(s => ({
      slug: `year-${y}-${s}`, curriculum: "uk_national", year: y, subject: s, region: "uk",
      h1: `Year ${y} ${SD[s]} Practice`,
      subtitle: `AI-powered ${SD[s]} practice aligned to the UK National Curriculum (${ks}). Questions that adapt to your child's level in real time.`,
      metaTitle: `Year ${y} ${SD[s]} Practice — AI-Powered | LaunchPard`,
      metaDesc: `Free Year ${y} ${SD[s]} for ${ks}. AI questions, Tara AI tutor, parent dashboard. Try 3 questions now.`,
    }));
  })),
  // UK 11+
  ...([3,4,5,6].flatMap(y =>
    ["mathematics","english","verbal_reasoning","nvr","science"].map(s => ({
      slug: `11-plus-${s.replace(/_/g,"-")}-year-${y}`, curriculum: "uk_11plus", year: y, subject: s, region: "uk",
      h1: `11+ ${SD[s]} — Year ${y}`,
      subtitle: `Timed 11+ ${SD[s]} practice for grammar and independent school entry at Year ${y} level.`,
      metaTitle: `11+ ${SD[s]} Year ${y} — Practice Tests | LaunchPard`,
      metaDesc: `11+ ${SD[s]} Year ${y}. AI-adaptive, timed tests, instant marking. Try 3 free questions.`,
    }))
  )),
  { slug: "11-plus-practice", curriculum: "uk_11plus", year: 5, subject: null, region: "uk",
    h1: "11+ Exam Practice", subtitle: "AI-powered 11+ across Maths, English, VR, and NVR. Timed mock tests under real conditions.",
    metaTitle: "11+ Practice Tests Online | LaunchPard", metaDesc: "11+ grammar school prep. Maths, English, VR, NVR. Try 3 free questions." },
  { slug: "11-plus-verbal-reasoning", curriculum: "uk_11plus", year: 5, subject: "verbal_reasoning", region: "uk",
    h1: "11+ Verbal Reasoning Practice", subtitle: "Master verbal reasoning with AI-adaptive practice. Codes, sequences, analogies.",
    metaTitle: "11+ Verbal Reasoning Practice | LaunchPard", metaDesc: "11+ VR: codes, sequences, analogies. Try 3 free questions." },
  { slug: "11-plus-non-verbal-reasoning", curriculum: "uk_11plus", year: 5, subject: "nvr", region: "uk",
    h1: "11+ Non-Verbal Reasoning Practice", subtitle: "Pattern sequences, rotations, reflections, and matrices.",
    metaTitle: "11+ NVR Practice Online | LaunchPard", metaDesc: "11+ NVR: shapes, rotations, matrices. Try 3 free questions." },
  // Nigerian Primary
  ...([1,2,3,4,5,6].flatMap(y =>
    ["mathematics","english_studies","basic_science"].map(s => ({
      slug: `primary-${y}-${s.replace(/_/g,"-")}`, curriculum: "ng_primary", year: y, subject: s, region: "ng",
      h1: `Primary ${y} ${SD[s]} Practice`, subtitle: `Adaptive ${SD[s]} for Primary ${y}. Nigerian NERDC curriculum.`,
      metaTitle: `Primary ${y} ${SD[s]} — Nigeria | LaunchPard`, metaDesc: `${SD[s]} for Nigerian Primary ${y}. Try 3 free questions.`,
    }))
  )),
  // Nigerian JSS
  ...([1,2,3].flatMap(y =>
    ["mathematics","english_studies","basic_science","social_studies","civic_education"].map(s => ({
      slug: `jss-${y}-${s.replace(/_/g,"-")}`, curriculum: "ng_jss", year: y, subject: s, region: "ng",
      h1: `JSS ${y} ${SD[s]}`, subtitle: `Adaptive ${SD[s]} for JSS ${y}. NERDC aligned.`,
      metaTitle: `JSS ${y} ${SD[s]} — Nigeria | LaunchPard`, metaDesc: `JSS ${y} ${SD[s]}. AI questions. Try 3 free.`,
    }))
  )),
  { slug: "bece-practice", curriculum: "ng_jss", year: 3, subject: "mathematics", region: "ng",
    h1: "BECE Practice — Junior WAEC", subtitle: "Timed BECE mock papers. Real exam conditions.",
    metaTitle: "BECE Practice Questions | LaunchPard", metaDesc: "Junior WAEC prep. Try 3 free questions." },
  // Nigerian SSS
  ...([1,2,3].flatMap(y =>
    ["mathematics","english","physics","chemistry","biology"].map(s => ({
      slug: `ss-${y}-${s}`, curriculum: "ng_sss", year: y, subject: s, region: "ng",
      h1: `SS ${y} ${SD[s]}`, subtitle: `${SD[s]} practice for SS ${y}. WAEC/NECO aligned.`,
      metaTitle: `SS ${y} ${SD[s]} — WAEC | LaunchPard`, metaDesc: `SS ${y} ${SD[s]}. WAEC-style. Try 3 free questions.`,
    }))
  )),
  { slug: "waec-practice", curriculum: "ng_sss", year: 3, subject: "mathematics", region: "ng",
    h1: "WAEC Practice Questions", subtitle: "Timed WAEC and NECO mock papers across all subjects.",
    metaTitle: "WAEC Practice Online | LaunchPard", metaDesc: "WAEC/NECO prep. Try 3 free questions." },
  // Australian
  ...([1,2,3,4,5,6].flatMap(y =>
    ["mathematics","english","science"].map(s => ({
      slug: `year-${y}-${s}-australia`, curriculum: "aus_acara", year: y, subject: s, region: "au",
      h1: `Year ${y} ${SD[s]} — Australia`, subtitle: `ACARA-aligned ${SD[s]} for Year ${y}.`,
      metaTitle: `Year ${y} ${SD[s]} Australia | LaunchPard`, metaDesc: `Australian Year ${y} ${SD[s]}. Try 3 free questions.`,
    }))
  )),
  // Canadian
  ...([1,2,3,4,5,6,7,8].flatMap(y =>
    ["mathematics","english","science"].map(s => ({
      slug: `grade-${y}-${s}-canada`, curriculum: "ca_primary", year: y, subject: s, region: "ca",
      h1: `Grade ${y} ${SD[s]} — Canada`, subtitle: `Canadian curriculum-aligned ${SD[s]} for Grade ${y}.`,
      metaTitle: `Grade ${y} ${SD[s]} Canada | LaunchPard`, metaDesc: `Canadian Grade ${y} ${SD[s]}. Try 3 free questions.`,
    }))
  )),
];

const PAGE_MAP = Object.fromEntries(PAGES.map(p => [p.slug, p]));

function getSampleQs(subject, year) {
  if (!subject) return null;
  const key = `${subject}-${year}`;
  if (SQ[key]) return SQ[key];
  for (const d of [1,-1,2,-2,3,-3]) { const k = `${subject}-${year+d}`; if (SQ[k]) return SQ[k]; }
  const fb = Object.entries(SQ).find(([k]) => k.startsWith(subject));
  return fb ? fb[1] : null;
}

function getGuide(curriculum, subject, year) {
  return CG[`${curriculum}-${subject}`]?.[year] || null;
}

export async function generateStaticParams() { return PAGES.map(p => ({ slug: p.slug })); }

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const p = PAGE_MAP[slug];
  if (!p) return { title: "Not Found" };
  return {
    title: p.metaTitle, description: p.metaDesc,
    openGraph: { title: p.metaTitle, description: p.metaDesc, type: "website", url: `https://launchpard.com/learn/${p.slug}` },
    alternates: { canonical: `https://launchpard.com/learn/${p.slug}` },
  };
}

export default async function LearnPage({ params }) {
  const { slug } = await params;
  const page = PAGE_MAP[slug];
  if (!page) notFound();

  const subjectLabel = page.subject ? SD[page.subject] : null;
  const sampleQs = page.subject ? getSampleQs(page.subject, page.year || 5) : null;
  const guide = page.subject ? getGuide(page.curriculum, page.subject, page.year) : null;

  return (
    <div className="min-h-screen bg-[#f8f9ff] font-sans">
      <nav className="bg-white/90 backdrop-blur-xl border-b border-slate-200/80 shadow-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.svg" alt="LaunchPard" width={30} height={30} style={{ objectFit: "contain" }} />
            <span className="text-lg font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">LaunchPard</span>
          </Link>
          <Link href="/signup" className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-sm px-5 py-2 rounded-full shadow-md">Start Free →</Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-2 text-sm text-slate-400 mt-8 mb-6 flex-wrap">
          <Link href="/" className="hover:text-indigo-600">Home</Link><span>›</span>
          <span className="text-slate-600 font-bold">{page.h1}</span>
        </div>

        {/* Hero */}
        <section className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4 leading-tight">{page.h1}</h1>
          <p className="text-lg text-slate-600 leading-relaxed mb-6">{page.subtitle}</p>
          <div className="flex flex-wrap items-center gap-2.5 text-sm">
            <span className="bg-indigo-50 text-indigo-700 font-bold px-3 py-1.5 rounded-full border border-indigo-100">50,000+ questions</span>
            <span className="bg-emerald-50 text-emerald-700 font-bold px-3 py-1.5 rounded-full border border-emerald-100">AI-adaptive</span>
            <span className="bg-purple-50 text-purple-700 font-bold px-3 py-1.5 rounded-full border border-purple-100">Curriculum aligned</span>
            <span className="bg-amber-50 text-amber-700 font-bold px-3 py-1.5 rounded-full border border-amber-100">Free to start</span>
          </div>
        </section>

        {/* Interactive sample questions */}
        {sampleQs && (
          <section className="mb-14">
            <h2 className="text-xl font-black text-slate-900 mb-2">Try {subjectLabel} — no signup needed</h2>
            <p className="text-sm text-slate-500 mb-5">3 sample questions. Your child gets this — but adaptive, personalised, and with Tara AI feedback.</p>
            <SampleQuiz questions={sampleQs} subject={subjectLabel} />
          </section>
        )}

        {/* Curriculum guide */}
        {guide && (
          <section className="mb-14">
            <h2 className="text-xl font-black text-slate-900 mb-4">What your child learns</h2>
            <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
              <div className="p-5">
                <h3 className="font-bold text-slate-700 text-sm mb-2">Topics covered</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{guide.topics}</p>
              </div>
              <div className="p-5">
                <h3 className="font-bold text-slate-700 text-sm mb-2">Key skills</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{guide.skills}</p>
              </div>
            </div>
          </section>
        )}

        {/* How LaunchPard helps */}
        <section className="mb-14">
          <h2 className="text-xl font-black text-slate-900 mb-4">How LaunchPard helps</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              ["🧠","Adaptive AI","Every question adjusts to your child's level. Too easy? We move up. Struggling? We scaffold."],
              ["🤖","Tara AI Tutor","Got it wrong? Tara asks your child to explain why — building real understanding, not just memorisation."],
              ["📊","Guardian Dashboard","See exactly which topics are strong and which need work. Weekly reports delivered."],
              ["🚀","Space Missions","Your child isn't doing homework — they're completing missions, earning Stardust, and climbing leaderboards."],
            ].map(([icon,title,desc],i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5">
                <span className="text-2xl mb-3 block">{icon}</span>
                <h3 className="font-bold text-slate-900 text-sm mb-1.5">{title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Social proof */}
        <section className="mb-14">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 sm:p-8 text-white">
            <p className="text-lg font-bold italic leading-relaxed mb-4">
              &ldquo;My daughter went from dreading maths homework to asking for more missions. The 11+ results speak for themselves.&rdquo;
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-sm">SK</div>
              <div><p className="font-bold text-sm">Sarah K.</p><p className="text-slate-400 text-xs">Parent, Year 5 scholar, London</p></div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mb-16">
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-3xl p-8 text-center">
            <h2 className="text-2xl font-black text-slate-900 mb-2">Ready to start {subjectLabel || "learning"}?</h2>
            <p className="text-sm text-slate-600 mb-6">30-day Pro trial. No card needed. Up to 3 scholars.</p>
            <Link href="/signup" className="inline-block bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black px-8 py-3.5 rounded-xl shadow-lg text-sm">Create Free Account →</Link>
            <p className="text-xs text-slate-400 mt-3">After your trial, keep free access — 10 questions a day, forever.</p>
          </div>
        </section>
      </main>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context":"https://schema.org","@type":"WebPage",name:page.metaTitle,description:page.metaDesc,
        url:`https://launchpard.com/learn/${page.slug}`,
        provider:{"@type":"EducationalOrganization",name:"LaunchPard",url:"https://launchpard.com"},
      })}} />

      <footer className="border-t border-slate-200 py-6 px-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} LaunchPard Technologies · <Link href="/terms" className="hover:text-indigo-600">Terms</Link> · <Link href="/privacy-policy" className="hover:text-indigo-600">Privacy</Link>
      </footer>
    </div>
  );
}