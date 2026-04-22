/**
 * src/lib/security/serviceRole.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Guarded factory for the Supabase service-role client.
 *
 * Why a factory, not a module singleton?
 *   - Some ESM bundlers are too eager to include modules in client bundles.
 *     A module-level `createClient(url, SERVICE_ROLE_KEY)` that lives in a
 *     shared file risks leaking the key if a client component ever imports
 *     anything from that file transitively. The factory throws loudly if
 *     called in a browser context (`typeof window !== 'undefined'`).
 *   - Lazy instantiation gives us a single place to log every construction,
 *     so if a new code path starts using the service role we see it in logs.
 *
 * Never import this from a React component file.
 *
 * Usage (server-only, route handler or lib/*):
 *   import { getServiceRoleClient } from '@/lib/security/serviceRole';
 *   const supabase = getServiceRoleClient();
 * ─────────────────────────────────────────────────────────────────────────────
 */

// NOTE: We rely on the runtime `typeof window` guard rather than the
// `server-only` package to avoid adding a dep for a check we can enforce
// in one line. If we ever want a hard import-time failure, install
// `server-only` and add `import 'server-only';` at the top.
import { createClient } from '@supabase/supabase-js';
import { supabaseKeys } from '@/lib/env';
import logger from '@/lib/logger';

let _client = null;

export function getServiceRoleClient() {
  if (typeof window !== 'undefined') {
    // Defence-in-depth; `server-only` should already have refused the import.
    throw new Error('getServiceRoleClient must not be called in the browser');
  }

  // Resolution rule (see src/lib/env.ts): prefer new `sb_secret_*` key,
  // fall back to legacy `service_role` JWT. `supabaseKeys.secret()` throws
  // loudly if neither is set.
  let url;
  let key;
  try {
    url = supabaseKeys.url();
    key = supabaseKeys.secret();
  } catch (err) {
    logger.error('service_role_env_missing', { error: err?.message });
    throw err;
  }

  if (_client) return _client;

  _client = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  logger.info('service_role_client_created');
  return _client;
}

/**
 * Reset for tests; never call in production code paths.
 */
export function __resetServiceRoleClientForTests() {
  _client = null;
}
