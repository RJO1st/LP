# Three.js Animated Visuals Strategic Plan
## LaunchPard/Quest Academy Platform

**Document Purpose:** Strategic research and implementation roadmap for integrating three.js 3D visuals across the LaunchPard/Quest Academy platform.

**Date:** March 2026
**Version:** 1.0

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Research Findings](#research-findings)
3. [Use Cases by Age Band](#use-cases-by-age-band)
4. [Technical Integration Strategy](#technical-integration-strategy)
5. [Performance Budget & Mobile Strategy](#performance-budget--mobile-strategy)
6. [Visual Design Framework](#visual-design-framework)
7. [Lightweight Alternatives Assessment](#lightweight-alternatives-assessment)
8. [Bundle Size & Lazy Loading Strategy](#bundle-size--lazy-loading-strategy)
9. [Phased Implementation Roadmap](#phased-implementation-roadmap)
10. [Success Metrics & Monitoring](#success-metrics--monitoring)

---

## Executive Summary

This document provides strategic guidance for integrating three.js animated visuals across LaunchPard/Quest Academy to enhance engagement across four age bands (KS1-KS4). The research reveals that three.js, paired with React Three Fiber (R3F) for Next.js App Router integration, is viable for targeted educational and gamification use cases, but requires careful performance optimization, mobile device consideration, and selective deployment.

**Key Recommendations:**
- Use three.js for high-impact educational visualizations (molecule viewers, physics simulations, geometry explorers)
- Deploy particle systems for gamification celebrations and reward feedback
- Use lightweight alternatives (CSS 3D, Lottie, GSAP) for simple UI animations and decorative elements
- Implement strict performance budgets and mobile fallback strategies
- Phase implementation over three phases, starting with Phase 1 gamification particles

---

## Research Findings

### 1. React Three Fiber + Next.js App Router Integration

**Key Findings:**

- **Version Compatibility:** R3F v8 is not compatible with React 19/Next.js 15. Must use R3F v9 RC (`@react-three/fiber@rc`) for current deployments.
- **Configuration:** R3F works out-of-the-box but requires `transpilePackages: ['three']` in `next.config.js` to handle untranspiled three.js ecosystem add-ons.
- **Architecture Pattern:** Create client components (`'use client'`) containing all 3D content. R3F renders inside Canvas components within these client boundaries.
- **Hydration Challenges:** Complex canvas elements pose hydration risks with Server Components. Must carefully isolate 3D content from server-rendered content.
- **Performance Concerns:** Initial page load and asset bundling present the primary integration challenges—3D models and scenes can bloat bundle size significantly.

**Sources:**
- [React Three Fiber Installation](https://r3f.docs.pmnd.rs/getting-started/installation)
- [Next.js App Router: The Patterns That Actually Matter in 2026](https://dev.to/teguh_coding/nextjs-app-router-the-patterns-that-actually-matter-in-2026-146)

### 2. Mobile Device Performance Constraints

**Critical Mobile Considerations:**

**Battery Impact:**
- Graphics-intensive 3D rendering drains battery significantly. On-demand rendering (pause when not visible) saves battery vs. continuous 60fps.
- More GPU/CPU processing = more battery drain; use on-demand rendering for casual, non-critical 3D elements.

**GPU & Memory Limits:**
- Below 100 draw calls: most modern devices maintain smooth 60fps.
- Compressed textures essential for mobile—reduces GPU memory footprint significantly.
- Instancing (rendering multiple copies of geometry with one draw call) dramatically improves performance.

**Pixel Ratio Optimization:**
- Modern mobile devices have pixel ratios as high as 5 (5x actual pixels). Limiting max pixel ratio to 2–3 provides performance gains with negligible visual degradation.
- Dynamic pixel ratio adjustment based on device capabilities recommended.

**Polygon & Texture Optimization:**
- Reduce polygon counts for mobile.
- Scale textures down 50% or more compared to desktop.
- Eliminate or reduce expensive post-processing effects and dynamic shadows.
- Use basic materials instead of physically-based rendering (PBR) when possible.

**Performance Budget Target:** Target under 100 draw calls for consistently smooth 60fps on mid-range and budget devices.

**Sources:**
- [Performance of Three.js on Mobile Devices](https://coderlegion.com/4191/performance-of-three-mobile-devices-and-lower-end-hardware-for-games-and-creative-resumes)
- [100 Three.js Tips That Actually Improve Performance (2026)](https://www.utsubo.com/blog/threejs-best-practices-100-tips)
- [Optimizing ThreeJs for Mobile Devices](https://moldstud.com/articles/p-optimizing-threejs-for-mobile-devices)

### 3. Educational Use Cases: Proven Three.js Applications

**Molecule Visualization:**
- 3Dmol.js (built on three.js) is the industry standard for interactive molecular structure viewing in educational contexts.
- Enables students to rotate, zoom, and inspect 3D molecular structures with atom positions, bonds, and electron configurations.
- Used in Jupyter notebooks and classroom response systems for chemistry education.
- Real-world success: Published in *Journal of Chemical Education* for engaging students in chemistry concepts.

**Physics & Geometry Exploration:**
- Three.js effectively renders geometric shapes, orbital paths, and physics simulations for interactive learning.
- Particle systems ideal for visualizing forces, motion, and collision dynamics.
- CSS3D Renderer within three.js enables rendering of DOM elements in 3D space (e.g., periodic table with rotatable elements).

**Interactive Science Visualizations:**
- Apps for molecular orbitals, electron wavefunctions, and atomic structure exploration.
- Interactive demonstrations of physics concepts (projectile motion, gravity wells, planetary orbits).

**Browser Accessibility:**
- No software installation required—works in any modern web browser on desktop and mobile.
- Easy sharing of complex scenes via URL/links.

**Sources:**
- [3Dmol.js: Molecular Visualization with WebGL](https://academic.oup.com/bioinformatics/article/31/8/1322/213186)
- [The 3Dmol.js Learning Environment](https://pubs.acs.org/doi/10.1021/acs.jchemed.0c00579)

### 4. Lightweight Alternatives: CSS 3D, Lottie, GSAP

**CSS 3D Transforms:**
- **Best For:** Simple UI 3D effects, small numbers of DOM elements (< 10 simultaneous transforms).
- **Performance:** Hardware-accelerated; efficient for modest numbers of elements.
- **Limitations:** Becomes slow and janky with hundreds of transformed elements due to layout/compositing costs.
- **Ease of Use:** Trivial to implement with existing HTML/CSS/JS skills; integrates naturally with frameworks and accessibility.

**Lottie Animations (Vector-Based):**
- **Best For:** Complex, lightweight UI animations from After Effects (AE) exports without complex 3D.
- **Performance:** Generally good; vector rendering via canvas/SVG. Complex animations may tax CPU on low-end devices.
- **File Size:** dotLottie format reduces file sizes by up to 80% vs. standard JSON. @lottiefiles/dotlottie-react uses less CPU/memory.
- **Limitations:** Not true 3D; primarily for 2D motion graphics and UI animation.
- **Alternative:** Rive performs better (~60fps vs. Lottie's ~17fps) for state-driven UI animations.

**GSAP (GreenSock Animation Platform):**
- **Best For:** High-performance 2D/3D CSS transforms, scroll-based animations, complex animation sequences.
- **Performance:** Maintains 60fps consistently, even with complex sequences. Outperforms Framer Motion (~45fps with multiple simultaneous animations).
- **3D Capability:** Can orchestrate complex 3D transforms and create immersive gallery experiences.
- **Best Practices:** Animate only `transform` and `opacity` properties to avoid layout recalculations. Use @gsap/react `useGSAP` hook for clean integration.
- **Bundle Size:** Lightweight animation engine (much smaller than three.js).

**Motion / Framer Motion:**
- **Best For:** React-native UI animation with gesture support and spring physics.
- **Performance:** Good but not as high as GSAP for complex sequences.

**Decision Matrix:**
| Use Case | Solution | Reason |
|----------|----------|--------|
| Simple page transitions, hover effects | CSS 3D / GSAP | Lightweight, fast |
| XP/Stardust rewards, badge popups | GSAP or Lottie | Quick visual feedback, performant |
| Character animations, UI motion | Lottie (dotLottie) or Rive | Pre-designed, state-driven |
| Full 3D molecule viewer, physics sim | Three.js | True 3D geometry, complex interactivity |
| Confetti, sparkles, particle celebrations | Three.js particles or GSAP | High visual impact, hundreds of elements |

**Sources:**
- [Advanced UI Animation Strategies](https://medium.com/@vacmultimedia/advanced-ui-animation-strategies-when-to-use-css-lottie-rive-js-or-video-56289e8d2629)
- [Lottie vs. Rive: Optimizing Mobile App Animation](https://www.callstack.com/blog/lottie-vs-rive-optimizing-mobile-app-animation)
- [Using GSAP with Next.js: A Guide to Animations](https://medium.com/@1shyam2shyam/using-gsap-with-nextjs-a-guide-to-animations-bc5b832a70f0)
- [Building Efficient Three.js Scenes](https://tympanus.net/codrops/2025/02/11/building-efficient-three-js-scenes-optimize-performance-while-maintaining-quality/)

### 5. Particle Systems for Gamification

**Capabilities:**
- Hundreds of thousands of particles can render on-screen with reasonable frame rate.
- BufferGeometry + PointsMaterial approach is highly efficient.
- Ideal for: confetti, sparkles, fireworks, dust, rain, snow, star effects.

**Libraries & Tools:**
- **three.quarks:** High-performance particle system/VFX engine, TypeScript, includes visual editor.
- **Three Nebula:** WebGL-based particle system designer and engine with GUI editor for visual design.

**Gamification Applications:**
- XP/Stardust gain animations: particle burst on correct answer.
- Badge unlock celebrations: confetti and sparkle effects.
- Streak milestone rewards: fireworks or star shower.
- Coin collection feedback: floating particles converging toward UI element.

**Performance:** Particle systems are optimized for high count; a concern only with thousands of simultaneous particles + complex shaders.

**Sources:**
- [Particles — Three.js Journey](https://threejs-journey.com/lessons/particles)
- [Three ways to create 3D particle effects](https://varun.ca/three-js-particles/)
- [three.quarks GitHub](https://github.com/Alchemist0823/three.quarks)

---

## Use Cases by Age Band

### KS1 (Ages 5–7): Celestial Nursery

**Theme:** Warm purple-blue with gold, soft glowing, kid-friendly, cozy.

**Recommended 3D/Animation Visuals:**

1. **Floating Stardust Particles (Three.js Particles)**
   - Soft, slowly drifting star particles as background ambiance.
   - On task completion: gentle star sparkle burst.
   - Performance: Very low (< 50 particles visible at once).

2. **Glowing Celestial Icons (CSS 3D + Lottie)**
   - Soft glow animation on subject icons (Math, English, Science).
   - Use dotLottie format for file efficiency.
   - No true 3D needed; GSAP or Lottie sufficient.

3. **Constellation Game (Three.js or Canvas)**
   - Interactive mini-game connecting stars to form simple constellations.
   - Reward animation: stars glow in sequence to trace constellation shape.
   - Mobile-friendly: tap stars in order.

**Performance Target:** < 50 draw calls; optimize for tablets (iPads, Android tablets).

**Fallback Strategy:** Replace 3D particles with CSS-animated SVG stars if GPU unavailable.

---

### KS2 (Ages 8–11): Orbital Command

**Theme:** Sci-fi HUD with cyan/teal, Orbitron font, space theme, interactive dashboards.

**Recommended 3D/Animation Visuals:**

1. **Orbiting Objects (Three.js)**
   - Animated orbiting planets/moons around a central point (representing learning progress).
   - Each orbit represents a subject; size/brightness = progress level.
   - Interactive: click to navigate to subject dashboard.
   - Medium complexity: ~20–30 draw calls.

2. **Stardust/XP Particle Explosions (Three.js Particles)**
   - Reward particles burst from screen center on XP gain.
   - Particles float upward and fade.
   - Uses `three.quarks` or custom BufferGeometry approach.
   - Performance: < 200 particles on screen.

3. **Holographic Badge Unlock (GSAP + 3D Transform)**
   - Use GSAP to orchestrate 3D CSS transforms + particle effects.
   - Badge image rotates and scales in 3D space with glow overlay.
   - Efficient: no WebGL needed for badge animation.

4. **Scan/Data Stream Effect (Three.js or Canvas + GSAP)**
   - Animated scanning lines over content (HUD aesthetic).
   - Data stream particles flowing across screen.
   - Could use Canvas + GSAP for lightweight alternative.

5. **Mission/Challenge Briefing Portal (Three.js CSS3D Renderer)**
   - Render DOM challenge cards in 3D space with perspective.
   - Cards tilt and reorder based on selection.
   - Uses three.js CSS3DRenderer for DOM-in-3D effect.

**Performance Target:** < 100 draw calls; optimize for mid-range mobiles.

**Fallback Strategy:** Replace orbiting 3D objects with CSS 3D rotation; replace particles with GSAP-animated SVG.

---

### KS3 (Ages 12–14): Career Simulator

**Theme:** Dark teal/slate with emerald, professional, UI-focused, career/skill progression.

**Recommended 3D/Animation Visuals:**

1. **3D Molecule Viewer (Skill Chemistry)**
   - Use 3Dmol.js or three.js-based molecule viewer for chemistry topics.
   - Students rotate, zoom, inspect molecular structure.
   - Real educational value for KS3 chemistry.
   - Mobile-optimized: limit draw calls, use compressed textures.

2. **Geometric Shape Explorer (Three.js)**
   - Interactive 3D geometric shapes (polyhedra, solids of revolution).
   - Rotate, dissect, measure properties (edge counts, surface area).
   - For geometry/maths topics.
   - Medium complexity: ~40–60 draw calls.

3. **Data Visualization Particle Systems (Three.js or Canvas)**
   - Animate data points as particles in 3D space (scatter plots, distributions).
   - Rotate/zoom dataset in 3D.
   - For statistics/data science modules.

4. **Career Path Navigation (GSAP 3D Transforms + DOM)**
   - Animate career path steps with 3D perspective scrolling.
   - No WebGL; pure CSS 3D + GSAP for performance.
   - Node-based career progression UI.

5. **Interactive Physics Simulation (Three.js)**
   - Pendulums, projectile motion, gravity wells, orbital mechanics.
   - Adjustable parameters; real-time visualization.
   - For KS3 physics topics.
   - Moderate complexity: ~80 draw calls.

**Performance Target:** < 100 draw calls on desktop; < 50 for mobile. Implement mobile detection and lower-quality models for phones.

**Fallback Strategy:** Replace 3D geometry with 2D projections; replace particles with GSAP-animated divs.

---

### KS4 (Ages 15–17): Exam Studio

**Theme:** Precision exam interface, violet/purple, minimal aesthetic, focused, professional.

**Recommended 3D/Animation Visuals:**

1. **3D Molecule Viewer (Advanced Chemistry)**
   - Full 3Dmol.js integration for organic/inorganic chemistry exam practice.
   - Display molecular structure with bond angles, 3D orientation.
   - Critical for exam success; invest in quality implementation.
   - Performance: optimize for desktop; mobile version available but less critical for exam prep.

2. **Orbital/Electron Configuration Visualization (Three.js)**
   - Animated orbital shapes and electron distributions.
   - Real 3D visualization of quantum mechanics concepts.
   - High educational impact for A-Level chemistry/physics.

3. **Advanced Physics Simulations (Three.js)**
   - Real-time physics simulations with user-adjustable parameters.
   - Examples: projectile motion in different gravity environments, electromagnetic fields, wave interference.
   - Desktop-focused; mobile fallback to 2D graphs.

4. **Minimal Progress Animations (GSAP or CSS)**
   - Exam progress bar with subtle 3D transform effects.
   - Score reveal animation (numbers floating/scaling in 3D).
   - Minimal but impactful; no heavy 3D needed.

5. **Study Material Manipulation (Three.js CSS3D)**
   - Organize study cards in 3D space; arrange by topic/difficulty.
   - Interactive rearrangement for spaced repetition learning.
   - DOM-based; three.js CSS3DRenderer.

**Performance Target:** Desktop prioritized; graceful degradation on mobile.

**Fallback Strategy:** Replace 3D visualizations with high-quality 2D SVG/Canvas; retain exam functionality.

---

## Technical Integration Strategy

### Architecture Overview

```
Next.js App Router Structure
├── app/
│   ├── layout.tsx (Server Component - no 3D)
│   ├── dashboard/
│   │   ├── page.tsx (Server Component)
│   │   └── 3d-particles.tsx (Client Component 'use client')
│   ├── subjects/
│   │   ├── chemistry/
│   │   │   ├── page.tsx (Server)
│   │   │   └── molecule-viewer.tsx (Client Component 'use client')
│   │   └── physics/
│   │       ├── page.tsx (Server)
│   │       └── simulation.tsx (Client Component 'use client')
│   └── gamification/
│       ├── rewards.tsx (Client Component 'use client')
│       └── streak-animation.tsx (Client Component 'use client')
├── components/
│   ├── 3d/
│   │   ├── ParticleSystem.tsx (R3F Canvas wrapper)
│   │   ├── MoleculeViewer.tsx (3Dmol.js wrapper)
│   │   └── PhysicsSimulation.tsx (R3F Canvas)
│   └── animations/
│       ├── GsapRewardAnimation.tsx (GSAP)
│       └── LottieBadgeAnimation.tsx (Lottie)
└── next.config.js (with transpilePackages: ['three'])
```

### React Three Fiber Integration Checklist

**Setup:**
1. Install dependencies: `three`, `@react-three/fiber@rc` (for React 19/Next.js 15).
2. Configure `next.config.js`:
   ```javascript
   transpilePackages: ['three', '@react-three/fiber', '@react-three/drei']
   ```
3. Import and use `Canvas` from `@react-three/fiber` inside `'use client'` components.

**Pattern: Client Component Wrapper**
```
// app/dashboard/3d-particles.tsx
'use client'

// All R3F Canvas code here
// Imported into parent Server Component as a regular React component
```

**Hydration Prevention:**
- Never render Canvas on server.
- Use dynamic imports with `ssr: false` for R3F components if rendering from server context.
- Isolate all 3D content to deep client component boundaries.

**Asset Management:**
- Store .glb/.glTF models in `public/models/`.
- Store textures in `public/textures/`.
- Use Next.js Image optimization for texture PNGs (where applicable).

### Dependency Stack

**Required:**
- `three`: WebGL 3D engine.
- `@react-three/fiber@rc`: React renderer for three.js (or latest stable R3F v9+).
- `@react-three/drei`: Utility helpers for R3F (useGLTF, Text3D, OrbitControls, etc.).

**Optional (Based on Use Case):**
- `3dmol-web`: Molecule visualization library (built on three.js).
- `three.quarks`: Particle system/VFX engine.
- `gsap`: Animation library (for non-3D animations).
- `lottie-react`: Lottie player for React.
- `rive-react`: Rive animation player.

**Performance Monitoring:**
- `spline/three-perf`: FPS monitor, memory usage, draw calls.
- Browser DevTools (Performance tab) for profiling.

---

## Performance Budget & Mobile Strategy

### Performance Targets by Device

| Device Class | FPS Target | Max Draw Calls | Max Particles | Notes |
|--------------|-----------|----------------|---------------|-------|
| Desktop (High) | 60 FPS | 200 | 1000+ | Full quality, post-processing OK |
| Desktop (Mid) | 60 FPS | 100 | 500 | Standard quality |
| Tablet (iPad) | 60 FPS | 80 | 300 | Medium quality, compressed textures |
| Mobile (Mid-Range) | 30–60 FPS | 50 | 100–200 | Low quality, reduced draw calls, pixel ratio 2 |
| Mobile (Budget) | 30 FPS | 20 | 50–100 | Minimal quality, fallback recommended |

### Mobile Detection & Fallback Strategy

**Approach:**
1. Detect device capability on client-side (user agent, GPU info via WebGL context).
2. Load appropriate asset quality (high-poly vs. low-poly models).
3. Dynamically adjust renderer pixel ratio.
4. Disable expensive effects (post-processing, shadows, real-time reflections).
5. Provide HTML/CSS fallback for completely unsupported devices.

**Implementation Points:**
- Detect `navigator.gpu` support (WebGL capabilities).
- Check viewport width to identify mobile.
- Load models from CDN with variants: `molecule-high.glb`, `molecule-low.glb`.
- On mobile, default to `molecule-low.glb` + pixel ratio 2.
- Monitor FPS; if < 30 FPS sustained, disable animations or show static fallback.

**Fallback Rendering:**
- **For Molecules:** Static 2D SVG projection + interactive labels.
- **For Particles:** CSS-animated SVG elements or Lottie animation.
- **For Orbits:** CSS 3D rotation animation + static background image.
- **For Physics Sim:** 2D Canvas graph or SVG diagram + manual play/pause controls.

### Battery & Data Considerations

**Battery Optimization:**
- Use **on-demand rendering**: pause WebGL rendering when canvas is out of viewport.
- Implement `IntersectionObserver` to detect visibility and pause/resume R3F Canvas.
- Avoid continuous 60 FPS; use lower frame rate (30 FPS) for passive animations.
- Disable animations when device battery is low (use Battery API if available).

**Data Efficiency:**
- Use compressed texture formats (WebP, ASTC if supported).
- Load models asynchronously; show loading indicator.
- Lazy-load 3D components only when visible.
- Cache models using browser service worker.

### Testing Recommendations

- Test on actual devices: iPhone 11/12, Samsung Galaxy A, iPad (5th gen).
- Use Chrome DevTools mobile emulation + throttling for initial testing.
- Profile with React Profiler + three.js performance monitor.
- Measure Core Web Vitals (LCP, FID, CLS) with 3D elements.

---

## Visual Design Framework

### Color Palette Alignment by Age Band

**KS1: Celestial Nursery**
- Primary: Warm purple (`#9B6BA8`), soft blue (`#7B9CBA`)
- Accent: Gold (`#FFD700`)
- Particle colors: Soft gold, pale blue, white (glowing).
- Material: Emissive materials for glow; avoid harsh lighting.

**KS2: Orbital Command**
- Primary: Cyan (`#00D9FF`), teal (`#008C99`)
- Accent: Neon lime (`#39FF14`)
- Particle colors: Cyan, lime green, electric blue.
- Material: Metallic/sci-fi shaders; bright emissive elements.

**KS3: Career Simulator**
- Primary: Dark teal (`#1A3A40`), slate (`#2A3F4B`)
- Accent: Emerald (`#28A745`)
- Particle colors: Emerald, teal, white.
- Material: Professional matte; minimal glow.

**KS4: Exam Studio**
- Primary: Violet (`#7B68EE`), deep purple (`#4B0082`)
- Accent: Silver (`#C0C0C0`)
- Particle colors: Purple, silver, white (minimal effect).
- Material: Clean, minimal aesthetic; no excessive glow.

### Animation Principles

1. **Feedback & Reward:** Particles, glow, scale animations on user success (correct answer, XP gain, badge unlock).
2. **Smooth Transitions:** All 3D object movements should ease smoothly (avoid jarring rotations).
3. **Attention Direction:** Particle bursts, glows, and animations should draw attention toward important UI (XP counter, milestone badge).
4. **Restraint:** Not every interaction needs 3D animation. Use sparingly to maintain focus.
5. **Accessibility:** Provide `prefers-reduced-motion` support; disable heavy animations for users with vestibular disorders.

### Specific Visual Ideas

**1. Particle Celebration Burst (All Age Bands)**
- Trigger: Correct answer, skill unlocked, streak milestone.
- Behavior: 50–200 particles burst from center; float upward with fade-out.
- Color: Age band accent color.
- Duration: 1–2 seconds.
- Cost: Low (< 200 particles, < 50 draw calls).

**2. Orbiting Learning Progress (KS2 Orbital Command)**
- 4–8 planets/moons orbit around center point.
- Each represents a subject (Math, English, Science, PE).
- Size/brightness = completion percentage or current progress.
- Interactive: click to navigate to subject.
- Cost: Medium (8 objects + lighting + shadows; ~30 draw calls).

**3. Glowing 3D Subject Icons (KS2, KS3)**
- Stylized 3D icons for each subject (molecule, equation symbol, book, etc.).
- Glow/pulse animation when hovered or unlocked.
- Clickable to navigate to subject.
- Cost: Low–Medium (1–2 objects per icon; ~5–10 draw calls each).

**4. Spinning Medal/Badge (All Bands, Gamification)**
- 3D medal or badge model spins in 3D space on achievement unlock.
- Accompany with particle burst and GSAP text animation.
- Drop shadow for depth.
- Cost: Medium (1 model + particles; ~20 draw calls).

**5. Holographic Data Stream (KS2, KS3)**
- Animated particles flowing across screen in grid pattern.
- Represents data, information, or learning flow.
- Can overlay on content as decorative background.
- Cost: High if continuous; Low if triggered (< 300 particles when triggered).

**6. Interactive Molecule Rotate (KS3, KS4 Chemistry)**
- Full 3D molecule model (via 3Dmol.js or three.js).
- Respond to mouse/touch drag to rotate.
- Display atom labels, bond angles, molecular formula.
- Cost: Medium (depends on molecule complexity; typically 20–100 draw calls).

**7. Physics Simulation Canvas (KS3, KS4 Physics)**
- Real-time 3D simulation (pendulum, projectile, orbital mechanics).
- User adjusts parameters (gravity, initial velocity, mass) and sees immediate 3D feedback.
- Cost: Medium–High (depends on simulation; typically 50–150 draw calls).

**8. Constellation Connect Game (KS1)**
- Stars appear on screen; user taps them in order to form constellation shape.
- Correct sequence = glow animation + reward particles.
- Cost: Low (< 30 objects; ~20 draw calls).

**9. Streak Milestone Animation (KS2, KS3)**
- On 7-day, 30-day, 100-day streak milestone:
- Particle firework burst from center.
- Milestone badge spins in 3D.
- Confetti (CSS or particle) falls briefly.
- Cost: Low–Medium (particles + badge; ~30–50 draw calls).

**10. Study Card 3D Rearrangement (KS4)**
- Study cards rendered as DOM elements within three.js CSS3DRenderer.
- Animate cards rotating/moving in 3D space as user organizes them by topic.
- Cost: Low (DOM-based; ~0 draw calls for 3D geometry, but CSS rendering overhead).

---

## Lightweight Alternatives Assessment

### When NOT to Use Three.js

The following scenarios are better served by lightweight alternatives:

| Scenario | Recommended Solution | Rationale |
|----------|---------------------|-----------|
| Simple badge unlock animation | GSAP 3D CSS transforms + Lottie | No need for WebGL geometry; GSAP more performant |
| XP counter number pop-up | GSAP scale + fade | Pure DOM animation, faster than three.js |
| Page transition parallax | GSAP + ScrollTrigger | CSS transforms are hardware-accelerated; no WebGL overhead |
| Hover glow effect | CSS glow shadow + GSAP | Simple CSS, no 3D needed |
| Character animation (e.g., mascot) | Lottie (dotLottie) or Rive | Pre-designed, vector-based, easier to maintain |
| Spinning loader icon | CSS `@keyframes` rotation | Simplest, fastest |
| Confetti on celebration | Rive or CSS animation | Lighter than three.js particles for simple effect |
| Navigation menu transitions | GSAP | Smooth DOM animations without 3D |

### Lightweight Solution Stack

**GSAP (Animation Library)**
- **Use For:** Complex 2D/3D CSS animations, scroll-based effects, timeline-based sequences.
- **Advantages:** 60 FPS performance, small bundle, integrates easily with React.
- **Bundle Size:** ~30 KB (minified).
- **Integration:** `useGSAP` hook from `@gsap/react` for clean React integration.

**CSS 3D Transforms**
- **Use For:** Simple 3D DOM effects (rotation, perspective), hover states.
- **Advantages:** Hardware-accelerated, native browser support, zero JS overhead.
- **Limitations:** Can't handle hundreds of elements; layout recalculation overhead.
- **Best Practice:** Animate only `transform` and `opacity` properties.

**Lottie / dotLottie**
- **Use For:** Vector animations from After Effects, UI motion graphics, character animations.
- **Advantages:** Small file size (especially dotLottie), pre-designed, easy iteration.
- **Bundle Size:** ~50–80 KB (player) + animation JSON (~10–50 KB each).
- **Alternative:** Rive for state-driven UI animations (60 FPS vs. Lottie's 17 FPS).

**Canvas 2D / SVG**
- **Use For:** Simple particle effects, 2D simulations, data visualizations.
- **Advantages:** Lower overhead than three.js, easier to reason about.
- **Limitations:** No true 3D; 2D projection only.

### Decision Tree: Three.js vs. Lightweight

```
Is it true 3D? (Rotation, perspective, depth)
├─ No → Use GSAP, CSS 3D, or Lottie
└─ Yes:
   ├─ Is it complex geometry? (Molecule, shape, mesh)
   │  ├─ Yes → Use Three.js
   │  └─ No → Use CSS 3D or GSAP
   ├─ Many particles or objects (50+)?
   │  ├─ Yes → Use Three.js particles
   │  └─ No → Use CSS animation or Lottie
   └─ Interactive manipulation required?
      ├─ Yes → Use Three.js
      └─ No → Use static 3D CSS or video

Is performance critical (mobile, low-end device)?
├─ Yes → Prefer lightweight alternative; test three.js carefully
└─ No → Three.js acceptable
```

---

## Bundle Size & Lazy Loading Strategy

### Three.js Bundle Impact

- **three.js core:** ~150 KB (minified + gzipped).
- **@react-three/fiber:** ~30 KB.
- **@react-three/drei (full):** ~100 KB.
- **3dmol.js:** ~200 KB.
- **three.quarks:** ~80 KB.
- **Models (.glb/.glTF):** 50 KB–5 MB each (depends on complexity).

**Total potential:** 600 KB–3 MB for full three.js + libraries + models.

### Lazy Loading Strategy

**Goal:** Load 3D libraries only when user navigates to pages requiring them.

**Implementation:**

1. **Dynamic Imports (Code Splitting):**
   ```
   Use Next.js dynamic() with ssr: false for 3D components.
   Only load Canvas component when page renders on client.
   ```

2. **Route-Based Loading:**
   - `/dashboard/3d-particles` → Load particle system on demand.
   - `/subjects/chemistry` → Load 3Dmol.js only if user navigates to chemistry.
   - `/subjects/physics` → Load physics simulation on demand.

3. **Conditional Loading:**
   - Detect device capability before loading three.js.
   - If unsupported (very old device), skip loading three.js entirely.
   - Serve fallback HTML instead.

4. **Model Asset Optimization:**
   - Load model files asynchronously after Canvas renders.
   - Show placeholder/loading spinner while model fetches.
   - Cache models in service worker for repeat visits.
   - Use different model quality based on device class.

### Bundle Size Targets

| Phase | Target Bundle Size | Strategy |
|-------|-------------------|----------|
| Phase 1 (Particles only) | +300 KB | three + fiber + custom particle code; no drei |
| Phase 2 (+ Edu visuals) | +500 KB | Add @react-three/drei + sample models |
| Phase 3 (Full suite) | +800 KB–1.5 MB | Add 3dmol.js, three.quarks, multiple models |

### Monitoring & Optimization

- Use `next/bundle-analyzer` to track bundle size over time.
- Set budget limits; fail CI if bundle exceeds threshold.
- Periodically audit dependencies (remove unused packages).
- Minify, tree-shake, and compress assets.

---

## Phased Implementation Roadmap

Implementation spans **3 phases over 6–9 months**, with clear deliverables, testing, and user feedback at each stage.

---

### Phase 1: Foundation & Gamification (Months 1–3)

**Goal:** Establish three.js integration and test with low-risk gamification particles.

**Deliverables:**

1. **Three.js + R3F Setup**
   - Configure Next.js with transpilePackages.
   - Create R3F Canvas wrapper component.
   - Document setup in `/docs/three-js-setup.md`.
   - Acceptance: Dev environment builds without errors; Canvas renders on dummy page.

2. **Particle System Framework (Custom or three.quarks)**
   - Implement reusable particle emitter component.
   - Support: burst (reward), continuous (background), and custom effects.
   - Test on desktop and tablet.
   - Acceptance: Particles render at 60 FPS on iPad, 30 FPS on mid-range Android.

3. **Gamification Particle Integrations**
   - XP/Stardust burst animation on question correct.
   - Badge unlock sparkle effect.
   - Streak milestone celebration (fireworks).
   - Integrate with existing gamification UI (XP counter, badge modal, etc.).
   - Acceptance: Animations trigger correctly; no lag during gameplay.

4. **Mobile Fallback & Performance**
   - Implement device detection and fallback rendering (CSS-based).
   - Test on 5 device classes (desktop, iPad, iPhone, Samsung Galaxy, budget Android).
   - Measure FPS and battery drain.
   - Acceptance: 60 FPS desktop, 30+ FPS mobile, no observable battery drain increase.

5. **Analytics & Monitoring**
   - Add FPS counter and performance metrics (internal dashboards only).
   - Track 3D render time in analytics.
   - Set baselines for performance regression testing.
   - Acceptance: Dashboard shows render times < 16ms (60 FPS target).

**Testing:**
- Unit tests for particle system logic.
- Integration tests with gamification state (XP gain, badge unlock).
- Manual QA on 5+ devices.
- User acceptance testing with small cohort (KS2 class, ~20 students).

**Success Metrics:**
- Phase 1 particle features used by 100% of active users (opt-in disabled).
- Zero crash reports related to 3D rendering.
- FPS maintained > 30 on 90% of test devices.
- User feedback: "Fun and satisfying" (target 4/5 satisfaction).

**Risk Mitigation:**
- If 3D rendering causes lag, disable for user cohort and revert to CSS fallback.
- If bundle size > 400 KB, optimize or defer to Phase 2.

---

### Phase 2: Educational Visuals & Lightweight Molecules (Months 4–6)

**Goal:** Add educational 3D visuals (molecules, geometry, basic physics) for KS2–KS4.

**Deliverables:**

1. **3D Molecule Viewer (3Dmol.js Integration)**
   - Integrate 3Dmol.js for KS3/KS4 chemistry topics.
   - Support loading molecules from PDB database or custom files.
   - Features: rotate, zoom, measure distances, toggle atom labels, color-code bonds.
   - Mobile optimization: reduce detail on smaller screens; allow pinch-to-zoom.
   - Acceptance: Molecules load in < 2 seconds; interactive on mobile.

2. **Geometry Explorer (Three.js)**
   - Interactive 3D geometric shapes (cube, sphere, pyramid, polyhedra).
   - Features: rotate, dissect, measure edges/faces, calculate volume.
   - For KS3 maths/geometry topics.
   - Acceptance: Shapes render smoothly; dissection animations smooth (no jank).

3. **Basic Physics Simulation (Three.js)**
   - Pendulum or projectile motion simulator (Phase 2 feature; full suite in Phase 3).
   - User adjusts parameters; 3D visualization updates in real-time.
   - For KS3 physics introduction.
   - Acceptance: Simulation runs at 60 FPS; parameters adjust smoothly.

4. **R3F Orbital Command Visuals (KS2)**
   - Orbiting planets/progress indicators (medium complexity).
   - Subject icons with glow animations (GSAP + three.js).
   - Acceptance: Orbits render at 60 FPS; glow animations smooth.

5. **Model Asset Pipeline**
   - Set up CDN for hosting .glb/.glTF models.
   - Create low-poly variants for mobile.
   - Implement model loading with async/loading states.
   - Acceptance: Models load without hydration errors; file sizes < 500 KB each.

6. **GSAP Integration for Non-3D Animations**
   - Supplement particle effects with GSAP for badge, XP, and UI animations.
   - Reduce three.js workload for simple 2D animations.
   - Acceptance: GSAP animations at 60 FPS; bundle size impact < 50 KB.

**Testing:**
- Functional testing: molecule rotation, geometry dissection, physics parameter changes.
- Performance testing: FPS, battery drain, memory usage on Phase 2 devices.
- Content testing: verify accuracy of molecule structures, physics simulations.
- User acceptance: small cohort (KS3 chemistry class, ~25 students) tests molecule viewer.

**Success Metrics:**
- Phase 2 visuals available for 5+ lessons/topics.
- Molecule viewer used by 80%+ of KS3 chemistry students in trial.
- FPS maintained > 30 on mobile for all 3D visuals.
- Time-on-task increases 10–15% (hypothesis: visuals improve engagement).

**Risk Mitigation:**
- If 3Dmol.js causes layout issues, wrap in iframe or shadow DOM.
- If FPS drops below 30 on budget phones, disable expensive visuals on those devices.

---

### Phase 3: Advanced Simulations & Full Feature Set (Months 7–9)

**Goal:** Complete the three.js suite with advanced educational simulations and polish all features.

**Deliverables:**

1. **Advanced Physics Simulations (Three.js)**
   - Orbital mechanics (planets, gravity wells).
   - Electromagnetic field visualization.
   - Wave interference / sound visualization.
   - Fluid dynamics (optional advanced feature).
   - For KS4 A-Level physics.
   - Acceptance: Simulations accurate (validated against physics equations); smooth 60 FPS on desktop.

2. **Electron Orbitals & Quantum Visualization (Three.js)**
   - 3D electron orbital shapes (s, p, d, f orbitals).
   - Probability density visualization.
   - For KS4 chemistry (bonding, electronic structure).
   - Acceptance: Orbital shapes match textbook representations.

3. **Extended Particle System Capabilities (three.quarks)**
   - Custom particle emitters for various celebration effects.
   - Introduce Rive for character animations (optional).
   - Acceptance: 15+ unique particle effects in use across platform.

4. **3D UI Enhancements (three.js CSS3DRenderer)**
   - Study card organization in 3D space (KS4).
   - 3D challenge/mission briefing cards (KS2).
   - Acceptance: DOM elements in 3D space render without artifacts; responsive on all screen sizes.

5. **Performance Optimization Pass**
   - Profile all Phase 2–3 features for performance regression.
   - Optimize draw calls, texture sizes, shader complexity.
   - Implement aggressive caching and LOD (level-of-detail) systems.
   - Acceptance: Average FPS > 40 on mid-range mobile; bundle size < 1.5 MB.

6. **Accessibility & Reduced-Motion Support**
   - Test with `prefers-reduced-motion` media query.
   - Disable particle/animation effects for users who prefer reduced motion.
   - Provide alt text and descriptions for 3D visuals.
   - Acceptance: All 3D features accessible; no crashes with reduced-motion enabled.

7. **Documentation & Developer Guide**
   - Complete API documentation for R3F wrapper components.
   - Performance optimization guide.
   - Model asset pipeline documentation.
   - Contributing guide for adding new 3D visuals.
   - Acceptance: All components documented; new developers can add 3D features within 4 hours.

8. **User Feedback Integration**
   - Gather qualitative feedback from Phase 1–2 users.
   - Iterate on visual designs based on feedback.
   - A/B test particle effects vs. static rewards.
   - Acceptance: Phase 3 visuals receive 4.5+/5 satisfaction rating.

**Testing:**
- Full regression testing on all Phase 1–3 features.
- Performance testing on 10+ device classes.
- Accessibility testing (WCAG 2.1 compliance).
- User acceptance testing with 2–3 full classes (across all age bands).

**Success Metrics:**
- Platform-wide adoption: 90%+ active users view at least one 3D visual monthly.
- Educational impact: students using 3D molecule viewer improve chemistry test scores by 5–10% (vs. control group).
- Performance: 95% of user sessions maintain > 30 FPS.
- User satisfaction: 4.5+/5 for all 3D visual features.

**Risk Mitigation:**
- If advanced simulations perform poorly, feature-flag behind "Advanced Mode" toggle.
- If accessibility issues remain, defer to Phase 4 (future).

---

### Phase Timeline Summary

| Phase | Duration | Key Deliverables | Team Effort |
|-------|----------|------------------|------------|
| **Phase 1** | Months 1–3 | R3F setup, particle system, gamification | 2–3 dev + QA |
| **Phase 2** | Months 4–6 | Molecule viewer, geometry, basic physics, GSAP | 2–3 dev + QA |
| **Phase 3** | Months 7–9 | Advanced simulations, polish, optimization, docs | 1–2 dev + QA |

---

## Success Metrics & Monitoring

### Key Performance Indicators (KPIs)

**Technical Metrics:**
1. **Render Performance**
   - Average FPS per page/scene.
   - 95th percentile FPS (should remain > 30 fps).
   - Frame drop frequency (target < 1% of frames drop below 30 FPS).
   - Measure via three.js performance monitor + analytics.

2. **Bundle Size Impact**
   - Size of three.js + dependencies as % of total JS bundle.
   - Size of lazy-loaded 3D component bundles.
   - Gzip-compressed size trends over time.
   - Tools: `next/bundle-analyzer`.

3. **Load Time**
   - Time to interactive (TTI) on pages with 3D content.
   - Canvas render time (should be < 50ms per frame).
   - Model asset load time.
   - Measure via Web Vitals (LCP, FID, CLS).

4. **Memory Usage**
   - Heap memory before/after 3D feature load.
   - Sustained memory growth over time (target: no memory leaks).
   - Measure via Chrome DevTools memory profiler.

5. **Device Compatibility**
   - % of user sessions that successfully render 3D.
   - Fallback rate (% sessions using CSS/static fallback).
   - Crash rate for 3D features.

**Engagement & Educational Metrics:**
6. **Feature Adoption**
   - % of active users interacting with 3D visuals monthly.
   - Engagement time with 3D features (time spent, interactions).
   - Correlation between 3D visual use and lesson completion.

7. **Educational Impact**
   - Pre/post test scores for lessons with 3D visuals (vs. control).
   - Retention rate for topics using 3D visuals.
   - Student satisfaction (survey: "Visuals helped me understand concept").

8. **Gamification Engagement**
   - Frequency of particle reward interactions per session.
   - Correlation between particle effects and session retention.
   - User feedback on reward animations (qualitative satisfaction).

### Monitoring & Alerting

**Real-Time Monitoring:**
- Dashboard showing FPS, memory, bundle size across all platforms.
- Alert if FPS drops below 30 on > 5% of sessions.
- Alert if bundle size exceeds budget.

**Analytics Events to Track:**
- `3d_feature_loaded` → time to load.
- `3d_feature_rendered` → first frame render time.
- `3d_feature_fallback_triggered` → why fallback was used (device, performance, etc.).
- `3d_particle_animation_played` → engagement metric.
- `3d_molecule_viewer_opened` → educational feature usage.

**Quarterly Reviews:**
- Analyze KPI trends; identify regressions.
- Gather user feedback; iterate on designs.
- Plan optimization based on performance data.

### Rollback Strategy

If Phase 1–3 features introduce regressions (> 20% performance decrease, > 2% crash rate):
1. Feature-flag affected components behind rollout config.
2. Disable for affected device classes / regions.
3. Investigate root cause (slow model, expensive shader, memory leak).
4. Deploy hotfix or revert feature.
5. Communicate delays transparently to stakeholders.

---

## Appendix: Resources & References

### Documentation
- [React Three Fiber Docs](https://r3f.docs.pmnd.rs/)
- [Three.js Docs](https://threejs.org/docs/)
- [Next.js App Router Guide](https://nextjs.org/docs/app)
- [3Dmol.js Documentation](https://3dmol.csb.pitt.edu/)
- [GSAP Docs](https://gsap.com/docs/)

### Learning Resources
- [Three.js Journey (Course)](https://threejs-journey.com/)
- [Discover Three.js](https://discoverthreejs.com/)
- [Three.js Tips & Tricks](https://discoverthreejs.com/tips-and-tricks/)

### Performance Tools
- [three.js Performance Monitor](https://github.com/mrdoob/three.js/tree/dev/examples/jsm/utils)
- [Chrome DevTools Performance Tab](https://developer.chrome.com/docs/devtools/performance/)
- [Next.js Bundle Analyzer](https://www.npmjs.com/package/@next/bundle-analyzer)
- [Web Vitals](https://web.dev/vitals/)

### Related Platforms / Case Studies
- **3Dmol.js in Education:** [Journal of Chemical Education article](https://pubs.acs.org/doi/10.1021/acs.jchemed.0c00579)
- **Three.js in Science:** Molecular visualization, physics simulations, interactive learning tools.

---

## Conclusion

Three.js offers compelling opportunities for LaunchPard/Quest Academy to enhance engagement and educational impact across all age bands (KS1–KS4). The phased rollout ensures manageable technical risk, validated educational benefits, and sustainable performance. By leveraging lightweight alternatives (GSAP, Lottie, CSS 3D) for simple animations and reserving three.js for true 3D educational content, the platform can achieve impressive visual polish without sacrificing performance or accessibility.

**Next Steps:**
1. Review and approve this plan with stakeholders.
2. Allocate team resources for Phase 1 (R3F setup + gamification particles).
3. Create detailed technical specifications for Phase 1 deliverables.
4. Begin Phase 1 implementation (Month 1).

---

**Document Status:** Draft (Ready for Stakeholder Review)
**Last Updated:** March 2026
