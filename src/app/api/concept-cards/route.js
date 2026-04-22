import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { supabaseKeys } from '@/lib/env'

/**
 * GET /api/concept-cards
 *
 * Returns a concept card for a given topic before the quiz begins.
 * Used by QuestOrchestrator to show a teaching card once per topic per session.
 *
 * Query params:
 *   topic_slug  — e.g. "addition", "fractions" (required)
 *   curriculum  — e.g. "uk_national", "ng_jss" (optional, defaults to "universal")
 *   subject     — e.g. "mathematics", "english" (optional)
 *   year_band   — "ks1" | "ks2" | "ks3" | "ks4" | "jss" | "sss" (optional)
 *
 * Fallback chain:
 *   1. exact match: topic_slug + curriculum + year_band
 *   2. universal: topic_slug + 'universal' + year_band
 *   3. subject-wide: topic_slug + curriculum (any year_band)
 *   4. null (no card) — quiz proceeds normally, no card shown
 *
 * No auth required — teaching content is world-readable.
 */
export async function GET(req) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKeys.publishable(),
      {
        cookies: { getAll: () => cookieStore.getAll() }
      }
    )

    const url = new URL(req.url)
    const topicSlug = url.searchParams.get('topic_slug')
    const curriculum = (url.searchParams.get('curriculum') || 'universal').toLowerCase()
    const subject    = (url.searchParams.get('subject') || 'mathematics').toLowerCase()
    const yearBand   = (url.searchParams.get('year_band') || '').toLowerCase()

    if (!topicSlug) {
      return NextResponse.json({ error: 'topic_slug is required' }, { status: 400 })
    }

    // Normalise topic slug — replace spaces/dashes with underscores, lowercase
    const slug = topicSlug.toLowerCase().replace(/[\s-]+/g, '_')

    // ── Fallback chain: up to 3 queries ─────────────────────────────────────

    let card = null

    // 1. Exact match: curriculum + year_band
    if (curriculum !== 'universal' && yearBand) {
      const { data } = await supabase
        .from('concept_cards')
        .select('*')
        .eq('topic_slug', slug)
        .eq('curriculum', curriculum)
        .eq('year_band', yearBand)
        .limit(1)
        .maybeSingle()
      card = data
    }

    // 2. Universal + year_band
    if (!card && yearBand) {
      const { data } = await supabase
        .from('concept_cards')
        .select('*')
        .eq('topic_slug', slug)
        .eq('curriculum', 'universal')
        .eq('year_band', yearBand)
        .limit(1)
        .maybeSingle()
      card = data
    }

    // 3. Curriculum match, any year_band (most general)
    if (!card && curriculum !== 'universal') {
      const { data } = await supabase
        .from('concept_cards')
        .select('*')
        .eq('topic_slug', slug)
        .eq('curriculum', curriculum)
        .limit(1)
        .maybeSingle()
      card = data
    }

    // 4. Universal, any year_band
    if (!card) {
      const { data } = await supabase
        .from('concept_cards')
        .select('*')
        .eq('topic_slug', slug)
        .eq('curriculum', 'universal')
        .limit(1)
        .maybeSingle()
      card = data
    }

    if (!card) {
      // No card found — return 204 so client skips gracefully
      return new NextResponse(null, { status: 204 })
    }

    // Filter worked_example to preferred context
    // Preference order: ng (if Nigerian curriculum) → uk → universal
    const isNigerian = ['ng_primary', 'ng_jss', 'ng_sss'].includes(curriculum)
    const preferredContext = isNigerian ? 'ng' : 'uk'

    let worked_example = card.worked_example || []
    // Attach a "best" field so client can pick the most relevant example
    const preferred = worked_example.find(e => e.context === preferredContext)
      || worked_example.find(e => e.context === 'universal')
      || worked_example[0]
      || null

    return NextResponse.json({
      card: {
        ...card,
        worked_example,    // full array — client can use all or pick one
        best_example: preferred,
      }
    }, {
      status: 200,
      headers: {
        // Short cache — content changes rarely, but we want near-instant updates
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
      }
    })

  } catch (err) {
    console.error('[concept-cards] GET error:', err)
    // Return 204 on error so quiz always proceeds — never block the scholar
    return new NextResponse(null, { status: 204 })
  }
}
