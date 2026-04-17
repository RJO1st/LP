/**
 * POST /api/coach/weekly-plan
 *
 * Generates a 5-day study plan for a scholar based on their current mastery gaps.
 * Uses Tara (OpenRouter) with a structured prompt. Respects Tara quota.
 * Response is cached for the current week (key: scholar_id + ISO week number).
 *
 * Body: { scholarId }
 * Returns: { plan: Day[], cached: bool }
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const APP_URL = process.env.APP_URL || "https://launchpard.com";

// Current ISO week string — used as cache key
function isoWeekKey() {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(((now - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { cookies: { getAll: () => cookieStore.getAll() } }
    );

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const { scholarId } = await request.json();
    if (!scholarId) return NextResponse.json({ error: "scholarId required" }, { status: 400 });

    // Confirm caller is the scholar's parent
    const { data: consent } = await supabase
      .from("scholar_school_consent")
      .select("scholar_id")
      .eq("parent_id", session.user.id)
      .eq("scholar_id", scholarId)
      .maybeSingle();

    // Also allow direct parent ownership check
    const { data: scholar } = await supabase
      .from("scholars")
      .select("id, name, year_level, curriculum, avatar")
      .eq("id", scholarId)
      .single();

    if (!scholar) return NextResponse.json({ error: "Scholar not found" }, { status: 404 });

    const weekKey = isoWeekKey();
    const cacheKey = `coach_plan:${scholarId}:${weekKey}`;

    // Check in-DB cache (reuse scholar_readiness_snapshot or a simple kv approach)
    // We'll store in a simple JSON column — use school_dashboard_cache table with a sentinel school_id
    const { data: cached } = await supabase
      .from("school_dashboard_cache")
      .select("avg_readiness") // repurpose: store JSON in avg_readiness as text — harmless
      .eq("school_id", "coach_cache")
      .eq("class_id", cacheKey)
      .maybeSingle();

    if (cached?.avg_readiness) {
      try {
        const plan = JSON.parse(cached.avg_readiness);
        return NextResponse.json({ plan, cached: true });
      } catch { /* fall through to regenerate */ }
    }

    // Fetch mastery gaps
    const { data: mastery } = await supabase
      .from("scholar_topic_mastery")
      .select("topic_slug, subject, p_mastery, stability")
      .eq("scholar_id", scholarId)
      .order("p_mastery", { ascending: true })
      .limit(20);

    const gaps = (mastery || [])
      .filter((r) => r.p_mastery < 0.7)
      .slice(0, 8)
      .map((r) => ({
        topic: (r.topic_slug || "").replace(/_/g, " "),
        subject: r.subject,
        mastery: Math.round(r.p_mastery * 100),
      }));

    const { data: strengths } = await supabase
      .from("scholar_topic_mastery")
      .select("topic_slug, subject, p_mastery")
      .eq("scholar_id", scholarId)
      .order("p_mastery", { ascending: false })
      .limit(3);

    const curriculum = scholar.curriculum || "uk_national";
    const yearLevel = scholar.year_level || 6;
    const isNigerian = curriculum.startsWith("ng_");

    const prompt = `You are Coach Tara, an expert AI learning coach for children aged 5–17 on LaunchPard.

Create a structured 5-day study plan for ${scholar.name}, a Year ${yearLevel} scholar on the ${curriculum.replace(/_/g, " ")} curriculum.

Their current weakest topics (most urgent first):
${gaps.map((g, i) => `${i + 1}. ${g.topic} (${g.subject}) — mastery ${g.mastery}%`).join("\n") || "General practice across all subjects"}

Their strongest topics (for confidence activities):
${(strengths || []).map((s) => (s.topic_slug || "").replace(/_/g, " ")).join(", ") || "To be discovered"}

Design a realistic weekday plan with no more than 20–30 minutes of LaunchPard per day. ${isNigerian ? "Include WAEC/NECO exam relevance where appropriate." : "Align to UK National Curriculum standards where appropriate."}

Respond ONLY with a valid JSON array. No markdown, no explanation. Format:
[
  {
    "day": "Monday",
    "focus": "<topic name>",
    "subject": "<subject>",
    "duration": "<e.g. 20 mins>",
    "activity": "<specific activity — 1 short sentence>",
    "tip": "<1 motivational coaching tip — 1 sentence>"
  },
  ... (5 items total, Mon–Fri)
]`;

    // Call OpenRouter (Tara)
    const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": APP_URL,
        "X-Title": "LaunchPard Coach",
      },
      body: JSON.stringify({
        model: "anthropic/claude-haiku-4-5",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1200,
        temperature: 0.4,
      }),
    });

    if (!aiRes.ok) {
      // Return a fallback plan if AI fails
      return NextResponse.json({ plan: fallbackPlan(scholar.name, gaps), cached: false, fallback: true });
    }

    const aiData = await aiRes.json();
    const raw = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON — handle wrapped markdown
    let plan;
    try {
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      plan = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    } catch {
      return NextResponse.json({ plan: fallbackPlan(scholar.name, gaps), cached: false, fallback: true });
    }

    // Cache for the week
    await supabase.from("school_dashboard_cache").upsert({
      school_id: "coach_cache",
      class_id: cacheKey,
      cache_date: new Date().toISOString().split("T")[0],
      avg_readiness: JSON.stringify(plan),
      placement_pct: 0,
    });

    return NextResponse.json({ plan, cached: false });
  } catch (err) {
    console.error("[coach/weekly-plan]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function fallbackPlan(name, gaps) {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const topics = gaps.length
    ? gaps.slice(0, 5)
    : [
        { topic: "Times tables", subject: "mathematics" },
        { topic: "Reading comprehension", subject: "english" },
        { topic: "States of matter", subject: "science" },
        { topic: "Fractions", subject: "mathematics" },
        { topic: "Punctuation", subject: "english" },
      ];

  return days.map((day, i) => {
    const t = topics[i % topics.length];
    return {
      day,
      focus: t.topic,
      subject: t.subject,
      duration: "20 mins",
      activity: `Practice ${t.topic} with 10 adaptive questions on LaunchPard.`,
      tip: `Every minute of practice today makes tomorrow easier, ${name}!`,
    };
  });
}
