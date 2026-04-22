/**
 * src/lib/security/idempotency.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Webhook event deduplication using per-provider Postgres tables:
 *   - paystack_events (event_id PRIMARY KEY)
 *   - stripe_events   (event_id PRIMARY KEY)
 *
 * Scoped tables (vs one generic `webhook_events`) so provider-specific
 * retention policies, GDPR/NDPR purges and per-provider schema evolution
 * can proceed independently.
 *
 * The insert uses `ON CONFLICT (event_id) DO NOTHING RETURNING event_id`.
 * If a row comes back we were the first to see this event; if not, it's a
 * replay and the caller should short-circuit with a 200 (to stop Paystack
 * retrying) but skip the side effects.
 *
 * Usage:
 *   import { claimWebhookEvent } from '@/lib/security/idempotency';
 *   const claimed = await claimWebhookEvent(supabase, 'paystack_events', {
 *     event_id: data.id,
 *     event_type: eventType,
 *     reference: data.reference,
 *     payload: data,
 *   });
 *   if (!claimed) return NextResponse.json({ received: true, replay: true });
 * ─────────────────────────────────────────────────────────────────────────────
 */

import logger from '@/lib/logger';

const ALLOWED_TABLES = new Set(['paystack_events', 'stripe_events']);

/**
 * claimWebhookEvent(supabase, table, row)
 * Inserts `row` into `table`; returns true if inserted (first-seen),
 * false on conflict (replay).
 *
 * @param {SupabaseClient} supabase - service-role client
 * @param {string} table - 'paystack_events' | 'stripe_events'
 * @param {object} row - must include event_id (string)
 * @returns {Promise<boolean>} true = claimed, false = replay
 */
export async function claimWebhookEvent(supabase, table, row) {
  if (!ALLOWED_TABLES.has(table)) {
    logger.error('idempotency_bad_table', { table });
    return false;
  }
  if (!row || !row.event_id) {
    logger.error('idempotency_missing_event_id', { table });
    return false;
  }

  const { data, error } = await supabase
    .from(table)
    .insert(row)
    .select('event_id')
    .maybeSingle();

  if (error) {
    // 23505 is unique_violation (replay). Anything else is a real error.
    const code = error.code || error?.details || '';
    if (code === '23505' || /duplicate key/i.test(error.message || '')) {
      logger.info('webhook_replay_skipped', {
        table,
        event_id: row.event_id,
      });
      return false;
    }
    logger.error('idempotency_insert_failed', {
      table,
      event_id: row.event_id,
      error,
    });
    return false; // fail-closed: don't double-apply if we can't persist
  }

  return !!data;
}
