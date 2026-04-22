/**
 * src/lib/security/admin.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for admin identity checks.
 *
 * BEFORE this helper, three separate routes carried their own hard-coded
 * admin email arrays, one of which contained a personal gmail address. This
 * helper replaces all of them with an env-driven list and a `requireAdmin`
 * guard that returns a 401/403 NextResponse directly.
 *
 * Env:
 *   ADMIN_EMAILS="rotimi@launchpard.com,admin@launchpard.com"
 *
 * Usage (App Router route handler):
 *   import { requireAdmin } from '@/lib/security/admin';
 *
 *   export async function POST(request) {
 *     const { user, error } = await requireAdmin(request);
 *     if (error) return error;
 *     // ...use `user`
 *   }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import logger from '@/lib/logger';
import { supabaseKeys } from '@/lib/env';

/**
 * Parse ADMIN_EMAILS env into a Set of lowercased, trimmed addresses.
 * Falls back to the canonical admin email if env is missing so the platform
 * always has exactly one known-good admin identity.
 */
function parseAdminEmails() {
  const raw = process.env.ADMIN_EMAILS || 'rotimi@launchpard.com';
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

let _adminEmailsCache = null;

export function getAdminEmails() {
  if (!_adminEmailsCache) _adminEmailsCache = parseAdminEmails();
  return _adminEmailsCache;
}

export function isAdminEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return getAdminEmails().has(email.trim().toLowerCase());
}

/**
 * requireAdmin(request)
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates that the caller is a signed-in Supabase user whose email is on the
 * ADMIN_EMAILS allow-list. Returns { user } on success OR { error: NextResponse }
 * that the route handler should return directly.
 *
 * We use the SSR-aware Supabase client (cookie-based session), never the
 * service role, so this function is safe for any route.
 */
export async function requireAdmin(_request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      supabaseKeys.url(),
      supabaseKeys.publishable(),
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {
            // No-op: route handlers never set auth cookies here.
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        error: NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        ),
      };
    }

    if (!isAdminEmail(user.email)) {
      logger.warn('admin_access_denied', {
        user_id: user.id,
        email: user.email,
      });
      return {
        error: NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        ),
      };
    }

    return { user };
  } catch (err) {
    logger.error('admin_check_failed', { error: err });
    return {
      error: NextResponse.json(
        { error: 'Server error' },
        { status: 500 }
      ),
    };
  }
}
