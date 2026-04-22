/**
 * src/lib/env.ts — centralised, validated environment config.
 *
 * Why this file exists:
 * 1. **Fail-fast boot**: missing or malformed env vars crash module load
 *    with a list of every problem, not the 100th request with a cryptic
 *    `undefined.match is not a function`.
 * 2. **Typed access**: `import { env } from '@/lib/env'` gives you IntelliSense
 *    + compile-time names; no more `process.env.BREVO_API_KY` typos.
 * 3. **Server / client firewall**: `env` is server-only. `publicEnv` is the
 *    subset safe to ship in the browser bundle. Touching `env` from a
 *    component (client) throws a clear "server-only" error.
 *
 * If you add a new env var, add it to ONE of the two schemas below
 * (`serverSchema` or `publicSchema`), update `.env.example`, and you're done.
 *
 * ---
 * Legacy aliases handled:
 *   - `SUPABASE_SERVICE_KEY`       → resolved as `SUPABASE_SERVICE_ROLE_KEY`
 *   - `SUPABASE_URL`               → resolved as `NEXT_PUBLIC_SUPABASE_URL`
 * Two cron routes (`/api/cron/daily-summary`, `/api/cron/inactivity-nudge`)
 * still read the legacy names. Migrate them in a follow-up PR, then delete
 * the aliases.
 *
 * ---
 * Supabase key migration (April 22 2026):
 *   Supabase has moved from legacy JWT-based `anon` / `service_role` keys to
 *   new publishable + secret API keys. The legacy keys can NOT be rotated on
 *   demand without standby+revoke flow, so we're migrating off them.
 *
 *   New canonical names:
 *     - `SUPABASE_SECRET_KEY`                (replaces SUPABASE_SERVICE_ROLE_KEY)
 *     - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (replaces NEXT_PUBLIC_SUPABASE_ANON_KEY)
 *
 *   Resolution rule: PREFER new, FALL BACK to legacy. At least one must be
 *   present in prod or boot fails. Exposed via `supabaseKeys.secret()` and
 *   `supabaseKeys.publishable()` — use these, not raw env reads, in new code.
 *
 *   Once all env is dual-keyed in prod and green for 24h, delete the legacy
 *   fields from the schemas and the resolution helpers.
 */

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const isProd = process.env.NODE_ENV === 'production';
const isBuild = process.env.NEXT_PHASE === 'phase-production-build';
const isServer = typeof window === 'undefined';

/** A secret: non-empty in prod, tolerant in dev/build so `next build` doesn't gate on dev-only machines. */
const prodRequired = (label: string, minLen = 16) =>
  isProd
    ? z.string().min(minLen, `${label} must be at least ${minLen} chars in production`)
    : z.string().min(0).optional().default('');

/** A URL: accept empty in non-prod. */
const prodRequiredUrl = (label: string) =>
  isProd
    ? z.string().url(`${label} must be a valid URL in production`)
    : z.string().url().or(z.literal('')).optional().default('');

/** Comma-separated list (emails, ids, etc). */
const csvList = (inner: z.ZodType<string>) =>
  z
    .string()
    .optional()
    .default('')
    .transform((s) =>
      s
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean),
    )
    .pipe(z.array(inner));

// ─────────────────────────────────────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────────────────────────────────────

/**
 * SERVER schema. Never bundled to the client. Accessing a key from this
 * schema in client code throws.
 */
const serverSchemaShape = z.object({
  // ── Runtime
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // ── Supabase (server) — dual-keyed during migration
  // New format starts with `sb_secret_…`; legacy is a ~200-char JWT starting `eyJ…`.
  // At least one must be present in prod; enforced at schema level below.
  SUPABASE_SECRET_KEY: z
    .string()
    .optional()
    .default('')
    .refine(
      (v) => v === '' || v.startsWith('sb_secret_') || v.length >= 40,
      {
        message:
          "SUPABASE_SECRET_KEY must start with 'sb_secret_' (new format) or be 40+ chars (legacy JWT)",
      },
    ),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .optional()
    .default('')
    .refine((v) => v === '' || v.length >= 40, {
      message: 'SUPABASE_SERVICE_ROLE_KEY looks too short — expected a JWT',
    }),

  // ── AI providers
  OPENROUTER_API_KEY: prodRequired('OPENROUTER_API_KEY', 20),
  OPENAI_API_KEY: z.string().optional().default(''), // secondary provider — optional

  // ── Email providers (transactional)
  BREVO_API_KEY: prodRequired('BREVO_API_KEY', 20),
  RESEND_API_KEY: prodRequired('RESEND_API_KEY', 20),
  BREVO_BETA_LIST_ID: z
    .string()
    .optional()
    .default('')
    .refine((v) => v === '' || /^\d+$/.test(v), {
      message: 'BREVO_BETA_LIST_ID must be numeric',
    }),

  // ── Cron + admin
  CRON_SECRET: prodRequired('CRON_SECRET', 32),
  ADMIN_EMAILS: csvList(z.string().email()),

  // ── Rate limiting
  UPSTASH_REDIS_REST_URL: prodRequiredUrl('UPSTASH_REDIS_REST_URL'),
  UPSTASH_REDIS_REST_TOKEN: prodRequired('UPSTASH_REDIS_REST_TOKEN', 20),

  // ── Payments (Nigeria)
  PAYSTACK_SECRET_KEY: z
    .string()
    .optional()
    .default('')
    .refine((v) => v === '' || v.startsWith('sk_'), {
      message: "PAYSTACK_SECRET_KEY must start with 'sk_'",
    }),
  PAYSTACK_PUBLIC_KEY: z
    .string()
    .optional()
    .default('')
    .refine((v) => v === '' || v.startsWith('pk_'), {
      message: "PAYSTACK_PUBLIC_KEY must start with 'pk_'",
    }),
  PAYSTACK_WEBHOOK_SECRET: z.string().optional().default(''),

  // ── Payments (UK — awaiting entity)
  STRIPE_SECRET_KEY: z
    .string()
    .optional()
    .default('')
    .refine((v) => v === '' || v.startsWith('sk_'), {
      message: "STRIPE_SECRET_KEY must start with 'sk_'",
    }),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(''),

  // ── URLs
  APP_URL: z.string().url().or(z.literal('')).optional().default(''),

  // ── Observability
  SENTRY_DSN: z.string().url().or(z.literal('')).optional().default(''),

  // ── CSP (Phase 5)
  CSP_ENFORCE: z.enum(['0', '1']).optional().default('0'),
  CSP_REPORT_URI: z.string().url().or(z.literal('')).optional().default(''),

  // ── Next.js-internal
  NEXT_RUNTIME: z.enum(['nodejs', 'edge']).optional(),
  NEXT_PHASE: z.string().optional(),
});

/**
 * Server schema with cross-field enforcement: in prod, at least one of the two
 * Supabase secret keys (new `SUPABASE_SECRET_KEY` or legacy
 * `SUPABASE_SERVICE_ROLE_KEY`) must be set. In dev/test we tolerate both
 * missing so local builds don't break for contributors who haven't copied
 * `.env.local` yet.
 */
const serverSchema = serverSchemaShape.superRefine((data, ctx) => {
  if (!isProd) return;
  if (!data.SUPABASE_SECRET_KEY && !data.SUPABASE_SERVICE_ROLE_KEY) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['SUPABASE_SECRET_KEY'],
      message:
        'In production, one of SUPABASE_SECRET_KEY (preferred) or SUPABASE_SERVICE_ROLE_KEY (legacy) must be set.',
    });
  }
});

/**
 * PUBLIC schema. Every key MUST be prefixed `NEXT_PUBLIC_` so Next.js inlines
 * it into the client bundle. Everything here is readable from the browser.
 *
 * Like the server schema, the Supabase key is dual-keyed during migration:
 * prefer `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, fall back to
 * `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
 */
const publicSchemaShape = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .optional()
    .default('')
    .refine(
      (v) => v === '' || v.startsWith('sb_publishable_') || v.length >= 40,
      {
        message:
          "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must start with 'sb_publishable_' (new format) or be 40+ chars (legacy JWT)",
      },
    ),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .optional()
    .default('')
    .refine((v) => v === '' || v.length >= 40, {
      message: 'NEXT_PUBLIC_SUPABASE_ANON_KEY looks too short — expected a JWT',
    }),
  NEXT_PUBLIC_APP_URL: z.string().url().or(z.literal('')).optional().default(''),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().or(z.literal('')).optional().default(''),
  NEXT_PUBLIC_TTS_API_URL: z.string().url().or(z.literal('')).optional().default(''),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional().default(''),
});

const publicSchema = publicSchemaShape.superRefine((data, ctx) => {
  // Public schema runs in both server and client contexts. Require at least
  // one publishable key everywhere — if it's missing, the browser client
  // simply can't talk to Supabase, and a loud boot error beats a silent UI
  // break.
  if (!data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && !data.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'],
      message:
        'One of NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (preferred) or NEXT_PUBLIC_SUPABASE_ANON_KEY (legacy) must be set.',
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Resolution — collect raw values and apply legacy aliases
// ─────────────────────────────────────────────────────────────────────────────

function readRawServerEnv(): Record<string, string | undefined> {
  const raw = { ...process.env };
  // Legacy aliases — remove after migrating callers.
  if (!raw.SUPABASE_SERVICE_ROLE_KEY && raw.SUPABASE_SERVICE_KEY) {
    raw.SUPABASE_SERVICE_ROLE_KEY = raw.SUPABASE_SERVICE_KEY;
  }
  return raw;
}

function readRawPublicEnv(): Record<string, string | undefined> {
  // IMPORTANT: Next.js only inlines `NEXT_PUBLIC_*` vars it can SEE literally
  // in source. Listing them explicitly keeps the client bundle static-analyzable.
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_TTS_API_URL: process.env.NEXT_PUBLIC_TTS_API_URL,
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Parse + fail fast
// ─────────────────────────────────────────────────────────────────────────────

function formatZodIssues(issues: z.ZodIssue[]): string {
  return issues
    .map((i) => `  • ${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('\n');
}

function parseOrThrow<T extends z.ZodTypeAny>(
  schema: T,
  raw: Record<string, unknown>,
  label: string,
): z.infer<T> {
  const result = schema.safeParse(raw);
  if (!result.success) {
    const header = `[env] ${label} validation failed (NODE_ENV=${process.env.NODE_ENV ?? 'unset'}):`;
    const body = formatZodIssues(result.error.issues);
    // Log before throwing so Vercel captures the details even if the stack is truncated.
    // eslint-disable-next-line no-console
    console.error(`\n${header}\n${body}\n`);
    throw new Error(`${header}\n${body}`);
  }
  return result.data;
}

// Public env is safe to parse in both server and client contexts.
export const publicEnv = parseOrThrow(publicSchema, readRawPublicEnv(), 'public');

// Server env: only parse on the server. On the client, expose a Proxy that
// throws on access so a mis-routed import doesn't silently return undefined.
type ServerEnv = z.infer<typeof serverSchema>;

// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
const serverEnvValue: ServerEnv = isServer
  ? parseOrThrow(serverSchema, readRawServerEnv(), 'server')
  : ({} as ServerEnv);

export const env: ServerEnv = isServer
  ? serverEnvValue
  : (new Proxy({} as ServerEnv, {
      get(_, key) {
        throw new Error(
          `[env] Attempted to read server-only env var "${String(
            key,
          )}" from client code. Use \`publicEnv\` for NEXT_PUBLIC_* values.`,
        );
      },
    }) as ServerEnv);

// ─────────────────────────────────────────────────────────────────────────────
// Derived helpers — keep the "is this configured?" checks in one place.
// ─────────────────────────────────────────────────────────────────────────────

export const featureFlags = {
  /** Paystack is wired but awaiting account activation. */
  paystackEnabled: () => isServer && env.PAYSTACK_SECRET_KEY.length > 0,
  /** Stripe is wired but awaiting UK entity. */
  stripeEnabled: () => isServer && env.STRIPE_SECRET_KEY.length > 0,
  /** Upstash Redis — if missing in prod the rate limiter falls open. */
  rateLimitEnabled: () =>
    isServer && env.UPSTASH_REDIS_REST_URL.length > 0 && env.UPSTASH_REDIS_REST_TOKEN.length > 0,
  /** CSP enforcement mode (true = enforce, false = Report-Only). */
  cspEnforce: () => isServer && env.CSP_ENFORCE === '1',
};

// ─────────────────────────────────────────────────────────────────────────────
// Supabase key resolution — prefer new publishable/secret keys, fall back
// to legacy anon/service_role JWTs. Helpers are the single source of truth;
// factories (browser/server/serviceRole) must call these, never read
// `process.env.*` directly.
// ─────────────────────────────────────────────────────────────────────────────

let _warnedSecretLegacy = false;
let _warnedPublishableLegacy = false;

export const supabaseKeys = {
  /**
   * Server-only. Returns the new `sb_secret_*` key if present, else falls
   * back to the legacy `service_role` JWT. Logs a one-time warning on
   * fallback so we can watch the migration drain.
   */
  secret(): string {
    if (!isServer) {
      throw new Error('supabaseKeys.secret() must not be called in the browser');
    }
    if (env.SUPABASE_SECRET_KEY) return env.SUPABASE_SECRET_KEY;
    if (env.SUPABASE_SERVICE_ROLE_KEY) {
      if (!_warnedSecretLegacy) {
        _warnedSecretLegacy = true;
        // eslint-disable-next-line no-console
        console.warn(
          '[env] Using legacy SUPABASE_SERVICE_ROLE_KEY. Migrate to SUPABASE_SECRET_KEY and delete the legacy var.',
        );
      }
      return env.SUPABASE_SERVICE_ROLE_KEY;
    }
    throw new Error(
      'No Supabase secret key available — set SUPABASE_SECRET_KEY (preferred) or SUPABASE_SERVICE_ROLE_KEY (legacy).',
    );
  },

  /**
   * Client-safe. Returns the new `sb_publishable_*` key if present, else
   * falls back to the legacy `anon` JWT. Safe in the browser because both
   * keys are designed for public exposure behind RLS.
   */
  publishable(): string {
    if (publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
      return publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    }
    if (publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      if (isServer && !_warnedPublishableLegacy) {
        _warnedPublishableLegacy = true;
        // eslint-disable-next-line no-console
        console.warn(
          '[env] Using legacy NEXT_PUBLIC_SUPABASE_ANON_KEY. Migrate to NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and delete the legacy var.',
        );
      }
      return publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    }
    throw new Error(
      'No Supabase publishable key available — set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (preferred) or NEXT_PUBLIC_SUPABASE_ANON_KEY (legacy).',
    );
  },

  /** Project URL — unchanged across the migration, just a convenience re-export. */
  url(): string {
    return publicEnv.NEXT_PUBLIC_SUPABASE_URL;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Admin check — replaces ad-hoc `ADMIN_EMAILS.split(',').includes(email)` calls.
// ─────────────────────────────────────────────────────────────────────────────

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!isServer || !email) return false;
  const normalised = email.toLowerCase().trim();
  return env.ADMIN_EMAILS.some((a) => a.toLowerCase() === normalised);
}

// Build-time breadcrumb (only during `next build`, helpful for Vercel logs).
if (isServer && isBuild) {
  // eslint-disable-next-line no-console
  console.log(
    `[env] build-phase parse ok — admin emails: ${env.ADMIN_EMAILS.length}, paystack: ${featureFlags.paystackEnabled()}, rate-limit: ${featureFlags.rateLimitEnabled()}`,
  );
}
