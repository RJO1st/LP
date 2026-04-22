# Verify — post-audit smoke tests (2026-04-22)

Every route touched in Phases 3–6 gets a curl line that **must pass** and a curl line that **must fail**. Run against a staging deploy before cutting prod.

Assumptions:
- `BASE=https://staging.launchpard.com`
- `CRON=$(openssl rand -hex 32)` — set this as `CRON_SECRET` in staging env before running
- `ADMIN_JWT=<Supabase access token for rotimi@launchpard.com>` — grab from DevTools → Application → Cookies on a logged-in admin session
- `PARENT_JWT=<Supabase access token for a non-admin parent>` — same, from a second test account

If a MUST-PASS fails or a MUST-FAIL succeeds, stop and fix before merge.

---

## 1. Deleted backdoor — `/api/test/activate-subscription`

**MUST-FAIL (route no longer exists):**

```bash
curl -i -X POST "$BASE/api/test/activate-subscription"
# Expect: 404 Not Found
```

If this returns 200 or 401, the file was not deleted — re-run Phase 4.

---

## 2. Cron routes — `CRON_SECRET` gate + `timingSafeEqual`

```bash
# MUST-PASS
curl -i -H "Authorization: Bearer $CRON" "$BASE/api/cron/reminders"
# Expect: 200, JSON body

# MUST-FAIL — missing header
curl -i "$BASE/api/cron/reminders"
# Expect: 401

# MUST-FAIL — wrong secret, same length (timing-attack sanity)
curl -i -H "Authorization: Bearer $(echo $CRON | tr 'a-z' 'A-Z')" "$BASE/api/cron/reminders"
# Expect: 401, constant-time response

# MUST-FAIL — wrong secret, shorter
curl -i -H "Authorization: Bearer hunter2" "$BASE/api/cron/reminders"
# Expect: 401
```

Repeat the same four for every cron route:
- `/api/cron/reminders`
- `/api/cron/daily-summary`
- `/api/cron/inactivity-nudge`
- `/api/cron/weekly-report` (was `analytics/weekly-report` before Phase 5)

---

## 3. `/api/classes/info` — auth + rate limit + no service-role leak

```bash
# MUST-FAIL — no auth
curl -i "$BASE/api/classes/info?code=ABC123"
# Expect: 401

# MUST-PASS — authed parent, valid code
curl -i -H "Authorization: Bearer $PARENT_JWT" "$BASE/api/classes/info?code=ABC123"
# Expect: 200, { className, schoolName }

# MUST-FAIL — rate limit (11 requests in 60s from same IP)
for i in {1..12}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -H "Authorization: Bearer $PARENT_JWT" \
    "$BASE/api/classes/info?code=ABC$i"
done
# Expect: first 10 × 200/404 mix, then 429 on the 11th+

# Negative: enumeration should no longer work unauthenticated
for code in AAAAAA BBBBBB CCCCCC; do
  curl -s -o /dev/null -w "%{http_code}\n" "$BASE/api/classes/info?code=$code"
done
# Expect: 401, 401, 401 — never leaks existence
```

---

## 4. Paystack webhook — HMAC + idempotency

```bash
# Craft a valid Paystack payload + signature. Use their test fixture.
PAYLOAD='{"event":"charge.success","data":{"reference":"TEST_IDEMPOTENCY_1","amount":250000,"customer":{"email":"rotimi@launchpard.com"},"metadata":{"tier":"ng_scholar"}}}'
SIG=$(echo -n "$PAYLOAD" | openssl dgst -sha512 -hmac "$PAYSTACK_WEBHOOK_SECRET" -r | cut -d' ' -f1)

# MUST-PASS — first delivery
curl -i -X POST "$BASE/api/webhooks/paystack" \
  -H "Content-Type: application/json" \
  -H "x-paystack-signature: $SIG" \
  -d "$PAYLOAD"
# Expect: 200

# MUST-PASS — replay of the same event (idempotency)
curl -i -X POST "$BASE/api/webhooks/paystack" \
  -H "Content-Type: application/json" \
  -H "x-paystack-signature: $SIG" \
  -d "$PAYLOAD"
# Expect: 200, but DB not double-written. Check paystack_events table has exactly one row for TEST_IDEMPOTENCY_1.

# MUST-FAIL — tampered body, original signature
TAMPERED='{"event":"charge.success","data":{"reference":"TEST_IDEMPOTENCY_1","amount":999999999,"customer":{"email":"attacker@example.com"}}}'
curl -i -X POST "$BASE/api/webhooks/paystack" \
  -H "Content-Type: application/json" \
  -H "x-paystack-signature: $SIG" \
  -d "$TAMPERED"
# Expect: 401

# MUST-FAIL — arbitrage: GB parent sending NG payment
# Simulate by using a reference whose metadata says ng_scholar but whose parent row has region='GB'
# Expect: 403 from anti-arbitrage check
```

---

## 5. Admin routes — canonical ADMIN_EMAILS env check

```bash
# MUST-PASS — rotimi@launchpard.com
curl -i -H "Authorization: Bearer $ADMIN_JWT" "$BASE/api/admin/stats"
# Expect: 200

# MUST-FAIL — non-admin parent
curl -i -H "Authorization: Bearer $PARENT_JWT" "$BASE/api/admin/stats"
# Expect: 403

# MUST-FAIL — unauthenticated
curl -i "$BASE/api/admin/stats"
# Expect: 401
```

Repeat for `/api/admin`, `/api/admin/schools/provision`.

Also: grep the deployed bundle for the old hardcoded lists — should return nothing.

```bash
curl -s "$BASE/_next/static/chunks/*.js" | grep -E "'founder@launchpard\.com'|'admin@launchpard\.com'" | head
# Expect: empty
```

---

## 6. `/api/parent/consent` — no service-role escalation

```bash
# MUST-PASS — parent consents for own scholar
curl -i -X POST "$BASE/api/parent/consent" \
  -H "Authorization: Bearer $PARENT_JWT" \
  -H "Content-Type: application/json" \
  -d '{"scholar_id":"<own-scholar-uuid>","school_id":"<school-uuid>"}'
# Expect: 200

# MUST-FAIL — parent tries to consent for someone else's scholar
curl -i -X POST "$BASE/api/parent/consent" \
  -H "Authorization: Bearer $PARENT_JWT" \
  -H "Content-Type: application/json" \
  -d '{"scholar_id":"<stranger-scholar-uuid>","school_id":"<school-uuid>"}'
# Expect: 403 or 404 — RLS must block, NOT the route's own check, because we dropped the service-role client

# MUST-PASS — DELETE revokes
curl -i -X DELETE "$BASE/api/parent/consent?scholar_id=<own-scholar-uuid>&school_id=<school-uuid>" \
  -H "Authorization: Bearer $PARENT_JWT"
# Expect: 200
```

---

## 7. `/api/parent/claim-scholar` — RPC transaction + no access-code in response

```bash
# MUST-PASS — valid code, first claim
curl -i -X POST "$BASE/api/parent/claim-scholar" \
  -H "Authorization: Bearer $PARENT_JWT" \
  -H "Content-Type: application/json" \
  -d '{"validation_code":"<valid-code>"}'
# Expect: 200, body must NOT contain access_code field
# Verify: jq '.access_code // "missing"' <<< "$RESPONSE"  → "missing"

# MUST-FAIL — same code, second claim (race condition / double-click)
curl -i -X POST "$BASE/api/parent/claim-scholar" \
  -H "Authorization: Bearer $PARENT_JWT" \
  -H "Content-Type: application/json" \
  -d '{"validation_code":"<valid-code>"}'
# Expect: 409 Conflict — "already claimed"

# MUST-FAIL — expired code
curl -i -X POST "$BASE/api/parent/claim-scholar" \
  -H "Authorization: Bearer $PARENT_JWT" \
  -H "Content-Type: application/json" \
  -d '{"validation_code":"<expired-code>"}'
# Expect: 410 Gone or 400 with "expired"
```

---

## 8. `/api/schools/import-scholars` — size cap + CSV escape + 64-bit codes

```bash
# MUST-PASS — small valid CSV
cat > /tmp/scholars.csv <<'EOF'
name,year_level,parent_email
Adaeze Okafor,7,parent1@example.ng
Bola Adeyemi,8,parent2@example.ng
EOF
curl -i -X POST "$BASE/api/schools/import-scholars" \
  -H "Authorization: Bearer $PROPRIETOR_JWT" \
  -F "file=@/tmp/scholars.csv" \
  -F "school_id=<school-uuid>"
# Expect: 200

# MUST-FAIL — 3 MB file (cap is 2 MB)
dd if=/dev/urandom of=/tmp/big.csv bs=1M count=3
curl -i -X POST "$BASE/api/schools/import-scholars" \
  -H "Authorization: Bearer $PROPRIETOR_JWT" \
  -F "file=@/tmp/big.csv" \
  -F "school_id=<school-uuid>"
# Expect: 413 Payload Too Large

# MUST-FAIL — non-CSV MIME
curl -i -X POST "$BASE/api/schools/import-scholars" \
  -H "Authorization: Bearer $PROPRIETOR_JWT" \
  -F "file=@/etc/hosts" \
  -F "school_id=<school-uuid>"
# Expect: 415 Unsupported Media Type

# MUST-PASS — CSV-injection row
cat > /tmp/inject.csv <<'EOF'
name,year_level,parent_email
=HYPERLINK("http://evil.com","pwned"),7,test@example.ng
EOF
curl -i -X POST "$BASE/api/schools/import-scholars" \
  -H "Authorization: Bearer $PROPRIETOR_JWT" \
  -F "file=@/tmp/inject.csv" \
  -F "school_id=<school-uuid>"
# Expect: 200, but query scholars table: the stored name must be prefixed with a single quote ('=HYPERLINK…)
# so any Excel round-trip export won't evaluate it.

# Code entropy — pull an access_code from DB, it must be 16 hex chars (64 bits), not 6.
```

---

## 9. `/api/auth/school-setup` — no-store, no-referrer, IP binding

```bash
# MUST-PASS — first GET from browser
curl -i "$BASE/api/auth/school-setup?token=<valid-token>"
# Expect: 200
# Check response headers:
#   Cache-Control: no-store
#   Referrer-Policy: no-referrer

# MUST-FAIL — same token, different IP within 10 minutes (simulate via different --interface)
curl -i --interface eth1 "$BASE/api/auth/school-setup?token=<same-valid-token>"
# Expect: 401 or 403

# MUST-FAIL — known prefetcher user-agent
curl -i -A "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)" \
  "$BASE/api/auth/school-setup?token=<valid-token>"
# Expect: 403
```

---

## 10. CSP — Report-Only mode, then enforce

```bash
# With CSP_ENFORCE=0 (Report-Only)
curl -sI "$BASE" | grep -i "content-security-policy"
# Expect: Content-Security-Policy-Report-Only header present
# script-src uses a nonce='…'

curl -sI "$BASE" | grep -i "content-security-policy-report-only"
# Expect: nonce-based policy, no 'unsafe-inline'

# With CSP_ENFORCE=1 (after 48h of clean report-only)
curl -sI "$BASE" | grep -i "content-security-policy"
# Expect: enforcing Content-Security-Policy header (no -Report-Only suffix)
```

---

## 11. Proxy IP detection — x-real-ip preferred over x-forwarded-for[0]

```bash
# Simulate a client-prepended XFF (user-controlled)
curl -i -H "x-forwarded-for: 1.2.3.4, 5.6.7.8" -H "x-real-ip: 8.8.8.8" "$BASE/api/health"
# Rate limiter should key on 8.8.8.8, NOT 1.2.3.4.

# Send 11 requests with same x-real-ip but varying XFF[0]:
for i in {1..11}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -H "x-forwarded-for: 10.0.0.$i" \
    -H "x-real-ip: 8.8.8.8" \
    "$BASE/api/classes/info?code=AAAAAA"
done
# Expect: rate limit triggers by request 11 (keyed on 8.8.8.8, not fooled by varied XFF)
```

---

## 12. RLS — school_dashboard_cache + topic_exam_importance

Use `psql` or Supabase SQL editor with an anon-key session:

```sql
-- MUST-FAIL — anon read on aggregates
SET request.jwt.claim.role = 'authenticated';
SET request.jwt.claim.sub = '<unrelated-user-uuid>';
SELECT * FROM school_dashboard_cache LIMIT 1;
-- Expect: 0 rows or permission denied

-- MUST-PASS — proprietor of the school
SET request.jwt.claim.sub = '<proprietor-of-school-X>';
SELECT * FROM school_dashboard_cache WHERE school_id = '<school-X>';
-- Expect: rows returned

-- MUST-FAIL — write via anon
INSERT INTO topic_exam_importance (topic_slug, subject, exam_type, weight)
VALUES ('test', 'maths', 'waec', 0.5);
-- Expect: permission denied
```

---

## 13. `schools.setup_token` — moved to dedicated table

```sql
-- MUST-FAIL — reading raw token from schools table
SELECT setup_token FROM schools WHERE id = '<school-uuid>';
-- Expect: column does not exist (moved to school_setup_tokens)

-- MUST-FAIL — anon read on school_setup_tokens
SELECT * FROM school_setup_tokens LIMIT 1;
-- Expect: permission denied / 0 rows
```

---

## 14. Env validation — fail-fast on missing vars

Deploy a preview with `SUPABASE_SERVICE_ROLE_KEY` unset and watch build logs:

```
[env] server validation failed (NODE_ENV=production):
  • SUPABASE_SERVICE_ROLE_KEY: Required
```

Build must fail. No request should reach the app with malformed env.

---

## 15. Rate limiter — cross-region (Upstash)

Issue 11 requests from two different Vercel regions (or two different machines hitting the edge):

```bash
# From region A
for i in {1..6}; do curl -s -o /dev/null -w "%{http_code} " "$BASE/api/classes/info?code=Z$i"; done
# Expect: 200 × 6 (or 404 × 6)

# From region B (different IP)
for i in {7..11}; do curl -s -o /dev/null -w "%{http_code} " "$BASE/api/classes/info?code=Z$i"; done
# If limiter is keyed purely on IP, both regions independently get limits.
# If limiter is keyed on parent_id or scholar_id, the same user across regions hits 429 at request 11.
```

Validate Upstash is being hit: check Upstash dashboard → Commands per second during the burst.

---

## Sign-off

Each section above must be executed and checked off in a PR comment before merging the security-audit branch. Anything that can't be tested in staging (payment webhooks in particular) needs a prod test run with a £1 charge against the founder's card, refunded immediately.
