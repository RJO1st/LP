# LaunchPard — Project Memory

## What Is LaunchPard?
AI-powered adaptive learning platform for scholars aged 5-17. Covers Maths, English, Science across UK (KS1-KS4) and Nigerian (JSS/SSS) curricula. **Strategic pivot April 2026: Nigerian market first** — primary school B2B2C channel launched (April 15 2026).

## Stack
- **Frontend**: Next.js 16 (App Router) + Tailwind CSS
- **Backend**: Supabase (project ID: `vjslqdvhujzlupxyosbq`)
- **Hosting**: Vercel (`proxy.ts` convention, not deprecated `middleware.ts`)
- **AI**: Tara (tutor/feedback via OpenRouter)
- **Graphics**: 2D sprites Phase 1; Phaser 3 Phase 2; Babylon.js Phase 3 (3D essential only). R3F SHELVED.
- **Avatars**: Avataaars-style faces in LaunchPard space helmets. Renderer: `AvatarRendererCanvas.jsx`
- **Payments**: Paystack (NG, awaiting account activation) + Stripe (GB, awaiting UK entity setup)

## Critical Rules
- **Never use a rainbow anywhere in LaunchPard**
- Mobile-first always
- British English in user-facing copy
- No competitor names on the website (internal analysis only)

## Key Stage Definitions
| Key Stage | Years | Nigerian equiv |
|-----------|-------|----------------|
| KS1 | Y1–2 | Primary 1–3 |
| KS2 | Y3–6 | Primary 4–6 |
| KS3 | Y7–9 | JSS 1–3 |
| KS4 | Y10–11 | SSS 1–3 |

Nigerian curriculum offset: `ng_jss` → +6, `ng_sss` → +9.

## Architecture — Dashboard Rendering
**CRITICAL**: Student dashboard has TWO modes (`dashboardMode` state in `src/app/dashboard/student/page.jsx`):
1. **`"adaptive"` (DEFAULT)** → `AdaptiveDashboardLayout.jsx` — edit THIS for dashboard UI changes
2. **Fallback (legacy)** → inline in `page.jsx` using `AvatarRendererLazy`

## Avatar System
- Shape: `{base, hat, pet, accessory, background, skin, hair, expression}` in `scholars.avatar` JSONB
- 8 bases: astronaut, explorer, scientist, pilot, captain, ranger, guardian, vanguard
- Renderer: `AvatarRendererCanvas.jsx` (Canvas 2D)
- Shop: `AvatarShop.jsx` — All / Suit / Scene categories
- Update flow: `AvatarShop → onAvatarChange → setScholar(prev => ({...prev, avatar: newAvatar}))` (ALWAYS use functional setState)

## Geo-Regional System
- `src/proxy.ts` reads `x-vercel-ip-country` → sets `__geo` cookie (NG or GB)
- `__geo_override` cookie wins over IP (footer region switcher)
- `src/app/page.jsx` uses `useRegion()` + `REGION_CONFIG` to branch hero, pricing, curricula, FAQ
- **Currency-by-curriculum rule**: `ng_primary/ng_jss/ng_sss` → NGN; all others → GBP (enforced at signup, not geo-IP)
- `regionFromCurriculum()` and `curriculumIsNigerian()` exported from `src/lib/tierAccess.js`

## Tier Gating System (April 14–15 2026)
- **Migration**: `supabase/migrations/20260414_tier_gating.sql` + `20260414_simplified_ng_pricing.sql`
- **Model**: Free + `ng_scholar` (₦2,500/mo core) + add-ons in `parents.ng_addons TEXT[]`
  - `family_child` ₦1,000/mo per extra scholar
  - `waec_boost` ₦1,000/mo — live Q&A, unlimited AI, mock exams
  - `ai_unlimited` ₦500/mo — removes 50/mo Tara cap
  - `tutor_connect` — pay-per-session entitlement flag
- **Source of truth**: `src/lib/tierAccess.js` — exports `hasFeature`, `getLimit`, `canAddScholar`, `checkQuota`, `getUpgradeReason`, `getTierLabel`, `isTierAllowedInRegion`, `curriculumIsNigerian`, `regionFromCurriculum`, `hasAddon`, `getFamilyChildAddonCount`
- **UI gate**: `src/components/gates/FeatureGate.jsx`
- **API helpers**: `src/lib/assertFeature.js` (returns 402/429)
- **Tara quota**: `src/lib/taraQuotaCheck.js` — fail-open monthly quota, short-circuits on free tier

## Nigerian Pricing (Simplified April 2026)
Single core plan + add-ons (see `NIGERIAN_PRICING_ANALYSIS.md` for full research):
- Constellation (Free): ₦0
- **Scholar: ₦2,500/mo (₦25,000/yr)** — most popular, WAEC/NECO ready
- WAEC Intensive Boost add-on: ₦1,000/mo
- Family add-on: ₦1,000/mo per extra scholar
- Max spend (3 scholars + all add-ons): ₦6,000/mo

uLesson verified pricing (April 2026): ₦12,000/3mo = **₦4,000/mo**; ₦25,000/yr = ₦2,083/mo.

**Annual + add-ons rule (April 23 2026)**: Paystack checkout is one-time charges only (no stored `authorization_code`, no recurring). Annual billing + monthly add-ons in the same purchase is REJECTED at both the UI (`src/app/subscribe/page.jsx` disables add-on controls on annual and shows an amber notice) and the server (`src/app/api/paystack/checkout/route.js` §1b returns 400). Re-enable when Paystack Plans (`plan_code` + `authorization_code`) are wired. See `PAYSTACK_SMOKE_TEST.md` → "Annual + Add-ons Guard".

## School Dashboard System (April 15 2026) — B2B2C Channel
Model: school mandates free accounts → 100% cohort data → parent upgrades drive revenue.

### Database Schema (new tables)
- `classes` (school_id, name, year_level, curriculum)
- `enrolments` (scholar_id, class_id, academic_year)
- `teacher_assignments` (teacher_id, class_id, role, subject)
- `scholar_invitations` (validation_code, parent_email, status, expires_at) — 7-day expiry
- `school_roles` (user_id, school_id, role: proprietor/admin/teacher)
- `topic_exam_importance` (topic_slug, subject, exam_type, weight 0–1) — seeded 45 topics
- `scholar_readiness_snapshot` (scholar_id, snapshot_date, overall_score, subject scores, grade_band)
- `school_dashboard_cache` (school_id, class_id, cache_date, avg_readiness, placement_pct)
- `scholar_school_consent` (scholar_id, school_id, parent_id, consent_given_at, revoked_at)
- `school_leads` (school_id, parent_id, scholar_id, lead_status) — non-partner schools
- Migrations: `20260415_school_dashboard.sql`, `20260415_readiness_snapshots.sql`, `20260415_consent_and_leads.sql`

### Readiness Score Formula
`topic_readiness = p_mastery × stability × recency_decay × exam_weight`
- `recency_decay`: `0.97^days_since_practice`, floor 0.3
- `exam_weight`: from `topic_exam_importance` table (loaded + cached by `_loadExamWeights`)
- Subject weights: Maths 30%, English 30%, VR 25%, NVR 15%
- Implemented in `src/lib/analyticsEngine.js`: `computeClassReadiness`, `computeSchoolReadiness`, `writeReadinessSnapshot`, `getReadinessTrend`, `getClassReadinessTrend`, `getPlacementPrediction`

### Secondary Entrance Exam Config
`EXAM_CONFIGS.secondary_entrance` in `src/lib/examReadiness.js`:
- Grade bands: Exceptional (≥85) / Ready (≥70) / Developing (≥50) / Needs Support (<50)
- Placement prediction curve maps readiness score to admission probability

### API Routes
- `POST /api/schools/import-scholars` — CSV bulk import (inline parser, no csv-parse dep), generates validation codes, sends claim emails via Resend
- `POST /api/parent/claim-scholar` — validates code, links parent to scholar; fail-open `school_leads` write for non-partner schools
- `POST/DELETE /api/parent/consent` — NDPR consent give/revoke
- `GET /api/class/[classId]/readiness` — full class analytics with consent indicators per student
- `GET /api/schools/[schoolId]/overview` — school-wide analytics via `computeSchoolReadiness`
- `GET /api/schools/[schoolId]/parent-engagement` — claim summary, per-class breakdown, unclaimed scholar list with validation codes + expiry

### Dashboard Pages
- `/dashboard/teacher` — class selector, 4 stat cards, grade distribution, student list with consent dots + gated subject scores, topic gaps, export
- `/dashboard/proprietor` — placement prediction banner, KPI cards, grade bands, parent engagement panel (collapsible unclaimed list with copy-code chips), classes table, subject breakdown, CSV upload
- `/parent/claim` — auth tabs (create/login) + NDPR consent modal + 7-day trial banner (wrapped in `<Suspense>`)

### NDPR Compliance
- Consent captured before claiming scholar (`scholar_school_consent` table)
- Consent text: processing purpose, school visibility, 3-year retention, withdrawal right
- Teachers see individual scores only if parent has consented (consent indicator in API response)
- `school_leads` captures non-partner school selections for sales outreach

## Supabase Schema (Key Tables)
- `scholars` — profiles, avatar JSONB, school_id
- `parents` — subscription state, region, subscription_tier, currency, ng_addons, billing_cycle
- `question_bank` — questions, `is_active`, `also_curricula TEXT[]`
- `curriculum_standards` — 2,457 standards across 7 curricula
- `scholar_topic_mastery` — per-topic mastery (BKT + SM-2)
- `exam_papers`, `exam_sittings`, `exam_answers` — GCSE/WAEC exam system
- `tier_feedback_quota` — Tara feedback monthly counter per scholar
- Full schema: inspect `supabase/migrations/`

## Curriculum RAG
- Core: `generateCurriculumAwarePath()` in `src/lib/learningPathEngine.js`
- Also exports: `aggregateClassMastery`, `getStrugglingStudents`, `getGroupRecommendations`
- Standards format: `NC-Y7-A-1` (UK), `NGJ-Y1-M-2` (Nigeria JSS), `NGS-Y1-M-2` (Nigeria SSS)
- Falls back to hardcoded `TOPIC_SEQUENCES` if DB tables missing

## Question Bank Quality
- Active count: 79,681 (after full audit sweep April 24 2026 — see below)
- 28 generator guards (D1–D35) in `scripts/generateQuestionsV2.mjs`
- New guards added April 15: D29 (label artifact), D30 (capital giveaway), D31 (decimal), D32 (circular answer), D33 (AOTA/NOTA in any option), D34b (Levenshtein fuzzy mismatch), D35 (KS1 hard reject)
- JSON5 fallback in `parseAIResponse`, SHA-256 dedup replaces 80-char fingerprint
- Concept cards: `scripts/generateConceptCards.mjs` — 3 modes: static (253 topics), discover (live DB scan), localise (Nigerian variants)
- Gap fill: `scripts/gapFillParallel.mjs` — ng_jss/ng_sss/ng_primary ordered first

## GCSE Exam Papers System
- Full flow: dashboard → `ExamLobby` → `ExamRunner` → `ExamMarkingScreen` → `ExamResults`
- Orchestrator: `src/components/exam/ExamOrchestrator.jsx`
- 3-tier marking in `src/lib/markingEngine.js`

## Key Scripts
- `scripts/generateQuestionsV2.mjs` — generate + validate questions
- `scripts/generateConceptCards.mjs` — concept card generation (static/discover/localise modes)
- `scripts/gapFillParallel.mjs` — parallel gap-fill (Nigeria first)
- `scripts/auditQuestionBankV3.mjs` — 17-category quality audit
- `scripts/ingestExamPaper.mjs` — exam paper PDF → DB

## Recent Session Work (Last 3)

### April 27, 2026 (session 13) — Quiz Micro-Moments, Mastery Ceremony, Pre-Teach, Termly Report, Trajectory Widget, Sibling Tara

**`src/components/game/QuizEngine.jsx` — 4 features added:**

1. **Pre-teach overlay**: On each new question, if scholar's `p_mastery < 0.3` for that topic (queried from `scholar_topic_mastery`), the `PreTeachScreen` overlay shows before the question. Fetches concept card from `/api/concept-cards` using year-band derived from `student.year_level` + curriculum. `preTaughtTopicsRef` (Set) ensures each topic pre-taught at most once per session. Cancel-safe async useEffect (`let cancelled = false` + cleanup). Fail-open on all network errors.

2. **Avatar mood feedback (`AvatarMomentWidget`)**: Emoji-based pill shown in quiz header — 🚀 "Brilliant!" on correct, 💪 "Keep going!" on wrong. Auto-clears after 1.8 s. `setAvatarMood` wired into all 6 answer handlers: `handlePick`, `handleFreeTextSubmit`, `handleMultiSubmit`, `handleOrderingSubmit`, `handleNumberLineSubmit`, `handleFractionSubmit`.

3. **Mastery unlock ceremony**: In `finishQuest`, after upsert, loops `masteryUpdates` vs pre-session `masteryMap`. First topic crossing 0.8 threshold sets `masteryUnlock` state → `MasteryUnlockOverlay` renders (topic + subject + confetti-style animation). Also fires `supabase.functions.invoke("notify-parent-mastery", ...)` fire-and-forget. One ceremony per `finishQuest` call.

4. **Tara whispers**: `TARA_WHISPERS` static array of 7 motivational strings, cycled by `qIdx % 7`. Shown above explanation div in all 4 wrong-answer panels (MCQ/free-text, ordering, number_line, fraction_bar). Zero API cost.

**NEW `src/app/api/parent/termly-report/route.js`** — `GET /api/parent/termly-report?scholarId=`:
- Auth: `createServerClient` + session + `parent_id` ownership check on scholar
- `fetchScholarReport()`: queries `scholars`, `scholar_topic_mastery`, `scholar_readiness_snapshot`, `exam_answers`, `quiz_results`, computes streak
- `buildHTML()`: self-contained branded HTML — 6 KPI cards, subject progress bars, mastered topic chips, focus area list, motivational headline
- Returns `Content-Disposition: attachment` HTML file; filename `${name}_${term}_${year}_Report.html`

**NEW `src/components/dashboard/PracticeTrajectory.jsx`**:
- Props: `{ scholarId, supabase, currentScore }`
- Reads last 8 `scholar_readiness_snapshot` rows, computes linear regression slope (`weeklyDelta`), projects `current + weeklyDelta * 4` capped 0–100
- SVG sparkline (80×36 px): indigo historical polyline + dashed projection line in band colour + projected dot
- Shows projected score, band label, `±N pts over 4 weeks` trend label, conditional "On track!" / "At risk!" if band changes
- Falls back to simple current-band label when no snapshot history

**`src/app/dashboard/parent/page.jsx`** (wiring):
- `PracticeTrajectory` mounted below `<ReadinessScore>` in scholar card
- `handleDownloadReport`: async fetch → blob → anchor download with per-scholar `downloadingReport` spinner
- Download Report button (emerald) added to scholar actions row alongside Insights + Scholar Dashboard

**`src/components/dashboard/MultiChildComparison.jsx`**:
- `buildTaraObservation(scholars)` added: 5-branch heuristic — all inactive → nudge both; streak gap ≥ 3 + lagging at 0 → celebrate leader + nudge lagging; shared subject weakness (avg < 0.5) → suggest co-practice; family avg ≥ 60 → celebrate all; default → top subject nudge from leader
- Observation rendered as indigo pill below sibling card grid with 🤖 Tara label

**No new DB migrations. No new API routes beyond termly-report. Commit: `d9224c7`.**

---

### April 27, 2026 (session 12) — Authoring Pipeline for Interactive Question Types

**`scripts/generateQuestionsV2.mjs` — full generator support for `ordering`, `number_line`, `fraction_bar` question types.**

**New additions:**
- `MATHS_INTERACTIVE_WEIGHTS` — per-band probability maps: ks1 (ordering 6%, number_line 6%, fraction_bar 4%), ks2 (5%/5%/4%), ks3 (4%/3%/2%), ks4 empty (no interactive types at GCSE/senior level).
- `pickQuestionTypeForContext(subject, band)` — replaces direct `pickQuestionType()` call in main loop. Returns an interactive type for maths subjects at ks1–ks3 based on weighted random; falls back to the standard type pool (probability-scaled to fill the remaining weight). Non-maths subjects always use the standard pool.
- `typeInstructions` in `buildPrompt` extended with 3 new entries (ordering, number_line, fraction_bar) — each specifies the exact JSON fields, constraints, and valid use cases.
- JSON output schema in prompt updated: `question_type` union includes 3 new values; `items`, `correct_order`, `number_line`, `fraction` fields documented.

**New D-series validation guards in `validateQuestion`:**
- `ordering` case: items 3–8, correct_order length matches items, no duplicate indices, all in-range, items must NOT already be in correct order (trivial case rejected).
- `number_line` case: all 4 fields required; min < max; D37: tick count = (max−min)/step ≤ 20 (mobile UX); correct must be exactly reachable via step (epsilon check); correct in [min, max].
- `fraction_bar` case: numerator + denominator both numbers; denominator 2–12; numerator in [0, denominator]; D38: rejects numerator === denominator (all-filled) and numerator === 0 (empty).
- D36: `ordering`/`number_line`/`fraction_bar` rejected for non-maths/non-science subjects.

**`toDbRow` updates:**
- `answer_type` now returns `"interactive"` for the 3 new types (previously only `"choice"` or `"text"`).
- `question_data` spread includes type-specific fields: `items`+`correct_order` for ordering; `number_line`+`answer` (mirrors `number_line.correct`) for number_line; `fraction`+`answer` (mirrors `fraction.numerator`) for fraction_bar. QuizEngine's `q.answer` fallback path works without code changes.

**Main loop updated:** `pickQuestionType()` call replaced with `pickQuestionTypeForContext(subject, ctx.band)` — the only call site. Gap-fill path (`buildGapFillPrompt`/`generateForStandards`) intentionally not changed (MCQ/text types appropriate for standards-targeted gap-fill).

**No new API routes. No DB schema changes. No migrations.**

---

### April 27, 2026 (session 11) — Interactive Question Types + Misconception Selector

**`src/components/game/QuizEngine.jsx` — 3 new question type renderers + misconception-targeted retry queue.**

**New question type components (defined above `QuizEngine`):**
- `OrderingQuestion` — tap-to-select-then-swap ordering (no drag events; works on mobile). Items shuffled via Fisher-Yates at question load, `origIdx` preserved for marking. Post-submit: ✓/✗ per item based on position vs `q.correct_order`.
- `NumberLineWidget` — click/touch rail to snap to nearest tick; epsilon comparison (`< 1e-9`) for float safety; correct-position emerald marker shown on wrong submit. Tick stride auto-scales when > 11 ticks.
- `FractionBarWidget` — click-to-toggle segments (up to 12); denominator from `q.fraction.denominator ?? q.question_data.denominator ?? 4`; post-submit colours: emerald (correct shaded), emerald-200 (correct unshaded/missed), rose (wrong shaded).

**State added:** `orderingItems`, `orderingSelectedIdx`, `orderingSubmitted`, `numberLineValue`, `numberLineSubmitted`, `fractionShaded`, `fractionSubmitted`.

**Submit handlers:** `handleOrderingSubmit`, `handleNumberLineSubmit`, `handleFractionSubmit` — all follow the standard pattern: `setSelected(true/false)`, `queueMistake`, `promoteMisconceptionQuestions`, `fetchConceptCard`, `recordTopicResult`.

**Timer skip:** `NO_TIMER_TYPES` array extended — `['numerical_input', 'ordering', 'number_line', 'fraction_bar']` all skip the countdown so scholars have adequate interaction time.

**Question data schema per type:**
- `ordering`: `q.items` (string[]), `q.correct_order` or `q.answer` (int[])
- `number_line`: `q.number_line.{min,max,step,correct}` or `q.answer`
- `fraction_bar`: `q.fraction.{numerator,denominator}` or `q.answer` + `q.question_data.denominator`

**Misconception selector (Item 3 completion):**
- `misconceptionMapRef` — ref storing `{ questionId → Set<misconceptionUuid> }`. Populated by a background Supabase query on `question_misconceptions` whenever `sessionQuestions` populates. Fully fail-open; cancelled if session changes before completion.
- `promoteMisconceptionQuestions(wrongQId)` — on wrong answer, partitions remaining unasked questions: those sharing any misconception UUID are moved to immediately after the current position (before the rest of the queue). `_isRetry` questions are never reordered. No-op when map is empty (pre-generator-run questions have no misconception data yet).
- All 6 wrong-answer handlers wired: `handlePick`, `handleFreeTextSubmit`, `handleMultiSubmit`, `handleOrderingSubmit`, `handleNumberLineSubmit`, `handleFractionSubmit`.
- **Priority on wrong answer:** misconception-targeted questions (promoted inline) → rest of original queue → raw `missedQuestions` retries at session end.

**Also (session 11 — other items):**
- `vercel.json`: added `GET /api/cron/daily-ops-digest` cron at `0 7 * * *`
- `src/components/exam/ExamBriefing.jsx` (new): pre-exam briefing card with paper stats (questions/duration/marks), topic distribution bars (top 8 topics), mode-specific tips (timed/practice/topic_focus/review), "Begin Mission" CTA. Review mode shows "Open Review" instead.
- `src/components/exam/ExamOrchestrator.jsx`: wires `ExamBriefing` between lobby and running states. `"briefing"` state added to machine; review mode skips briefing. `handleBeginFromBriefing` callback.
- `supabase/migrations/20260427_misconceptions.sql` (new): `misconceptions` table (id, topic_slug, subject, year_band, label, description, common_trigger, remediation_hint, source) + `question_misconceptions` join table (question_id, misconception_id, relevance 0–1). RLS: authenticated SELECT only; service-role writes only. **Apply in Supabase SQL editor.**

**No new API routes. No other DB changes.**

### April 27, 2026 (session 10) — Stripe GB Integration

**Full Stripe checkout + webhook + callback pipeline built (awaiting UK entity + Stripe account to go live).**

**New files:**
- `src/app/api/stripe/checkout/route.js` — POST handler: rate-limit (20/min) → auth → anti-arbitrage (region === 'GB') → resolve price ID from env → create Stripe Checkout Session (mode: subscription) via `fetch` (no SDK) → store pending row in `stripe_sessions` → return `{ checkout_url, session_id }`. Feature-flagged: returns 503 if `STRIPE_SECRET_KEY` absent.
- `src/app/api/stripe/webhook/route.js` — POST handler (Node runtime): rate-limit → `verifyStripeSignature()` (timing-safe, 300 s replay window) → idempotency via `claimWebhookEvent(supabase, 'stripe_events', ...)` → dispatch to 4 handlers:
  - `checkout.session.completed` → activate parent (DB row > session metadata fallback), anti-arbitrage GB check, sets `stripe_subscription_id`
  - `customer.subscription.updated` → extend `subscription_end` from `current_period_end`, sync `subscription_status`
  - `customer.subscription.deleted` → downgrade to free, clear `stripe_subscription_id`
  - `invoice.payment_failed` → flip to `past_due` (subscription ID lookup → email ilike fallback)
- `src/app/api/stripe/callback/route.js` — GET redirect handler: verifies session via `GET /v1/checkout/sessions/:id`, redirects to `/dashboard/parent?payment=success&provider=stripe` on success or `/subscribe?payment=failed&provider=stripe` on failure.

**Migration:**
- `supabase/migrations/20260427_parents_stripe_fields.sql` — adds `stripe_subscription_id TEXT` column + sparse index on `parents`.

**Subscribe page wired:**
- `src/app/subscribe/page.jsx`: GB else-branch now calls `/api/stripe/checkout` and redirects to `json.checkout_url`. Error messaging falls through from the route (503 = "coming soon" when keys not set, 502 = Stripe network error, etc.).

**Subscription metadata strategy:** `metadata.{parent_id,plan,billing}` set on both session and `subscription_data` so all subscription events can resolve the parent without secondary lookups.

**Stripe not yet live — user actions required before testing:**
1. Create UK Ltd entity + Stripe account
2. Create 4 subscription price objects in Stripe dashboard (uk_pro monthly/annual, uk_pro_exam monthly/annual)
3. Set env vars in Vercel: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_UK_PRO_MONTHLY`, `STRIPE_PRICE_UK_PRO_ANNUAL`, `STRIPE_PRICE_UK_PRO_EXAM_MONTHLY`, `STRIPE_PRICE_UK_PRO_EXAM_ANNUAL`
4. Apply migration: `supabase/migrations/20260427_parents_stripe_fields.sql`
5. Register `/api/stripe/webhook` in Stripe dashboard → copy signing secret → set `STRIPE_WEBHOOK_SECRET`

**Also (logo + header polish for PDF reports):**
- `sample_teacher_class_report.html` + `sample_proprietor_termly_report.html`: rocket emoji replaced with base64 `logo192.png`; header redesigned from split two-column to fully centred single-column layout.
- `src/app/api/schools/[schoolId]/termly-report/route.js` + `src/app/api/teacher/class-report/route.js`: same logo embed + centred header applied. Footer emojis cleared.

### April 27, 2026 (session 9) — PDF Reports (#42 + #43)

**Two new report API routes (zero external dependencies — self-contained HTML, printable to PDF via browser):**

1. **`GET /api/teacher/class-report?classId=`** (`src/app/api/teacher/class-report/route.js`):
   - Auth: `teacher_assignments` OR `school_roles` (proprietor/admin)
   - Calls `computeClassReadiness(classId, svc)` — the same engine used by the class readiness API
   - Consent gating: subject scores shown per-student only when NDPR consent granted (falls back to "—")
   - Sections: class name/school/term header, 4 summary cards (class avg, on-target count, needs support count, placement probability), grade distribution bars, class focus areas (topic weakness chips), full student table (rank, name, readiness bar, score, grade band, up to 4 subject scores), NDPR footnote
   - `Content-Disposition: attachment; filename="ClassName_Progress_Report.html"`

2. **`GET /api/schools/[schoolId]/termly-report`** (`src/app/api/schools/[schoolId]/termly-report/route.js`):
   - Auth: `school_roles` with `proprietor` or `admin` role + matching `school_id`
   - Calls `computeSchoolReadiness(schoolId, svc)` — parallelises `computeClassReadiness` across all classes
   - Sections: school name/term header, 4 summary cards (school avg, % on target, total scholars, placement probability), placement narrative banner (contextual text based on score range), grade distribution bars (aggregated across all classes), subject performance averages, per-class breakdown table (name, year, scholars, readiness bar, score, band, % ready, placement %), school-wide focus area chips (deduplicated weaknesses, cross-class count shown)
   - `Content-Disposition: attachment; filename="SchoolName_Autumn_Term_Report.html"`

**Dashboard wiring:**
- `src/app/dashboard/teacher/page.jsx`: `handleExport` rewritten from `window.print()` to async fetch → blob → anchor download. New `downloadingClassReport` state drives `disabled` + "Generating…" label on button.
- `src/app/dashboard/proprietor/page.jsx`: `handleExport` rewritten similarly. New `downloadingTermly` state. Button label changed to "Download Termly Report".

**No DB schema changes. No new migrations.**

### April 26, 2026 (session 6) — Concept Cards Wiring

**`src/components/game/QuizEngine.jsx` — concept card in wrong-answer panel:**

- **`ConceptSnapshot` component** (defined above `QuizEngine`): compact inline teaching card — renders topic label, `key_concept` text, and `best_example` (problem + solution) from `concept_cards` API. Animated loading skeleton while fetching. Silently skips if the API returns 204 (no card for this topic).
- **`fetchConceptCard` callback**: maps scholar year + curriculum to `year_band` (ks1/ks2/ks3/ks4/jss/sss), calls `GET /api/concept-cards?topic_slug=&curriculum=&subject=&year_band=`, fail-open on network errors. State: `conceptCard`, `conceptCardLoading`.
- **Wired into all three wrong-answer branches**: `handlePick`, `handleFreeTextSubmit`, `handleMultiSubmit` all call `fetchConceptCard(currQ.topic, currQ.subject)` on incorrect answer.
- **`resetQuestionState` updated**: clears `conceptCard` and `conceptCardLoading` so card doesn't bleed between questions.
- **Render position**: between the explanation div (indigo left-border) and the Tara EIB textarea — visible only on wrong answers, invisible on correct.
- Commit: `6652de2`. No new API routes or DB schema changes.

### April 26, 2026 (session 5) — Quiz Lesson Loop

**`src/components/game/QuizEngine.jsx` — 4 features added:**

1. **Mistake re-queue** (highest-leverage): When a scholar answers wrong, the question is pushed to `missedQuestions` (cap 3, no duplicates, retries excluded). When `next()` reaches the last question, it injects the missed questions into `sessionQuestions` before calling `finishQuest()`, gated by `retriesInjectedRef` to prevent double-injection. Retry questions carry `_isRetry: true` and show a "🔄 2nd chance" badge in the quiz header. "Next Mission" button resets `retriesInjectedRef.current = false` for a clean new session.

2. **Session wrap-up screen**: `finished` block now shows per-topic accuracy bars (up to 4 topics, sorted weakest-first), a "Focus tomorrow" recommendation (weakest topic), adaptive headline emoji (`🚀/🌟/🪐/💪` based on accuracy), and XP earned. Accuracy is calculated on original questions only (not retries) so retry successes don't inflate the headline score.

3. **Live streak bar during quiz**: Header streak display replaced with a styled pill that scales up (`scale-125`) briefly via `streakPop` state when streak increments. Pill colour is amber-50/amber-200 when on a streak, slate when at zero — gives a clear visual signal without being distracting.

4. **Difficulty level-up signal**: `useEffect` on `streak` fires a `levelUpMsg` ("🔥 On Fire!" at 3, "⚡ Level Up!" at 5, "🌟 Unstoppable!" at 7, "💫 Legendary!" at 10). Message renders as a bouncing overlay pill inside the quiz card, auto-dismissed after 2.2 s via `setTimeout`.

**State added:** `missedQuestions`, `levelUpMsg`, `streakPop` + `retriesInjectedRef`.
**Callbacks modified:** `handlePick`, `handleFreeTextSubmit`, `handleMultiSubmit` all call `queueMistake(currQ)` on wrong answer; `next()` injects retries before finishing.
**No new API calls, no DB schema changes.**

### April 26, 2026 (session 3) — Security Hardening Continued + School Leads Admin View

**School leads pipeline (commit 7aa2d5d):**
- `GET /api/admin/school-leads` — paginated list (50/page), status filter, joins `schools+scholars`, batch-resolves parent emails via `supabase.auth.admin.getUserById` (parallel, non-fatal on miss).
- `PATCH /api/admin/school-leads` — update `lead_status` or `notes`; auto-stamps `contacted_at`/`converted_at`.
- `/admin/school-leads` page — dark admin table: status tabs, inline status transitions, expandable notes panel, one-click email copy, direct mailto link. Auth: `requireAdmin()` on both endpoints.

**Critical security fix — unprotected admin route (commit 8588d16):**
- `api/admin/flag-question` had **no auth guard** — anyone could bulk-delete the question bank. Added `requireAdmin()` to both GET and POST. Added Zod schema (uuid array, action enum, reason max-500). Max 500 IDs per bulk op.
- `api/auth/route.js` — legacy signup handler with two issues: (1) no input validation, (2) leaked `access_token` in URL query param. Route unreferenced. Replaced with 410 Gone.

**Zod coverage sweep — email trigger routes (commit e9be895):**
- Added 4 schemas to `validation.js`: `brevoSyncContactSchema`, `welcomeEmailSchema`, `firstQuizEmailSchema`, `scholarCreatedEmailSchema`.
- Wired to: `brevo/sync-contact`, `emails/welcome`, `emails/scholar-created`, `resend-verification/send-first-quiz-email`. Prevents spam-relay abuse (arbitrary email triggers) without breaking no-session caller flow.

**Zod coverage sweep — remaining routes (commits 024190d, 2661541):**
- Added 6 schemas to `validation.js`: `legacyScholarCreatedEmailSchema` (questCode variant), `weeklyDigestSchema`, `schoolReminderSchema` (union: batch | single), `remindersUpsertSchema` (day enum + HH:MM), `goalToggleSchema`, `examSittingActionSchema` (discriminatedUnion on action).
- Wired to 10 routes: `send-welcome-email`, `send-first-quiz-email`, `send-scholar-created-email`, `resend-verification/send-scholar-created-email`, `emails/first-quiz`, `emails/weekly-digest`, `emails/school-reminder`, `reminders POST`, `parent/goals/[id] PUT`, `exam-sittings/[sittingId] PATCH`.
- **All body-reading POST/PUT/PATCH routes now validated.** Only intentional exception: `paystack/checkout` (inline domain-logic checks for plan/billing/addon combinations).

### April 26, 2026 (session 2) — Security Audit + Performance Sprint

**Security — all critical + high-priority items resolved:**
1. **Auth guards on AI endpoints** (7e02d83): `POST /api/chat` and `POST /api/validate-drawing` now require authenticated user OR `scholar_id` cookie; 401 before any OpenRouter call.
2. **Rate limits added** (7e02d83): `drawingLimiter` 10/min on `/api/validate-drawing` (vision model), `scholarLimiter` 10/15min on `/api/scholar` (brute-force guard).
3. **RLS on `scholar_readiness_snapshot`** (7e02d83): three scoped SELECT policies — teacher via `teacher_assignments`, proprietor/admin via `school_roles`, parent via `scholars→parents` join. Migration `20260426_readiness_snapshot_rls.sql`.
4. **RLS hardening** (d79bd14): `FORCE ROW LEVEL SECURITY` on `scholar_readiness_snapshot`; explicit `REVOKE INSERT, UPDATE, DELETE FROM authenticated, anon` (service-role-only writes). Migration `20260426_readiness_snapshot_rls_hardening.sql`.
5. **Tara classifier homoglyph bypass** (3f96a69): three-form matching in `taraClassifier.js` — raw-lower, normalised (leetspeak → latin), compact (spaces stripped). Catches "k i l l", "d3ath", etc. 11/11 tests pass.
6. **Safeguarding parent notification** (600024b): crisis-level Tara events fire-and-forget `notifyParentOfSafeguardingEvent()` in `tara/route.js` via Brevo.
7. **Anonymous Tara turnCount bypass** (b62f8f5): anonymous sessions now tracked in `tara_turns` (scholar_id=NULL) via HttpOnly `tara_session_id` cookie. `addCookie()` helper wraps all returns after session tracking.

**Performance — N+1 eliminations + bundle reduction:**
- **Quest expiry N+1** (3f96a69): `assign-personalised` cron bulk-expires in one UPDATE before the scholar loop.
- **Weekly-digest N+1** (9f146e1): prefetch mastery + streaks with `Promise.all([.in(scholarIds), .in(scholarIds)])` before parent send loop.
- **School overview N+1** (00ac953): `computeSchoolReadiness` second loop was re-fetching enrolments + mastery + exam weights per class (3N extra queries). Fixed: thread `students` (with pre-computed `subjectScores`) through `classData`; aggregate in-memory. Response shape unchanged.
- **Recharts bundle** (5804e15): `MasteryProgressChart`, `ProgressChart`, `TimeChart` converted to `next/dynamic` with `ssr:false` + skeleton; ~200KB deferred from initial bundle.

### April 26, 2026 — School Dashboard Sprint Completion + Script Hardening

**rewriteExplanations.mjs — two fixes (commits 9b2ffaa, aad78fe):**
- Consecutive-failure cooloff: `failCount` Map per model — 3 consecutive non-429 network errors (terminated/fetch failed) → 30 s cooloff + reset. Prevents flaky models from being retried every batch without backoff.
- Per-batch CSV flush: header written before loop; each batch appended to CSV immediately after processing. Ctrl+C now loses at most the 5 in-flight questions, not the entire run. Resume detection (`Found N existing rewrites — will skip`) now works correctly on restart.
- Batch delay bumped 500 ms → 700 ms (free rotation); free model ring: Llama 3.3 70B / GPT-OSS 120B / Hermes 3 405B / Nemotron 30B / Qwen3 80B / Gemma 4 31B.

**School dashboard sprint — all three items shipped:**
1. **Teacher consent UI** — confirmed already complete in `teacher/page.jsx`: aggregate NDPR banner (green/amber/red pill counts), per-student consent dot, expanded row shows subject scores only when `consentStatus === 'granted'` (ShieldIcon + message otherwise).
2. **Parent readiness view** — confirmed already complete via `ScholarSchoolReadiness.jsx`: free tier shows circular score gauge + grade band badge + blurred/locked subject bars + upgrade CTA; Scholar tier shows full subject bars + topic weakness chips. Wired into parent dashboard at `scholar.school_id` check.
3. **Parent Engagement Panel** (commit d3a13da) — new collapsible section in proprietor dashboard:
   - `GET /api/schools/[schoolId]/parent-engagement`: queries scholars → enrolments → classes + latest invitation per scholar via service role; returns `{summary, byClass, unclaimed}`. Auth: proprietor/admin only.
   - `ParentEngagementPanel` component: collapsed by default, header shows claim rate + progress bar + pending badge. Expanded: per-class filter pills, class-level progress bars, scrollable unclaimed-scholar list with `ValidationCodeChip` (one-click copy), expiry indicator (red if expired, amber if ≤ 2 days). 100% claim rate shows success state.
   - Inserted between "Parent Activation" funnel and Classes table.

**Note on school_leads vs parent-engagement split:**
`school_leads` captures demand from non-partner schools (written in `claim-scholar` hook when `is_partner=false`). Partner school proprietors (who have dashboard access) won't have entries there, so the engagement view queries `scholars.parent_id IS NULL` directly, which is the actionable surface for them.

### April 15, 2026 — School Dashboard B2B2C + NDPR + Pricing Simplification
**School dashboard system (full B2B2C channel):**
- 3 migrations: school_dashboard.sql, readiness_snapshots.sql, consent_and_leads.sql
- `src/lib/analyticsEngine.js` extended: enhanced readiness formula (BKT×stability×recency×exam_weight), `computeClassReadiness`, `computeSchoolReadiness`, `writeReadinessSnapshot`, `getReadinessTrend`, `getClassReadinessTrend`, `getPlacementPrediction`
- `src/lib/examReadiness.js` extended: `secondary_entrance` exam config with grade bands + placement curve
- `topic_exam_importance` seeded with 45 topic weights across 4 entrance subjects
- Teacher dashboard `/dashboard/teacher`, Proprietor dashboard `/dashboard/proprietor`
- CSV import API `/api/schools/import-scholars` (inline parser, no external dep)
- Parent claim API `/api/parent/claim-scholar`
- Parent consent API `/api/parent/consent` (NDPR: POST give, DELETE revoke)
- School overview API `/api/schools/[schoolId]/overview` wired to real `computeSchoolReadiness`
- Class readiness API `/api/class/[classId]/readiness` wired to real `computeClassReadiness` + consent indicators
- Parent claim page `/parent/claim` — auth tabs + NDPR consent modal + 7-day trial banner, wrapped in `<Suspense>` (Turbopack prerender fix)
- Commission removed from proprietor dashboard; partner programme placeholder shown instead
- Turbopack build fixes: inline CSV parser (replaces `csv-parse/sync`), Suspense boundary on `useSearchParams`

**Nigerian pricing simplified:**
- `src/lib/tierAccess.js` rewritten: Free + `ng_scholar` core + `ng_addons[]` for modular add-ons
- `src/app/page.jsx` Nigerian variant: exam boards grid (WAEC/NECO/JAMB/BECE/Common Entrance/State Scholarship), FEATURES_NG, AGE_BANDS_NG (Primary/JSS/SSS), FAQS_NG (10 Nigeria-specific), two-plan pricing (Free + Scholar + add-ons panel)
- `src/app/signup/page.jsx`: region locked to 🇳🇬 for NG visitors, curriculum-based billing region
- `src/app/dashboard/parent/page.jsx`: curriculum dropdown filtered to ng_primary/ng_jss/ng_sss for NG parents

### April 14, 2026 — Geo-IP Landing + Tier Gating + CSV Audit
- `src/proxy.ts` geo-detection (x-vercel-ip-country → `__geo` cookie)
- Region-aware landing page, signup, subscribe, parent dashboard
- Tier gating: migration + `tierAccess.js` + `FeatureGate.jsx` + `assertFeature.js` + `taraQuotaCheck.js`
- `AdaptiveDashboardLayout.jsx` tier-gated shims for exams/3D sims/boss battles
- CSV audit V3.1: 3,127 expunge + 2,459 salvage SQL generated
- `NIGERIAN_PRICING_ANALYSIS.md` (624 lines) — research-backed pricing

### April 12, 2026 — GRAPHICS_STRATEGY v2.0 + Nigeria Focus Phase 1
- `GRAPHICS_STRATEGY.md` v2.0: Century Tech analysis, Nigerian localisation, KPI table, ₦18.6k budget
- Nigerian dashboard: WAECCountdown, WAECGradeTracker, nigerianCurriculumLabels.js, AdaptiveGreeting/Leaderboard Nigerian labels

### April 24, 2026 — Full DB Audit + Structural Deactivations + Tier Migration
**Audit sweep — net result: 85,943 → 79,681 active questions (-6,262 total)**

Applied SQL operations (all committed to scripts/output/, gitignored):
- `full_expunge_audit.sql`: -134 (H_TOO_SHORT stems + H_TRAILING_DOTS + 13 low-quality explanations)
- `curriculum_drift_deactivate.sql`: -74 (genuine drift, cross-curricula excluded by also_curricula guard)
- `difficulty_tier_fixes.sql`: 605 tier corrections (individual IDs, not deactivations)
- `structural_deactivate.sql`: -6,078 (correct_index null/OOB + options null/<2 — unanswerable questions)
- `tier_migration.sql`: 24,639 tier remaps (expected→intermediate, exceeding→advanced, secure→intermediate, mastering→advanced, greater_depth→advanced, emerging→foundation, typos fixed) + 13 deactivations (unresolvable whitespace/template tiers)

**New scripts committed:**
- `scripts/fullBankAudit.mjs` — comprehensive multi-dimension audit: structural (A1–A4), content (B1–B4), metadata (C1–C5), coverage gaps (D1–D3), difficulty distribution (E1–E3). Run: `node scripts/fullBankAudit.mjs`
- `scripts/rewriteExplanations.mjs` — rewrites stub explanations (avg_score 1.5–2.9) via OpenRouter claude-haiku-4-5. Ready to run: `node scripts/rewriteExplanations.mjs --limit=300`
- `src/lib/safeguardingConfig.js` — age-adaptive safeguarding responses (UK Childline + SURPIN NG)
- `src/lib/taraClassifier.js` — two-tier intent classifier for Tara (< 5ms, no external calls)

**Post-audit bank state (as of April 24 2026):**
- Active: 79,681 | Structural issues: 0 | Invalid tiers: 0 | Missing explanations: 0
- Stub explanations (< 80 chars): 15,330 — next priority for rewriteExplanations.mjs
- Difficulty tier distribution: foundation 24,963 / developing 25,826 / intermediate 16,012 / advanced 12,880

### April 19, 2026 — WAEC/NECO Ingestion Plan + Live Q&A / Tutor Connect Removal
**Feature removals (no infrastructure built):**
- Removed `live_qa` from all touchpoints: tierAccess.js (NG_ADDON_DEFS + TIER_DEFS), FeatureGate.jsx (FEATURE_LABELS), AdaptiveDashboardLayout.jsx (canUseLiveQA line), subscribe/page.jsx (WAEC Boost desc), page.jsx (FAQ + add-ons panel)
- Removed `tutor_connect` entirely: tierAccess.js (NG_ADDON_DEFS, ADDON_LABELS), subscribe/page.jsx (card), page.jsx (add-ons panel)
- WAEC Intensive Boost now: "Unlimited Tara AI · full mock exams · A1–F9 grade predictions"
- Fixed school auto-reply email (`api/schools/interest/route.js`) — removed "parents fund access through optional upgrades" line

**Demo seed (`supabase/seeds/demo_greenfield_academy.sql`):**
- Greenfield Academy, Lagos — 3 classes (JSS 2A, JSS 3B, SS 1A), 60 scholars with Nigerian names
- 4 auth.users (proprietor + 2 teachers + 1 demo parent) using `crypt()` password hashing
- 600 mastery rows (10 topics × 60 scholars), tier-based mastery with sin()-based micro-variation
- 360 readiness snapshots (6 weekly per scholar, improving trend)
- NDPR consent for all scholars; school dashboard cache seeded
- Demo logins: `proprietor@greenfield.ng` / `teacher.ibrahim@greenfield.ng` / `teacher.adeyemi@greenfield.ng` — all password `DemoGreenfield2026!`

**WAEC/NECO ingestion plan (`WAEC_NECO_INGESTION_PLAN.md`):**
- Sourcing: waecdirect.org (₦500/paper), NECO bulk licence request, physical scanning for gaps
- Phase 1 MVP: 33 papers — Maths + English + Biology + Physics + Chemistry, 2019–2024, WAEC + NECO
- WAEC structure: Section A (50 MCQ, 5 options A–E), Section B (optional theory, answer 5 of 8)
- Script: `scripts/waecAnswerKeyIngest.mjs` — extracts CER answer keys and updates correct_mcq_index
- Script: `scripts/batchIngestWAEC.mjs` — batch runner from CSV manifest
- Manifest: `scripts/waec_papers_manifest.csv` — 33 Phase 1 rows ready to fill
- Migration: `supabase/migrations/20260420_waec_exam_fields.sql` — adds exam_board_region, section_label, optional, answer_key_ingested
- Cost: ~$6 / ~₦10,000 for full Phase 1 ingestion (vision-LLM)

## Outstanding / Active Work

### 🟠 Payments (Revenue-Blocking)
- ✅ `PAYSTACK_SECRET_KEY` set in Vercel env vars (April 21 2026)
- ✅ Full DB audit complete (April 24 2026) — 79,681 active questions, zero structural/tier/index issues
- ✅ `20260420_waec_exam_fields.sql` migration applied
- ✅ `demo_greenfield_academy.sql` seed applied (Greenfield Academy demo live)
- ✅ Paystack checkout + webhook routes built (awaiting account activation for live transactions)
- ✅ Security secrets rotated (April 2026)
- Paystack account activation: test end-to-end once activated — see `PAYSTACK_SMOKE_TEST.md`
- ✅ Stripe checkout + webhook + callback routes built (April 27 session 10) — `src/app/api/stripe/` directory. Subscribe page wired. Feature-flagged on `STRIPE_SECRET_KEY`. Anti-arbitrage GB guard matches Paystack NG pattern.
- ✅ `supabase/migrations/20260427_parents_stripe_fields.sql` — adds `stripe_subscription_id TEXT` to parents. **Apply in Supabase SQL editor.**
- ✅ `supabase/migrations/20260427_misconceptions.sql` — `misconceptions` + `question_misconceptions` tables. **Apply in Supabase SQL editor.**
- Paystack account activation: test end-to-end once activated — see `PAYSTACK_SMOKE_TEST.md`
- Stripe go-live checklist (see session 10 notes above): UK entity → Stripe account → 4 price objects → 6 env vars → webhook endpoint registration → apply `20260427_parents_stripe_fields.sql`

### 🟡 WAEC/NECO Exam Papers
- Purchase Phase 1 papers from waecdirect.org (33 papers, ~₦33,000): Maths + English + Bio + Physics + Chemistry, 2019–2024
- Email NECO at info@neco.gov.ng for bulk educational licence
- Download Chief Examiner Reports (free, waecdirect.org → Reports section)
- Create `papers/waec/` and `papers/neco/` directories (gitignored)
- Run batch ingest: `node scripts/batchIngestWAEC.mjs --manifest scripts/waec_papers_manifest.csv --dry-run` first
- After QA: remove `--dry-run` and run overnight; ~$6 total LLM cost
- Full plan: `WAEC_NECO_INGESTION_PLAN.md`

### 🟡 Content — Visual Requirement Gaps (#34, April 27 2026)
- **311 questions** where the stem references a visual (diagram/figure/table/graph) but none is attached — student cannot answer. `visual_gap_fix.sql` Phase 1 sets `needs_visual = true` + `visual_status = 'needed'` on these.
- **591 questions** where only the explanation references a missing visual ("The diagram shows..."). Phase 2 of `visual_gap_fix.sql` stamps `question_data.explanation_visual_ref = true` so `rewriteExplanations.mjs` can target them with `--filter=explanation_visual_ref`.
- **Run order**: paste `scripts/output/visual_gap_fix.sql` into Supabase SQL editor. Run Phase 1, verify UPDATE count ≈ 311. Then run Phase 2, verify ≈ 591.
- **Diagnostic** (live DB): `scripts/output/visual_gap_diagnostic.sql` — 4 queries: summary, by-subject breakdown, spot-check sample, pipeline queue health.
- Source audit: `scripts/output/visual_reference_audit.csv` (1,678 rows, 1,013 unique questions).

### 🟡 Content — Explanation Quality (4,702 stubs remaining)
- ✅ **10,628 rewrites complete (April 28 2026)** — `scripts/output/explanation_rewrites.sql` ready (40,739 lines, BEGIN/COMMIT wrapped). Total cost: $0.02 (free model rotation).
- **⚠️ USER ACTION REQUIRED**: paste `scripts/output/explanation_rewrites.sql` into Supabase SQL editor and run to apply 10,628 explanation rewrites to `question_bank`.
- After applying: run `node scripts/rewriteExplanations.mjs` again to catch remaining ~4,702 stubs (script skips already-rewritten IDs via CSV dedup)
- Resume safety: per-batch CSV flush — restart correctly skips already-done IDs; consecutive-failure cooloff (3 errors → 30 s cooloff) prevents model thrashing

### ✅ Generator Hardening (#53, April 27 2026)
- Migration: `supabase/migrations/20260427_generator_hardening.sql` — adds `content_hash TEXT` column + partial unique index on `question_bank`; creates `generation_runs` audit table (run_id, started_at, tokens, cost, models_used, etc.).
- `callAI()` now captures `json.usage` and returns `{ content, model, usage }`.
- `toDbRow()` computes a 32-char SHA-256 hash (`content_hash`) from normalised question_text + sorted options — stored as a DB column for cross-run dedup.
- `insertBatch()` uses `.upsert(chunk, { onConflict: "content_hash", ignoreDuplicates: true })` — Vercel retries and re-runs no longer produce duplicate rows. Returns `{ inserted, skipped }`. Skipped count logged ("♻ N duplicate(s) skipped").
- Token accumulation in `generateForSubjectYear()` + `generateForStandards()` — `runPromptTokens`, `runCompletionTokens`, `runModels` Set propagated up through result objects.
- `main()`: stats objects now carry token fields; final summary prints token counts + estimated cost (using $0.15/M prompt + $0.60/M completion as rough baseline). Writes one `generation_runs` row at completion (fail-open warn on DB error). Run ID logged to console.
- **Run order**: paste `supabase/migrations/20260427_generator_hardening.sql` into Supabase SQL editor before next generation run. Existing rows remain unaffected (content_hash IS NULL initially).

### 🟡 Content — Phase 2 Expunge Runner (#38, April 27 2026)
- Script: `scripts/expungeRunnerPhase2.mjs` — consumes 6 audit CSVs, outputs kill/fix/review artefacts
- Dry-run: `node scripts/expungeRunnerPhase2.mjs` (default) | Generate files: `node scripts/expungeRunnerPhase2.mjs --write`
- **Kill** (79 deactivations): V3 J3 encoding artefacts (15) + H7 NOT/EXCEPT multi-valid (4) + KS1 circular/banned_words explanations (67)
- **Fix** (1,028 auto-corrections): difficulty tier under_labelled_developing→developing (312) + under_labelled_foundation→foundation (293) + V2 E4 missing question mark (423)
- **Review** (4,250 items): `scripts/output/expunge_phase2_review.csv` — sorted by `suggested_action`, highest-volume: G1 double-barrelled (1,355), B6 keyword bleed (1,015), B5 length bias (447)
- **Run order**: paste `expunge_phase2_kill.sql` into Supabase SQL editor first, then `expunge_phase2_fix.sql`

### 🟡 Content — Nigerian Question Bank
- Run concept card generation: `node scripts/generateConceptCards.mjs --ng-only` (JSS + SSS localised cards with ₦ examples)
- Run gap-fill: `node scripts/gapFillParallel.mjs --ng-first --severity=critical`
- Apply salvage CSV edits (`scripts/output/audit_v3_salvage.csv` — 2,459 fixable rows)
- Run full bank audit for Nigerian coverage gaps: `node scripts/fullBankAudit.mjs --curriculum=ng_primary` (+ ng_jss, ng_sss)

### 🟡 School Dashboard — Next Sprint (P2)
- ✅ Consent indicator in teacher UI — complete (dot + banner + gated subject scores)
- ✅ Parent readiness view — complete (`ScholarSchoolReadiness.jsx`, free teaser + Scholar full view)
- ✅ Parent engagement panel — complete (proprietor dashboard, unclaimed list + copy-code chips)
- ✅ Resend expired invitations — complete (April 26 session 3): Resend button per unclaimed scholar in `ParentEngagementPanel`; calls `POST /api/teacher/notify-parent` which refreshes expired code + re-sends claim email; per-scholar loading/success/retry states.
- ✅ PDF reports — complete (April 27 session 9): `GET /api/teacher/class-report?classId=` + `GET /api/schools/[schoolId]/termly-report` — zero-dep self-contained HTML (printable to PDF via browser). Teacher "Download Class Report" button upgraded from `window.print()` to async download with loading state. Proprietor "Download Termly Report" button wired to termly route. Both gated by existing auth (teacher_assignments / school_roles).
- ✅ school_leads pipeline view — complete (April 26 session 3): `/admin/school-leads` + `GET/PATCH /api/admin/school-leads`

### 🟡 Security
- ✅ Secrets rotated (April 2026)
- ✅ Auth guards on `/api/chat` + `/api/validate-drawing` (April 26 session 2)
- ✅ Rate limits: drawing (10/min), scholar brute-force (10/15min) (April 26 session 2)
- ✅ RLS on `scholar_readiness_snapshot` — scoped + FORCE + write revoke (April 26 session 2)
- ✅ Tara classifier homoglyph hardening (April 26 session 2)
- ✅ Anonymous Tara turnCount bypass closed — HttpOnly session cookie (April 26 session 2)
- ✅ CSP nonce-based script loading (April 26 session 3): proxy.ts generates per-request nonce → x-nonce header → layout.jsx applies to all <Script> tags; script-src uses nonce + strict-dynamic (no unsafe-inline); currently Report-Only. **User action**: set `CSP_ENFORCE=true` in Vercel env vars after 48h of clean violations.
- ✅ Zod validation extended (April 26 session 3): 22+ routes covered — parentGoalSchema, advanceSubjectSchema, ttsSchema, brevoSyncContactSchema, welcomeEmailSchema, firstQuizEmailSchema, scholarCreatedEmailSchema.
- ✅ Zod validation sweep complete (April 26 session 4): ALL body-reading routes now validated. Legacy email routes, weekly-digest, school-reminder, reminders upsert, goals toggle, exam-sittings action dispatch. Only exception: paystack/checkout (intentional inline domain checks).
- ✅ RLS corrective migration (April 26 session 3): `20260426_corrective_rls_fix.sql`. **User action**: paste into Supabase SQL editor + run verification query.
- ✅ `api/admin/flag-question` auth guard (April 26 session 3): was fully unprotected, anyone could bulk-delete question bank. Now gated behind `requireAdmin()`.
- ✅ Legacy `api/auth/route.js` disabled (April 26 session 3): replaced with 410 Gone (had token-in-URL leak + no validation).
- ✅ Cron timing attack closed (April 27 session 8, commit `955a448`): `src/lib/security/cronAuth.js` exports `authorizedCronRequest()` using `crypto.timingSafeEqual`. All four assign-* cron routes updated.
- ✅ Duplicate quest idempotency (April 27 session 8): preflight count check in `assign-daily`, `assign-weekly`, `assign-personalised` — skips scholar if active quests already exist for today/this week. Guards Vercel cron retries. `skippedCount` in response.
- ✅ Webhook annual+addon defense (April 27 session 8): after `sanitiseAddons()`, clear addons and log warn if `billing === 'annual'`. Defense in depth alongside checkout guard.
- ✅ List-Unsubscribe headers (April 27 session 8): `sendEmail()` accepts optional `headers` param. `BULK_UNSUBSCRIBE_HEADERS` constant exported with RFC 8058 one-click unsubscribe. Wired into weekly-digest cron send (Gmail bulk-sender compliance).
- ✅ Test infrastructure (#51, April 27 session 8 cont.): Vitest 2.x + coverage-v8. 163 tests across 4 files — taraClassifier (35), tierAccess (60), security/webhook (28), markingEngine (40). `npm test` / `npm run test:coverage`. Thresholds: lines ≥60%, functions ≥70%.
- ✅ CI pipeline (#52, April 27 session 8 cont.): `.github/workflows/ci.yml` — test + lint + build jobs on push/PR to main. Build job gated on test passing. Lint continue-on-error (advisory). Node 22 + npm ci cache.

### 🟢 Quiz Experience — Next Enhancements
- ✅ Mistake re-queue — complete (session 5): wrong questions injected before finish, cap 3, retry badge shown
- ✅ Session wrap-up screen — complete (session 5): per-topic bars, "Focus tomorrow", adaptive headline, XP display
- ✅ Live streak bar — complete (session 5): animated pill, scales on increment
- ✅ Level-up flash — complete (session 5): overlay at streak 3/5/7/10, auto-dismiss 2.2 s
- ✅ Concept cards wiring — complete (session 6): `ConceptSnapshot` inline component fetches GET `/api/concept-cards` on wrong answer (all 3 question types); shows loading skeleton then key_concept + best_example; silent 204 skip; cleared on question advance. Renders between explanation div and Tara EIB textarea.
- ✅ Formula/equation input — complete (session 7): `MathInput` component with 12-symbol toolbar; active for KS3+ maths free-text questions; cursor-position insert via selectionStart + rAF; falls back to plain input.
- ✅ Question palette — confirmed complete (session 7): already in `ExamRunner.jsx` — desktop sidebar (grid-cols-5) + mobile modal (grid-cols-6); blue/amber/green/slate states.
- ✅ KS1 accessibility — complete (session 7): voice readout via Web Speech API (en-GB); toggle in quiz header; "Read to me" pill on MCQ + free_text; speech cancelled on question change; SSR-safe guards.
- ✅ Interactive question types — complete (session 11): `OrderingQuestion` (tap-swap, Fisher-Yates shuffle), `NumberLineWidget` (click-to-snap, ε comparison), `FractionBarWidget` (click-to-toggle segments). All 3 follow standard wrong-answer pipeline (queueMistake + promoteMisconceptionQuestions + fetchConceptCard). Timer skipped for all 3. Data schema: ordering uses `q.items`+`q.correct_order`; number_line uses `q.number_line.{min,max,step,correct}`; fraction_bar uses `q.fraction.{numerator,denominator}`.
- ✅ Misconception selector — complete (session 11): `misconceptionMapRef` loaded from `question_misconceptions` table in background after session questions populate. `promoteMisconceptionQuestions` reorders remaining unasked questions sharing a misconception to immediately after current position on wrong answer. Wired into all 6 wrong-answer handlers. Fail-open — no effect until generator tags questions with misconception_ids.
- ✅ Pre-exam briefing card — complete (session 11): `ExamBriefing.jsx` shown between lobby and timer start. Stats, topic distribution, mode tips. Review mode skips briefing. `ExamOrchestrator` wired.
- ✅ Authoring pipeline for interactive types — complete (session 12): `generateQuestionsV2.mjs` extended with `ordering`/`number_line`/`fraction_bar` schema support. See session 12 notes below.
- ✅ Pre-teach overlay — complete (session 13): `PreTeachScreen` shown on questions where `p_mastery < 0.3`; concept card fetched from `/api/concept-cards`; `preTaughtTopicsRef` prevents repeat per session; cancel-safe useEffect.
- ✅ Avatar mood feedback — complete (session 13): `AvatarMomentWidget` pill (🚀/💪) shown in quiz header on every answer; 1.8 s auto-clear; wired into all 6 answer handlers.
- ✅ Mastery unlock ceremony — complete (session 13): `MasteryUnlockOverlay` on first topic crossing 80% in `finishQuest`; fires `notify-parent-mastery` Edge Function fire-and-forget.
- ✅ Tara whispers — complete (session 13): 7-string static array cycled by `qIdx % 7`; shown in all 4 wrong-answer panels; zero API cost.
- ✅ Parent termly report — complete (session 13): `GET /api/parent/termly-report?scholarId=` → self-contained branded HTML (6 KPI cards, subject bars, mastered topics, focus areas); ownership-gated; async blob download wired in parent dashboard.
- ✅ Practice trajectory widget — complete (session 13): `PracticeTrajectory.jsx` — linear regression over last 8 snapshots, 4-week projection, SVG sparkline; mounted below ReadinessScore in parent dashboard.
- ✅ Sibling Tara observation — complete (session 13): `buildTaraObservation()` 5-branch heuristic in `MultiChildComparison.jsx`; rendered as indigo pill below sibling grid.

### 🟢 Platform
- PWA offline mode (workbox + IndexedDB) — NG priority
- WhatsApp Business API distribution (NG)
- Phase 2 graphics: Phaser 3 boss battles + science simulations
- Scholar self-serve region-change flow

### UK Entity / Corporate Structure (Noted)
- UK Ltd recommended for SEIS/EIS angel fundraising
- Nigerian CAC subsidiary for Paystack compliance
- Commission logic deferred — needs partnership agreement per school; `school_partnerships` table planned

## Deployment Checklist
```bash
git add <files>
git commit -m "..."
git push origin main  # Vercel auto-deploys
# Migrations: supabase db push OR paste into SQL editor
```

**Critical env vars**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENROUTER_API_KEY`, `OPENAI_API_KEY`, `CRON_SECRET`, `BREVO_API_KEY`, `RESEND_API_KEY`, `APP_URL`

**Vercel-provided headers** (used by proxy.ts): `x-vercel-ip-country`, `x-real-ip`, `cf-connecting-ip`
