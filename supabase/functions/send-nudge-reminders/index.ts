import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE_URL = Deno.env.get("SITE_URL") || "https://launchpard.com";

// ── Inactivity tiers ──────────────────────────────────────────────
const TIERS = [
  { key: "3_day", days: 3 },
  { key: "7_day", days: 7 },
  { key: "14_day", days: 14 },
  { key: "30_day", days: 30 },
] as const;

type TierKey = (typeof TIERS)[number]["key"];

// ── Email templates ───────────────────────────────────────────────
function getEmailContent(
  tier: TierKey,
  scholarName: string,
  parentName: string,
  daysInactive: number
) {
  const firstName = parentName?.split(" ")[0] || "there";
  const scholarFirst = scholarName?.split(" ")[0] || "your child";
  const dashboardUrl = `${SITE_URL}/dashboard/parent`;

  const wrapper = (inner: string) => `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
  <div style="text-align:center;margin-bottom:24px">
    <span style="font-size:24px;font-weight:700;color:#6366f1">LaunchPard</span>
    <span style="font-size:24px"> 🚀</span>
  </div>
  <div style="background:white;border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
    ${inner}
  </div>
  <p style="text-align:center;font-size:12px;color:#94a3b8;margin-top:24px">
    You're receiving this because ${scholarFirst} is registered on LaunchPard.<br/>
    <a href="${SITE_URL}/dashboard/parent/account" style="color:#94a3b8">Manage email preferences</a>
  </p>
</div>
</body></html>`;

  const cta = (label: string) =>
    `<div style="text-align:center;margin:24px 0"><a href="${dashboardUrl}" style="display:inline-block;background:#6366f1;color:white;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:600;font-size:15px">${label}</a></div>`;

  const templates: Record<TierKey, { subject: string; body: string }> = {
    // ── 3-day gentle nudge ──────────────────────────────────────
    "3_day": {
      subject: `${scholarFirst} hasn't practised in 3 days — a quick nudge could help`,
      body: wrapper(`
    <p style="font-size:16px;color:#1e293b;margin:0 0 16px">Hi ${firstName},</p>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px">
      It's been <strong>3 days</strong> since ${scholarFirst} last used LaunchPard. Research shows that short, regular practice beats long cramming sessions every time.
    </p>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px">
      Even 10 minutes today can keep the momentum going. Here's a conversation starter:
    </p>
    <div style="background:#f0f0ff;border-left:4px solid #6366f1;border-radius:0 8px 8px 0;padding:16px;margin:0 0 24px">
      <p style="font-size:14px;color:#4338ca;margin:0;font-style:italic">"Hey ${scholarFirst}, want to do a quick quest on LaunchPard before dinner? Let's see if you can beat your last score!"</p>
    </div>
    ${cta(`View ${scholarFirst}'s Progress`)}
    <p style="font-size:13px;color:#94a3b8;margin:16px 0 0;text-align:center">Small steps, big leaps.</p>`),
    },

    // ── 7-day warning ───────────────────────────────────────────
    "7_day": {
      subject: `It's been a week — ${scholarFirst} might be losing ground`,
      body: wrapper(`
    <p style="font-size:16px;color:#1e293b;margin:0 0 16px">Hi ${firstName},</p>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px">
      ${scholarFirst} hasn't logged into LaunchPard for <strong>a full week</strong> now. That's long enough for skills to start getting rusty — especially in maths and English.
    </p>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px">
      The good news? LaunchPard remembers exactly where ${scholarFirst} left off and adapts to fill any gaps.
    </p>
    <div style="background:#fef3c7;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;padding:16px;margin:0 0 24px">
      <p style="font-size:14px;color:#92400e;margin:0"><strong>Try this:</strong> Sit with ${scholarFirst} for the first quest. Ask them to explain what they're learning — teaching you is one of the best ways to lock knowledge in.</p>
    </div>
    ${cta(`Check ${scholarFirst}'s Dashboard`)}`),
    },

    // ── 14-day streak reset ─────────────────────────────────────
    "14_day": {
      subject: `2 weeks without practice — ${scholarFirst}'s streak is gone`,
      body: wrapper(`
    <p style="font-size:16px;color:#1e293b;margin:0 0 16px">Hi ${firstName},</p>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px">
      It's been <strong>two weeks</strong> since ${scholarFirst} last practised on LaunchPard. At this point, topics they were making progress on will need revisiting.
    </p>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px">
      We get it — life gets busy, routines slip. But here's what we've seen: scholars who come back after a break and do just <strong>3 quests in their first week back</strong> regain their confidence within days.
    </p>
    <div style="background:#fce4ec;border-left:4px solid #e91e63;border-radius:0 8px 8px 0;padding:16px;margin:0 0 16px">
      <p style="font-size:14px;color:#880e4f;margin:0"><strong>${scholarFirst}'s streak has reset to zero.</strong> But a new streak starts with one quest. Today could be day one.</p>
    </div>
    <div style="background:#e8f5e9;border-left:4px solid #4caf50;border-radius:0 8px 8px 0;padding:16px;margin:0 0 24px">
      <p style="font-size:14px;color:#1b5e20;margin:0"><strong>Conversation starter:</strong> "${scholarFirst}, your LaunchPard streak reset — fancy starting a new one together? I'll time you!"</p>
    </div>
    ${cta(`Restart ${scholarFirst}'s Journey`)}`),
    },

    // ── 30-day we miss you ──────────────────────────────────────
    "30_day": {
      subject: `We miss ${scholarFirst} on LaunchPard — is everything okay?`,
      body: wrapper(`
    <p style="font-size:16px;color:#1e293b;margin:0 0 16px">Hi ${firstName},</p>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px">
      It's been <strong>a month</strong> since ${scholarFirst} last used LaunchPard. We wanted to check in — is there anything we can do to help?
    </p>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px">
      If something about the platform isn't working for ${scholarFirst}, we'd love to hear about it. If life just got in the way, that's completely normal — and the door is always open.
    </p>
    <div style="background:#ede9fe;border-left:4px solid #8b5cf6;border-radius:0 8px 8px 0;padding:16px;margin:0 0 24px">
      <p style="font-size:14px;color:#5b21b6;margin:0"><strong>Fresh start:</strong> We've kept all of ${scholarFirst}'s progress safe. When they log back in, Tara (our AI tutor) will create a personalised catch-up plan based on what they need most right now.</p>
    </div>
    ${cta(`Welcome ${scholarFirst} Back`)}
    <p style="font-size:13px;color:#94a3b8;margin:16px 0 0;text-align:center">Have feedback? Just reply to this email — a real human reads every one.</p>`),
    },
  };

  return templates[tier];
}

// ── Send email via Resend ─────────────────────────────────────────
async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<string | null> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "LaunchPard <hello@launchpard.com>",
        to: [to],
        subject,
        html,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("Resend error:", data);
      return null;
    }
    return data.id || null;
  } catch (err) {
    console.error("Failed to send email:", err);
    return null;
  }
}

// ── Main handler ──────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  // Optional: verify a shared secret for cron auth
  const authHeader = req.headers.get("Authorization");
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const now = new Date();
  const results: {
    tier: string;
    sent: number;
    skipped: number;
    errors: number;
  }[] = [];

  for (const tier of TIERS) {
    const cutoffDate = new Date(now);
    cutoffDate.setDate(cutoffDate.getDate() - tier.days);
    const cutoffStr = cutoffDate.toISOString().split("T")[0];

    const tierResult = { tier: tier.key, sent: 0, skipped: 0, errors: 0 };

    // Find scholars inactive for at least this tier's duration
    const { data: inactiveList, error } = await supabase
      .from("scholars")
      .select("id, name, last_activity_date, parent_id")
      .is("archived_at", null)
      .not("last_activity_date", "is", null)
      .lte("last_activity_date", cutoffStr);

    if (error) {
      console.error(`Error querying scholars for ${tier.key}:`, error);
      tierResult.errors++;
      results.push(tierResult);
      continue;
    }

    if (!inactiveList || inactiveList.length === 0) {
      results.push(tierResult);
      continue;
    }

    for (const scholar of inactiveList) {
      const anchor = scholar.last_activity_date;

      // Check if we already sent this tier for this inactivity anchor
      const { data: existing } = await supabase
        .from("nudge_emails_log")
        .select("id")
        .eq("scholar_id", scholar.id)
        .eq("tier", tier.key)
        .eq("inactivity_anchor", anchor)
        .maybeSingle();

      if (existing) {
        tierResult.skipped++;
        continue;
      }

      // Fetch parent info
      const { data: parent } = await supabase
        .from("parents")
        .select("id, email, full_name, nudge_emails_enabled")
        .eq("id", scholar.parent_id)
        .single();

      if (!parent || !parent.email || parent.nudge_emails_enabled === false) {
        tierResult.skipped++;
        continue;
      }

      // Calculate actual days inactive
      const lastActive = new Date(anchor);
      const daysInactive = Math.floor(
        (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Generate + send email
      const { subject, body } = getEmailContent(
        tier.key,
        scholar.name,
        parent.full_name,
        daysInactive
      );
      const messageId = await sendEmail(parent.email, subject, body);

      if (messageId) {
        await supabase.from("nudge_emails_log").insert({
          scholar_id: scholar.id,
          parent_id: parent.id,
          tier: tier.key,
          inactivity_anchor: anchor,
          resend_message_id: messageId,
        });
        tierResult.sent++;
      } else {
        tierResult.errors++;
      }
    }

    results.push(tierResult);
  }

  const summary = {
    timestamp: now.toISOString(),
    tiers: results,
    total_sent: results.reduce((a, r) => a + r.sent, 0),
    total_skipped: results.reduce((a, r) => a + r.skipped, 0),
    total_errors: results.reduce((a, r) => a + r.errors, 0),
  };

  console.log("Nudge reminder run complete:", JSON.stringify(summary));

  return new Response(JSON.stringify(summary), {
    headers: { "Content-Type": "application/json" },
  });
});
