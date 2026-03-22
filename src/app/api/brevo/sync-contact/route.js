/**
 * src/app/api/brevo/sync-contact/route.js
 *
 * Syncs a new parent signup to Brevo contact list.
 * Called from signup page after successful account creation.
 *
 * POST body: { email, firstName, lastName, curriculum, country, source }
 *
 * Creates/updates contact in Brevo with:
 *   - List membership (BETA_TESTERS list)
 *   - Custom attributes: FIRSTNAME, LASTNAME, CURRICULUM, COUNTRY, SIGNUP_SOURCE, SIGNUP_DATE
 */

import { NextResponse } from "next/server";

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_API_URL = "https://api.brevo.com/v3";

// Set this to your Brevo list ID for beta testers
// Find it in Brevo → Contacts → Lists → click your list → ID is in the URL
const BETA_LIST_ID = parseInt(process.env.BREVO_BETA_LIST_ID || "2", 10);

export async function POST(request) {
  try {
    if (!BREVO_API_KEY) {
      console.error("[brevo-sync] BREVO_API_KEY not set");
      return NextResponse.json({ error: "Brevo not configured" }, { status: 500 });
    }

    const body = await request.json();
    const { email, firstName, lastName, curriculum, country, source } = body;

    if (!email) {
      return NextResponse.json({ error: "email required" }, { status: 400 });
    }

    // Create or update contact in Brevo
    const contactPayload = {
      email,
      attributes: {
        FIRSTNAME: firstName || "",
        LASTNAME: lastName || "",
        CURRICULUM: curriculum || "",
        COUNTRY: country || "",
        SIGNUP_SOURCE: source || "website",
        SIGNUP_DATE: new Date().toISOString().split("T")[0],
      },
      listIds: [BETA_LIST_ID],
      updateEnabled: true, // Update if contact already exists
    };

    const res = await fetch(`${BREVO_API_URL}/contacts`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "api-key": BREVO_API_KEY,
      },
      body: JSON.stringify(contactPayload),
    });

    if (res.ok || res.status === 201 || res.status === 204) {
      return NextResponse.json({ synced: true });
    }

    // Handle "contact already exists" (not an error)
    if (res.status === 400) {
      const errData = await res.json().catch(() => ({}));
      if (errData.code === "duplicate_parameter") {
        // Contact exists — update their list membership
        const updateRes = await fetch(`${BREVO_API_URL}/contacts/${encodeURIComponent(email)}`, {
          method: "PUT",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "api-key": BREVO_API_KEY,
          },
          body: JSON.stringify({
            attributes: contactPayload.attributes,
            listIds: [BETA_LIST_ID],
          }),
        });
        if (updateRes.ok || updateRes.status === 204) {
          return NextResponse.json({ synced: true, updated: true });
        }
      }
      console.error("[brevo-sync] Create failed:", errData);
      return NextResponse.json({ error: "sync failed", details: errData }, { status: 400 });
    }

    const errText = await res.text().catch(() => "");
    console.error("[brevo-sync] Unexpected response:", res.status, errText);
    return NextResponse.json({ error: "sync failed" }, { status: res.status });

  } catch (err) {
    console.error("[brevo-sync] Error:", err?.message);
    // Non-fatal — don't block signup if Brevo fails
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}