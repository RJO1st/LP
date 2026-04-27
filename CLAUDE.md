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

### April 27, 2026 (session 8) — Security + Reliability Audit: Critical + High Items

**Commit `955a448` — 4 verified bugs closed:**

1. **Cron timing attack (#48)**: `src/lib/security/cronAuth.js` — new shared helper `authorizedCronRequest()` using `crypto.timingSafeEqual`. Replaces naive `===` string comparison in all four assign-* cron routes (`assign-daily`, `assign-weekly`, `assign-personalised`, `assign-boss-battle`). Added `export const runtime = "nodejs"` to each (required for Node crypto module).

2. **Duplicate quests on Vercel retry (#49)**: Added idempotency preflight to `assign-daily`, `assign-weekly`, `assign-personalised`. Pattern: count active quests for scholar within today's window before inserting; skip with `skippedCount++` if already assigned. `assign-boss-battle` had this guard already. `assign-daily` also improved: bulk expire now targets `expires_at < today_start` (not inline per scholar), plus `export const runtime = "nodejs"`.

3. **Webhook annual+addon defense gap (#50)**: In `paystack/webhook/route.js`, after `sanitiseAddons()`, if `billing === 'annual' && addons.length > 0`: clear array, log `paystack_webhook_annual_addon_rejected` warning. Defense in depth alongside the checkout §1b guard (400 at purchase time).

4. **Weekly digest Gmail spam (#54)**: `sendEmail()` in `src/lib/email.js` now accepts optional `headers` param; Brevo API `headers` key only included when non-empty. `BULK_UNSUBSCRIBE_HEADERS` constant exported: `List-Unsubscribe` (https one-click + mailto fallback) + `List-Unsubscribe-Post: List-Unsubscribe=One-Click` (RFC 8058). Wired into weekly-digest cron `sendEmail()` call.

**No DB schema changes. No new API routes.**

### April 27, 2026 (session 7) — Quiz Polish: MathInput + KS1 Voice + Palette Confirmed

**`src/components/game/QuizEngine.jsx` — 3 features added (commit `39ade20`):**

1. **MathInput component** (KS3+ maths free-text): `<MathInput>` defined above `QuizEngine`. 12-symbol toolbar (², ³, √, π, ×, ÷, ±, ≤, ≥, ≠, ∞, °) inserts at cursor position via `selectionStart`/`selectionEnd` + `requestAnimationFrame`. Active when `qType === "free_text"` AND `isKS3Plus` (year ≥ 7) AND `isMathsSubj`. Falls back to plain `<input>` otherwise.

2. **KS1 voice readout** (year ≤ 2 only): `speakQuestion` callback wraps `SpeechSynthesisUtterance` (en-GB, rate 0.88, pitch 1.05). Speech cancelled on question change via `useEffect` cleanup on `qIdx`. Toggle button (VolumeIcon / VolumeOffIcon inline SVGs) in quiz header, visible to KS1 scholars only. "Read to me" pill added in both MCQ and free_text branches below the question h3. Both SSR-safe (`typeof window !== 'undefined'` guards).

3. **Question palette** — confirmed already complete in `ExamRunner.jsx`: desktop sidebar (w-64, grid-cols-5) + mobile modal (grid-cols-6). Color states: blue=current, amber=flagged, green=answered, slate=unanswered. No new code needed.

**New state/constants**: `voiceEnabled`, `scholarYear`, `isKS1`, `isKS3Plus`, `isMathsSubj`. New SVGs: `VolumeIcon`, `VolumeOffIcon`. No new API calls, no DB schema changes.

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
- Stripe server route for GB tier checkout + webhook (awaiting UK entity setup — see corporate structure notes)
- Webhook: updates `parents.subscription_tier` + `subscription_end` on payment success
- Anti-arbitrage: Paystack endpoint 403s if `parent.region !== 'NG'`; Stripe 403s for NG parents

### 🟡 WAEC/NECO Exam Papers
- Purchase Phase 1 papers from waecdirect.org (33 papers, ~₦33,000): Maths + English + Bio + Physics + Chemistry, 2019–2024
- Email NECO at info@neco.gov.ng for bulk educational licence
- Download Chief Examiner Reports (free, waecdirect.org → Reports section)
- Create `papers/waec/` and `papers/neco/` directories (gitignored)
- Run batch ingest: `node scripts/batchIngestWAEC.mjs --manifest scripts/waec_papers_manifest.csv --dry-run` first
- After QA: remove `--dry-run` and run overnight; ~$6 total LLM cost
- Full plan: `WAEC_NECO_INGESTION_PLAN.md`

### 🟡 Content — Explanation Quality (15,330 stubs)
- Script running: `node scripts/rewriteExplanations.mjs --limit=300` (British English, 300-word cap)
- Resume safety fixed (April 26): per-batch CSV flush — Ctrl+C loses ≤ 5 questions; restart correctly skips already-done IDs
- Consecutive-failure cooloff fixed: 3 network errors → 30 s cooloff per model; prevents flaky models looping
- After run completes: apply `scripts/output/explanation_rewrites.sql` to DB via Supabase SQL editor
- Remaining stubs: ~15,330 (< 80 chars); script targets avg_score < 2.9 queue first

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
- PDF export: teacher class report (print CSS exists; proper PDF generation TBD)
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

### 🟢 Quiz Experience — Next Enhancements
- ✅ Mistake re-queue — complete (session 5): wrong questions injected before finish, cap 3, retry badge shown
- ✅ Session wrap-up screen — complete (session 5): per-topic bars, "Focus tomorrow", adaptive headline, XP display
- ✅ Live streak bar — complete (session 5): animated pill, scales on increment
- ✅ Level-up flash — complete (session 5): overlay at streak 3/5/7/10, auto-dismiss 2.2 s
- ✅ Concept cards wiring — complete (session 6): `ConceptSnapshot` inline component fetches GET `/api/concept-cards` on wrong answer (all 3 question types); shows loading skeleton then key_concept + best_example; silent 204 skip; cleared on question advance. Renders between explanation div and Tara EIB textarea.
- ✅ Formula/equation input — complete (session 7): `MathInput` component with 12-symbol toolbar; active for KS3+ maths free-text questions; cursor-position insert via selectionStart + rAF; falls back to plain input.
- ✅ Question palette — confirmed complete (session 7): already in `ExamRunner.jsx` — desktop sidebar (grid-cols-5) + mobile modal (grid-cols-6); blue/amber/green/slate states.
- ✅ KS1 accessibility — complete (session 7): voice readout via Web Speech API (en-GB); toggle in quiz header; "Read to me" pill on MCQ + free_text; speech cancelled on question change; SSR-safe guards.

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
