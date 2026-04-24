#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FULL QUESTION BANK AUDIT — Comprehensive multi-dimension quality sweep
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Covers every dimension not already addressed by prior targeted audits.
 * Reads all active questions in a single paginated pass, then runs all checks.
 *
 * AUDIT CATEGORIES
 * ─────────────────
 * A  STRUCTURAL INTEGRITY
 *    A1  correct_index null, undefined, or >= options.length
 *    A2  options null / not an array / fewer than 2 entries
 *    A3  options has duplicates (case-insensitive trim)
 *    A4  options has blank/empty entries
 *
 * B  CONTENT QUALITY
 *    B1  explanation missing (null or empty string)
 *    B2  explanation present but < 80 chars (stub-level)
 *    B3  question_text has encoding artefacts (□ ■ ▯ \n \t literal)
 *    B4  question_text or any option is suspiciously long (> 600 chars)
 *
 * C  METADATA COMPLETENESS
 *    C1  topic null or "general" (untagged)
 *    C2  subject null
 *    C3  curriculum null
 *    C4  year_level null or 0
 *    C5  difficulty_tier null or invalid value
 *
 * D  COVERAGE GAPS (aggregated, reported only)
 *    D1  curriculum × subject × year_level cells with < 5 active questions
 *    D2  curriculum × topic cells with < 3 active questions
 *    D3  Nigerian curricula gap vs UK baseline topic set
 *
 * E  DIFFICULTY DISTRIBUTION (aggregated, reported only)
 *    E1  topics where every question shares the same difficulty_tier (no range)
 *    E2  topics with 0 foundation-tier questions (accessibility gap)
 *    E3  topics with 0 advanced-tier questions (ceiling gap)
 *
 * OUTPUT
 * ───────
 *   scripts/output/audit_structural.csv     — A1–A4 (with IDs for SQL)
 *   scripts/output/audit_content.csv        — B1–B4
 *   scripts/output/audit_metadata.csv       — C1–C5
 *   scripts/output/audit_coverage.csv       — D1–D3 thin cells
 *   scripts/output/audit_difficulty.csv     — E1–E3 imbalanced topics
 *   scripts/output/structural_deactivate.sql — A1+A2 high-confidence deactivations
 *   scripts/output/full_bank_audit_report.txt — executive summary
 *
 * USAGE
 * ──────
 *   node scripts/fullBankAudit.mjs
 *   node scripts/fullBankAudit.mjs --curriculum ng_primary
 *   node scripts/fullBankAudit.mjs --dry-run   (prints only, no file writes)
 *
 * REQUIRES: .env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "fs/promises";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const outputDir = resolve(projectRoot, "scripts", "output");

// ─── Args ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const curriculumFilter = (() => {
  const f = args.find(a => a.startsWith("--curriculum="));
  return f ? f.split("=")[1] : null;
})();

// ─── Supabase ─────────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
  console.error("❌ Missing env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY");
  process.exit(1);
}

// ─── Constants ────────────────────────────────────────────────────────────────
const VALID_DIFFICULTY_TIERS = new Set(["foundation", "developing", "intermediate", "advanced"]);
const ENCODING_ARTEFACT_RE = /[\u25A0\u25A1\u25AE\u25AF]|\\n|\\t|\u{FFFD}/u;
const THIN_CELL_THRESHOLD = 5;   // < 5 questions in curriculum×subject×year
const THIN_TOPIC_THRESHOLD = 3;  // < 3 questions in curriculum×topic
const STUB_EXPLANATION_LEN = 80; // explanations shorter than this are stubs

// ─── Helpers ──────────────────────────────────────────────────────────────────
const esc = s => `"${String(s ?? "").replace(/"/g, '""')}"`;

function csvRow(values) {
  return values.map(v => (typeof v === "string" ? esc(v) : (v ?? ""))).join(",");
}

// ─── Fetch all active questions ────────────────────────────────────────────────
async function fetchAllQuestions() {
  let all = [];
  let page = 0;
  const pageSize = 1000;

  console.log("📖 Fetching active questions...");

  while (true) {
    let query = supabase
      .from("question_bank")
      .select("id, topic, subject, curriculum, year_level, question_text, options, correct_index, explanation, difficulty_tier, also_curricula")
      .eq("is_active", true)
      .order("curriculum, subject, year_level")
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (curriculumFilter) query = query.eq("curriculum", curriculumFilter);

    const { data, error } = await query;
    if (error) { console.error("❌ Fetch error:", error.message); process.exit(1); }
    if (!data || data.length === 0) break;

    all = all.concat(data);
    page++;
    process.stdout.write(`\r  ${all.length.toLocaleString()} questions loaded...`);
  }

  console.log(`\n✅ Fetched ${all.length.toLocaleString()} active questions\n`);
  return all;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
await mkdir(outputDir, { recursive: true });

console.log("═".repeat(64));
console.log("FULL QUESTION BANK AUDIT");
console.log(`Mode:      ${dryRun ? "DRY RUN" : "WRITE"}`);
if (curriculumFilter) console.log(`Curriculum: ${curriculumFilter}`);
console.log("═".repeat(64) + "\n");

const questions = await fetchAllQuestions();
const total = questions.length;

// ─── Single-pass per-question analysis ────────────────────────────────────────
console.log("🔬 Analysing questions...\n");

const structural = []; // A1–A4
const content = [];    // B1–B4
const metadata = [];   // C1–C5

// Aggregation maps
const coverageCells = new Map();   // "curriculum|subject|year_level" → count
const topicCells = new Map();      // "curriculum|topic" → count
const topicDifficulty = new Map(); // "curriculum|topic" → { foundation:0, developing:0, intermediate:0, advanced:0 }

const DIFF_TEMPLATE = () => ({ foundation: 0, developing: 0, intermediate: 0, advanced: 0 });

function incCoverage(key) { coverageCells.set(key, (coverageCells.get(key) ?? 0) + 1); }
function incTopicCell(key) { topicCells.set(key, (topicCells.get(key) ?? 0) + 1); }

// Track which IDs are A1 or A2 for the deactivation SQL
const deactivateA1 = [];
const deactivateA2 = [];

for (let i = 0; i < questions.length; i++) {
  const q = questions[i];
  const opts = Array.isArray(q.options) ? q.options : null;
  const optLen = opts ? opts.length : 0;
  const qText = q.question_text ?? "";
  const exp = q.explanation ?? "";
  const curriculum = q.curriculum ?? "";
  const subject = q.subject ?? "";
  const topic = q.topic ?? "";
  const yearLevel = q.year_level ?? "";
  const tier = q.difficulty_tier ?? "";

  // ── A: Structural ──────────────────────────────────────────────────────────
  const ciNull = q.correct_index === null || q.correct_index === undefined;
  const ciOob = !ciNull && (q.correct_index >= optLen || q.correct_index < 0);

  if (ciNull || ciOob) {
    structural.push({ id: q.id, category: "A1", detail: ciNull ? "correct_index is null" : `correct_index=${q.correct_index} but options.length=${optLen}`, curriculum, subject, topic, year_level: yearLevel });
    deactivateA1.push(q.id);
  }

  if (!opts || optLen < 2) {
    structural.push({ id: q.id, category: "A2", detail: !opts ? "options is null/non-array" : `only ${optLen} option(s)`, curriculum, subject, topic, year_level: yearLevel });
    deactivateA2.push(q.id);
  } else if (optLen < 4) {
    structural.push({ id: q.id, category: "A2", detail: `only ${optLen} option(s) (< 4)`, curriculum, subject, topic, year_level: yearLevel });
    // < 2 → deactivate; < 4 → flag only
  }

  if (opts && optLen >= 2) {
    const normalised = opts.map(o => String(o ?? "").trim().toLowerCase());
    const seen = new Set();
    let hasDup = false;
    for (const o of normalised) { if (seen.has(o)) { hasDup = true; break; } seen.add(o); }
    if (hasDup) structural.push({ id: q.id, category: "A3", detail: "duplicate option values", curriculum, subject, topic, year_level: yearLevel });

    const blankOpts = opts.filter(o => !String(o ?? "").trim());
    if (blankOpts.length > 0) structural.push({ id: q.id, category: "A4", detail: `${blankOpts.length} blank option(s)`, curriculum, subject, topic, year_level: yearLevel });
  }

  // ── B: Content ────────────────────────────────────────────────────────────
  if (!exp || exp.trim().length === 0) {
    content.push({ id: q.id, category: "B1", detail: "explanation missing", curriculum, subject, topic, year_level: yearLevel });
  } else if (exp.trim().length < STUB_EXPLANATION_LEN) {
    content.push({ id: q.id, category: "B2", detail: `explanation only ${exp.trim().length} chars`, curriculum, subject, topic, year_level: yearLevel });
  }

  if (ENCODING_ARTEFACT_RE.test(qText)) {
    content.push({ id: q.id, category: "B3", detail: "encoding artefact in question_text", curriculum, subject, topic, year_level: yearLevel });
  }

  const longText = qText.length > 600 || (opts || []).some(o => String(o ?? "").length > 600);
  if (longText) {
    content.push({ id: q.id, category: "B4", detail: `text > 600 chars (qText=${qText.length})`, curriculum, subject, topic, year_level: yearLevel });
  }

  // ── C: Metadata ───────────────────────────────────────────────────────────
  if (!topic || topic === "general") metadata.push({ id: q.id, category: "C1", detail: topic ? "topic='general'" : "topic null", curriculum, subject, year_level: yearLevel });
  if (!subject) metadata.push({ id: q.id, category: "C2", detail: "subject null", curriculum, topic, year_level: yearLevel });
  if (!curriculum) metadata.push({ id: q.id, category: "C3", detail: "curriculum null", subject, topic, year_level: yearLevel });
  if (!yearLevel) metadata.push({ id: q.id, category: "C4", detail: "year_level null/0", curriculum, subject, topic });
  if (!tier || !VALID_DIFFICULTY_TIERS.has(tier)) metadata.push({ id: q.id, category: "C5", detail: tier ? `invalid tier '${tier}'` : "difficulty_tier null", curriculum, subject, topic, year_level: yearLevel });

  // ── D: Coverage aggregation ───────────────────────────────────────────────
  if (curriculum && subject && yearLevel) {
    incCoverage(`${curriculum}|${subject}|${yearLevel}`);
  }
  if (curriculum && topic) {
    incTopicCell(`${curriculum}|${topic}`);
  }

  // ── E: Difficulty distribution ────────────────────────────────────────────
  if (curriculum && topic && tier && VALID_DIFFICULTY_TIERS.has(tier)) {
    const dk = `${curriculum}|${topic}`;
    if (!topicDifficulty.has(dk)) topicDifficulty.set(dk, DIFF_TEMPLATE());
    topicDifficulty.get(dk)[tier]++;
  }

  if ((i + 1) % 10000 === 0) process.stdout.write(`\r  Analysed ${(i + 1).toLocaleString()}/${total.toLocaleString()}...`);
}

console.log(`\r  Analysed ${total.toLocaleString()}/${total.toLocaleString()}... ✅\n`);

// ─── D: Build coverage gap report ─────────────────────────────────────────────
const thinCells = [];
for (const [key, count] of coverageCells) {
  if (count < THIN_CELL_THRESHOLD) {
    const [curriculum, subject, year_level] = key.split("|");
    thinCells.push({ curriculum, subject, year_level, question_count: count });
  }
}
thinCells.sort((a, b) => a.question_count - b.question_count || a.curriculum.localeCompare(b.curriculum));

const thinTopics = [];
for (const [key, count] of topicCells) {
  if (count < THIN_TOPIC_THRESHOLD) {
    const [curriculum, topic] = key.split("|");
    thinTopics.push({ curriculum, topic, question_count: count });
  }
}
thinTopics.sort((a, b) => a.question_count - b.question_count || a.curriculum.localeCompare(b.curriculum));

// Nigerian gap: which topics in UK curricula don't exist in Nigerian curricula?
const ukTopics = new Set();
const ngTopics = new Set();
for (const [key] of topicCells) {
  const [curriculum, topic] = key.split("|");
  if (curriculum.startsWith("uk_") || curriculum.startsWith("nc_")) ukTopics.add(topic);
  if (curriculum.startsWith("ng_")) ngTopics.add(topic);
}
const ngGaps = [...ukTopics].filter(t => !ngTopics.has(t)).sort();

// ─── E: Build difficulty distribution report ───────────────────────────────────
const diffIssues = [];
for (const [key, dist] of topicDifficulty) {
  const [curriculum, topic] = key.split("|");
  const levels = Object.values(dist);
  const nonZero = levels.filter(v => v > 0).length;

  if (nonZero === 1) {
    const tierName = Object.entries(dist).find(([, v]) => v > 0)[0];
    diffIssues.push({ curriculum, topic, issue: "E1_monotone", tier: tierName, foundation: dist.foundation, developing: dist.developing, intermediate: dist.intermediate, advanced: dist.advanced });
  }
  if (dist.foundation === 0) {
    diffIssues.push({ curriculum, topic, issue: "E2_no_foundation", tier: "", ...dist });
  }
  if (dist.advanced === 0) {
    diffIssues.push({ curriculum, topic, issue: "E3_no_advanced", tier: "", ...dist });
  }
}
diffIssues.sort((a, b) => a.curriculum.localeCompare(b.curriculum) || a.topic.localeCompare(b.topic) || a.issue.localeCompare(b.issue));

// ─── Write CSV: structural ─────────────────────────────────────────────────────
const STRUCT_HEADERS = ["question_id", "category", "detail", "curriculum", "subject", "topic", "year_level"];
const structCsv = [
  STRUCT_HEADERS.join(","),
  ...structural.map(r => csvRow([r.id, r.category, r.detail, r.curriculum, r.subject, r.topic, r.year_level]))
].join("\n");

// ─── Write CSV: content ───────────────────────────────────────────────────────
const CONTENT_HEADERS = ["question_id", "category", "detail", "curriculum", "subject", "topic", "year_level"];
const contentCsv = [
  CONTENT_HEADERS.join(","),
  ...content.map(r => csvRow([r.id, r.category, r.detail, r.curriculum, r.subject, r.topic, r.year_level]))
].join("\n");

// ─── Write CSV: metadata ──────────────────────────────────────────────────────
const META_HEADERS = ["question_id", "category", "detail", "curriculum", "subject", "topic", "year_level"];
const metaCsv = [
  META_HEADERS.join(","),
  ...metadata.map(r => csvRow([r.id, r.category, r.detail, r.curriculum ?? "", r.subject ?? "", r.topic ?? "", r.year_level ?? ""]))
].join("\n");

// ─── Write CSV: coverage ──────────────────────────────────────────────────────
const COV_HEADERS = ["type", "curriculum", "subject_or_topic", "year_level", "question_count"];
const coverageCsvRows = [
  ...thinCells.map(r => csvRow(["D1_thin_cell", r.curriculum, r.subject, r.year_level, r.question_count])),
  ...thinTopics.map(r => csvRow(["D2_thin_topic", r.curriculum, r.topic, "", r.question_count])),
  ...ngGaps.map(t => csvRow(["D3_ng_gap", "ng_*", t, "", 0])),
];
const coverageCsv = [COV_HEADERS.join(","), ...coverageCsvRows].join("\n");

// ─── Write CSV: difficulty ────────────────────────────────────────────────────
const DIFF_HEADERS = ["issue", "curriculum", "topic", "tier", "foundation", "developing", "intermediate", "advanced"];
const difficultyCsv = [
  DIFF_HEADERS.join(","),
  ...diffIssues.map(r => csvRow([r.issue, r.curriculum, r.topic, r.tier, r.foundation, r.developing, r.intermediate, r.advanced]))
].join("\n");

// ─── Write SQL: structural deactivations ─────────────────────────────────────
const deactivateAll = [...new Set([...deactivateA1, ...deactivateA2])];
let sqlContent = "";
if (deactivateAll.length > 0) {
  const idList = deactivateAll.map(id => `'${id}'`).join(", ");
  sqlContent = `-- AUTO-GENERATED: Full Bank Audit — Structural Deactivations
-- Generated: ${new Date().toISOString()}
-- A1: correct_index null or out-of-bounds (${deactivateA1.length} questions)
-- A2: options null / non-array / < 2 entries (${deactivateA2.length} questions, overlap possible)
-- Total unique: ${deactivateAll.length} questions
-- Safe to apply: these questions cannot be answered correctly and are therefore inert.

UPDATE question_bank
SET is_active = false
WHERE id IN (${idList});
`;
}

// ─── Write report ─────────────────────────────────────────────────────────────
const cat = (label, n) => `  ${label.padEnd(50)} ${n.toLocaleString().padStart(7)}`;

// Compute B1 counts per curriculum for the NG breakdown
const b1byCurriculum = {};
for (const r of content.filter(r => r.category === "B1")) {
  b1byCurriculum[r.curriculum] = (b1byCurriculum[r.curriculum] ?? 0) + 1;
}
const b1NgTotal = Object.entries(b1byCurriculum).filter(([k]) => k.startsWith("ng_")).reduce((s, [, v]) => s + v, 0);

const report = `
════════════════════════════════════════════════════════════════
FULL QUESTION BANK AUDIT — EXECUTIVE SUMMARY
Generated: ${new Date().toISOString()}
${curriculumFilter ? `Curriculum filter: ${curriculumFilter}\n` : ""}Questions audited: ${total.toLocaleString()}
════════════════════════════════════════════════════════════════

A — STRUCTURAL INTEGRITY
${cat("A1  correct_index null/OOB (deactivate):", deactivateA1.length)}
${cat("A2  options null/< 2 entries (deactivate):", deactivateA2.length)}
${cat("A2  options < 4 entries (flag only):", structural.filter(r => r.category === "A2" && !deactivateA2.includes(r.id)).length)}
${cat("A3  duplicate options (flag):", structural.filter(r => r.category === "A3").length)}
${cat("A4  blank option entries (flag):", structural.filter(r => r.category === "A4").length)}
${cat("    → Total structural deactivations:", deactivateAll.length)}

B — CONTENT QUALITY
${cat("B1  missing explanation:", content.filter(r => r.category === "B1").length)}
${cat("    ↳ of which ng_primary/jss/sss:", b1NgTotal)}
${cat("B2  explanation stub (< 80 chars):", content.filter(r => r.category === "B2").length)}
${cat("B3  encoding artefacts in question_text:", content.filter(r => r.category === "B3").length)}
${cat("B4  suspiciously long text (> 600 chars):", content.filter(r => r.category === "B4").length)}

C — METADATA COMPLETENESS
${cat("C1  topic null or 'general':", metadata.filter(r => r.category === "C1").length)}
${cat("C2  subject null:", metadata.filter(r => r.category === "C2").length)}
${cat("C3  curriculum null:", metadata.filter(r => r.category === "C3").length)}
${cat("C4  year_level null:", metadata.filter(r => r.category === "C4").length)}
${cat("C5  difficulty_tier null or invalid:", metadata.filter(r => r.category === "C5").length)}

D — COVERAGE GAPS (< threshold, not deactivated)
${cat("D1  thin curriculum×subject×year cells (<5 Qs):", thinCells.length)}
${cat("D2  thin curriculum×topic cells (<3 Qs):", thinTopics.length)}
${cat("D3  topics in UK but absent from NG curricula:", ngGaps.length)}
  Top NG gaps (first 20):
${ngGaps.slice(0, 20).map(t => `    • ${t}`).join("\n")}

E — DIFFICULTY DISTRIBUTION (per curriculum×topic)
${cat("E1  monotone topics (single tier only):", diffIssues.filter(r => r.issue === "E1_monotone").length)}
${cat("E2  no foundation questions:", diffIssues.filter(r => r.issue === "E2_no_foundation").length)}
${cat("E3  no advanced questions:", diffIssues.filter(r => r.issue === "E3_no_advanced").length)}

════════════════════════════════════════════════════════════════
RECOMMENDED NEXT ACTIONS
════════════════════════════════════════════════════════════════
1. Apply structural_deactivate.sql (${deactivateAll.length} questions — A1+A2 cannot be answered)
2. Prioritise B1 explanation writes for ng_* curricula (${b1NgTotal} missing, Nigerian launch blocker)
3. Run rewriteExplanations.mjs for B2 stubs — already committed, ready to run
4. Review audit_coverage.csv D3 column to prioritise gap-fill by topic
5. Investigate C5 questions (invalid difficulty_tier) — likely leftover from pre-migration data
6. Difficulty balance (E1–E3): flag for generator to seed foundation/advanced variants per thin topic
`.trim();

// ─── Write outputs ────────────────────────────────────────────────────────────
console.log(report);
console.log("\n");

if (!dryRun) {
  await writeFile(resolve(outputDir, "audit_structural.csv"), structCsv, "utf-8");
  await writeFile(resolve(outputDir, "audit_content.csv"), contentCsv, "utf-8");
  await writeFile(resolve(outputDir, "audit_metadata.csv"), metaCsv, "utf-8");
  await writeFile(resolve(outputDir, "audit_coverage.csv"), coverageCsv, "utf-8");
  await writeFile(resolve(outputDir, "audit_difficulty.csv"), difficultyCsv, "utf-8");
  await writeFile(resolve(outputDir, "full_bank_audit_report.txt"), report, "utf-8");
  if (sqlContent) {
    await writeFile(resolve(outputDir, "structural_deactivate.sql"), sqlContent, "utf-8");
    console.log(`📁 SQL: scripts/output/structural_deactivate.sql (${deactivateAll.length} deactivations)`);
  }
  console.log("📁 CSVs written to scripts/output/audit_*.csv");
  console.log("📁 Report: scripts/output/full_bank_audit_report.txt\n");
} else {
  console.log("📋 [DRY RUN] No files written.\n");
}

console.log("✅ Full bank audit complete.");
process.exit(0);
