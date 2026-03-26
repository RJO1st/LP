#!/usr/bin/env node
/**
 * backfill_explanations.js
 * 
 * Generates explanations for questions that have question_text + options but no explanation.
 * Uses OpenRouter API (Llama 3.3 70B for speed/cost, or Claude Sonnet for quality).
 *
 * Usage:
 *   OPENROUTER_API_KEY=sk-or-... SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_KEY=eyJ... \
 *   node backfill_explanations.js [--curriculum ng_sss] [--subject mathematics] [--limit 500] [--model meta-llama/llama-3.3-70b-instruct] [--dry-run]
 *
 * Defaults:
 *   --limit 500 (questions per run)
 *   --model meta-llama/llama-3.3-70b-instruct (fast + cheap, $0.30/M tokens)
 *   --batch-size 5 (questions per API call — batched for efficiency)
 *
 * Cost estimate:
 *   ~500 tokens per question (prompt + response)
 *   500 questions × 500 tokens = 250K tokens ≈ $0.08 with Llama 3.3
 *   10,000 questions ≈ $1.50 with Llama 3.3
 *   10,000 questions ≈ $9.00 with Claude Sonnet
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!OPENROUTER_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing env vars. Required: OPENROUTER_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY");
  process.exit(1);
}

// ── Parse CLI args ───────────────────────────────────────────────────────────
const args = process.argv.slice(2);
function getArg(name, defaultVal) {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultVal;
}
const CURRICULUM = getArg("curriculum", null);
const SUBJECT = getArg("subject", null);
const LIMIT = parseInt(getArg("limit", "500"), 10);
const MODEL = getArg("model", "meta-llama/llama-3.3-70b-instruct");
const BATCH_SIZE = parseInt(getArg("batch-size", "5"), 10);
const DRY_RUN = args.includes("--dry-run");
const DELAY_MS = parseInt(getArg("delay", "500"), 10); // ms between API calls

console.log(`
═══════════════════════════════════════════════════════════
  EXPLANATION BACKFILL — LaunchPard
═══════════════════════════════════════════════════════════
  Model:      ${MODEL}
  Curriculum: ${CURRICULUM || "ALL"}
  Subject:    ${SUBJECT || "ALL"}
  Limit:      ${LIMIT}
  Batch size: ${BATCH_SIZE}
  Dry run:    ${DRY_RUN}
  Delay:      ${DELAY_MS}ms between calls
═══════════════════════════════════════════════════════════
`);

// ── Supabase REST helpers ────────────────────────────────────────────────────
async function supabaseQuery(table, params = "") {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${params}`;
  const res = await fetch(url, {
    headers: {
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=minimal",
    },
  });
  if (!res.ok) throw new Error(`Supabase GET failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function supabaseUpdate(table, id, data) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=minimal",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Supabase PATCH failed for ${id}: ${res.status}`);
}

// ── Fetch questions missing explanations ─────────────────────────────────────
async function fetchMissingExplanations() {
  // First, discover the correct column name by trying 'explanation', then 'exp'
  let expColumn = "explanation";
  try {
    await supabaseQuery("question_bank", "select=explanation&limit=1");
  } catch {
    try {
      await supabaseQuery("question_bank", "select=exp&limit=1");
      expColumn = "exp";
    } catch {
      console.log("⚠ Could not find explanation/exp column. Trying question_data...");
      expColumn = null;
    }
  }

  if (!expColumn) {
    console.error("Cannot determine explanation column name. Check your schema.");
    process.exit(1);
  }

  console.log(`  Using column: ${expColumn}`);
  EXP_COLUMN = expColumn;

  let params = [
    `select=id,question_text,options,correct_index,subject,topic,curriculum,year_level,${expColumn}`,
    `${expColumn}=is.null`,
    "question_text=not.is.null",
    `limit=${LIMIT}`,
    "order=curriculum,subject,topic",
  ];
  if (CURRICULUM) params.push(`curriculum=eq.${CURRICULUM}`);
  if (SUBJECT) params.push(`subject=eq.${SUBJECT}`);

  const results = await supabaseQuery("question_bank", params.join("&"));
  
  // If null filter returned 0, try empty string filter too
  if (results.length === 0) {
    console.log("  No null explanations found, trying empty string filter...");
    params[1] = `${expColumn}=eq.`;
    const emptyResults = await supabaseQuery("question_bank", params.join("&"));
    return emptyResults;
  }
  
  return results;
}

// ── Generate explanations via OpenRouter ─────────────────────────────────────
async function generateExplanations(questions) {
  const questionsBlock = questions.map((q, i) => {
    const opts = typeof q.options === "string" ? JSON.parse(q.options) : q.options;
    const optsStr = (opts || []).map((o, j) => `${String.fromCharCode(65 + j)}) ${o}`).join(" | ");
    const correctAns = opts && q.correct_index != null ? opts[q.correct_index] : "unknown";
    return `[Q${i + 1}] ${q.question_text}\nOptions: ${optsStr}\nCorrect: ${correctAns}\nSubject: ${q.subject} | Topic: ${q.topic} | Year: ${q.year_level}`;
  }).join("\n\n");

  const systemPrompt = `You are an expert educational content writer for a K-12 learning platform. 
Generate clear, concise explanations for each question below. Each explanation should:
- Be 1-2 sentences (max 50 words)
- Explain WHY the correct answer is right (not just restate it)
- Use age-appropriate language matching the year level
- For maths: show the key step or formula used
- For science: reference the relevant concept
- For English: explain the grammar rule or comprehension skill
- Never start with "The correct answer is..." — the scholar already knows that

Respond ONLY as a JSON array of strings, one explanation per question, in order.
Example: ["Because 3 × 4 = 12, there are 12 apples in total.", "Photosynthesis uses sunlight to convert CO2 and water into glucose and oxygen."]

No markdown, no backticks, just the JSON array.`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": "https://launchpard.com",
      "X-Title": "LaunchPard Explanation Backfill",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1000,
      temperature: 0.3,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: questionsBlock },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter API failed: ${response.status} — ${err}`);
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content || "[]";

  // Parse JSON — handle common formatting issues
  let explanations;
  try {
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    explanations = JSON.parse(cleaned);
  } catch (e) {
    console.warn("  ⚠ Failed to parse JSON response, attempting line-by-line extraction");
    // Fallback: try to extract individual strings from the response
    const matches = raw.match(/"([^"]{10,200})"/g);
    explanations = matches ? matches.map(m => m.slice(1, -1)) : [];
  }

  return explanations;
}

// ── Main loop ────────────────────────────────────────────────────────────────
// Global column name — set during fetchMissingExplanations
let EXP_COLUMN = "explanation";

async function main() {
  console.log("Fetching questions missing explanations...");
  const questions = await fetchMissingExplanations();
  console.log(`Found ${questions.length} questions to process.\n`);

  if (questions.length === 0) {
    console.log("✅ No questions need explanations. Done!");
    return;
  }

  let updated = 0;
  let failed = 0;
  let skipped = 0;
  const startTime = Date.now();

  // Process in batches
  for (let i = 0; i < questions.length; i += BATCH_SIZE) {
    const batch = questions.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(questions.length / BATCH_SIZE);

    process.stdout.write(`  Batch ${batchNum}/${totalBatches} (${batch.length} questions)... `);

    try {
      const explanations = await generateExplanations(batch);

      if (DRY_RUN) {
        console.log("DRY RUN — would update:");
        batch.forEach((q, j) => {
          console.log(`    ${q.id} → "${(explanations[j] || "NO EXPLANATION").slice(0, 60)}..."`);
        });
        skipped += batch.length;
      } else {
        // Update each question
        for (let j = 0; j < batch.length; j++) {
          const exp = explanations[j];
          if (exp && exp.length > 5) {
            await supabaseUpdate("question_bank", batch[j].id, { [EXP_COLUMN]: exp });
            updated++;
          } else {
            skipped++;
          }
        }
      }

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const rate = (updated / (elapsed / 60)).toFixed(0);
      console.log(`✓ ${updated} updated, ${failed} failed, ${skipped} skipped (${elapsed}s, ~${rate}/min)`);

    } catch (err) {
      console.log(`✗ ERROR: ${err.message}`);
      failed += batch.length;

      // If rate limited, wait longer
      if (err.message.includes("429")) {
        console.log("  Rate limited — waiting 10 seconds...");
        await sleep(10000);
      }
    }

    // Delay between batches to avoid rate limits
    if (i + BATCH_SIZE < questions.length) {
      await sleep(DELAY_MS);
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`
═══════════════════════════════════════════════════════════
  COMPLETE
  Updated:  ${updated}
  Failed:   ${failed}
  Skipped:  ${skipped}
  Time:     ${totalTime}s
  Rate:     ${(updated / (totalTime / 60)).toFixed(0)} questions/min
═══════════════════════════════════════════════════════════
`);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});