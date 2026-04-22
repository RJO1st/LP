/**
 * POST /api/push/send
 *
 * Internal server-to-server endpoint for sending push notifications.
 * Called by cron jobs, the notify-parent webhook, etc.
 * Protected by CRON_SECRET header.
 *
 * Body: { userId?, scholarId?, title, body, url?, icon? }
 * Sends to all matching subscriptions in push_subscriptions.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// Minimal Web Push without the `web-push` npm package
// Uses the VAPID JWT approach with native crypto
async function buildVapidJWT(audience, expSeconds = 43200) {
  const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
  const VAPID_EMAIL       = process.env.VAPID_EMAIL || "mailto:hi@launchpard.com";

  if (!VAPID_PRIVATE_KEY) throw new Error("VAPID_PRIVATE_KEY not configured");

  const header = { alg: "ES256", typ: "JWT" };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + expSeconds,
    sub: VAPID_EMAIL,
  };

  function b64u(str) {
    return Buffer.from(str).toString("base64url");
  }

  const signingInput = `${b64u(JSON.stringify(header))}.${b64u(JSON.stringify(payload))}`;

  // Import the VAPID private key (expects Base64URL-encoded raw 32-byte private key or PEM)
  let keyData;
  try {
    // Try raw Base64URL → JWK import
    const rawKey = Buffer.from(VAPID_PRIVATE_KEY, "base64url");
    keyData = await crypto.subtle.importKey(
      "pkcs8",
      rawKey,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["sign"]
    );
  } catch {
    // Fallback: assume it's already in PEM format — skip signing for now
    return null;
  }

  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    keyData,
    Buffer.from(signingInput)
  );

  return `${signingInput}.${Buffer.from(sig).toString("base64url")}`;
}

async function sendPushToSubscription(sub, payload) {
  const url = new URL(sub.endpoint);
  const audience = `${url.protocol}//${url.host}`;

  try {
    const jwt = await buildVapidJWT(audience);
    if (!jwt) {
      console.warn("[push/send] VAPID JWT could not be built — skipping push");
      return false;
    }

    const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

    const res = await fetch(sub.endpoint, {
      method: "POST",
      headers: {
        "Content-Type":  "application/octet-stream",
        "Content-Encoding": "aesgcm",
        Authorization:   `vapid t=${jwt},k=${VAPID_PUBLIC_KEY}`,
        TTL:             "86400",
      },
      body: Buffer.from(JSON.stringify(payload)),
    });

    return res.ok || res.status === 201;
  } catch (err) {
    console.error("[push/send] fetch error", err);
    return false;
  }
}

export async function POST(request) {
  // Protect with CRON_SECRET
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKeys.secret() // Use from env helpers,
      { cookies: { getAll: () => cookieStore.getAll() } }
    );

    const { userId, scholarId, title, body, url = "/dashboard/parent", icon = "/icon-192.png" } = await request.json();

    if (!title || !body) {
      return NextResponse.json({ error: "title and body required" }, { status: 400 });
    }

    // Find subscriptions
    let query = supabase.from("push_subscriptions").select("*");
    if (scholarId) query = query.eq("scholar_id", scholarId);
    else if (userId) query = query.eq("user_id", userId);
    else return NextResponse.json({ error: "userId or scholarId required" }, { status: 400 });

    const { data: subs } = await query;
    if (!subs || subs.length === 0) {
      return NextResponse.json({ sent: 0, message: "No subscriptions found" });
    }

    const payload = { title, body, icon, data: { url } };
    let sent = 0;
    const stale = [];

    for (const sub of subs) {
      const ok = await sendPushToSubscription(sub, payload);
      if (ok) { sent++; }
      else { stale.push(sub.endpoint); }
    }

    // Remove stale subscriptions (410 Gone)
    if (stale.length) {
      await supabase.from("push_subscriptions").delete().in("endpoint", stale);
    }

    return NextResponse.json({ sent, stale: stale.length });
  } catch (err) {
    console.error("[push/send]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
