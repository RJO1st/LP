/**
 * POST /api/push/subscribe   — store a push subscription
 * DELETE /api/push/subscribe — remove a push subscription
 *
 * Uses the Web Push Protocol (RFC 8030). Subscriptions are stored in
 * the `push_subscriptions` table. VAPID keys must be set as env vars.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { supabaseKeys } from "@/lib/env";
import {
  pushSubscribeSchema,
  pushUnsubscribeSchema,
  parseBody,
} from "@/lib/validation";

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      supabaseKeys.url(),
      supabaseKeys.publishable(),
      { cookies: { getAll: () => cookieStore.getAll() } }
    );

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const body = await request.json().catch(() => null);
    const parsed = parseBody(pushSubscribeSchema, body);
    if (!parsed.success) return parsed.error;
    const { subscription, scholarId } = parsed.data;

    // Upsert by endpoint (unique per browser/device)
    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id:    session.user.id,
        scholar_id: scholarId || null,
        endpoint:   subscription.endpoint,
        p256dh:     subscription.keys?.p256dh,
        auth:       subscription.keys?.auth,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" }
    );

    if (error) {
      console.error("[push/subscribe]", error);
      return NextResponse.json({ error: "Failed to store subscription" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[push/subscribe POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      supabaseKeys.url(),
      supabaseKeys.publishable(),
      { cookies: { getAll: () => cookieStore.getAll() } }
    );

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const body = await request.json().catch(() => null);
    const parsed = parseBody(pushUnsubscribeSchema, body);
    if (!parsed.success) return parsed.error;
    const { endpoint } = parsed.data;

    await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", session.user.id)
      .eq("endpoint", endpoint);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[push/subscribe DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
