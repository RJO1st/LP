# Lessons — security audit patterns (2026-04-22)

Distilled from Phases 1–8. Keep these next to the keyboard on any PR touching auth, secrets, webhooks, or RLS.

---

## Trust

### Never trust `x-forwarded-for[0]` as client IP on Vercel
XFF is client-writable. Any browser can prepend its own entry. Order preference: `x-real-ip` (Vercel-set, single value) → `cf-connecting-ip` (Cloudflare-set if behind CF) → `x-forwarded-for` **last value** (last hop = Vercel edge) → `request.ip` fallback.

Breaks when the rate limiter is keyed on untrusted IP: attacker rotates XFF[0] per request, limiter sees a new "client" each time.

### Never trust request-body claims for identity
`auth.uid()` (Supabase JWT) is the only identity. Anything in the JSON body is user-provided. A POST body claiming `user_id: <admin>` means nothing — the SQL must filter by `auth.uid()`.

### Never trust metadata on webhooks
Paystack/Stripe metadata is whatever the merchant puts in the checkout session. Read fields by **allow-list**, type-check each one with Zod, and reject unknown keys. Never pass metadata straight into a DB update.

---

## Comparisons

### Always `timingSafeEqual` on secrets
`a === b` leaks length and prefix via CPU timing. For CRON_SECRET, webhook signatures, API tokens:

```ts
import { timingSafeEqual } from 'crypto';
const ok =
  a.length === b.length &&
  timingSafeEqual(Buffer.from(a), Buffer.from(b));
```

The `length === length` guard is required — `timingSafeEqual` throws on mismatched lengths.

### Always HMAC with sha512 for Paystack, sha256 for Stripe
Paystack docs explicitly specify SHA-512. Stripe is SHA-256 with a timestamp tolerance (reject signatures older than 5 minutes to block replay).

---

## Idempotency

### Every webhook needs an idempotency key
Scoped table per provider (`paystack_events`, `stripe_events`) with `event_id PRIMARY KEY`. Write is `INSERT ... ON CONFLICT DO NOTHING` inside the same transaction as the business mutation, so retries are safe.

Why scoped not generic: provider event IDs aren't globally unique, and a debug tool that logs unified events gets confused by ID collisions.

### Every claim/redeem flow needs a transaction
`/api/parent/claim-scholar` read three tables then wrote two, over four round-trips. Double-click = double-claim. Move the whole thing into a `SECURITY DEFINER` RPC with `SELECT ... FOR UPDATE` on the invitation row.

---

## Env vars

### `src/lib/env.ts` is the only place that reads `process.env.*`
Anywhere else = bug. Zod validation catches typos, missing values, wrong formats at boot. No silent `undefined` on request #100.

### Server env leaks into client via three routes
1. Direct `process.env.FOO` in a `"use client"` component — inlined as `undefined`, breaks silently.
2. Server env used in a module that's imported by both server and client — Next.js bundles the whole module client-side.
3. Hardcoded secret in a git-tracked file someone once used for a one-off script.

Defence: server `env` is a Proxy in the browser that throws on any read. `publicEnv` is the only thing client code can touch. Pre-commit hook scans for JWT shapes. CI greps the build output for known secret prefixes.

### Legacy aliases are temporary, by definition
`SUPABASE_SERVICE_KEY` → `SUPABASE_SERVICE_ROLE_KEY` alias exists because two cron routes still read the old name. Migration PR + alias deletion is a follow-up, not "someday." Set a calendar reminder.

### Transitive deps rot silently
`zod` was imported by `src/lib/validation.js` but declared by nothing — it resolved via `@sentry/nextjs` or `openai`. One `npm update` upstream and the whole validation layer breaks at deploy time with no warning. If you import it, declare it.

---

## RLS

### `ENABLE ROW LEVEL SECURITY` is not enough — add `FORCE`
`ENABLE` lets the table owner bypass policies. Service role in Supabase = table owner. That's fine for explicit service-role operations, but any role you grant later inherits bypass behaviour. `FORCE ROW LEVEL SECURITY` closes that door: even the owner respects policies. You lose nothing — service role can still disable RLS per-session when it actually needs to.

### Every new table needs a policy, even read-only reference data
`topic_exam_importance` with no policy = anon role can read AND write. Even if the UI never exposes it, one missed `.rpc()` or a direct SQL call from a compromised dev account lets an attacker edit exam weights. Set read to `authenticated`, write to service role only.

### Aggregates tables are read-leaks
`school_dashboard_cache` stores the averaged readiness per school. Even without per-scholar data, aggregates across schools are competitive intel. An authenticated parent at school A should never see school B's average. `auth.uid() IN (SELECT user_id FROM school_roles WHERE school_id = <row school>)` policy.

### Secrets don't belong in rows that get `SELECT *`'d
`schools.setup_token` was a string column on a table any proprietor eventually reads. Move setup tokens to a dedicated table (`school_setup_tokens`) with service-role-only SELECT.

---

## Service role usage

### Default to authenticated client, escalate only on demand
Every `createClient(url, SUPABASE_SERVICE_ROLE_KEY)` is a "bypass RLS" button. Widening blast radius if the route leaks. `/api/parent/consent` originally escalated to service role for a write that RLS allowed natively — pure over-privilege.

Rule: if RLS covers the operation, use the authenticated client. Service role only when the route must do something no end-user is allowed to do (cron, webhook, admin provisioning).

### Factory with assertion, lazy import
`src/lib/supabase/serviceRole.ts` — asserts `typeof window === 'undefined'` before returning a client. Imported lazily inside route handlers, never at module scope. Log a structured event every time it's constructed so anomalies are noticeable.

---

## CSV

### `=`, `+`, `-`, `@` at the start of a cell = code execution
When an admin downloads an export and opens it in Excel, cells starting with those characters evaluate as formulas. `=HYPERLINK("http://evil.com","click me")` → one click, account compromise. Prefix all cells with `'` during write, strip on read.

### Size caps + MIME whitelist on every upload route
`file.arrayBuffer()` with no cap is a DoS. 2 MB is enough for a class roster; higher caps need to justify themselves.

---

## Secret hygiene

### Never paste a key into code "just for this script"
The one-shot script becomes `populate-questions.js`, 1,300 lines, hardcoded service-role JWT, committed to main. Use `dotenv -e .env.local -- node script.js`. Better: the script reads `src/lib/env.ts`.

### Pre-commit hooks + GitHub Push Protection are non-negotiable
`ggshield` / `gitleaks` local, GitHub Push Protection server-side. Both. Either layer can fail; the other catches it.

### Rotate everything when in doubt
A key that was ever in git history is compromised forever. BFG-rewriting history breaks every open PR and every clone. Rotate instead; git history becomes inert.

---

## Hardcoded-key audits

Run these before every release:

```bash
# JWT shape
git log --all -S "eyJhbGciOi" -- '*.js' '*.mjs' '*.ts' '*.jsx' '*.tsx'

# Stripe
git grep -n "sk_live_\|pk_live_\|whsec_"

# Paystack
git grep -n "sk_live_\|pk_live_"  # same prefix pattern, different issuer

# OpenRouter / OpenAI
git grep -n "sk-or-v1-\|sk-proj-"

# Sentry DSN (public, but still inventoriable)
git grep -n "@sentry.io/"
```

Any hit that isn't in `.env.example` or a doc comment needs triage.

---

## Rate limiting

### Process-local `Map` is not rate limiting
Vercel Edge cold-starts multiple instances per region. A `Map` in module scope resets per cold start and isn't shared across instances. Effective limit = (your nominal limit) × (instance count) × (burst factor). Upstash Redis with `rl:<ip>` keys is the minimum.

### Fall open, not closed, on limiter failure
If Upstash is unreachable, log a warning and let the request through. Falling closed creates a new DoS vector: take out Redis and the whole app 429s.

### Key on the right identifier
IP for anonymous routes. `auth.uid()` for authenticated routes (IP is noisy for mobile users on shared cellular NAT). Route path + identifier, so `/api/foo` and `/api/bar` don't share a bucket.

### Upstash REST over the SDK, with an in-memory fallback
The Upstash SDK (`@upstash/redis`, `@upstash/ratelimit`) pulls in ioredis under the hood and ships a chunky bundle. On Vercel Edge that's fine; on Node runtime in Next 16 App Router it bloats cold starts for every route that touches the limiter. The REST API is one `fetch` with a pipelined `[INCR, EXPIRE NX, PTTL]` and a 2-second `AbortSignal.timeout`. Gives us the same primitive, smaller footprint, same observability. Trade-off: no sliding window helper, no built-in Lua — if we ever need token-bucket semantics the SDK comes back.

The in-memory fallback (`localLimit` via a module-scope `Map`) is **not** the limit; it's the failure mode. Upstash unreachable → log the backend as `local`, let the request through, and accept that a single instance briefly rate-limits itself. This is fall-open semantics (see above). Any metric showing `backend: local` sustained past a minute is a Redis outage, not a feature.

### Dual-guard (IP + email) is the pattern for public auth-adjacent routes
Forgot-password / forgot-access-code / schools-interest all carry the same risk shape: a public POST that emits email on our infra. Key by IP and by email. IP catches volume attacks; email catches "attacker rotates IPs but keeps hammering one account." They protect different things and the combined cost is one extra Redis round-trip.

On the email-limit path, return the **generic success response** (200), not 429. An attacker probing which accounts have hit the limit reads the status code — keeping the output identical to a successful flow denies them that signal. The IP limit can safely return 429 because a real user debugging their own client deserves to see the limit, and IP alone doesn't identify an account.

---

## CSP

### Nonce-based is the only CSP worth shipping
`'unsafe-inline'` in `script-src` makes CSP a decoration. Any reflected XSS executes. Nonce-based CSP means the attacker needs the nonce, which they don't have.

### Report-Only for 48 hours before enforcing
Inline scripts you didn't know about will break. Third-party widgets, dev tools, framework quirks. `Content-Security-Policy-Report-Only` with a report endpoint for two days, then flip `CSP_ENFORCE=1`.

---

## Process

### Plan in writing before coding
`tasks/todo.md` upfront means you're less likely to skip a phase when the work gets hard. Also: the user can reject a bad plan before you've burned an afternoon on it.

### Pushback is a feature
User-stated preferences said "never agree by default" — the right version of this isn't contrarianism, it's surfacing trade-offs:
- "Should we rate-limit at 10/min or 60/min?" → depends on signup burst rate; pick based on data, not vibe.
- "Upstash or in-memory?" → in-memory is a rate-limiter-shaped decoration; Upstash with an in-memory fallback is the honest answer.
- Reject "hack-proof" framing entirely. Nothing is hack-proof. "Defensible under the realistic threat model" is.

### One PR per phase
9 phases, 9 PRs, or at minimum 9 commits with clean boundaries. Auditable after the fact, revertable if something breaks, reviewable without drowning the reviewer.

### Re-verify blocker status when resuming a session
When picking up work from a compacted summary or prior session, do not inherit "externally blocked" labels from stale context. Ask or check: is the account live, is the key in prod, has the counterparty replied? A payment processor that was "pending activation" last week may be live today, and silently keeping it in the blocked column hides both actionable work and live production bugs that can now be hit by real customers.

Triggered by: user having to flag "we have an active paystack account now, no longer a blocker" more than once. The fix is a status check at resume time, not a mental note.

---

## Payments

### Annual billing plus monthly add-ons is a trap on one-time charges
If the checkout is a one-time Paystack charge (no `subscription_code`, no stored `authorization_code`), there is no mechanism to bill add-ons monthly while the base plan runs annually. Either:
- Bundle 12 months of add-ons into the upfront charge (sticker shock, refund complexity), or
- Forbid add-ons on annual until subscriptions are wired, or
- Wire proper Paystack Plans with `plan_code` and recurring charges.

What you cannot do is set `ng_addons` for 12 months after a single base-plan charge and call it "add-ons bill monthly". That is a revenue leak and a truth-in-advertising bug at the same time.

### Check UI copy against billing code, not against itself
The subscribe page promised "Add-ons bill monthly so you can change them anytime." The checkout route explicitly skipped add-on charges for annual billing. Both files read fine in isolation. The bug lived in the gap between them. Reviews that read checkout, webhook, and UI copy in the same sitting would have caught it on merge.

---

## What I'd do differently next time

1. **Audit hardcoded keys in Phase 1 recon**, not Phase 8. `src/populate-questions.js` should have shown up in the first recon pass. I caught it while building env.ts, which is late.
2. **Check Supabase rotation flow before writing rotation checklists**. I assumed "Regenerate" was still a button. User caught it. A `curl https://supabase.com/docs/...` call would have saved the round-trip.
3. **Add Upstash in Phase 3, not as a bolt-on**. The in-memory limiter shipped for a few days while I deferred the real one. Every day it was live was a day the limiter wasn't actually limiting.
4. **Write `tasks/verify.md` alongside implementation, not at the end**. Writing the test commands while writing the fix catches edge cases the fix missed.

---

## CSP Two-Stage Nonce Rollout

### Two response headers for the same policy get AND-intersected
If `next.config.js` emits a static `Content-Security-Policy` header AND `proxy.ts` emits a per-request nonce CSP, browsers intersect them. The static header's `'unsafe-inline'` does not relax the per-request policy; the per-request policy's `'nonce-…'` + `'strict-dynamic'` gets hollowed out by the static header's missing directives. Net effect: your own nonce'd scripts get silently blocked.

Fix: delete the static CSP from `next.config.js` entirely and let `proxy.ts` be the sole CSP authority. Keep Strict-Transport-Security, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy as static headers (those do not conflict).

### `<script type="application/ld+json">` counts as a script under `script-src`
Even though it is not executable JS, the browser enforces `script-src` against it. If you remove `'unsafe-inline'` and do not add a `nonce`, structured data for SEO silently vanishes from the DOM. Four files in LaunchPard carry JSON-LD: `src/app/layout.jsx`, `src/app/learn/[slug]/page.jsx`, `src/app/blog/page.jsx`, `src/app/blog/[slug]/page.jsx`. All four now read `(await headers()).get('x-nonce')` and apply `nonce={nonce}`.

### Blob URL scripts are a Stage 2 landmine
`AdaptiveDashboardLayout.jsx` line 142 builds a printable report as an HTML string, wraps it in a `Blob`, and opens it via `window.open(blobUrl)`. That HTML contains an inline `<script>` that triggers `window.print()`. Under Stage 1 (Report-Only) this logs a violation but still runs. Under Stage 2 (`CSP_ENFORCE=true` + enforcing CSP) the inline script without a nonce will be blocked and printing will silently fail. There is no way to inject the parent document's nonce into a blob'd HTML string at render time, because the nonce is generated per-request by proxy.ts and the React tree does not expose it to Blob construction.

Before flipping `CSP_ENFORCE=true`, refactor the print flow to either:
- Render the report inline in the SPA and call `window.print()` on a hidden iframe, or
- Use a dedicated print route (`/dashboard/student/report/print`) that serves full HTML with the right nonce, and have the button navigate to it.

### Next.js 15+ `headers()` returns a Promise
`const nonce = (await headers()).get('x-nonce')` requires the component or Route Handler to be `async`. `src/app/blog/page.jsx` was a sync function and needed `async` added when I wired the nonce. Sync server components that try to `await headers()` will fail type-check but not always at runtime, they just return a non-string. Worth checking explicitly when refactoring.
