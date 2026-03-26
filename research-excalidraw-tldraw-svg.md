# Strategic Plan: SVG Rendering for "Show Your Work" on Tablets & Mobile Devices
## LaunchPard/Quest Academy Platform

**Date:** 2026-03-25
**Status:** Research Phase Complete — Ready for Planning
**Scope:** Excalidraw + tldraw SVG output integration for mobile/tablet "show your work" functionality

---

## Executive Summary

LaunchPard currently uses **Excalidraw** for drawing-based questions (ExcalidrawQuestion.jsx) and **tldraw** for creative workspaces in Learning Commons (TldrawCanvas.jsx). Both libraries support SVG export, but their mobile/tablet performance and stylus integration require careful evaluation before deploying to the target demographic (UK scholars ages 5-17, KS1-KS4).

This document outlines:
- Current SVG capabilities of both libraries
- Mobile/tablet-specific considerations (touch, stylus, performance)
- Recommended "show your work" approach per question type and age band
- Implementation architecture and integration points
- Phased rollout plan over 3 quarters

---

## 1. Current State: SVG Capabilities

### 1.1 Excalidraw SVG Export

**Available APIs:**
- `exportToSvg()` — Promise-based function that returns an SVGElement
- `exportToBlob()` — Exports as PNG/SVG blob (currently used in ExcalidrawQuestion.jsx for PNG)
- `exportToClipboard()` — Copy SVG/PNG/JSON to clipboard
- Fonts embedded as `@font-face` declarations in `<style>` element within `<defs>`
- Complete SVG document with proper namespaces, viewBox, and metadata

**Current LaunchPard Usage:**
- Exports to **PNG** for AI validation (line 239-256 in ExcalidrawQuestion.jsx)
- Scene JSON stored for reconstruction
- No current SVG output for display

**Advantages:**
- Well-documented API with stable exports
- Proven in production (v0.18.0 in package.json)
- SVG includes proper viewBox for responsive rendering
- Native support for all Excalidraw shapes (freehand, geometry, text, diagrams)

**Limitations:**
- Fonts must be embedded; external font references don't always render reliably
- Complex drawings with many elements can produce large SVG files
- iOS SVG rendering can lag after ~200-300 strokes (known issue on Safari)

---

### 1.2 tldraw SVG Export

**Available APIs:**
- `SvgExportContext` — Fine-grained control over shape-by-shape export
- `toSvg()` / `toBackgroundSvg()` — Shape utility methods per shape type
- Lazy exports — Support for deferred export if shapes load data dynamically
- Asset resolution in export context — Can downscale images for different targets
- Custom shapes can define their own SVG export logic via `foreignObject` (default)

**Current LaunchPard Usage:**
- No SVG export currently; only JSON snapshots for save/load (line 121-131 in TldrawCanvas.jsx)
- tldraw v4.5.3 in package.json

**Advantages:**
- Built-in support for shape-level control
- Modern asset handling (images, videos)
- Cleaner SVG structure with proper defs management
- Good performance on most browsers when SVGs are optimized

**Limitations:**
- Custom shape SVG export requires developer implementation
- foreignObject-based exports can be verbose and inefficient
- iOS Safari SVG rendering can stall with complex canvas state

---

## 2. Mobile & Tablet Considerations

### 2.1 Touch Input & Stylus Support

| Feature | Excalidraw | tldraw | Status |
|---------|-----------|--------|--------|
| **iPad Pencil (1st/2nd gen)** | ✓ Supported | ✓ Supported | Ready |
| **Apple Pencil Pressure** | ✓ Yes (20ms latency) | ✓ Yes | Good |
| **Scribble Recognition** | Partial (may trigger occasionally) | Not reported as issue | Minor risk |
| **Android Stylus (Wacom, Samsung S-Pen)** | ✓ Supported | ✓ Supported | Good |
| **Finger + Stylus Toggle** | ✓ Pen mode disables touch | ✓ Pressure detection | Reliable |
| **Two-finger Pan in Pen Mode** | ✓ Yes | ✓ Yes | Good |

**Key Finding:** Both libraries handle stylus input well via **Pointer Events API**, achieving ~20ms end-to-end latency on iPad.

**Risk:** Excalidraw may occasionally trigger Apple Pencil Scribble character recognition, requiring user to disable it manually.

---

### 2.2 Performance on Tablets/Mobile

**Canvas vs SVG Trade-offs:**

| Metric | Canvas | SVG |
|--------|--------|-----|
| **Element Count** | Constant performance | Degrades ~500+ elements |
| **Complexity** | Good with ~1000+ objects | Struggles with ~300+ objects |
| **File Size** | Larger exports | Smaller if optimized |
| **Responsiveness** | Better on slow CPUs | Better on high-DPI |
| **iOS Safari** | Stable | Can lag after 200-300 strokes |
| **Android** | Faster rendering | SVG elements can slow significantly |

**Recommendation:**
- For **simple, clean drawings** (KS1 & KS2): SVG export works well
- For **complex diagrams with 500+ elements** (KS3 & KS4): Consider hybrid (display SVG, store JSON)

**Optimization Priorities:**
1. SVGO minification — reduces SVG file size by 20-40%
2. viewBox + width/height → ensures crisp rendering on all DPI devices
3. Lazy loading for overlay images
4. will-change: transform + GPU acceleration for animations
5. Avoid re-rendering SVGs if data hasn't changed

---

### 2.3 iOS Safari Limitations

**Known Issue:** SVG rendering on iOS Safari stalls after ~200-300 freehand strokes, particularly with pressure-sensitive input.

**Mitigation Strategies:**
1. **Path Simplification** — Use Bezier curve reduction to lower stroke count
2. **Chunked SVG Rendering** — Break large drawings into layers
3. **PNG Fallback** — Generate PNG for iOS if SVG stalls
4. **Progressive Rendering** — Load drawing in sections as user scrolls

**Not Recommended:** Don't attempt real-time SVG updates on iOS; batch export at submission time.

---

## 3. Alternative Approaches Evaluated

### 3.1 Canvas-to-SVG Conversion
- **Pros:** Real-time conversion, works offline
- **Cons:** Complex implementation, performance overhead, limitations with gradients/filters
- **Tool:** canvas2svg (GitHub library)
- **Verdict:** NOT RECOMMENDED for primary approach; too complex relative to benefit

### 3.2 Hand-Drawn Annotation Overlays (Rough.js)
- **Pros:** Beautiful hand-drawn aesthetic, lightweight
- **Tool:** Rough Notation (GitHub)
- **Cons:** Limited to annotation use cases, not suitable for full "show your work"
- **Verdict:** Useful as secondary feature for marking up existing content

### 3.3 Hybrid SVG + Canvas Rendering
- **Approach:** SVG for export/display, canvas for real-time drawing, store both
- **Pros:** Best of both worlds, flexibility
- **Cons:** Increased complexity, storage overhead
- **Verdict:** Consider for KS3/KS4 where complexity is high

### 3.4 WebGL Rendering (Not Investigated)
- Excalidraw and tldraw don't currently use WebGL for primary canvas
- Could improve performance on Android but requires forking libraries
- **Verdict:** OUT OF SCOPE

---

## 4. Recommended Approach per Question Type

### 4.1 Excalidraw Drawing Questions (ExcalidrawQuestion.jsx)

**Current Integration:**
- Stores scene JSON + PNG export (line 268-273)
- AI validation uses PNG for content analysis

**Recommended Enhancement:**
1. **Export SVG on submission** using `exportToSvg()`
2. **Store three formats:**
   - Scene JSON (already done) — for reconstruction
   - PNG (already done) — for AI validation + fallback display
   - SVG (NEW) — for "show your work" rendering

3. **Mobile Optimization:**
   - Limit to **KS1/KS2** for full SVG export
   - **KS3/KS4** uses PNG + JSON (more complex diagrams)
   - iOS: Monitor stroke count; if >200, auto-generate PNG instead
   - Android: Full SVG support with SVGO minification

4. **Age Band Adaptation:**

| Band | Approach | Rationale |
|------|----------|-----------|
| **KS1 (5-7)** | SVG full | Simple drawings, stylus not yet introduced |
| **KS2 (8-11)** | SVG full | Clear diagrams, early tablet adoption |
| **KS3 (12-14)** | PNG + JSON | More complex, longer diagrams |
| **KS4 (15-17)** | PNG + JSON | Exam-style, need fast rendering |

---

### 4.2 tldraw Creative Workspaces (TldrawCanvas.jsx)

**Current Integration:**
- Stores JSON snapshot only (line 121-131)
- No export functionality

**Recommended Enhancement:**
1. **Implement SVG export** via tldraw's `SvgExportContext`
2. **Add export button** to canvas header (alongside Save)
3. **Store snapshot + optional SVG** for sharing/gallery view
4. **Mobile Strategy:**
   - KS1/KS2: Full SVG export on save
   - KS3/KS4: SVG export with complexity thresholds
   - Implement `getSvg()` API when tldraw exposes it publicly

5. **Learning Commons Gallery:**
   - Display thumbnails as SVG for quick rendering
   - Fallback to PNG if SVG export fails

---

## 5. Integration Points with Existing Code

### 5.1 ExcalidrawQuestion.jsx Changes Required

**File:** `/sessions/gifted-inspiring-einstein/mnt/quest-academy-main/src/components/game/ExcalidrawQuestion.jsx`

**Modification Points:**
1. **Import exportToSvg** (alongside current exportToBlob)
   - Line ~242: Add `exportToSvg` to import

2. **Add SVG export function** (similar to exportAsPng, line 239-257)
   - Name: `exportAsSvg()`
   - Returns SVG string instead of data URL
   - Include minification step (SVGO)

3. **Extend submission data** (line 268-273)
   - Add `svgDataUrl` alongside `pngDataUrl`
   - Add `strokeCount` metric for iOS fallback logic
   - Add `elementType` breakdown for analytics

4. **Conditional SVG export** based on:
   - Age band (KS1/KS2 only)
   - Stroke count (if >200, skip SVG on iOS)
   - Element complexity

---

### 5.2 TldrawCanvas.jsx Changes Required

**File:** `/sessions/gifted-inspiring-einstein/mnt/quest-academy-main/src/components/commons/TldrawCanvas.jsx`

**Modification Points:**
1. **Add SVG export function** (new)
   - Extract current editor state
   - Call tldraw's internal SVG export
   - Fallback to JSON if SVG generation fails

2. **Add "Export as SVG" button** (alongside Save button, line 219-233)
   - Only show for non-readOnly mode
   - Trigger `onExport(svgString)` callback

3. **New Props:**
   - `onExport?: (svgString) => void` — callback for SVG export
   - `enableSvgExport?: boolean = true` — toggle export feature

4. **Optional: Add Sharing**
   - Store SVG in session/analytics
   - Generate shareable SVG links for Learning Commons gallery

---

## 6. Technical Implementation Architecture

### 6.1 SVG Export Pipeline

```
User Action (Submit/Save)
  ↓
[Get Drawing Data]
  ↓
[Generate SVG via Library API]
  ↓
[Apply SVGO Minification]
  ↓
[Check Size & Complexity]
  ├─ Too Large? → PNG Fallback
  ├─ iOS > 200 strokes? → PNG Fallback
  └─ OK → Store as SVG
  ↓
[Store in Database/State]
  - Schema: { type, format, svgString, pngDataUrl, jsonSnapshot }
  ↓
[Render in "Show Your Work"]
  ├─ SVG: <svg dangerouslySetInnerHTML={...} />
  ├─ PNG: <img src={pngUrl} />
  └─ JSON: Editable snapshot for Learning Commons
```

---

### 6.2 Database Schema Extension

**New fields in drawing submissions:**

```javascript
{
  // Existing
  sceneData: { type, elements, appState },  // JSON
  pngDataUrl: "data:image/png;base64,...",

  // NEW
  svgDataUrl: "data:image/svg+xml;base64,...",  // Optional
  svgString: "<svg>...</svg>",                  // Optional, unencoded
  renderFormat: "svg" | "png" | "json",         // Preferred render target
  metrics: {
    elementCount: 42,
    strokeCount: 150,
    fileSize: { png: 5000, svg: 3000 },
    exportTime: 234  // ms
  }
}
```

---

### 6.3 Dependencies & Libraries

**Add to package.json:**
- `svgo@^3.0.0` — SVG minification (already available via npm)
- `rough-notation@^0.5.0` — Optional, for hand-drawn overlays in KS1

**No breaking changes to existing dependencies:**
- `@excalidraw/excalidraw` — Already v0.18.0, has SVG export
- `tldraw` — Already v4.5.3, has SvgExportContext

---

## 7. Risks & Unknowns

### 7.1 Identified Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| **iOS Safari SVG lag (>200 strokes)** | Medium | High | PNG fallback logic, monitor in testing |
| **tldraw getSvg() not public in v4.5** | Medium | Medium | Use internal SvgExportContext, handle failures gracefully |
| **SVG file bloat from embedded fonts** | Low | Medium | SVGO minification, consider system fonts |
| **Complex KS3/KS4 diagrams render slowly** | Medium | Medium | Complexity threshold → PNG fallback |
| **Android SVG performance variability** | Medium | Low | Test on actual tablets, provide PNG option |
| **Scribble Recognition blocks iPad Pencil** | Low | Low | Document workaround, add toggle in settings |

### 7.2 Unknowns Requiring Testing

1. **Real-world SVG size** on typical student drawings
   - KS1: Simple shapes → expect <50KB SVG
   - KS4: Complex diagrams → expect 100-500KB SVG

2. **SVG render time** on actual tablets
   - iPad Air 2 (older) vs iPad Pro (new)
   - Samsung Galaxy Tab S (different OS versions)

3. **tldraw SVG export stability** in v4.5.3
   - Test complex canvases with 100+ objects
   - Test with embedded images, videos

4. **AI validation** with SVG vs PNG
   - Does Claude/GPT model prefer PNG for content analysis?
   - Can we validate from SVG instead (faster)?

---

## 8. Phased Implementation Roadmap

### Phase 1: Foundation (Q2 2026 - Weeks 1-4)

**Objectives:**
- Implement SVG export for Excalidraw
- Set up SVGO minification pipeline
- Create SVG rendering component

**Deliverables:**
1. `exportAsSvg()` function in ExcalidrawQuestion.jsx
2. SVGO integration for minification
3. `<SvgDisplay />` component for rendering SVG safely
4. Fallback to PNG if SVG export fails
5. Unit tests for SVG export and rendering

**Testing:**
- Export simple drawings (KS1) → verify SVG renders correctly
- Export complex diagrams (KS4) → measure performance
- Test on iPad + Android tablet with stylus
- Monitor iOS Safari for lag

**Success Criteria:**
- SVG exports successfully for 95%+ of drawings
- SVG renders in <2s on iPad Air 2
- PNG fallback activates for >200-stroke drawings on iOS

---

### Phase 2: tldraw & Gallery (Q2 2026 - Weeks 5-8)

**Objectives:**
- Implement SVG export for tldraw
- Add gallery view with SVG thumbnails
- Create "Show Your Work" gallery component

**Deliverables:**
1. `exportAsSvg()` function in TldrawCanvas.jsx
2. Export button in canvas header
3. `<SvgGallery />` component for Learning Commons
4. Database schema update for svg storage
5. API endpoint for SVG retrieval/sharing

**Testing:**
- Export tldraw canvases with 50-500 objects
- Gallery renders 20+ SVGs without lag
- Sharing link works on mobile
- Test with images/embedded content in tldraw

**Success Criteria:**
- 90%+ of tldraw canvases export to valid SVG
- Gallery loads in <3s on 4G connection
- SVG sharing links are unique and secure

---

### Phase 3: Optimization & Analytics (Q3 2026)

**Objectives:**
- Optimize SVG rendering per device
- Track SVG usage and performance metrics
- A/B test SVG vs PNG rendering for "show your work"

**Deliverables:**
1. Device-specific SVG optimization (iPad vs Android vs desktop)
2. Analytics dashboard for SVG export success rates
3. Performance monitoring (render time, file size)
4. A/B test framework for SVG rendering
5. Documentation for scholars on SVG quality/sizes

**Testing:**
- Monitor real-world SVG performance across user base
- Identify slow device/browser combinations
- Validate AI model acceptance of SVG vs PNG
- User feedback on visual quality

**Success Criteria:**
- SVG render time <1.5s on 95% of devices
- SVG file sizes <200KB for 90% of drawings
- 10%+ improvement in page load time vs PNG-only
- Scholar feedback: SVG quality matches expectations

---

## 9. Detailed Success Criteria

### 9.1 Technical Metrics

- **SVG Export Success Rate:** ≥95% of submissions
- **SVG File Size:** <200KB (KS1/KS2), <500KB (KS3/KS4)
- **Render Time:** <1.5s on iPad Air 2 (baseline slow device)
- **iOS Safari Compatibility:** Handles drawings with >300 strokes via PNG fallback
- **Android Performance:** No lag on Samsung Galaxy Tab A or newer
- **Minification Ratio:** SVGO reduces size by 25-40%
- **API Response Time:** <500ms for SVG retrieval

### 9.2 User Experience Metrics

- **Adoption Rate:** >70% of submissions include SVG export
- **Render Quality:** Scholar feedback: 4.5+/5 for visual fidelity
- **Accessibility:** SVG passes WCAG 2.1 AA contrast checks
- **Feature Discoverability:** >80% of users know about SVG export within 2 weeks

### 9.3 Business Metrics

- **Support Tickets:** <5% of issues related to SVG rendering
- **Performance Impact:** <5% increase in server load from SVG storage
- **Storage Efficiency:** SVG + JSON < PNG + JSON in 60% of cases
- **Feature Completion:** All three phases complete by Q3 end

---

## 10. Risk Mitigation & Contingencies

### 10.1 If tldraw getSvg() API is Unstable

- **Plan B:** Use internal `SvgExportContext` with custom shape handlers
- **Plan C:** Export as JSON + Canvas rendering on client (slower)
- **Timeline Impact:** +1 week for workaround implementation

### 10.2 If iOS Safari SVG Performance is Unacceptable

- **Plan B:** Reduce scope to SVG-on-desktop only, PNG on mobile
- **Plan C:** Implement path simplification (Ramer-Douglas-Peucker algorithm)
- **Timeline Impact:** +2 weeks for path simplification

### 10.3 If SVG File Sizes Exceed 500KB

- **Plan B:** Implement chunked SVG rendering (split into layers)
- **Plan C:** Switch to PNG for all exports, keep SVG as optional feature
- **Timeline Impact:** +3 weeks for chunked implementation

### 10.4 If AI Validation Models Struggle with SVG

- **Plan B:** Keep PNG as primary export, SVG as display-only feature
- **Plan C:** Implement hybrid: SVG for display, PNG for AI analysis
- **No timeline impact** — architectured for this already

---

## 11. Success Stories & Inspiration

### Real-world Implementations

1. **Excalidraw.com** — Fully supports SVG export; mobile UX is core
2. **tldraw.dev** — Built as infinite canvas SDK; mobile-first design
3. **Amplenote iPad App** — Uses Excalidraw + Pencil; smooth experience
4. **Wacom Inkspace** — Hand-drawn to SVG on tablets (reference for UX)
5. **Rough Notation** — Hand-drawn annotation overlays (for styling inspiration)

**Key Insight:** All production drawing apps on tablets default to lower-resolution SVG or PNG for performance; they don't force full vector export on mobile.

---

## 12. Questions for Stakeholder Review

### Before Phase 1 Starts:

1. **AI Validation:** Can Claude/current model validate drawings from SVG instead of PNG? (Could save export time)
2. **Storage:** Should we store all three formats (JSON, PNG, SVG) or conditionally based on age band?
3. **Sharing:** Is Learning Commons gallery the primary use case for SVG display, or are other features planned?
4. **Compliance:** Do UK education privacy/GDPR rules affect SVG storage vs PNG? (Consider metadata)
5. **Device Testing:** Do we have access to iPad + Samsung tablets for real-world testing, or should we plan emulator testing?

### During Implementation:

6. **Performance Budget:** What's the maximum acceptable increase in database storage per student?
7. **Fallback UX:** When PNG fallback occurs, should users be notified? (Could confuse scholars)
8. **Accessibility:** Are there SVG color contrast requirements for dyslexic scholars?

---

## 13. Appendix: Resource Links

### Official Documentation
- [Excalidraw Export Utilities](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/utils/export)
- [tldraw SvgExportContext](https://tldraw.dev/reference/editor/SvgExportContext)
- [tldraw Custom SVG Shapes](https://tldraw.dev/examples/shapes/tools/toSvg-method-example)

### Performance & Optimization
- [SVG Animation Performance (Zigpoll)](https://www.zigpoll.com/content/how-can-i-optimize-svg-animations-to-run-smoothly-on-both-desktop-and-mobile-browsers-without-significant-performance-loss)
- [High Performance SVGs (CSS-Tricks)](https://css-tricks.com/high-performance-svgs/)
- [SVGO Minification Tool](https://svgo.dev/)
- [Safari SVG Rendering Issues (StackOverflow)](https://kristerkari.github.io/adventures-in-webkit-land/blog/2013/03/08/dealing-with-svg-images-in-mobile-browsers/)

### Alternative Approaches
- [canvas2svg Library (GitHub)](https://github.com/gliffy/canvas2svg)
- [Rough Notation (GitHub)](https://github.com/rough-stuff/rough-notation)
- [Canvas vs SVG Performance Comparison](https://www.sitepoint.com/canvas-vs-svg/)

### Mobile & Tablet Testing
- [Excalidraw on iPad Pro (Issue #3808)](https://github.com/excalidraw/excalidraw/issues/3808)
- [tldraw Native Mobile Support (Issue #4251)](https://github.com/tldraw/tldraw/issues/4251)
- [Stylus Input Support (GitHub Issue #9215)](https://github.com/excalidraw/excalidraw/discussions/9215)

---

## 14. Document Control

| Version | Date | Author | Status | Notes |
|---------|------|--------|--------|-------|
| 1.0 | 2026-03-25 | Rotimi (via Claude Research) | Draft | Initial research & planning phase complete |

**Next Review:** After Phase 1 completion (Week 4, Q2 2026)

**Approval Required From:**
- [ ] LaunchPard CTO / Architecture Lead
- [ ] Product Manager (Learning Commons)
- [ ] QA Lead (mobile/tablet testing)
- [ ] Accessibility Lead (WCAG compliance)

---

**Document Location:** `/sessions/gifted-inspiring-einstein/mnt/quest-academy-main/research-excalidraw-tldraw-svg.md`

**Supersedes:** None (initial strategic planning document)

**Expires:** 2026-09-30 (end of Q3 implementation)
