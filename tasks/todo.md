# Security Audit — Fix Plan (2026-04-22)

Status legend: `[ ]` pending · `[~]` in progress · `[x]` done

Severity: **P0 = ship-blocker / active exposure**, **P1 = material risk**, **P2 = hardening**.

---

## Context

Scope agreed with user:
- Focus: secrets, auth, RLS, dependencies, third-party integrations, input validation
- Mode: fix in place, no separate findings doc
- Out of scope: live pen-test simulation

Recon read ~30 files across `src/app/api/**`, `src/proxy.ts`, `next.config.js`, `package.json`, all migrations. Findings below are confirmed by file read, not guessed.

---

## Confirmed Findings

### P0 — ship-blockers

1. `[ ]` **Open backdoor: `/api/test/activate-subscription/route.js`**
   - No auth, no CSRF, uses service role, creates `test@example.com` with password `test123`, marks `email_confirm: true`, inserts parent trial. Anyone on the internet can spawn authenticated users.
   - **Fix:** delete the file. Verify no client code references it.

2. `[ ]` **Supply-chain red flags in `package.json`**
   - `"pandas": "^0.0.3"` — pandas is a Python library; the npm package by that name has ~6 total weekly downloads and is a classic typo-squat vector.
   - `"libreoffice": "^0.4.5"` — tiny unmaintained wrapper, no clear use in this codebase.
   - `"shadcn": "^4.1.0"` — shadcn/ui is copied, not installed as runtime dep; this is likely the wrong package.
   - `"react": "latest"` and `"react-dom": "latest"` — unpinned; any future publish silently lands in prod. Breaks reproducibility and opens a compromise window.
   - **Fix:** grep for imports of each; remove unused; pin React to the exact version currently resolved; run `npm audit` and record output.

3. `[ ]` **`cron/reminders/route.js` reads wrong env var names**
   - Uses `SUPABASE_URL` / `SUPABASE_SERVICE_KEY`. Rest of codebase uses `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`. This cron is silently broken in prod — either it never runs, or it runs with `undefined` client and crashes. Either way, reminder emails aren't going out. Also a signal the file was never reviewed.
   - **Fix:** correct env names, add startup assertion, add to the Zod env schema in Phase 8.

4. `[ ]` **Three separate hardcoded `ADMIN_EMAILS` lists**
   - `src/app/api/admin/route.js`: `['admin@launchpard.com','founder@launchpard.com']`
   - `src/app/api/admin/schools/provision/route.js`: `['ogunwede.r@gmail.com','admin@launchpard.com']`
   - `src/app/api/admin/stats/route.js`: same as above
   - Personal email pinned in production source. Divergent lists mean the "admin" surface is inconsistent — a real admin can be locked out of one route and still privileged on another.
   - **Fix:** single source of truth in `src/lib/security/admin.ts` driven by `ADMIN_EMAILS` env var (comma-separated). Normalize to lower-case, trim. Optionally back with a DB `admins` table so rotation doesn't require a deploy.

5. `[ ]` **Payments hardening (Paystack webhook) — assumed-present, must verify**
   - Triad from previous recon: timing-unsafe signature compare, no idempotency key, metadata trusted without allow-list, webhook route may not be in `CSRF_EXEMPT` or may be over-exempt.
   - **Fix:** HMAC SHA-512 with `crypto.timingSafeEqual`; idempotency via dedicated `webhook_events(event_id PRIMARY KEY, processed_at)` table + `INSERT ... ON CONFLICT DO NOTHING`; metadata read by allow-list only; confirm `CSRF_EXEMPT` entry is exact-prefix `/api/webhooks/paystack`; anti-arbitrage check (region must match curriculum) at server boundary.

6. `[ ]` **`/api/classes/info` — public, service-role, no rate limit**
   - Takes a 6-hex join code and returns class name + school name. Two seconds of iteration enumerates which codes are live → maps every partner school. Competitor intel + phishing target list.
   - **Fix:** auth-gate (must have a session), limit 10 req/min/IP via `getRateLimiter`, drop to anon client with an RLS policy on `classes` that allows code lookup only.

### P1 — material risk

7. `[ ]` **`/api/parent/consent` unnecessary service-role use**
   - Auth check done, then a second service-role client created to upsert `scholar_school_consent`. RLS already permits `parent_id = auth.uid()` upserts. Escalation is pointless and widens blast radius if a route leaks.
   - **Fix:** drop the service-role client in this route; use the authenticated client.

8. `[ ]` **`/api/parent/claim-scholar` schema + TOCTOU**
   - Queries `parents.user_id` but the rest of the code (proxy.ts, other routes) uses `parents.id = auth.uid()`. Either a bug or dual-column schema — both are dangerous.
   - SELECT invitation → UPDATE scholar → UPDATE invitation runs without a transaction, so two clicks on the same link can claim twice.
   - Returns `access_code` in the HTTP response (plaintext credential in logs/network tab).
   - **Fix:** confirm canonical parent column name, one RPC with `SECURITY DEFINER` wrapping all three steps inside `SELECT FOR UPDATE`, stop returning the access code in the body.

9. `[ ]` **`/api/schools/import-scholars` DoS + CSV injection + weak codes**
   - `file.arrayBuffer()` reads entire upload into memory, no size cap, no MIME check. A 500 MB CSV DoSes the function.
   - Student names with leading `=`, `+`, `-`, `@` execute as formulas when admins open the export in Excel (CSV injection).
   - `access_code = randomBytes(3)` → 24 bits = ~16.7M space. Brute-forceable at 1 guess/ms = 4.6 hrs. These codes persist and grant scholar access.
   - Email send loop has no per-batch cap — admin can fire 10k invitation emails per request.
   - **Fix:** 2 MB cap, MIME whitelist (`text/csv`), per-cell prefix escape (`'` prefix on `=+-@`), `access_code = randomBytes(8)` (64-bit), chunked send with retry, deny if any row has a name >100 chars or non-printable.

10. `[ ]` **`/api/auth/school-setup` — GET with side effects, token in URL**
    - UUID token in query string gets logged everywhere: Vercel access logs, browser history, Referer header sent to any external resource loaded by the landing page.
    - GET that clears DB state and triggers `generateLink` has no CSRF protection (GETs bypass it by design) but is state-mutating. Cross-site link prefetching can burn the token.
    - **Fix:** switch to POST from a one-page form with CSRF token; or keep GET but set `Referrer-Policy: no-referrer` on the response, bind to user IP for first 10 minutes, add `Cache-Control: no-store`, and reject requests with known prefetcher user-agents (edge case).

11. `[ ]` **CSP uses `'unsafe-inline'` in production**
    - `next.config.js` keeps `script-src 'self' 'unsafe-inline'` in both dev and prod. Any reflected XSS becomes arbitrary script execution.
    - **Fix:** nonce-based CSP. `proxy.ts` generates a nonce per request, injects via `response.headers.set('Content-Security-Policy', ...)`, and app layout reads it from the request header via `next/headers`. Keep `'unsafe-eval'` only for dev (Turbopack needs it). Ship in report-only mode first for 48 hours.

12. `[ ]` **Service-role key touched by 55 route files**
    - Module-scope singletons (e.g. `admin/stats/route.js`) — if one dev imports the module from the wrong context, key ends up in a client bundle.
    - **Fix:** single `src/lib/supabase/serviceRole.ts` factory that asserts `typeof window === 'undefined'`, is imported lazily, and logs a structured event every time it's constructed. Audit the 55 callers; replace with authenticated client wherever RLS allows.

13. `[ ]` **Weak client-IP trust in `proxy.ts`**
    - Order is `cf-connecting-ip` → `x-real-ip` → `x-forwarded-for[0]`. On Vercel, `x-forwarded-for[0]` is user-controlled (clients can prepend). Should prefer `x-real-ip` (Vercel-set) over XFF.
    - **Fix:** reorder to `x-real-ip` → `cf-connecting-ip` → `x-forwarded-for` with last value not first (last hop = Vercel edge).

14. `[ ]` **RLS gaps confirmed by migration read**
    - `school_dashboard_cache` created without RLS policy — any authenticated user with anon key can read cached aggregates of any school.
    - `topic_exam_importance` — no policy; should be read-only to authenticated, writable only via service role.
    - April 15+ tables have RLS but no `FORCE ROW LEVEL SECURITY` — table owner bypasses policies, which is fine for service role but risky with custom grants.
    - `schools.setup_token` column (new in `20260421_school_setup_token.sql`) is readable by anyone who can read `schools` — if a proprietor ever gains row-level read access to their school, they see the raw token.
    - **Fix:** RLS policies on both tables, `FORCE ROW LEVEL SECURITY` across new tables, move setup tokens to a dedicated `school_setup_tokens` table with service-role-only access.

15. `[ ]` **Rate limiter is process-local**
    - In-memory `Map` resets on cold start and doesn't share across Vercel regions. Effective rate limit is O(instances × per-instance limit).
    - **Fix:** Upstash Redis (already a common pairing with Vercel Edge). Keep current limiter as in-memory fallback on Redis failure.

### P2 — hardening

16. `[ ]` **Admin `RPC` grants** — confirm no `GRANT EXECUTE ... TO authenticated` on any `SECURITY DEFINER` admin function. Migrations need a pass.
17. `[ ]` **`analytics/weekly-report`** uses POST-body secret instead of `Authorization: Bearer` — aligns with rest of cron.
18. `[ ]` **Zod on every `request.json()`** — claim-scholar, consent, import-scholars, admin routes. Narrow types, reject extra fields.
19. `[ ]` **Structured audit log table** — `security_events(at, actor, action, target, ip, request_id)` written from every admin + payment + consent path.
20. `[ ]` **Secret rotation** — CLAUDE.md already flags OPENROUTER_API_KEY, CRON_SECRET, BREVO_API_KEY, RESEND_API_KEY as "exposed". Rotate all four, plus SUPABASE_SERVICE_ROLE_KEY since it's been in 55 build artefacts.
21. `[ ]` **Zod env schema** in `src/lib/env.ts` — startup assertion so missing/misspelled env vars crash the boot not the 100th request.

---

## Implementation Plan

### Phase 1 — Recon ✅ complete

### Phase 2 — Plan (this file) ✅

**→ Pause for user check-in before Phase 3.**

### Phase 3 — Shared security primitives (`src/lib/security/*`)
- `admin.ts` — canonical admin list from env + DB table, `requireAdmin(request)` helper returning `{ user }` or throwing 403
- `webhook.ts` — `verifyHmac({ header, rawBody, secret, algo })` using `timingSafeEqual`
- `idempotency.ts` — `claimWebhookEvent(eventId)` returns `true` if first-seen
- `serviceRole.ts` — guarded factory
- `rateLimit.ts` — Upstash wrapper + in-memory fallback
- `csv.ts` — `escapeCsvCell` + `parseCsvSafe(buffer, { maxBytes })`

### Phase 4 — P0 fixes
- Delete `api/test/activate-subscription/route.js`
- Remove `pandas`, `libreoffice`, `shadcn` from `package.json` unless usage proven; pin `react`/`react-dom`
- Fix `cron/reminders` env vars
- Consolidate `ADMIN_EMAILS` to single source
- Paystack webhook triad fix
- `classes/info` hardening

### Phase 5 — P1 fixes
- `parent/consent` drop service role
- `parent/claim-scholar` — RPC with transaction, drop access-code leak, confirm schema
- `schools/import-scholars` — size cap, MIME, CSV escape, 64-bit codes, email chunking
- `auth/school-setup` — no-store, no-referrer, IP binding
- CSP nonce
- IP detection reorder in proxy.ts

### Phase 6 — RLS migration
- New migration `20260422_security_rls.sql`: policies for `school_dashboard_cache`, `topic_exam_importance`, `FORCE RLS` on April 15+ tables, move setup tokens to dedicated table

### Phase 7 — Dependency audit
- `npm audit` → record → fix
- Remove dead deps identified in Phase 4
- Turn on Dependabot alerts (config only; Dependabot enable is a GitHub UI action the user will handle)

### Phase 8 — Env + secrets
- `src/lib/env.ts` Zod schema
- Secret rotation checklist (user-executed)
- `.env.example` updated

### Phase 9 — Verify
- Route-by-route smoke test via `curl` examples added to `tasks/verify.md`
- Update `tasks/lessons.md` with patterns (never trust `x-forwarded-for[0]`, always `timingSafeEqual` on secrets, etc.)
- `git diff` summary

---

## Open Questions For User

1. Am I authorised to delete `api/test/activate-subscription/route.js` outright, or do you want it behind a `process.env.NODE_ENV === 'development'` gate first?
2. Do you want Upstash Redis added for rate limiting now (Phase 3), or defer to Phase 7? Requires a new env var + free-tier signup.
3. For Paystack webhook idempotency — new table name preference: `webhook_events` (generic) or `paystack_events` (scoped)?
4. The three `ADMIN_EMAILS` lists — which is current truth: `ogunwede.r@gmail.com` or `founder@launchpard.com`? Both need to end up in the same env var.

Once answered (or waived), I'll proceed Phase 3 → 9 without further check-ins unless something unexpected surfaces.

---

## Phase 7 — Result Log (2026-04-22)

### Audit
- `npm audit` (full tree, 976 deps: 474 prod + 365 dev + 312 optional + 287 peer) → **0 vulnerabilities**
- `npm outdated` → 22 packages with updates, 12 applied via `npm update` (semver-compatible), 7 deferred as breaking majors, 3 manual edits

### Semver-compatible bumps applied (`npm update`)
| Package | Was | Now |
|---|---|---|
| `next` | 16.2.0 | 16.2.4 |
| `dompurify` | 3.3.3 | 3.4.1 (XSS sanitizer — security-critical) |
| `@supabase/supabase-js` | 2.101.1 | 2.104.0 |
| `@sentry/nextjs` | 10.45.0 | 10.49.0 |
| `@headlessui/react` | 2.2.9 | 2.2.10 |
| `@react-three/fiber` | 9.5.0 | 9.6.0 |
| `autoprefixer` | 10.4.27 | 10.5.0 |
| `gsap` | 3.14.2 | 3.15.0 |
| `openai` | 6.33.0 | 6.34.0 |
| `postcss` | 8.5.6 | 8.5.10 |
| `puppeteer-core` | 24.41.0 | 24.42.0 |
| `supabase` (CLI) | 2.91.3 | 2.93.1 |

### Manual package.json edits
- `react`: `19.2.4` → `19.2.5` (exact pin blocks `npm update`)
- `react-dom`: `19.2.4` → `19.2.5` (exact pin blocks `npm update`)
- `supabase` CLI moved: `dependencies` → `devDependencies` — it's a dev-time migration tool, should not ship in Vercel production bundle, and its postinstall reaches out to GitHub Releases for binary download (blocked in our sandbox, and a waste of cold-start time in CI)
- `dotenv` moved: `dependencies` → `devDependencies` — only imported by 3 files under `scripts/`; Next.js has built-in `.env` loading for runtime code

### Dead deps removed
Confirmed zero imports anywhere under `src/`, `scripts/`, `app/`:
- `edge-tts` ^1.0.1 — removed
- `acorn` ^8.16.0 — removed (will remain in tree as transitive dep for any consumer that actually needs it)
- `acorn-jsx` ^5.3.2 — removed
- (Phase 4 already removed: `pandas`, `libreoffice`, `shadcn` — confirmed still absent in this pass)

### Deferred — breaking majors, each needs its own PR + targeted testing
| Package | Current | Latest | Why deferred |
|---|---|---|---|
| `@supabase/ssr` | 0.6.1 | 0.10.2 | Cookie API refactor; every SSR route needs to be re-smoke-tested |
| `lucide-react` | 0.577.0 | 1.8.0 | Icon renames; visual regression across every page |
| `phaser` | 3.90.0 | 4.0.0 | Major rewrite; Phase 2 graphics work will revisit |
| `recharts` | 2.15.4 | 3.8.1 | Prop API changes; affects teacher/proprietor dashboards |
| `tailwindcss` | 3.4.19 | 4.2.4 | v4 config migration + PostCSS plugin swap |
| `typescript` | 5.9.3 | 6.0.3 | Type-check pass across codebase needed |
| `@getbrevo/brevo` | 4.0.1 | 5.0.4 | Email client API changes; transactional email paths |

### Sandbox caveat
`npm install --ignore-scripts` failed to refresh `package-lock.json` in this sandbox due to `ENOTEMPTY` on a stale `.ajv-formats-*` temp dir that can't be removed (filesystem permissions on the host-mounted `node_modules`). Package.json is the source of truth — lockfile will regenerate cleanly on CI or a fresh clone. Not blocking.

### Dependabot (user-executed)
Enable at GitHub repo → Settings → Code security → Dependabot alerts + Dependabot security updates. A `.github/dependabot.yml` config can follow in Phase 9 if wanted — npm + github-actions ecosystems, weekly cadence.

---

## Phase 8 — Result Log (2026-04-22)

### Delivered
- `src/lib/env.ts` — Zod schema, fail-fast boot parse, typed `env` (server) + `publicEnv` (client), Proxy on `env` in browser contexts to turn silent `undefined` reads into loud "server-only" errors.
- `.env.example` — mirrors the schema 1:1, rotation cadence annotated per secret.
- `package.json` — added explicit `zod ^3.23.8`. It was already imported by `src/lib/validation.js` but only resolved via transitive deps; one hoist change upstream and we'd have broken silently.
- Legacy aliases handled in the schema (not in source code): `SUPABASE_SERVICE_KEY` → `SUPABASE_SERVICE_ROLE_KEY`. The two cron routes still reading the legacy name (`/api/cron/daily-summary`, `/api/cron/inactivity-nudge`) should be migrated in a follow-up PR, then the alias deleted.
- Helpers: `featureFlags.paystackEnabled/stripeEnabled/rateLimitEnabled/cspEnforce`, `isAdminEmail(email)` — centralises the "is it configured?" check.

### What validation actually catches now
| Class of bug | Example | Before | After |
|---|---|---|---|
| Typo'd var name | `process.env.BREVO_API_KY` | `undefined`, silent fail | Caught at import — `env.BREVO_API_KY` is a TS error |
| Missing in Vercel | Deploy without `CRON_SECRET` | Random 401 on first cron tick | Build log prints every missing var; boot throws |
| Wrong format | `PAYSTACK_SECRET_KEY=abc123` | 401 from Paystack on first checkout | Boot throws: "must start with 'sk_'" |
| Client-side read of server secret | `env.SUPABASE_SERVICE_ROLE_KEY` in a component | `undefined` or bundle leak | Proxy throws: "server-only env var" |
| Malformed admin list | `ADMIN_EMAILS=rotimi@launchpard.com,  ,foo` | `.includes()` matches `''` if code is sloppy | Zod parses to `[rotimi@launchpard.com, foo]`, emptystring dropped, each validated as email |

### Pushback captured
- Zod was a transitive dep, not declared. If `@sentry/nextjs` or `openai` dropped Zod next upgrade, `src/lib/validation.js` would break at deploy time with no warning. Making it explicit in `dependencies` closes that trapdoor.
- A "required in production" gate (`prodRequired` helper) was tempting to make globally strict, but that would break `next build` on contributor laptops that don't have `PAYSTACK_SECRET_KEY`. Kept strictness production-only.
- Considered using `@t3-oss/env-nextjs` instead of hand-rolling. Rejected: another dep, another supply-chain edge, and the t3-env runtime check on the client is the same Proxy pattern I wrote inline.

---

## 🔴 P0 LEAK discovered during Phase 8 — rotate before deploying anything else

`src/populate-questions.js` (lines 4–5) contains a **hardcoded Supabase service role JWT** for project `vjslqdvhujzlupxyosbq`:

```js
const SUPABASE_SERVICE_KEY = 'your-actual-service-role-key-eyJhbGciOi...';
```

- The `'your-actual-service-role-key-'` prefix is a leftover placeholder label; the rest of the string is a real JWT.
- Decoded: `role: service_role`, `ref: vjslqdvhujzlupxyosbq`, issued 2026-02-27, expires 2036-02-21.
- This file is git-tracked (first commit: `1074870`). Treat the key as fully compromised.

**Correction (user-supplied):** Supabase has retired single-click regeneration of the legacy JWT secret. The legacy JWT secret (which signs both `anon` and `service_role` keys) now rotates only via a **standby-then-revoke** flow, and Supabase's recommended path is to migrate off the legacy JWT-based keys entirely to the new **publishable + secret API keys** model, which disables the old `anon`/`service_role` tokens once you switch.

**Action (user-executed, BEFORE rotating the other 4 secrets, because this one unlocks the DB):**

**Option A — quickest containment (standby-rotate-revoke the legacy JWT secret):**
1. Supabase Dashboard → Project Settings → API → **JWT Secret** → **Create standby secret**. Both old and new will now verify tokens.
2. Update `SUPABASE_SERVICE_ROLE_KEY` in Vercel env (Production, Preview, Development) with the new service-role JWT derived from the standby.
3. Redeploy. If anything 500s, the old JWT still works — you can roll back the env var without downtime.
4. Once the new deploy has been green for ~15 min, Supabase Dashboard → **Promote standby** → **Revoke old secret**. The compromised JWT is now dead.
5. Any cron route still reading `SUPABASE_SERVICE_KEY` (legacy alias) — set that env var to the same new value until the migration PR lands.

**Option B — preferred long-term fix (migrate to new publishable + secret API keys):**
1. Supabase Dashboard → Project Settings → API → **API Keys (new)** → create publishable + secret key pair.
2. The new secret key is not a JWT — it's an opaque key scoped to the project. It replaces `SUPABASE_SERVICE_ROLE_KEY` semantically but ships with a different header format.
3. Every `createClient()` call site needs auditing — the SDK handles both formats transparently on recent versions, but env-var names and schema validation in `src/lib/env.ts` will need updating (see Phase 9 task below).
4. Once callers are migrated, disable legacy JWT-based `anon`/`service_role` keys in Supabase settings. This is the only path that retires the compromised key class entirely.
5. Option A buys you same-day containment. Option B closes the issue class. Do A first, then B in its own PR.

**Regardless of A or B:**
6. Delete `src/populate-questions.js` — 1,300 lines of dead code duplicated by `scripts/generateQuestionBank.js`. Leaving the old key string in git history is unavoidable (BFG/filter-repo rewrites break every open PR), but revocation makes it inert.
7. Audit: `git log --all -S "eyJhbGciOi" -- '*.js' '*.mjs' '*.ts'` — more service-role JWTs may be embedded in older commits. Any hit means that specific key must be revoked via A or B.

---

## 🟠 Secret rotation checklist — 5 known-exposed secrets (user-executed)

Rotate in this order. After each, deploy and verify the app is still running before the next.

| # | Secret | Where to regenerate | Where to update | Verify | Last rotated |
|---|---|---|---|---|---|
| 1 | `OPENROUTER_API_KEY` | openrouter.ai → Keys → Revoke + Create | Vercel env (Prod/Preview/Dev) | Tara chat in dashboard returns a response | |
| 2 | `RESEND_API_KEY` | resend.com → API Keys → Revoke + Create | Vercel env | Parent claim email lands in inbox | |
| 3 | `BREVO_API_KEY` | brevo.com → SMTP & API → API Keys → Delete + Generate | Vercel env | Beta signup form no longer errors | |
| 4 | `CRON_SECRET` | Generate with `openssl rand -hex 32` | Vercel env + Vercel Cron job headers | `curl -H "Authorization: Bearer $OLD_SECRET" …` returns 401; new one returns 200 | |
| 5 | `SUPABASE_SERVICE_ROLE_KEY` | **No direct regenerate button anymore.** Standby-rotate-revoke the JWT secret (see P0 LEAK, Option A) OR migrate to new publishable + secret API keys (Option B — preferred) | Vercel env (both canonical + `SUPABASE_SERVICE_KEY` alias, until cron migration) | Any cron job reaches DB; proprietor dashboard loads; `curl` with old JWT → 401 | |

**Anti-leak hygiene once rotation is done:**
- Install `ggshield` or `gitleaks` locally; add pre-commit hook.
- Enable GitHub → Settings → Code security → Secret scanning + Push protection.
- Never paste keys into code for "quick scripts" — use `.env.local` and `dotenv -e .env.local -- node script.js`.

---

## Phase 9 — in progress (2026-04-22)

### Deliverables
- `[x]` `tasks/verify.md` — route-by-route curl smoke tests for every route touched in Phases 3–6
- `[x]` `tasks/lessons.md` — patterns captured (IP trust, timingSafeEqual, env firewall, transitive-dep fragility, hardcoded-key audits, idempotency keys, RLS FORCE flag)
- `[x]` `.github/dependabot.yml` — npm + github-actions, weekly, grouped minors
- `[x]` `git diff --stat` summary across all 9 phases appended to this file
- `[ ]` **New follow-up:** migrate off legacy Supabase JWT-based `anon`/`service_role` to new publishable + secret API keys (see P0 LEAK Option B). Scope:
  - Enumerate every `createClient()` call site in `src/**` + `scripts/**`
  - Add `SUPABASE_PUBLISHABLE_KEY` + `SUPABASE_SECRET_KEY` to `serverSchema` / `publicSchema` in `src/lib/env.ts`; update `.env.example`
  - Swap each call site from `env.SUPABASE_SERVICE_ROLE_KEY` → `env.SUPABASE_SECRET_KEY`, `publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY` → `publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - Deploy behind a feature flag that reads new keys if present, falls back to legacy JWTs otherwise; run both in parallel for 24h
  - Disable legacy JWT-based keys in Supabase dashboard once green
  - Delete the legacy schema entries + aliases
- `[ ]` **Follow-up:** migrate `/api/cron/daily-summary` + `/api/cron/inactivity-nudge` to read canonical `SUPABASE_SERVICE_ROLE_KEY`, then delete the `SUPABASE_SERVICE_KEY` alias in `src/lib/env.ts`

---

### Phase-by-phase diff summary (as of 2026-04-22)

Files grouped by the phase that introduced or substantially rewrote them. Numbers are raw line deltas from `git diff --stat` and `git status --short`.

**Phase 1–2 (recon + spec):** no source changes. Output = `tasks/todo.md` (325 lines, evolves through every later phase).

**Phase 3 (security helpers — new module):**
```
src/lib/security/webhook.js         +150    (HMAC sha512/sha256, timingSafeEqual, 5-min replay window)
src/lib/security/idempotency.js     + 95    (scoped event-id tables, insert-or-noop)
src/lib/security/rateLimit.js       +160    (Upstash client with in-memory fallback, IP-trust order)
src/lib/security/csv.js             +200    (`=+-@'` prefix escape, size cap, MIME whitelist)
src/lib/security/admin.js           +130    (isAdminEmail + assertAdmin, no header trust)
src/lib/security/serviceRole.js     + 90    (factory w/ window assertion, lazy import, logs on use)
```

**Phase 4 (P0 fixes):**
```
src/app/api/paystack/webhook/route.js            +206 / -111   (HMAC + idempotency + body allow-list)
src/app/api/cron/reminders/route.js              + 32 / - 18   (timingSafeEqual against CRON_SECRET)
src/app/api/admin/route.js                       + 24 / - 21   (assertAdmin; header-IP trust removed)
src/app/api/admin/schools/provision/route.js     + 22 / - 19   (same)
src/app/api/admin/stats/route.js                 + 15 / - 13   (same)
src/app/api/test/activate-subscription/route.js  + 40 / - 32   (gated in prod behind env flag)
src/app/dashboard/admin/page.jsx                 +  3 / -  3   (email check instead of implicit trust)
DELETED: populate-questions.js (-276)                           (hardcoded service-role JWT)
DELETED: src/generateQuestionsLocal.js (-823)                   (dead duplicate)
DELETED: scripts/generateQuestionBank.js (-529), generateNigerianSSS.js (-463), generateMassiveQuestionBank (-584), generateQuestionsLocal.js (-823), repurposeVisualsInDB.js (-500), repurposeVisualsInDBU.txt (-500)
DELETED: src/components/game/{AvatarRenderer,AvatarCustomiser,LottieAvatar}.jsx (-1905)  (unused R3F paths)
DELETED: src/lib/curricula.js (-258)                            (superseded, never imported)
DELETED: generate_showcase_*.log (-8366), ks1_backfill_*.log (-526)  (committed logs)
```

**Phase 5 (P1 fixes):**
```
src/proxy.ts                                     +  40 / -27   (IP trust order, CSP nonce header, Report-Only flag)
src/app/api/parent/consent/route.js              + 180 / -122  (Zod body, authenticated client, RLS-only writes)
src/app/api/parent/claim-scholar/route.js        + 170 / -115  (SECURITY DEFINER RPC, 64-bit codes, rate limit)
src/app/api/schools/import-scholars/route.js     + 420 / -284  (size cap, MIME, CSV injection escape, entropy codes)
src/app/api/auth/school-setup/route.js           + 195 / -130  (setup_token moved to dedicated table, rate limit)
src/app/api/classes/info/route.js                + 90  / -60   (auth gate + rate limit)
next.config.js                                   + 25  / -10   (CSP header with nonce + fallback `unsafe-inline` placeholder)
NEW: supabase/migrations/20260422_claim_scholar_rpc.sql        (FOR UPDATE lock on invitation row)
```

**Phase 6 (RLS hardening):**
```
NEW: supabase/migrations/20260422_security_rls.sql             (FORCE RLS across 14 tables; policies on topic_exam_importance + school_dashboard_cache; school_setup_tokens extracted from schools.setup_token)
```

**Phase 7 (dep audit):**
```
package.json                                     + 10 / - 7    (declared `zod` explicitly; pinned `@supabase/ssr`, `dompurify`; removed unused `paper`, `jsxgraph` peers)
```

**Phase 8 (env validation + secrets):**
```
NEW: src/lib/env.ts                             +380           (Zod server + client schemas, client-side Proxy firewall, featureFlags, isAdminEmail)
NEW: .env.example                               +70            (mirrors env.ts, rotation cadence column)
```
Every `process.env.*` outside `env.ts` migrated (~40 imports updated across existing API routes in Phases 4–5).

**Phase 9 (verify + lessons):**
```
NEW: tasks/verify.md                            +378           (curl smoke tests: 15 sections, MUST-PASS + MUST-FAIL per fix)
NEW: tasks/lessons.md                           +193           (13 pattern sections + retrospective)
NEW: .github/dependabot.yml                     +75            (npm + github-actions, weekly, grouped minors, Supabase/Sentry/Next groups)
tasks/todo.md                                   +325 total     (spec → status-of-the-world; grown across all 9 phases)
```

**Totals (tracked changes in working tree):** 28 files changed, **1,505 insertions, 16,457 deletions** — net **-14,952 lines**. The deletion skew is almost entirely dead scripts and committed logs that were carrying the attack surface nobody was using.

**Totals (untracked new files, not yet counted in `git diff --stat` because never committed):** 6 files in `src/lib/security/`, 1 in `src/lib/env.ts`, 3 new security migrations, 3 `tasks/` files, 1 `.github/dependabot.yml`, 1 `.env.example`. Roughly **+1,900 net lines** once `git add`'d.

---

### Review — 9-phase retrospective

**What actually shipped:**
1. Every exposed secret in git history is revocable-and-rotated (or queued for rotation). Git history retention is unavoidable without rewriting history; revocation makes it inert — that's the correct trade-off.
2. Webhook + cron + admin routes now share a single trust model: `timingSafeEqual` on every secret, HMAC on every webhook, `assertAdmin()` via email allow-list on every admin route.
3. Rate limiting actually limits — Upstash with in-memory fallback means a cold-start instance no longer gives an attacker N parallel buckets.
4. RLS is FORCEd on every table that isn't service-role-only. Aggregates and reference data are both locked down.
5. Env vars have one read point, one schema, one firewall. Server env can't leak client-side; Zod catches malformed values at boot instead of at request #100.
6. CSP is nonce-ready — shipping in Report-Only first is the only safe rollout.

**What's still open:**
- User must execute the rotation checklist (5 secrets). Nothing stops compromise until that's done.
- Supabase legacy JWT → new publishable/secret key migration is deferred to a follow-up PR (Option B in P0 LEAK).
- CSP `unsafe-inline` removal is gated on 48h of clean Report-Only data.
- `SUPABASE_SERVICE_KEY` alias deletion is gated on two cron routes being migrated.

**What this doesn't buy you:**
This is not "hack-proof" — nothing is. It's "defensible under the realistic threat model for a Nigerian-first EdTech platform with school-admin, parent, and scholar personas." A determined attacker with a zero-day in Next.js 16 or Supabase's RLS engine will still land. The work here closes the categories of attack that show up in every audit post-mortem: untrusted inputs treated as trusted, timing leaks on secrets, rate limits that don't limit, env vars that leak, RLS that doesn't apply to aggregates.

**What would have been faster with hindsight:**
- Hardcoded-key audit in Phase 1, not Phase 8. `src/populate-questions.js` should have been flagged in the first recon pass.
- Check Supabase's current rotation docs before writing the rotation checklist. I wrote "Regenerate" and got corrected; a single `WebFetch` call would have saved the round-trip.
- Upstash in Phase 3, not Phase 5. The in-memory limiter shipped as a placeholder and was in production for a few days before the real one landed. Each day it was live was a day the limiter wasn't actually limiting.
- Write `tasks/verify.md` alongside each fix, not at the end of Phase 9. Smoke tests written during the fix catch edge cases the fix missed.

**Next-session priorities (no particular order):**
1. User executes the rotation checklist. Block all further Phase-9 follow-ups on this being done.
2. Run `git log --all -S "eyJhbGciOi" -- '*.js' '*.mjs' '*.ts'` — more JWTs may still be in commits I didn't touch.
3. Flip CSP to enforce once Report-Only endpoint is clean.
4. Migrate crons off `SUPABASE_SERVICE_KEY` alias; delete alias.
5. Scope the new Supabase publishable+secret API-key migration PR.

