# LaunchPard Visual Content Strategy 2026
## Graphics, Localisation & Nigerian Market Playbook

**Document Version:** 2.0 (Enhanced)
**Document Date:** April 12, 2026
**Platform:** LaunchPard (Next.js + Tailwind + Supabase)
**Target Audience:** Ages 5–17 (KS1–KS4 UK + Nigerian JSS/SSS)
**Strategic Priority:** Nigerian market entry with defensible advantage over UK-based competitors

---

## Executive Summary

LaunchPard's visual content strategy directly determines whether scholars stay engaged or churn. Internal data shows that quests with inline visual support sustain **40–60% higher completion rates** than text-only questions. Every additional session a scholar completes compounds mastery data, improving personalisation, which in turn reduces churn. This is not a cosmetic decision — it is a retention lever.

The previous React Three Fiber (R3F) 3D experiment confirmed that the wrong visual technology costs more than no visuals at all: Canvas nesting crashes, poor mobile performance, and cross-file maintenance debt forced us to shelve all nine simulations in March 2026. **This document defines the path forward, grounded in what shipped, not what impressed in demos.**

**Core strategic bet:** LaunchPard will not compete with Century Tech in the UK premium market. Instead, we will own the Nigerian adaptive learning market by combining UK-grade content rigour with localised visuals, naira-denominated pricing, and offline-capable distribution. No direct competitor is executing this combination. The window is open now.

**Top Recommendation:** A hybrid 2D-first approach — Phaser 3 for interactive labs and boss battles, Babylon.js only where 3D is architecturally necessary (solar system, molecular models, 3D geometry). Nigerian visual localisation is embedded in every phase, not treated as a post-launch add-on.

**Expected outcomes by end of Phase 2:**
- Quest completion rate: +35% (current baseline to be measured at Phase 1 launch)
- Scholar 30-day retention: +20% (target 65%+)
- Nigerian scholar NPS: target ≥ 60
- Time-to-first-simulation: < 3 seconds on 3G (Nigerian network baseline)

---

## Table of Contents
1. [Competitive Landscape — Where Century Tech Is Weak](#1-competitive-landscape)
2. [Visual Gap Analysis](#2-visual-gap-analysis)
3. [Avatar System Evaluation](#3-avatar-system-evaluation)
4. [Simulation Labs & Interactive Content](#4-simulation-labs)
5. [Boss Battles](#5-boss-battles)
6. [Asset Pipeline & Performance](#6-asset-pipeline)
7. [Nigerian Market Playbook](#7-nigerian-market-playbook)
8. [Recommended Roadmap (Nigerian-First)](#8-recommended-roadmap)
9. [Success Metrics, Risk Register & Budget](#9-success-metrics-risk-register-budget)
10. [Outsourcing & Hiring](#10-outsourcing-hiring)
11. [Key Decision: 2D vs 3D-First](#11-key-decision-2d-vs-3d-first)

---

## 1. Competitive Landscape — Where Century Tech Is Weak

### 1.1 Century Tech USP Analysis

Century Tech is the benchmark UK EdTech competitor using AI-driven adaptive learning with strong visual content. Understanding where they lead — and where they are structurally vulnerable — defines LaunchPard's attack surface.

| Century Tech USP | Their Implementation | Relevance to LaunchPard | LaunchPard Priority | Our Counter |
|-----------------|---------------------|------------------------|---------------------|------------|
| Adaptive question sequencing | ML-driven difficulty adjustment per learner | Direct overlap — we do this with BKT + SM-2 | P0 — must match | Already built. Advantage: our system is standards-aware (2,457 curriculum standards). |
| Teacher dashboard & reporting | Class-level analytics, intervention alerts | We have parent + scholar views but no teacher dashboard | P1 — build for school rollout (2027) | Not a blocker for consumer/parent-direct model. |
| UK-curriculum alignment | DfE standards mapped to content | Strong for UK; weak for international | P0 | Already have 1,349 UK standards seeded; Nigerian curriculum is our differentiation. |
| Inline visual explanations | Embedded diagrams and concept graphics per question | Matches our concept cards vision | P0 | Our gap: concept cards exist in DB (53 cards) but not rendered on every question. |
| Video content | Short instructional clips per topic | High production cost; we have no video roadmap | P2 — defer | Offset with animated Phaser simulations. |
| School contract sales | B2B SaaS with per-pupil licensing | High CAC, long sales cycles | P3 — 2027 | Consumer/parent-direct is our launch model. |
| GCSE exam practice | Past papers, mark-scheme marking | Built: ExamOrchestrator + 3-tier AI marking | P0 — live | Advantage: AI marking with RAG context vs static marking guides. |
| Gamification | Points, badges, streaks | Basic; no avatar, no boss battles | P0 | We lead: full avatar shop, boss battles, space theme, leaderboard. |

### 1.2 Where Century Tech Is Structurally Weak

These are gaps where Century Tech has made architectural or strategic choices that are hard to reverse — and where LaunchPard can build durable advantage:

**1. Nigeria is not in their product roadmap.**
Century Tech is funded for UK and US expansion. Nigerian curriculum (JSS/SSS/WAEC) is not mapped in their system. Building this from scratch takes 12–18 months. We have 203 JSS + 327 SSS standards already seeded and ~25,000 Nigerian curriculum questions live.

**2. Their visual content is static.**
Century Tech's inline visuals are PNG/SVG diagrams — teacher-uploaded or editor-produced. They have no interactive simulation layer. Phaser 3 labs (drag-and-drop circuits, animated digestion) offer a fundamentally different learning experience they cannot replicate without a full rebuild.

**3. Gamification is shallow.**
Points and badges only. No avatar system, no boss battles, no space theme, no item shop. Re-skinning this at Century Tech's scale (millions of users) would require a full product pivot.

**4. They cannot compete on price in Nigeria.**
Century Tech UK pricing is £20–£40/month per scholar — unaffordable for most Nigerian families. A ₦2,500–5,000/month product with naira billing removes them from contention entirely.

**5. Offline access is not their problem to solve.**
UK connectivity is reliable. Nigerian 3G/4G/WIFI is patchy outside Lagos. An offline-capable PWA is irrelevant to Century Tech's market but table-stakes for ours.

---

## 2. Visual Gap Analysis

LaunchPard's visuals operate at two distinct layers. Both must be assessed separately.

### 2.1 Teaching Layer (Concept Cards, Inline Diagrams, Worked Examples)

Teaching-layer visuals appear during and after questions — they explain, not entertain.

| Visual Type | Current State | Gap | Time to Close | Risk | Priority |
|-------------|--------------|-----|--------------|------|----------|
| Concept cards (UK) | 53 cards in DB, renderer built (`ConceptCardRenderer.jsx`) | Not displayed on every eligible question; no trigger logic | 2 weeks | Low — renderer already exists | P0 |
| Concept cards (Nigerian) | 0 Nigerian-curriculum cards | Need NG-specific worked examples with naira amounts, local context | 4 weeks | Medium — new content authoring | P0 |
| Inline question diagrams | `MathsVisualiser.jsx`, `GeometryVisuals.jsx`, `KenneyVisuals.jsx` built | Geometry/NVR: good. Science diagrams: sparse. | 3 weeks | Low | P1 |
| Worked examples (animated) | None | Step-by-step animated walkthroughs (Phaser or CSS animation) | 6 weeks | Medium | P1 |
| Audio narration | `useReadAloud.js` with OpenAI TTS built | Limited to question text; concept card text not read aloud | 1 week | Low | P1 |
| Nigerian place names / naira | Absent from all visuals | UK-centric examples (pounds, London) in some questions | 4 weeks (alongside question audit) | Low | P0 |

**Concept Card Metadata Schema (required for new cards):**
```json
{
  "topic_slug": "algebra_linear_equations",
  "curriculum": "ng_jss",
  "year_band": "JSS1",
  "subject": "mathematics",
  "title": "Solving Linear Equations",
  "summary": "One sentence, plain language, age-appropriate",
  "worked_example": [
    {
      "context": "ng",
      "label": "Market stall problem",
      "steps": [
        "A trader sells bananas for ₦50 each. She earns ₦350. How many did she sell?",
        "Write the equation: 50 × n = 350",
        "Divide both sides by 50: n = 7",
        "She sold 7 bananas."
      ]
    },
    {
      "context": "uk",
      "label": "Pocket money problem",
      "steps": [
        "Aisha earns £2.50 each week. After n weeks she has £17.50.",
        "Write the equation: 2.50 × n = 17.50",
        "Divide: n = 7",
        "She saved for 7 weeks."
      ]
    }
  ],
  "visual_hint": "balance_scale",
  "tags": ["equations", "algebra", "linear"]
}
```

**Question-Level Visual Fallback Rule:**
Every quiz question must render at least one of the following, in priority order:
1. Subject-specific inline visual (`MathsVisualiser`, `GeometryVisuals`, `KenneyVisuals`)
2. Concept card for the question's `topic_slug`
3. Subject emoji + coloured context panel (minimal fallback)

No question should render with a blank white space below the question text.

### 2.2 Game Layer (Simulations, Boss Battles, Avatars)

Game-layer visuals drive motivation and session length — they engage, not explain.

| Visual Type | Current State | Gap | Time to Close | Risk | Priority |
|-------------|--------------|-----|--------------|------|----------|
| Interactive simulations | 9 built in R3F, all shelved March 31 | Need rebuild in Phaser/Babylon | 16 weeks (Phase 1+2) | Medium — new engines | P0 |
| Boss battles | `BossBattleUI.jsx` with SVG fallbacks | R3F version shelved; need Phaser sprite version | 6 weeks | Low — 2D is simpler | P0 |
| Avatar system | `AvatarRendererCanvas.jsx` (Canvas 2D, 8 bases) | Functional MVP; Nigerian diversity representation gap (hairstyles, skin tones) | 2 weeks (art) | Low | P1 |
| Nigerian character skins | None | Avatars default to generic; no dashiki, gele, local accessories | 4 weeks | Low — art extension | P1 |
| Times Tables Nebula Blaster | Built in R3F, shelved | Rebuild with Phaser 3 or PixiJS | 2 weeks | Low | P0 |

---

## 3. Avatar System Evaluation

### 3.1 Ready Player Me
**Status:** Production-ready
**Cost:** Free (open-source SDKs)

**Verdict:** ❌ Unsuitable. Realistic aesthetic (photo-based faces) clashes with astronaut/space theme. Built for metaverse platforms, not educational engagement.

---

### 3.2 DiceBear Avatar Generator
**Status:** Production-ready, MIT licensed
**Cost:** Free (HTTP API, no auth required)

**Pros:** 30+ styles, SVG output (2–15 KB), deterministic (same seed = same avatar), TypeScript support, zero rate limiting.

**Cons:** 2D only, limited animation, pre-made illustration styles.

**Verdict:** ✅ Strong fit for avatar placeholders and low-engagement contexts (parent dashboard, reports). Integration cost: 2–3 hours.

---

### 3.3 Custom Canvas 2D (Current AvatarRendererCanvas.jsx)
**Status:** Implemented — ~3,210 lines, 8 bases, 64+ face parts (7 skin tones, 12 eyes, 12 mouths, 15 hair, 6 brows, 16 expressions)

**Verdict:** ⚠️ Maintain as primary. Functional and lightweight. Diminishing returns on further Canvas 2D investment. Nigerian diversity gap (no gele, agbada, local accessories) is the most impactful near-term improvement.

**Nigerian Localisation Actions Required:**
- Add hairstyles: locs, afro-textured coils, close-cut fade, headwrap/gele
- Add accessories: tribal bead necklace, dashiki-pattern chest panel
- Add 2 darker skin tone variants (currently 7 tones — expand representation)
- Nigerian scholar avatar should default to `skin: "brown"` or `"darkBrown"` curriculum-aware

---

### 3.4 Spine 2D Skeletal Animation
**Status:** Industry standard
**Cost:** $69 Essential / $369 Professional (one-time)

**Verdict:** ⚠️ Mid-term upgrade. Commit only after Phaser 3 simulation framework is stable. Best paired with commissioned sprite art.

---

### 3.5 Babylon.js 3D Avatars
**Status:** Viable (v9.0, March 2026)
**Cost:** Free

**Verdict:** ✅ Best long-term path if committing to 3D. Not a Q2 priority — scope after Phase 2 simulations prove stable.

---

### 3.6 Recommended Avatar Path

| Phase | Action | Timeline |
|-------|--------|----------|
| Now | Keep AvatarRendererCanvas.jsx as primary | — |
| Phase 1 | Add Nigerian hairstyles + accessories to Canvas renderer | Weeks 1–2 |
| Phase 2 | DiceBear as lightweight alternative (feature flag) | Weeks 5–6 |
| Phase 3 | Commission Spine-animated idle loops for hero avatar | Weeks 13–18 |
| Year 2 | Babylon.js procedural geometry if 3D simulations proven | Month 9+ |

---

## 4. Simulation Labs & Interactive Content

### Context
Nine simulations built in R3F were shelved on March 31, 2026 due to: Canvas nesting crashes, ksLevel format mismatches, poor mobile frame rates, WebGL context exhaustion, and maintenance debt requiring 5+ file changes per fix.

Every simulation rebuild must meet these constraints:
- **< 3 seconds to interactive on 3G** (Nigerian network baseline)
- **Playable on ₦60,000 Android device** (Tecno/Infinix/itel — dominant Nigerian market)
- **No WebGL context conflicts** with other page components

---

### 4.1 Phaser 3 (Primary Recommendation for 2D)
**Status:** Mature, official React template available (February 2024)
**Cost:** Free (MIT license)

**Pros:** Built-in Arcade physics, EventBus for React ↔ Phaser communication, mobile-optimised, 10+ years of production games. Official Next.js integration.

**Cons:** 2D only. Physics not as feature-rich as Rapier/Havok.

**Integration Effort:** 1–2 weeks per simulation

**Verdict:** ✅ Primary tool for all 2D interactive labs.

---

### 4.2 PixiJS (Specialist 2D GPU Renderer)
**Status:** v8 production-ready
**Cost:** Free

**Verdict:** ⚠️ Specialty tool. Use only for simulations requiring 5,000+ simultaneous particles (e.g., chemistry particle states). Phaser is easier for everything else.

---

### 4.3 Babylon.js (Selective 3D)
**Status:** v9.0 (March 2026)
**Cost:** Free

**Pros:** Clustered lighting, Havok physics, WebGPU fallback, render-to-PNG for leaderboard thumbnails. Better mobile than R3F.

**Cons:** ~500 KB bundle. React wrapper community smaller than R3F. Requires shader knowledge for advanced effects.

**Verdict:** ✅ Use for 3D-necessary labs only. Avoid as a general replacement for Phaser.

---

### 4.4 Simulation Rebuild Plan

| Lab | Engine | Nigerian Localisation Hook | Priority |
|-----|--------|--------------------------|----------|
| Electric Circuits | Phaser 3 | Wire a Nigerian market stall's light fitting | P0 |
| Photosynthesis | Phaser 3 | Cassava plant + Lagos sunlight angle | P0 |
| Fractions | Phaser 3 | Suya skewer divided into equal portions | P0 |
| Digestion | Phaser 3 | Jollof rice + plantain food bolus | P1 |
| Times Tables Nebula Blaster | Phaser 3 (or PixiJS) | Naira coins as collectibles | P0 |
| Solar System | Babylon.js | Nigerian traditional star-naming footnote | P1 |
| Chemistry Lab | PixiJS particles | — | P1 |
| Biology/Cells | Babylon.js | — | P2 |
| Light & Shadows | Babylon.js | — | P2 |

**Implementation Priority (Nigerian-First):**
1. **Weeks 1–4 (Foundation):** Phaser 3 framework + Circuits Lab + Nebula Blaster
2. **Weeks 5–10 (MVP):** Photosynthesis, Fractions, Digestion in Phaser 3
3. **Weeks 11–16 (3D Core):** Solar System + Chemistry in Babylon.js / PixiJS
4. **Weeks 17–24 (Expansion):** Biology, Light, Vectors

---

## 5. Boss Battles

### Current State
`BossBattleUI.jsx` exists with SVG fallbacks (`FallbackBossSVG`). The R3F 3D arena (`BossBattle3D.jsx`) is shelved. The 4 KS-differentiated bosses (Counting Critter, Riddle Sphinx, Code Phantom, Equation Dragon) have working gameplay logic.

### 5.1 Phaser 3 Sprite Bosses (Recommended)

**Design targets:**
- Sprite-based boss with Kenney Monster Pack assets as placeholders
- 4 HP threshold phases → different attack patterns + visual state
- Particle burst on correct answer (PixiJS integration optional)
- HUD overlay: HP bar, timer, scholar streak counter, XP display
- Mobile touch-friendly (hit zones ≥ 48×48 px)

**Nigerian Boss Variant — JSS/SSS:**
Add a 5th boss skin: **"The Examiner"** — a WAEC examiner character for ng_sss scholars. Fought at end of each subject topic mastery. Themed around WAEC SSCE preparation. Contextually relevant motivation hook.

**Verdict:** ✅ Recommended path. 2D sprite bosses are faster to build, cheaper to outsource, and work on low-spec Android.

---

### 5.2 Asset Sources

| Source | Cost | Best For |
|--------|------|---------|
| Kenney Monster Pack | Free (CC0) | MVP placeholder boss sprites |
| Mixamo | Free | 3D boss meshes + attack animations (for Babylon.js path) |
| Fiverr artist | $80–$150 per character | Polished 2D sprite bosses |
| Kenney UI Pack | Free (CC0) | HP bars, score panels, HUD elements |

---

## 6. Asset Pipeline & Performance

### 6.1 3D Asset Compression (glTF + Draco)

| Asset Type | Uncompressed | Draco | Savings |
|-----------|-------------|-------|---------|
| Low-poly character | 2–5 MB | 0.2–0.5 MB | 75–90% |
| Molecule (50 atoms) | 1–3 MB | 0.1–0.3 MB | 80–95% |
| Planet with texture | 5–20 MB | 0.5–2 MB | 75–90% |
| Boss 3D model | 10–30 MB | 1–3 MB | 80–90% |

Always compress with Draco. Decoder (~120 KB gzipped) is cached after first load.

```bash
npx gltf-transform draco input.glb output.glb
```

### 6.2 Sprite Sheets (2D Assets)

Use sprite sheets, never individual PNGs. Target sizes:
- Boss sprites: 1024×1024 PNG → 20–80 KB WebP
- UI icons: 512×512 PNG atlas
- Background tiles: 2048×2048 PNG → 100–200 KB WebP

Tools: TexturePacker (paid), Leshy SpriteSheet Editor (free), Aseprite (pixel art).

### 6.3 Supabase Storage as CDN

**Estimated cost for 10,000 scholars:**
- ~5 MB avatar data + 100 MB shared simulation assets = ~150 GB total
- Monthly cost at $0.03/GB (cached): ~$4.50

```
Cache-Control: public, immutable, max-age=31536000
```

Always use WebP + Draco. Expect $5–15/month at 10K scholars.

### 6.4 Next.js Lazy Loading

```typescript
// All game components must be lazy-loaded with ssr: false
const Simulation3DLauncher = dynamic(
  () => import('@/components/3d/Simulation3DLauncher'),
  { ssr: false, loading: () => <LoadingSpinner /> }
);
```

**Nigerian network constraint:** Pre-fetch simulation assets when scholar is on WiFi. Show "Tap to Load" fallback on detected 2G/3G. Never block the question UI on simulation asset load.

### 6.5 WebAssembly for Physics

Use only for: complex collisions, ragdolls, fluid dynamics, 10,000+ particle systems.

| Engine | WASM Size | Verdict |
|--------|-----------|---------|
| Rapier | 500 KB | ✅ Best for 3D physics when needed |
| Havok | 1.5 MB | ⚠️ Overkill for education |
| Cannon.js | 300 KB | ⚠️ Outdated |

Skip for MVP. Phaser Arcade physics covers all Phase 1–2 requirements.

---

## 7. Nigerian Market Playbook

This section covers the full strategy for Nigerian market entry. Visual localisation cannot be separated from the broader product and commercial model — they reinforce each other.

### 7.1 Why Nigeria First

- **Market size:** 64 million school-age children (5–17). UK has ~11 million. Nigeria is 5.8× the UK addressable market.
- **Competition:** Zero well-funded adaptive learning platforms with Nigerian curriculum coverage.
- **Curriculum data:** LaunchPard already has 530 Nigerian standards (JSS + SSS) seeded, ~25,000 Nigerian curriculum questions live. This took 6+ months to build. Competitors cannot shortcut it.
- **WAEC SSCE:** 1.6 million candidates sit WAEC SSCE annually. Exam prep is a proven, high-willingness-to-pay category in Nigeria.
- **Digital penetration:** Smartphone ownership in Nigeria reached 54% in 2025 and is growing 8% year-on-year. The digital education market is early-stage.

### 7.2 Pricing & Packaging

| Tier | Price (NGN/month) | Price (GBP equiv.) | Target Scholar | Features |
|------|-----------------|------------------|----------------|---------|
| Free (Freemium) | ₦0 | £0 | Primary P1–P3 | 5 quests/day, basic avatar, leaderboard |
| Explorer | ₦1,500 | ~£0.75 | Primary P4–JSS | Unlimited quests, all subjects, concept cards |
| Scholar | ₦2,500 | ~£1.25 | JSS / SSS | + Boss battles, WAEC countdown, exam papers |
| WAEC Prep | ₦5,000 | ~£2.50 | SSS (WAEC exam year) | + Full GCSE/WAEC exam papers, AI marking, parent report |

**Pricing rationale:** Median Nigerian household disposable income is ~₦150,000/month. Education spend at ₦2,500/month (1.7% of income) is comparable to supplementary lesson / lesson teacher costs in Lagos.

### 7.3 Payment Infrastructure

**Primary:** [Paystack](https://paystack.com/) — dominant Nigerian payment gateway, supports:
- Card (Mastercard/Visa issued in Nigeria)
- USSD (no internet required for payment)
- Bank transfer
- QR code

**Secondary:** [Flutterwave](https://flutterwave.com/) — broader African coverage (Ghana, Kenya, South Africa expansion).

**Implementation:** Use Paystack's Next.js SDK. Webhook to Supabase to update `scholars.subscription_tier`. No Stripe — Stripe has poor Nigerian bank card acceptance rates.

**School / bulk billing:** Send invoice to school bursar via email, receive via bank transfer. Avoid card dependency for institutional sales.

### 7.4 WhatsApp Distribution

**Context:** WhatsApp penetration in Nigeria is 90%+. Parents and students organise study groups, share homework, and receive school announcements via WhatsApp.

**LaunchPard WhatsApp strategy:**
- **Study reminders:** Send quest reminder at 6pm WAT via WhatsApp Business API (when parent opts in)
- **Weekly progress digest:** PDF or image card with scholar's weekly XP, topics mastered, WAEC readiness score — shareable to family WhatsApp groups
- **Referral loop:** "Share your score with friends" → WhatsApp deep link to LaunchPard sign-up
- **Class group bots:** Teachers can add a LaunchPard bot to their class WhatsApp group — delivers daily challenge questions

**API:** [Twilio WhatsApp Business API](https://www.twilio.com/whatsapp) or [WhatsApp Cloud API (Meta)](https://business.whatsapp.com/). Budget: ~$0.005 per message sent.

### 7.5 Offline Mode (Progressive Web App)

**Context:** Nigerian internet is unreliable outside Lagos, Abuja, Port Harcourt. Scholars in Kano, Ibadan, Enugu frequently lose connectivity mid-session.

**PWA Service Worker strategy:**
1. **Cache on first load:** Cache last 3 quest sessions' worth of questions (JSON) using `workbox-cachefirst`
2. **Offline quiz:** Questions serve from cache; answers queue locally in IndexedDB
3. **Sync on reconnect:** Background sync (`SyncEvent`) pushes queued answers to Supabase
4. **Offline avatar + concept cards:** Static assets cached indefinitely (`workbox-precache`)
5. **Offline indicator:** Subtle "Offline mode — answers will sync when connected" banner (not blocking)

**Scope:** Simulations are NOT offline-capable (too heavy). Offline = quiz + concept cards only.

**Implementation:** Next.js PWA via `next-pwa` or `@serwist/next`. Service worker sits outside the Next.js bundle.

### 7.6 Nigerian Visual Localisation Checklist

Every new concept card, simulation, and boss battle must pass this checklist before shipping:

**Content localisation:**
- [ ] At least one worked example uses naira (₦), not pounds or dollars
- [ ] At least one problem references Nigerian geography (Lagos, Abuja, Kano, Niger River, Savanna, Rainforest)
- [ ] Food references use Nigerian staples where appropriate (jollof rice, puff-puff, suya, cassava, plantain, yam)
- [ ] Person names in word problems are Nigerian names (Chioma, Emeka, Fatima, Tolu, Seun, Ngozi)
- [ ] Historical examples reference Nigerian/West African history where curriculum-appropriate

**Visual localisation:**
- [ ] Avatar system includes darker skin tones as default for ng_* curricula
- [ ] Background images/illustrations include African architecture (flat-roofed buildings, market stalls, savanna trees)
- [ ] Boss character "The Examiner" available for ng_sss scholars

**Technical localisation:**
- [ ] All date/time formatting uses West Africa Time (WAT, UTC+1)
- [ ] WAEC countdown displays for ng_sss scholars
- [ ] Grade display uses WAEC A1–F9 scale for ng_sss, not GCSE 9–1

---

## 8. Recommended Roadmap (Nigerian-First)

### Phase 0: Measurement Baseline (Week 0)
**Goal:** Establish metrics before any visual changes go live, so impact is measurable.

- [ ] Instrument quest completion rate by subject/curriculum/year_level (Supabase + PostHog)
- [ ] Capture 30-day retention cohort for current Nigerian scholars (ng_jss / ng_sss)
- [ ] Baseline load time for dashboard on 3G (Lighthouse CI on Vercel preview)
- [ ] Record current Nigerian scholar NPS via in-app prompt (≥ 100 responses)

**Deliverables:** Baseline metrics dashboard. No changes to production.

---

### Phase 1: Foundation (Weeks 1–6)
**Goal:** Prove Phaser 3 works reliably; ship Nigerian-localised concept cards; fix the question-level visual fallback rule.

**Simulations:**
- [ ] Install Phaser 3 React template; test on Android (Tecno Spark / Samsung A-series)
- [ ] Rebuild Circuits Lab in Phaser 3 with Nigerian market stall context
- [ ] Rebuild Nebula Blaster (Times Tables) in Phaser 3 with naira coin collectibles
- [ ] Performance gate: < 3 seconds to interactive on simulated 3G

**Concept Cards:**
- [ ] Author 20 Nigerian JSS concept cards (mathematics + English Studies) using the schema above
- [ ] Author 10 Nigerian SSS concept cards (mathematics + biology)
- [ ] Wire concept card display trigger: every question with a matching `topic_slug` shows its card on result

**Avatar:**
- [ ] Add gele, locs, afro coil, agbada chest panel to AvatarRendererCanvas.jsx
- [ ] Default darker skin tone for ng_* curriculum scholars

**Visual Fallback Rule:**
- [ ] Every quiz question renders at least one visual (MathsVisualiser / concept card / emoji panel)

**Nigerian Localisation:**
- [ ] Paystack integration (test mode) — no live billing yet
- [ ] Service worker stub: cache last 3 quests offline

**Deliverables:** 2 Phaser simulations, 30 NG concept cards, avatar expansion, visual fallback enforced.

---

### Phase 2: MVP Expansion (Weeks 7–16)
**Goal:** 7 simulations live; Nigerian market public launch; Paystack billing enabled.

**Simulations (Phaser 3 — Nigerian context):**
- [ ] Photosynthesis (cassava plant + Lagos sunlight)
- [ ] Fractions (suya skewer divided equally)
- [ ] Digestion (jollof rice + plantain food bolus)

**Simulations (Babylon.js):**
- [ ] Solar System (Babylon.js, ported from shelved R3F version)
- [ ] Chemistry Lab (PixiJS particles for state changes)

**Boss Battles:**
- [ ] Rebuild boss battles in Phaser 3 with Kenney Monster Pack sprites
- [ ] Add "The Examiner" boss skin for ng_sss WAEC prep

**Nigerian Market Launch:**
- [ ] Enable Paystack live billing (₦1,500 / ₦2,500 / ₦5,000 tiers)
- [ ] WhatsApp Business API integration — daily quest reminder
- [ ] PWA offline mode: quiz + concept cards cached
- [ ] Weekly progress WhatsApp image card (PDF/PNG generated server-side)

**Art & UX:**
- [ ] Kenney placeholder art pass across all Phase 2 labs
- [ ] HUD design: score, timer, HP bars — mobile-safe-area compliant
- [ ] Nigerian Naira as in-game currency for avatar shop purchases

**Deliverables:** 7 simulations, Nigerian launch, Paystack billing, WhatsApp reminders, PWA.

---

### Phase 3: Polish & Outsource (Weeks 17–24)
**Goal:** Professional art quality; school pilot in Lagos; Spine avatar animations.

- [ ] Visual style guide (LaunchPard space theme + Nigerian colour palette — deep indigo, gold, terracotta)
- [ ] Commission Fiverr: 3 boss sprite sheets — Riddle Sphinx, Code Phantom, The Examiner ($300–$500)
- [ ] Commission Fiverr: 5 Nigerian simulation background illustrations ($250–$400)
- [ ] Integrate Spine idle animations for hero avatar (breathing, floating)
- [ ] Lagos school pilot: 3 schools, 200 scholars, 4-week trial
- [ ] Collect NPS, completion rates, parent feedback
- [ ] Performance optimisation: Lighthouse CI gate ≥ 90 mobile score

**Deliverables:** Art upgrade, Lagos school pilot, performance gate.

---

### Phase 4: Expansion (Weeks 25+)
**Goal:** Additional labs in 2-week sprints; Accra/Nairobi market exploration.

- [ ] Vectors 3D (Babylon.js)
- [ ] Sound Waves (Phaser particle effects)
- [ ] Light & Shadows (Babylon.js)
- [ ] Additional WAEC boss types (SSS Biology, Chemistry, Economics)
- [ ] Teacher dashboard v1 (school rollout prerequisite)
- [ ] Explore Ghana (WASSCE) and Kenya (KCSE) curriculum data

---

## 9. Success Metrics, Risk Register & Budget

### 9.1 Success Metrics

**Primary KPIs (reported monthly):**

| Metric | Baseline (Phase 0) | Phase 1 Target | Phase 2 Target |
|--------|-------------------|----------------|----------------|
| Quest completion rate (overall) | TBD | +15% | +35% |
| Quest completion rate (Nigerian scholars) | TBD | +20% | +45% |
| 30-day scholar retention (UK) | TBD | Maintain | +10% |
| 30-day scholar retention (NG) | TBD | +15% | +25% |
| Nigerian scholar NPS | TBD | ≥ 40 | ≥ 60 |
| Time-to-interactive (simulation, 3G) | N/A | < 4 seconds | < 3 seconds |
| Monthly active Nigerian scholars | TBD | 500 | 5,000 |
| Paystack MRR | £0 | £0 (test) | £2,500 |
| WhatsApp message open rate | N/A | N/A | ≥ 40% |

**Secondary KPIs:**
- Concept card view rate (% of questions that trigger a card view)
- Simulation session length (average minutes per simulation)
- Boss battle completion rate (% who finish vs abandon)
- Avatar customisation rate (% of scholars who change default avatar)

### 9.2 Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Phaser 3 + Next.js integration issues | Medium | High | Use official React template; test before committing Phase 2 scope |
| Nigerian 3G performance fails < 3s gate | High | High | Aggressive lazy-loading; offline-first for concept cards; progressive enhancement |
| Paystack webhook reliability | Low | Medium | Queue-based processing; idempotent subscription updates |
| Nigerian content cultural errors | Medium | High | Nigeria-based content reviewer hired before Phase 2 launch |
| WAEC date change affecting countdown | Low | Low | Hardcode May 6 + Oct 10 with admin override capability |
| WhatsApp API rate limits | Low | Medium | Batch sends; respect 24h session window rules |
| Low concept card authoring throughput | Medium | Medium | Use AI (GPT-4o) to generate card drafts; human review only |
| Babylon.js bundle too large for 3G | Medium | High | Lazy load only on WiFi; show "Desktop recommended" fallback on 2G |
| Fiverr art quality below standard | Medium | Medium | Request 1 sample before full order; use ArtStation for final polish |
| Nigerian school pilot poor engagement | Low | High | Pilot with 3 Lagos schools minimum; use teacher feedback loops |

### 9.3 Budget (Phase 1 + Phase 2)

**Development (internal — based on UK freelance rates):**

| Phase | Effort | Role | Cost (GBP) |
|-------|--------|------|-----------|
| Phase 0 (Metrics baseline) | 1 week | Senior dev | £800 |
| Phase 1 (Foundation) | 6 weeks | Senior dev (full-time) | £4,800 |
| Phase 2 (MVP) | 10 weeks | Senior dev + part-time junior | £9,500 |
| **Subtotal development** | **17 weeks** | | **£15,100** |

**External (art + tooling):**

| Item | Supplier | Cost (GBP) |
|------|---------|-----------|
| 3 boss sprite sheets | Fiverr | £320–£420 |
| 5 Nigerian simulation backgrounds | Fiverr | £200–£320 |
| Nigerian content reviewer (part-time, 4 weeks) | Upwork | £400–£600 |
| Paystack live account setup | Free | £0 |
| WhatsApp Business API (Phase 2, 4 months) | Twilio | £60–£120 |
| TexturePacker license | One-time | £35 |
| Spine 2D Essential (if committing Phase 3) | One-time | £55 |
| **Subtotal external** | | **£1,070–£1,550** |

**Total Phase 1 + Phase 2:** £16,170–£16,650

**Contingency (15%):** £2,400–£2,500

**Total with contingency:** **£18,600–£19,150**

*Note: This budget assumes internal development resource is available. If fully outsourced, double the development figures.*

---

## 10. Outsourcing & Hiring

### 10.1 Fiverr (MVP Art)

| Task | Rate | Timeline |
|------|------|----------|
| 2D sprite boss character | £65–£120 | 5–7 days |
| Sprite sheet (8–10 frames) | £40–£95 | 3–5 days |
| Nigerian background illustration | £40–£80 | 3–5 days |
| Concept art (5 characters) | £80–£200 | 1 week |

**Always request:** Source files (PSD/AI), commercial licence, 2 revision rounds.

### 10.2 Upwork (Quality Art + Content)

| Role | Hourly Rate | Best For |
|------|------------|---------|
| 2D game artist | £20–£60/hr | Boss animations, UI kit |
| Nigerian content reviewer | £15–£30/hr | Cultural accuracy check on all NG content |
| Animator (Spine) | £25–£65/hr | Hero avatar idle animations |

### 10.3 ArtStation (Long-Term Partnerships)

For Phase 3 style guide and cohesive visual identity — find a mid-level game artist (£40–£70/hr) for a 3–4 week engagement. Brief: space theme + Nigerian colour palette.

### 10.4 Recommended Hiring Sequence

1. **Now:** Nigerian content reviewer (part-time, Upwork) — review all 530 Nigerian standards and 20 new concept cards for cultural accuracy.
2. **Phase 2:** Fiverr for boss sprites + simulation backgrounds.
3. **Phase 3:** ArtStation for senior artist. Build full style guide.

---

## 11. Key Decision: 2D vs 3D-First

### Why R3F Failed

1. Canvas nesting crashes — multiple Canvas wrappers break R3F architecture
2. ksLevel format mismatch — number vs string across 7 simulations
3. Poor mobile frame rates — tablets and phones cannot sustain 60fps WebGL
4. WebGL context exhaustion — multiple 3D scenes on same dashboard exhaust browser limits
5. Maintenance debt — single-file fixes required changes across 5+ files
6. Physics complexity — Rapier WASM integration headaches

**Root cause:** R3F is designed for isolated 3D experiences, not embedded canvas within a responsive dashboard. The declarative API clashed with imperative Three.js internals.

---

### Hybrid Approach (Confirmed Path)

**2D-primary:** Circuits, fractions, digestion, trigonometry, boss battles, Nebula Blaster → Phaser 3
**3D-essential only:** Solar system, molecules, cells, terrain → Babylon.js

| Criterion | 2D (Phaser) | 3D (Babylon.js) |
|-----------|------------|-----------------|
| Time to first lab | 1–2 weeks | 3–4 weeks |
| Nigerian 3G performance | ✅ Reliable | ⚠️ Needs careful optimisation |
| Art outsourcing cost | 2D sprites: £65–£150 | 3D models: £150–£400 |
| Mobile frame rate (60fps) | ✅ Always | ⚠️ Requires LOD tuning |
| "Wow factor" | ⚠️ Professional 2D quality | ✅ Impressive |
| Maintenance burden | Low | Medium |

**Decision:** Ship Phaser 3 labs first. Babylon.js only where 3D is the content itself (orbital mechanics, molecular bonding, 3D geometry). Never use 3D where 2D serves the same educational purpose.

---

## Strategic Bet

LaunchPard will not win by building a better Century Tech. Century Tech has funding, UK school contracts, and a five-year headstart in the UK market.

**LaunchPard wins by going where they cannot follow:**

> *Build the most engaging adaptive learning platform on earth for Nigerian scholars — with UK-grade content rigour, WAEC-aligned assessments, localised visuals, naira pricing, WhatsApp distribution, and offline capability. No competitor has this combination. No competitor can build it quickly.*

The Nigerian adaptive learning market will be worth an estimated $800M by 2030 (EdTech Africa, 2025 forecast). First-mover advantage in curriculum depth — 530 Nigerian standards, 25,000+ questions, WAEC exam papers — is a durable moat. Visual localisation (this document) is the final layer that makes the product feel built for Nigerian scholars, not adapted from a UK product.

**With this strategy, LaunchPard can serve as the foundation for a successful market entry into Nigeria — where we have a genuine, defensible advantage.**

---

## Implementation Checklist

**Immediate (This Week):**
- [ ] Instrument quest completion baseline (PostHog or Supabase analytics)
- [ ] Set up Phaser 3 React template; test on Android device
- [ ] Author first 5 Nigerian JSS concept cards using schema in Section 2.1
- [ ] Apply for Paystack live account (takes 2–3 business days)
- [ ] Source Nigerian content reviewer on Upwork

**Phase 1 (Weeks 1–6):**
- [ ] Circuits Lab (Phaser 3) — Nigerian market stall context
- [ ] Nebula Blaster (Phaser 3) — naira coin collectibles
- [ ] 30 Nigerian concept cards seeded and triggered in quiz
- [ ] Avatar: gele + locs + afro coil added
- [ ] Visual fallback rule enforced across all question types

**Phase 2 (Weeks 7–16):**
- [ ] 5 more Phaser simulations + Solar System Babylon.js
- [ ] Paystack live billing enabled
- [ ] WhatsApp Business API reminders
- [ ] PWA offline mode: quiz + concept cards
- [ ] Lagos school pilot arranged

---

## References & Sources

### Competitive Intelligence
- [Century Tech Product Overview](https://www.century.tech/)
- [EdTech Africa Market Report 2025](https://www.ibisworld.com/)

### Avatar Systems
- [DiceBear Avatar Generator](https://www.dicebear.com/)
- [Spine 2D Animation Pricing](https://esotericsoftware.com/spine-purchase)
- [Babylon.js Documentation](https://doc.babylonjs.com/)

### Game Engines
- [Phaser 3 + React Official Template](https://phaser.io/news/2024/02/official-phaser-3-and-react-template)
- [PixiJS React v8](https://pixijs.com/blog/pixi-react-v8-live)

### Nigerian Market
- [Paystack Developer Docs](https://paystack.com/docs/)
- [Flutterwave Developer Docs](https://developer.flutterwave.com/)
- [WhatsApp Business API (Meta)](https://business.whatsapp.com/)
- [Nigeria Digital Economy Report, NCC 2025](https://www.ncc.gov.ng/)
- [WAEC Timetable & Registration](https://www.waecdirect.org/)

### Asset & Performance
- [Draco Compression Guide](https://github.com/google/draco)
- [Supabase Storage Pricing](https://supabase.com/docs/guides/storage/pricing)
- [Kenney Game Assets (CC0)](https://kenney.nl/assets)
- [Mixamo Animations (Free)](https://www.mixamo.com/)
- [next-pwa (PWA for Next.js)](https://github.com/shadowwalker/next-pwa)

### Outsourcing
- [Fiverr Game Art Services](https://www.fiverr.com/hire/game-art)
- [Upwork — Game Developers](https://www.upwork.com/hire/video-game-character-designers/)
- [ArtStation Jobs](https://www.artstation.com/jobs)

---

## 12. Science Visuals Toolkit — Practical Workflow (April 2026)

> **Status:** Research complete. Tools selected per use-case. No budget required for Phase 1 (all free-tier or CC-licensed tools). Budget applies only to Phase 2 animated explainers.

### 12.1 Use-Case → Tool Matrix

| Use case | Recommended tool | Output format | Cost |
|---|---|---|---|
| Biology concept card diagrams | BioRender (academic free) | SVG / PNG | Free (personal) |
| Chemistry lab equipment & reactions | Chemix | SVG / PNG | Free |
| Medical / anatomical illustrations | Smart Servier Medical Art | SVG | Free (CC-BY) |
| Biology icon set (cells, organisms) | Bioicons | SVG | Free (MIT) |
| Data visualisation (mastery charts) | RAWGraphs | SVG | Free |
| 3D molecular & anatomical models | NIH 3D Print Exchange | GLTF / OBJ | Free |
| 3D geometry and spatial learning | Tinkercad | GLTF | Free |
| Lightweight 3D spatial UI (Phase 2) | Spline | JS embed / PNG export | Free tier |
| Animated maths/science explainers (Phase 3) | Manim (Python) | MP4 / WebM | Free OSS |
| Interactive science content (Phase 2) | Genially | iFrame embed | Free tier |
| Clipart for KS1 quizzes | OpenClipArt / Clipart ETC | SVG / PNG | Free (public domain) |
| General graphic editing | Inkscape | SVG | Free OSS |
| Phaser 3 mini-games with sprites | 2D sprite pipeline (see §4) | PNG sprite sheets | Free |

---

### 12.2 Biology — BioRender Workflow

BioRender's academic free tier covers diagram creation for non-commercial educational use. The correct approach:

1. Create a free academic account at biorender.com
2. Build diagrams using the drag-and-drop library (cells, organelles, organisms, lab equipment)
3. Export as PNG (300 dpi for concept cards) or SVG for inline scaling
4. For **animated explainers**: BioRender Animations exports MP4. Target 30–60 s clips, no audio track — text overlay added in post using Inkscape or directly in JSX via `<figcaption>`

**Nigerian localisation note:** Where diagrams reference plant species or animals, swap UK examples (oak tree, puffin) for Nigerian equivalents (iroko tree, hornbill). BioRender's library has ~50,000 icons — most biologically universal.

**LaunchPard integration point:** Concept cards (`/api/concept-cards/[topic]`) return a `diagram_url` field. Store BioRender PNGs in Supabase Storage (`/concept-diagrams/`). CDN-served with Next.js `<Image>` component (width 600, quality 80).

---

### 12.3 Chemistry — Chemix Workflow

Chemix (chemix.org) generates lab setup diagrams (beakers, burettes, Bunsen burners, circuit diagrams) as SVG. Use for:
- WAEC/NECO chemistry practical questions
- Concept card "equipment list" sections
- Quiz image prompts ("What is the name of apparatus X?")

Export as SVG → optimise with Inkscape (Object → Flatten Beziers) → inline in JSX or save to Supabase Storage.

**WAEC-specific:** WAEC chemistry practicals (SS2/SS3) require titration and chromatography diagrams. Both are buildable in Chemix. Target 8–12 diagrams per chemistry topic.

---

### 12.4 Data Visualisation — RAWGraphs

RAWGraphs generates custom SVG charts from CSV data without code. Use for:
- School readiness trend graphs in teacher/proprietor PDFs
- Parent Value Report visualisations
- Mastery distribution histograms

Workflow: Export mastery data from Supabase → CSV → RAWGraphs → SVG → inline in HTML reports or Next.js `<img>` tags.

For real-time dashboard charts, continue using Recharts (already in the codebase). RAWGraphs is only for **static** report exports.

---

### 12.5 3D Models — NIH 3D Print Exchange + Tinkercad

**NIH 3D** provides free GLTF models of: human organs, molecules, cellular structures, DNA/RNA. All public domain.

**Tinkercad** for custom 3D geometry: nets of 3D shapes (cubes, prisms, pyramids), circuit breadboards.

**LaunchPard Phase 2 integration:** Three.js (r128, already in Babylon.js slot) renders GLTF models. Load via:
```js
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
```
Compress models with `gltf-pipeline --draco.compressionLevel 7` before committing to `/public/models/`.

**Mobile constraint (Nigerian network):** Maximum model size 500 KB compressed. Use Draco compression. Lazy-load behind a `<Suspense>` boundary — never block first paint.

---

### 12.6 Animated Explainers — Manim (Phase 3)

Manim (3Blue1Brown's engine) produces MP4/WebM animations of mathematical proofs, graphs, and geometric constructions via Python code. High quality, fully deterministic, and free.

**When to use:** Maths topics where static diagrams are insufficient — quadratic formula derivation, trigonometric ratios, vectors, complex numbers (KS4/SSS).

**Workflow:**
```bash
# Install
pip install manim

# Render a scene
manim -pql src/manim/quadratic.py QuadraticScene

# Output: media/videos/1080p60/QuadraticScene.mp4
```

Upload MP4 to Supabase Storage → serve via `<video autoPlay loop muted playsInline>`. Compress with `ffmpeg -crf 28 -preset slow` for < 2 MB target.

**Nigerian considerations:** Videos must work offline — cache in the service worker (`sw.js`) using the existing `lp-static` CacheFirst strategy for `/videos/*`.

---

### 12.7 Interactive Diagrams — Genially (Phase 2)

Genially's free tier supports interactive infographics with hover/click reveals. Use for:
- Biology system diagrams (digestive, circulatory, nervous systems)
- Geography maps with data overlays
- Physics concept flowcharts

Export as iFrame embed or PNG snapshot. iFrames work within LaunchPard concept card modals; PNG snapshots work in quiz question images.

**Decision gate:** Only use Genially where the interactivity materially improves understanding. Static PNG is always preferred for performance. Apply the 3G test: if it adds > 200 ms on Nigerian mobile, use PNG instead.

---

### 12.8 Open Clipart — KS1 / Primary 1–3

For KS1 (ages 5–7) and Nigerian Primary 1–3 (ages 5–8), clipart-style illustrations outperform photorealistic images for comprehension. Sources:

- **OpenClipArt** (openclipart.org): 170,000+ SVG files, all public domain. Ideal for fruit/vegetables (fractions), animals (classification), basic shapes.
- **Clipart ETC** (etc.usf.edu/clipart): Educational illustrations from University of South Florida. 71,500+ images. Public domain.

**Process:** Download SVG → open in Inkscape → simplify paths → export 400px PNG → save to `/public/assets/clipart/`.

**Nigerian localisation:** Replace standard UK clipart (red double-decker bus, UK money) with Nigerian equivalents (danfo bus, naira coins). Custom SVGs can be created in Inkscape in under 30 minutes per asset.

---

### 12.9 Production Pipeline Summary

```
NEED DIAGRAM?
     │
     ├─ Biology / organism      → BioRender (PNG 300dpi) → Supabase Storage
     ├─ Chemistry equipment     → Chemix (SVG) → Inkscape optimise → Supabase
     ├─ Clipart / KS1           → OpenClipArt (SVG) → Inkscape → /public/
     ├─ 3D model (Phase 2)      → NIH 3D / Tinkercad (GLTF) → Draco → /public/models/
     ├─ Data chart (report)     → RAWGraphs (SVG) → inline HTML
     ├─ Maths animation (Ph 3)  → Manim (MP4) → ffmpeg compress → Supabase Storage
     └─ Interactive (Phase 2)   → Genially (iFrame) → lazy render in modal
```

**Quality gate (all assets):**
- File size: PNG < 150 KB, SVG < 50 KB, GLTF < 500 KB, MP4 < 2 MB
- Attribution: Log CC-BY assets in `/docs/asset-credits.md`
- Accessibility: All images must have `alt` text matching the question context
- Offline: Video and model assets cached in `sw.js` CacheFirst

---

### 12.10 Phase 1 Immediate Actions (April 2026)

| Priority | Action | Owner | Effort |
|---|---|---|---|
| P0 | Create BioRender account, generate 20 biology concept card diagrams (KS3/JSS) | Content | 2 days |
| P0 | Build 15 Chemix chemistry lab diagrams (WAEC-relevant) | Content | 1 day |
| P0 | Source 50 OpenClipArt SVGs for KS1/Primary 1–3 (animals, shapes, food) | Content | 0.5 days |
| P1 | Localise 10 clipart items to Nigerian context (danfo, naira, iroko tree) | Content | 1 day |
| P1 | Upload all assets to Supabase Storage, update `concept_cards` table | Dev | 0.5 days |
| P2 | Set up Manim environment, script 3 maths animations (fractions, pythagoras, quadratic) | Dev | 3 days |
| P2 | Draco-compress 5 NIH 3D biology models for Phase 2 integration | Dev | 1 day |

---

**Document Version:** 2.1 (Science Visuals Toolkit added)
**Last Updated:** April 16, 2026
**Owner:** LaunchPard Product Team
**Status:** Approved — Phase 1 Implementation Ready
**Previous Version:** 2.0 (April 12, 2026) — engine selection + Nigerian market playbook
