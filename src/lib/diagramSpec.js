/**
 * diagramSpec.js
 *
 * DiagramSpec — the JSON contract shared by:
 *   • Tara's AI responses        → diagram_spec key in response JSON
 *   • question_bank.visual_spec  → static JSONB column (Mode 1)
 *   • Concept card visual_data   → embedded spec object
 *   • MathsDiagram component     → consumes the spec
 *
 * ── SCHEMA ───────────────────────────────────────────────────────────────────
 *
 *   {
 *     version:  1,
 *     kind:     "geometry" | "graph" | "stats" | "transform",
 *     title:    string?,          // optional caption shown below diagram
 *     bounds:   [xmin, ymin, xmax, ymax],  // mathematical coordinate range
 *     showAxis: boolean?,         // draw x/y axes (default false)
 *     grid:     boolean?,         // draw background grid (default false)
 *     elements: DiagramElement[]
 *   }
 *
 * ── ELEMENT TYPES ────────────────────────────────────────────────────────────
 *
 *   point         { type, id?, coords, label?, color?, size?, labelColor? }
 *   segment       { type, id?, from, to, color?, strokeWidth?, dashed? }
 *   line          { type, id?, from, to, color?, dashed? }   — infinite line
 *   arrow         { type, id?, from, to, color?, strokeWidth? }
 *   circle        { type, id?, center, radius, color?, fill?, fillOpacity? }
 *   arc           { type, id?, center, from, to, color?, strokeWidth? }
 *   angle         { type, id?, vertex, arm1, arm2, label?, square?, color?, radius? }
 *   polygon       { type, id?, vertices, fill?, color?, fillOpacity? }
 *   functiongraph { type, id?, fn, domain?, color?, strokeWidth? }
 *   text          { type, id?, coords, content, color?, size?, bold? }
 *
 *   — NEW in v1.1 —
 *   slider        { type, id?, pos, range, label?, color?, snapWidth? }
 *                   pos:   [[x1,y1],[x2,y2]] — start and end of slider track
 *                   range: [min, start, max]
 *   ellipse       { type, id?, center, radiusX, radiusY, color?, fill?, fillOpacity?, strokeWidth? }
 *   regularpolygon { type, id?, center, radius, n, rotation?, color?, fill?, fillOpacity?, showVertices? }
 *                   rotation: degrees, default 0
 *   sector        { type, id?, center, radius, from, to, color?, fill?, fillOpacity? }
 *                   from/to: degrees (0 = right / +x direction, anticlockwise)
 *   parametric    { type, id?, xFn, yFn, tMin, tMax, color?, strokeWidth? }
 *                   xFn/yFn: math expression strings in variable t
 *   midpoint      { type, id?, p1, p2, label?, color?, size? }
 *   perpbisector  { type, id?, p1, p2, color?, dashed?, strokeWidth? }
 *   anglebisector { type, id?, vertex, arm1, arm2, color?, dashed? }
 *   tangentline   { type, id?, fn, at, domain?, color?, strokeWidth?, dashed? }
 *                   fn: math expression in x; at: x-value of tangent point
 *   integral      { type, id?, fn, from, to, fillColor?, fillOpacity?, color? }
 *   riemannsum    { type, id?, fn, n, method?, from, to, fill?, fillOpacity?, color? }
 *                   method: "left" | "right" | "middle" | "upper" | "lower" (default "left")
 *   inequality    { type, id?, line, above?, color?, fillOpacity? }
 *                   line: id of a 'line' element; above: true fills above, false below
 *
 * ── COORD REFERENCES ─────────────────────────────────────────────────────────
 *
 *   from / to / center / vertex / arm1 / arm2 / p1 / p2 accept either:
 *     - string  — references a previously defined element by its id
 *     - [x, y]  — absolute coordinate pair
 *
 * ── FUNCTION STRINGS ─────────────────────────────────────────────────────────
 *
 *   fn / xFn / yFn are math expression strings. Both JS and natural-maths
 *   notation are accepted — MathsDiagram normalises before eval:
 *
 *     "2*x + 1"           "2x+1" (implicit multiply NOT supported, use *)
 *     "x^2 - 3"           → x**2 - 3
 *     "sin(x)"            → Math.sin(x)
 *     "cos(x)"            → Math.cos(x)
 *     "tan(x)"            → Math.tan(x)
 *     "sqrt(x)"           → Math.sqrt(x)
 *     "abs(x)"            → Math.abs(x)
 *     "exp(x)"            → Math.exp(x)
 *     "ln(x)"             → Math.log(x)
 *     "log(x)"            → Math.log10(x)
 *     "pi" or "π"         → Math.PI
 *     "e"                 → Math.E  (standalone, not as part of word)
 */

export const DIAGRAM_SPEC_VERSION = 1

// ─── VALIDATOR ────────────────────────────────────────────────────────────────

/**
 * Validates a DiagramSpec object.
 * @param {object} spec
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateSpec(spec) {
  const errors = []
  if (!spec || typeof spec !== 'object') {
    errors.push('spec must be a non-null object')
    return { ok: false, errors }
  }
  if (!Array.isArray(spec.bounds) || spec.bounds.length !== 4) {
    errors.push('bounds must be [xmin, ymin, xmax, ymax]')
  }
  if (!Array.isArray(spec.elements)) {
    errors.push('elements must be an array')
  }
  const validKinds = ['geometry', 'graph', 'stats', 'transform']
  if (spec.kind && !validKinds.includes(spec.kind)) {
    errors.push(`kind must be one of: ${validKinds.join(', ')}`)
  }
  return { ok: errors.length === 0, errors }
}

/** Get a spec by stem name. Returns undefined if not found. */
export function getSpec(stem) {
  return DIAGRAM_SPECS[stem]
}

/** List all available stem names. */
export function listSpecs() {
  return Object.keys(DIAGRAM_SPECS)
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/** Generate evenly-spaced tick points along a number line. */
function _nticks(start, end, step = 1) {
  const pts = []
  for (let v = start; v <= end + 1e-9; v = Math.round((v + step) * 1e9) / 1e9) {
    pts.push(v)
  }
  return pts
}

// ─── PRE-DEFINED SPECS ────────────────────────────────────────────────────────

export const DIAGRAM_SPECS = {

  // ══════════════════════════════════════════════════════════════════════════
  // GEOMETRY
  // ══════════════════════════════════════════════════════════════════════════

  right_angle_triangle: {
    version: 1, kind: 'geometry', title: 'Right-angled triangle',
    bounds: [0, 0, 10, 8],
    elements: [
      { type: 'point', id: 'A', coords: [1, 1], label: 'A' },
      { type: 'point', id: 'B', coords: [8, 1], label: 'B' },
      { type: 'point', id: 'C', coords: [1, 6], label: 'C' },
      { type: 'polygon', id: 'tri', vertices: ['A', 'B', 'C'], fill: '#dbeafe', color: '#1e40af' },
      { type: 'angle', vertex: 'A', arm1: 'B', arm2: 'C', square: true, color: '#1e293b' },
      { type: 'text', coords: [4.3, 0.3], content: 'b' },
      { type: 'text', coords: [0.2, 3.5], content: 'a' },
      { type: 'text', coords: [5,   4.2], content: 'c' },
    ],
  },

  pythagoras: {
    version: 1, kind: 'geometry', title: 'Pythagoras: a² + b² = c²',
    bounds: [0, 0, 10, 8],
    elements: [
      { type: 'point', id: 'A', coords: [1, 1], label: 'A' },
      { type: 'point', id: 'B', coords: [7, 1], label: 'B' },
      { type: 'point', id: 'C', coords: [1, 6], label: 'C' },
      { type: 'polygon', vertices: ['A', 'B', 'C'], fill: '#ede9fe', color: '#7c3aed' },
      { type: 'angle', vertex: 'A', arm1: 'B', arm2: 'C', square: true, color: '#1e293b' },
      { type: 'text', coords: [3.8, 0.3], content: 'b', color: '#1e40af' },
      { type: 'text', coords: [0.2, 3.5], content: 'a', color: '#16a34a' },
      { type: 'text', coords: [4.8, 3.8], content: 'c (hypotenuse)', color: '#7c3aed' },
    ],
  },

  isosceles_triangle: {
    version: 1, kind: 'geometry', title: 'Isosceles triangle',
    bounds: [0, 0, 10, 9],
    elements: [
      { type: 'point', id: 'A', coords: [5,   8], label: 'A' },
      { type: 'point', id: 'B', coords: [1.5, 1], label: 'B' },
      { type: 'point', id: 'C', coords: [8.5, 1], label: 'C' },
      { type: 'polygon', vertices: ['A', 'B', 'C'], fill: '#d1fae5', color: '#065f46' },
      // Equal sides tick marks
      { type: 'text', coords: [2.8, 5],   content: '/', color: '#065f46' },
      { type: 'text', coords: [7,   5],   content: '/', color: '#065f46' },
      // Base label
      { type: 'text', coords: [4.7, 0.3], content: 'base', color: '#1e293b' },
      { type: 'text', coords: [0,   4.7], content: 'equal sides', color: '#065f46' },
      { type: 'text', coords: [5, -0.7], content: '∠B = ∠C (base angles equal)', color: '#065f46' },
    ],
  },

  triangle_30_60_90: {
    version: 1, kind: 'geometry', title: '30–60–90 triangle',
    bounds: [0, 0, 10, 8],
    elements: [
      { type: 'point', id: 'A', coords: [1, 1], label: 'A', color: '#1e40af' },
      { type: 'point', id: 'B', coords: [9, 1], label: 'B', color: '#1e40af' },
      { type: 'point', id: 'C', coords: [1, 5.62], label: 'C', color: '#1e40af' },  // tan60° × 8 ≈ 4.62 above
      { type: 'polygon', vertices: ['A', 'B', 'C'], fill: '#fef3c7', color: '#92400e' },
      { type: 'angle', vertex: 'A', arm1: 'B', arm2: 'C', square: true, color: '#1e293b' },
      { type: 'text', coords: [1.8, 1.5], content: '60°', color: '#dc2626' },
      { type: 'text', coords: [7.8, 1.5], content: '30°', color: '#dc2626' },
      { type: 'text', coords: [4.8, 0.3], content: '2x', color: '#92400e' },
      { type: 'text', coords: [0.1, 3.2], content: '√3·x', color: '#16a34a' },
      { type: 'text', coords: [5.3, 3.8], content: 'x', color: '#7c3aed' },
    ],
  },

  exterior_angle_theorem: {
    version: 1, kind: 'geometry', title: 'Exterior angle = sum of remote interior angles',
    bounds: [0, 0, 12, 8],
    elements: [
      { type: 'point', id: 'A', coords: [1,   1.5], label: 'A' },
      { type: 'point', id: 'B', coords: [7,   1.5], label: 'B' },
      { type: 'point', id: 'C', coords: [4,   6.5], label: 'C' },
      { type: 'point', id: 'D', coords: [11,  1.5], label: 'D', color: '#dc2626' },
      { type: 'polygon', vertices: ['A', 'B', 'C'], fill: '#dbeafe', color: '#1e40af' },
      // Extended line from A through B to D
      { type: 'segment', from: 'B', to: 'D', color: '#dc2626', strokeWidth: 2 },
      { type: 'text', coords: [1.8, 2.2], content: 'α', color: '#7c3aed' },
      { type: 'text', coords: [3.7, 5.5], content: 'β', color: '#7c3aed' },
      { type: 'text', coords: [7.8, 2.2], content: 'ext = α+β', color: '#dc2626' },
    ],
  },

  circle_parts: {
    version: 1, kind: 'geometry', title: 'Parts of a circle',
    bounds: [0, 0, 10, 10],
    elements: [
      { type: 'point', id: 'O', coords: [5, 5], label: 'O', color: '#1e293b', size: 3 },
      { type: 'circle', id: 'c', center: 'O', radius: 3.5, color: '#1e40af', fill: '#dbeafe', fillOpacity: 0.15 },
      { type: 'point', id: 'A', coords: [1.5, 5],  label: 'A', color: '#dc2626' },
      { type: 'point', id: 'B', coords: [8.5, 5],  label: 'B', color: '#dc2626' },
      { type: 'point', id: 'D', coords: [5,   8.5], label: 'D', color: '#16a34a' },
      { type: 'segment', from: 'A', to: 'B', color: '#dc2626', strokeWidth: 2 },
      { type: 'segment', from: 'O', to: 'D', color: '#16a34a', strokeWidth: 2 },
      { type: 'text', coords: [5.3, 7],   content: 'radius',   color: '#16a34a' },
      { type: 'text', coords: [3.8, 4.3], content: 'diameter', color: '#dc2626' },
    ],
  },

  circle_sector_area: {
    version: 1, kind: 'geometry', title: 'Sector area = ½r²θ',
    bounds: [-1, -1, 7, 7],
    elements: [
      { type: 'sector', id: 'sec', center: [3, 3], radius: 3.5, from: 0, to: 70,
        color: '#7c3aed', fill: '#ede9fe', fillOpacity: 0.6 },
      { type: 'point', id: 'O', coords: [3, 3], label: 'O', color: '#1e293b' },
      { type: 'segment', from: [3, 3], to: [6.5, 3], color: '#7c3aed', strokeWidth: 2 },
      { type: 'segment', from: [3, 3], to: [4.197, 6.287], color: '#7c3aed', strokeWidth: 2 },
      { type: 'angle', vertex: [3, 3], arm1: [6.5, 3], arm2: [4.197, 6.287],
        label: 'θ', color: '#7c3aed', radius: 1 },
      { type: 'text', coords: [5.2, 3.4], content: 'r', color: '#7c3aed' },
      { type: 'text', coords: [2, 1],     content: 'Area = ½r²θ  (θ in radians)', color: '#7c3aed' },
    ],
  },

  regular_hexagon: {
    version: 1, kind: 'geometry', title: 'Regular hexagon',
    bounds: [-4, -4, 4, 4],
    elements: [
      { type: 'regularpolygon', id: 'hex', center: [0, 0], radius: 3, n: 6, rotation: 0,
        color: '#1e40af', fill: '#dbeafe', fillOpacity: 0.35, showVertices: true },
      { type: 'point', id: 'O', coords: [0, 0], label: 'O', color: '#1e293b', size: 3 },
      { type: 'segment', from: [0, 0], to: [3, 0], color: '#dc2626', strokeWidth: 2 },
      { type: 'text', coords: [1.3, 0.4], content: 'r', color: '#dc2626' },
      { type: 'text', coords: [-1.5, -3.5], content: 'All interior angles = 120°', color: '#64748b' },
    ],
  },

  parallel_lines_angles: {
    version: 1, kind: 'geometry', title: 'Parallel lines and angles',
    bounds: [0, 0, 10, 10],
    elements: [
      { type: 'point', id: 'L1a', coords: [0.5, 7],  label: '' },
      { type: 'point', id: 'L1b', coords: [9.5, 7],  label: '' },
      { type: 'point', id: 'L2a', coords: [0.5, 3],  label: '' },
      { type: 'point', id: 'L2b', coords: [9.5, 3],  label: '' },
      { type: 'segment', from: 'L1a', to: 'L1b', color: '#1e293b', strokeWidth: 2 },
      { type: 'segment', from: 'L2a', to: 'L2b', color: '#1e293b', strokeWidth: 2 },
      { type: 'text', coords: [0.8, 7.3], content: '>', color: '#1e293b' },
      { type: 'text', coords: [0.8, 3.3], content: '>', color: '#1e293b' },
      { type: 'point', id: 'T1', coords: [3.5, 9.5], label: '' },
      { type: 'point', id: 'T2', coords: [6.5, 0.5], label: '' },
      { type: 'segment', from: 'T1', to: 'T2', color: '#7c3aed', strokeWidth: 2 },
      { type: 'point', id: 'P', coords: [4.4, 7], label: 'P', color: '#dc2626', size: 4 },
      { type: 'point', id: 'Q', coords: [5.6, 3], label: 'Q', color: '#dc2626', size: 4 },
      { type: 'text', coords: [4.8, 7.5], content: 'a°', color: '#dc2626' },
      { type: 'text', coords: [6.1, 3.5], content: 'a°', color: '#dc2626' },
      { type: 'text', coords: [4.8, 5.2], content: '(Alternate angles)', color: '#64748b' },
    ],
  },

  area_trapezium: {
    version: 1, kind: 'geometry', title: 'Area of a trapezium',
    bounds: [0, 0, 10, 8],
    elements: [
      { type: 'point', id: 'A', coords: [1, 1], label: 'A' },
      { type: 'point', id: 'B', coords: [9, 1], label: 'B' },
      { type: 'point', id: 'C', coords: [7, 5], label: 'C' },
      { type: 'point', id: 'D', coords: [3, 5], label: 'D' },
      { type: 'polygon', vertices: ['A', 'B', 'C', 'D'], fill: '#fef9c3', color: '#92400e' },
      { type: 'text', coords: [4.7, 0.3], content: 'b (longer parallel side)' },
      { type: 'text', coords: [4.5, 5.5], content: 'a (shorter parallel side)' },
      { type: 'segment', from: [4, 1], to: [4, 5], color: '#dc2626', dashed: true, strokeWidth: 1.5 },
      { type: 'text', coords: [4.3, 3], content: 'h', color: '#dc2626' },
      { type: 'text', coords: [3.5, 7.3], content: 'Area = ½(a + b) × h', color: '#92400e' },
    ],
  },

  circle_theorem_semicircle: {
    version: 1, kind: 'geometry', title: 'Angle in a semicircle = 90°',
    bounds: [0, 0, 10, 8],
    elements: [
      { type: 'point', id: 'O', coords: [5, 2.5], label: 'O', color: '#1e293b' },
      { type: 'point', id: 'A', coords: [1.5, 2.5], label: 'A', color: '#1e40af' },
      { type: 'point', id: 'B', coords: [8.5, 2.5], label: 'B', color: '#1e40af' },
      { type: 'point', id: 'P', coords: [5, 6],    label: 'P', color: '#dc2626' },
      { type: 'arc', center: 'O', from: 'A', to: 'B', color: '#1e40af', strokeWidth: 2 },
      { type: 'segment', from: 'A', to: 'B', color: '#1e40af', strokeWidth: 2 },
      { type: 'segment', from: 'A', to: 'P', color: '#7c3aed', strokeWidth: 2 },
      { type: 'segment', from: 'P', to: 'B', color: '#7c3aed', strokeWidth: 2 },
      { type: 'angle', vertex: 'P', arm1: 'A', arm2: 'B', square: true, color: '#dc2626' },
      { type: 'text', coords: [2.3, 7.2], content: 'Angle APB = 90° (angle in semicircle)', color: '#1e40af' },
    ],
  },

  circle_theorem_center_arc: {
    version: 1, kind: 'geometry', title: 'Central angle = 2 × inscribed angle',
    bounds: [0, 0, 10, 10],
    elements: [
      { type: 'point', id: 'O', coords: [5, 5],   label: 'O', color: '#1e293b', size: 3 },
      { type: 'circle', center: 'O', radius: 3.8, color: '#1e40af', fill: '#dbeafe', fillOpacity: 0.1 },
      { type: 'point', id: 'A', coords: [1.2, 5],  label: 'A', color: '#1e40af' },
      { type: 'point', id: 'B', coords: [8.8, 5],  label: 'B', color: '#1e40af' },
      { type: 'point', id: 'P', coords: [5, 8.8],  label: 'P', color: '#dc2626' },
      { type: 'segment', from: 'O', to: 'A', color: '#1e293b', strokeWidth: 1.5, dashed: true },
      { type: 'segment', from: 'O', to: 'B', color: '#1e293b', strokeWidth: 1.5, dashed: true },
      { type: 'segment', from: 'P', to: 'A', color: '#dc2626', strokeWidth: 2 },
      { type: 'segment', from: 'P', to: 'B', color: '#dc2626', strokeWidth: 2 },
      { type: 'text', coords: [4.5, 5.6], content: '2θ', color: '#1e293b' },
      { type: 'text', coords: [4.5, 7.8], content: 'θ',  color: '#dc2626' },
      { type: 'text', coords: [1,   1.5], content: 'Central angle = 2 × inscribed angle', color: '#1e40af' },
    ],
  },

  circle_theorem_cyclic_quad: {
    version: 1, kind: 'geometry', title: 'Cyclic quadrilateral: opposite angles sum to 180°',
    bounds: [-1, -1, 11, 11],
    elements: [
      { type: 'point', id: 'O', coords: [5, 5], label: 'O', color: '#1e293b', size: 3 },
      { type: 'circle', center: 'O', radius: 4.2, color: '#94a3b8', fill: 'none' },
      { type: 'point', id: 'A', coords: [1.2, 6.4], label: 'A', color: '#1e40af' },
      { type: 'point', id: 'B', coords: [4.5, 9.2], label: 'B', color: '#1e40af' },
      { type: 'point', id: 'C', coords: [8.9, 6.0], label: 'C', color: '#1e40af' },
      { type: 'point', id: 'D', coords: [5.5, 0.8], label: 'D', color: '#1e40af' },
      { type: 'polygon', vertices: ['A', 'B', 'C', 'D'], fill: '#dbeafe', color: '#1e40af', fillOpacity: 0.3 },
      { type: 'text', coords: [1.8, 7.3], content: 'α', color: '#dc2626' },
      { type: 'text', coords: [7.8, 5.0], content: 'α*', color: '#dc2626' },
      { type: 'text', coords: [4.0, 8.7], content: 'β', color: '#7c3aed' },
      { type: 'text', coords: [5.0, 1.5], content: 'β*', color: '#7c3aed' },
      { type: 'text', coords: [0.5, -0.5], content: 'α + α* = 180°,  β + β* = 180°', color: '#1e40af' },
    ],
  },

  angles_types: {
    version: 1, kind: 'geometry', title: 'Types of angles',
    bounds: [0, 0, 15, 6],
    elements: [
      { type: 'point', id: 'V1', coords: [2,   1],   label: '' },
      { type: 'point', id: 'A1', coords: [4.5, 1],   label: '' },
      { type: 'point', id: 'B1', coords: [3,   3.5], label: '' },
      { type: 'segment', from: 'V1', to: 'A1', color: '#1e293b', strokeWidth: 2 },
      { type: 'segment', from: 'V1', to: 'B1', color: '#1e293b', strokeWidth: 2 },
      { type: 'text', coords: [1.2, 0.4], content: 'Acute  (< 90°)', color: '#1e40af' },
      { type: 'point', id: 'V2', coords: [7,   1],   label: '' },
      { type: 'point', id: 'A2', coords: [9.5, 1],   label: '' },
      { type: 'point', id: 'B2', coords: [7,   3.5], label: '' },
      { type: 'segment', from: 'V2', to: 'A2', color: '#1e293b', strokeWidth: 2 },
      { type: 'segment', from: 'V2', to: 'B2', color: '#1e293b', strokeWidth: 2 },
      { type: 'angle', vertex: 'V2', arm1: 'A2', arm2: 'B2', square: true, color: '#16a34a' },
      { type: 'text', coords: [6.2, 0.4], content: 'Right  (= 90°)', color: '#16a34a' },
      { type: 'point', id: 'V3', coords: [11,   1],   label: '' },
      { type: 'point', id: 'A3', coords: [14,   1],   label: '' },
      { type: 'point', id: 'B3', coords: [9.8, 3.5], label: '' },
      { type: 'segment', from: 'V3', to: 'A3', color: '#1e293b', strokeWidth: 2 },
      { type: 'segment', from: 'V3', to: 'B3', color: '#1e293b', strokeWidth: 2 },
      { type: 'text', coords: [10.2, 0.4], content: 'Obtuse (90°–180°)', color: '#dc2626' },
    ],
  },

  similar_triangles: {
    version: 1, kind: 'geometry', title: 'Similar triangles (scale factor 2)',
    bounds: [0, 0, 14, 8],
    elements: [
      { type: 'point', id: 'A', coords: [1, 1], label: 'A' },
      { type: 'point', id: 'B', coords: [4, 1], label: 'B' },
      { type: 'point', id: 'C', coords: [1, 3.5], label: 'C' },
      { type: 'polygon', vertices: ['A', 'B', 'C'], fill: '#dbeafe', color: '#1e40af' },
      { type: 'point', id: 'P', coords: [7, 1],   label: 'P', color: '#92400e' },
      { type: 'point', id: 'Q', coords: [13, 1],  label: 'Q', color: '#92400e' },
      { type: 'point', id: 'R', coords: [7, 6],   label: 'R', color: '#92400e' },
      { type: 'polygon', vertices: ['P', 'Q', 'R'], fill: '#fef9c3', color: '#92400e' },
      { type: 'text', coords: [2.3, 0.3], content: '3 cm', color: '#1e40af' },
      { type: 'text', coords: [9.7, 0.3], content: '6 cm', color: '#92400e' },
      { type: 'text', coords: [5,   7.3], content: 'Scale factor: 2', color: '#64748b' },
    ],
  },

  sine_rule: {
    version: 1, kind: 'geometry', title: 'Sine rule: a/sin A = b/sin B = c/sin C',
    bounds: [0, 0, 10, 8],
    elements: [
      { type: 'point', id: 'A', coords: [1,   1],   label: '' },
      { type: 'point', id: 'B', coords: [8.5, 1],   label: '' },
      { type: 'point', id: 'C', coords: [5.5, 6.5], label: '' },
      { type: 'polygon', vertices: ['A', 'B', 'C'], fill: '#f0fdf4', color: '#166534', strokeWidth: 2 },
      { type: 'text', coords: [4.6, 0.3], content: 'c',  color: '#166534' },
      { type: 'text', coords: [7.5, 4],   content: 'b',  color: '#166534' },
      { type: 'text', coords: [2.5, 4],   content: 'a',  color: '#166534' },
      { type: 'text', coords: [1.8, 1.6], content: 'A',  color: '#dc2626' },
      { type: 'text', coords: [7.5, 1.6], content: 'B',  color: '#dc2626' },
      { type: 'text', coords: [5.3, 5.6], content: 'C',  color: '#dc2626' },
    ],
  },

  loci_equidistant: {
    version: 1, kind: 'geometry', title: 'Locus equidistant from two fixed points',
    bounds: [0, 0, 10, 8],
    elements: [
      { type: 'point', id: 'A', coords: [2, 4], label: 'A', color: '#1e40af', size: 5 },
      { type: 'point', id: 'B', coords: [8, 4], label: 'B', color: '#1e40af', size: 5 },
      { type: 'segment', from: [5, 0.5], to: [5, 7.5], color: '#dc2626', dashed: true, strokeWidth: 2 },
      { type: 'segment', from: 'A', to: [5, 4], color: '#94a3b8', dashed: true, strokeWidth: 1.5 },
      { type: 'segment', from: 'B', to: [5, 4], color: '#94a3b8', dashed: true, strokeWidth: 1.5 },
      { type: 'point', id: 'M', coords: [5, 4], label: 'M', color: '#dc2626', size: 4 },
      { type: 'text', coords: [5.3, 7],   content: 'Locus',          color: '#dc2626' },
      { type: 'text', coords: [3,   5.2], content: 'AM = BM always', color: '#64748b' },
    ],
  },

  perpendicular_bisector: {
    version: 1, kind: 'geometry', title: 'Perpendicular bisector construction',
    bounds: [0, 0, 10, 8],
    elements: [
      { type: 'point', id: 'A', coords: [2, 4], label: 'A', color: '#1e40af', size: 5 },
      { type: 'point', id: 'B', coords: [8, 4], label: 'B', color: '#1e40af', size: 5 },
      { type: 'segment', from: 'A', to: 'B', color: '#1e40af', strokeWidth: 2 },
      // Construction arcs (drawn as circles partly)
      { type: 'circle', center: 'A', radius: 3.5, color: '#94a3b8', fill: 'none', strokeWidth: 1 },
      { type: 'circle', center: 'B', radius: 3.5, color: '#94a3b8', fill: 'none', strokeWidth: 1 },
      // Perpendicular bisector line
      { type: 'perpbisector', p1: 'A', p2: 'B', color: '#dc2626', strokeWidth: 2 },
      { type: 'point', id: 'M', coords: [5, 4], label: 'M', color: '#dc2626', size: 4 },
      { type: 'angle', vertex: 'M', arm1: 'A', arm2: [5, 5.5], square: true, color: '#1e293b', radius: 0.4 },
      { type: 'text', coords: [5.3, 7.2], content: 'Perp. bisector', color: '#dc2626' },
    ],
  },

  angle_bisector_diagram: {
    version: 1, kind: 'geometry', title: 'Angle bisector',
    bounds: [0, 0, 10, 8],
    elements: [
      { type: 'point', id: 'V', coords: [1, 4],   label: 'V' },
      { type: 'point', id: 'A', coords: [8, 7],   label: 'A', color: '#1e40af' },
      { type: 'point', id: 'B', coords: [8, 1],   label: 'B', color: '#1e40af' },
      { type: 'segment', from: 'V', to: 'A', color: '#1e40af', strokeWidth: 2 },
      { type: 'segment', from: 'V', to: 'B', color: '#1e40af', strokeWidth: 2 },
      // Bisector
      { type: 'anglebisector', vertex: 'V', arm1: 'A', arm2: 'B', color: '#dc2626', dashed: false },
      // Equal angle arcs
      { type: 'text', coords: [2.2, 5.0], content: 'θ', color: '#dc2626' },
      { type: 'text', coords: [2.2, 3.0], content: 'θ', color: '#dc2626' },
      { type: 'text', coords: [5.5, 4.4], content: 'bisector', color: '#dc2626' },
    ],
  },

  bearing_diagram: {
    version: 1, kind: 'geometry', title: 'Three-figure bearing (060°)',
    bounds: [-4, -4, 4, 6],
    elements: [
      // North arrow
      { type: 'point', id: 'O',  coords: [0, 0], label: 'O', color: '#1e293b', size: 4 },
      { type: 'arrow', from: 'O', to: [0, 5],  color: '#1e293b', strokeWidth: 2 },
      { type: 'text',  coords: [-0.5, 5.2], content: 'N', color: '#1e293b' },
      // Bearing line: 060° means 60° clockwise from N → angle 30° from +x axis
      { type: 'arrow', from: 'O', to: [3.46, 2], color: '#dc2626', strokeWidth: 2.5 },
      // Arc for the angle
      { type: 'arc', center: 'O', from: [0, 2], to: [1.73, 1], color: '#dc2626', strokeWidth: 1.5 },
      { type: 'text',  coords: [0.6, 2.2], content: '060°', color: '#dc2626' },
      { type: 'text',  coords: [-3.5, -3], content: 'Bearing measured clockwise from North', color: '#64748b' },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // TRANSFORMATIONS
  // ══════════════════════════════════════════════════════════════════════════

  rotation_90: {
    version: 1, kind: 'transform', title: '90° anticlockwise rotation about origin',
    bounds: [-5, -5, 5, 5],
    showAxis: true, grid: true,
    elements: [
      { type: 'point', id: 'A',  coords: [1, 1], label: 'A',  color: '#1e40af' },
      { type: 'point', id: 'B',  coords: [3, 1], label: 'B',  color: '#1e40af' },
      { type: 'point', id: 'C',  coords: [1, 3], label: 'C',  color: '#1e40af' },
      { type: 'polygon', vertices: ['A', 'B', 'C'], fill: '#dbeafe', color: '#1e40af' },
      { type: 'point', id: "A'", coords: [-1, 1], label: "A'", color: '#dc2626' },
      { type: 'point', id: "B'", coords: [-1, 3], label: "B'", color: '#dc2626' },
      { type: 'point', id: "C'", coords: [-3, 1], label: "C'", color: '#dc2626' },
      { type: 'polygon', vertices: ["A'", "B'", "C'"], fill: '#fecaca', color: '#dc2626' },
      { type: 'text', coords: [1.2, -0.5],  content: 'Object', color: '#1e40af' },
      { type: 'text', coords: [-3.5, -0.5], content: 'Image',  color: '#dc2626' },
    ],
  },

  reflection_line: {
    version: 1, kind: 'transform', title: 'Reflection in the y-axis',
    bounds: [-6, -4, 6, 6],
    showAxis: true, grid: true,
    elements: [
      { type: 'point', id: 'A',  coords: [2, 1], label: 'A',  color: '#1e40af' },
      { type: 'point', id: 'B',  coords: [4, 1], label: 'B',  color: '#1e40af' },
      { type: 'point', id: 'C',  coords: [3, 4], label: 'C',  color: '#1e40af' },
      { type: 'polygon', vertices: ['A', 'B', 'C'], fill: '#dbeafe', color: '#1e40af' },
      { type: 'point', id: "A'", coords: [-2, 1], label: "A'", color: '#dc2626' },
      { type: 'point', id: "B'", coords: [-4, 1], label: "B'", color: '#dc2626' },
      { type: 'point', id: "C'", coords: [-3, 4], label: "C'", color: '#dc2626' },
      { type: 'polygon', vertices: ["A'", "B'", "C'"], fill: '#fecaca', color: '#dc2626' },
      { type: 'text', coords: [-0.5, 5.5], content: 'Mirror line (y-axis)', color: '#16a34a' },
    ],
  },

  enlargement_sf2: {
    version: 1, kind: 'transform', title: 'Enlargement, scale factor 2, centre O',
    bounds: [-2, -2, 12, 10],
    showAxis: true, grid: true,
    elements: [
      { type: 'point', id: 'O', coords: [0, 0], label: 'O', color: '#16a34a', size: 5 },
      // Object
      { type: 'point', id: 'A', coords: [2, 2], label: 'A', color: '#1e40af' },
      { type: 'point', id: 'B', coords: [3, 2], label: 'B', color: '#1e40af' },
      { type: 'point', id: 'C', coords: [2, 4], label: 'C', color: '#1e40af' },
      { type: 'polygon', vertices: ['A', 'B', 'C'], fill: '#dbeafe', color: '#1e40af' },
      // Image (×2)
      { type: 'point', id: "A'", coords: [4, 4], label: "A'", color: '#dc2626' },
      { type: 'point', id: "B'", coords: [6, 4], label: "B'", color: '#dc2626' },
      { type: 'point', id: "C'", coords: [4, 8], label: "C'", color: '#dc2626' },
      { type: 'polygon', vertices: ["A'", "B'", "C'"], fill: '#fecaca', color: '#dc2626' },
      // Ray lines from O
      { type: 'segment', from: 'O', to: "A'", color: '#16a34a', dashed: true, strokeWidth: 1 },
      { type: 'segment', from: 'O', to: "B'", color: '#16a34a', dashed: true, strokeWidth: 1 },
      { type: 'segment', from: 'O', to: "C'", color: '#16a34a', dashed: true, strokeWidth: 1 },
      { type: 'text', coords: [2.5, -1.5], content: 'Scale factor: 2', color: '#16a34a' },
    ],
  },

  transformation_matrix: {
    version: 1, kind: 'transform', title: 'Unit square for matrix transformation',
    bounds: [-2, -2, 4, 4],
    showAxis: true, grid: true,
    elements: [
      { type: 'point', id: 'O',  coords: [0, 0], label: 'O',      color: '#1e293b' },
      { type: 'point', id: 'Ax', coords: [1, 0], label: 'A(1,0)', color: '#1e40af' },
      { type: 'point', id: 'Bx', coords: [1, 1], label: 'B(1,1)', color: '#1e40af' },
      { type: 'point', id: 'Cx', coords: [0, 1], label: 'C(0,1)', color: '#1e40af' },
      { type: 'polygon', vertices: ['O', 'Ax', 'Bx', 'Cx'], fill: '#dbeafe', color: '#1e40af' },
      { type: 'text', coords: [0.2, -1.5], content: 'Unit square OABC', color: '#1e40af' },
    ],
  },

  vector_addition: {
    version: 1, kind: 'geometry', title: 'Vector addition: a + b = resultant',
    bounds: [0, 0, 10, 8],
    elements: [
      { type: 'point', id: 'O', coords: [1, 2],   label: 'O' },
      { type: 'point', id: 'M', coords: [5, 2],   label: '' },
      { type: 'point', id: 'E', coords: [7.5, 6], label: '' },
      { type: 'arrow', from: 'O', to: 'M', color: '#1e40af', strokeWidth: 2.5 },
      { type: 'text',  coords: [2.8, 1.5], content: 'a', color: '#1e40af' },
      { type: 'arrow', from: 'M', to: 'E', color: '#16a34a', strokeWidth: 2.5 },
      { type: 'text',  coords: [6.6, 4.3], content: 'b', color: '#16a34a' },
      { type: 'arrow', from: 'O', to: 'E', color: '#dc2626', strokeWidth: 2.5 },
      { type: 'text',  coords: [3.3, 4.5], content: 'a + b (resultant)', color: '#dc2626' },
    ],
  },

  vector_components: {
    version: 1, kind: 'geometry', title: 'Vector components',
    bounds: [-1, -1, 8, 6],
    showAxis: true,
    elements: [
      { type: 'point', id: 'O', coords: [0, 0], label: 'O', color: '#1e293b', size: 3 },
      { type: 'point', id: 'P', coords: [6, 4], label: 'P', color: '#1e40af', size: 4 },
      // Resultant vector
      { type: 'arrow', from: 'O', to: 'P', color: '#1e40af', strokeWidth: 3 },
      // Horizontal component
      { type: 'arrow', from: 'O', to: [6, 0], color: '#dc2626', strokeWidth: 2 },
      { type: 'text',  coords: [2.8, -0.6], content: 'vx = v cos θ', color: '#dc2626' },
      // Vertical component
      { type: 'arrow', from: [6, 0], to: 'P', color: '#16a34a', strokeWidth: 2 },
      { type: 'text',  coords: [6.3, 2],   content: 'vy = v sin θ', color: '#16a34a' },
      // Angle
      { type: 'point', id: 'Ax', coords: [2, 0], label: '', color: 'transparent' },
      { type: 'angle', vertex: 'O', arm1: 'Ax', arm2: 'P', label: 'θ', color: '#7c3aed', radius: 1.2 },
      { type: 'text',  coords: [2.5, 2.5], content: 'v', color: '#1e40af' },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // GRAPHS
  // ══════════════════════════════════════════════════════════════════════════

  coordinate_axes: {
    version: 1, kind: 'graph', title: 'Coordinate axes',
    bounds: [-5, -5, 5, 5],
    showAxis: true, grid: true,
    elements: [
      { type: 'point', id: 'P', coords: [3, 2],   label: 'P (3, 2)',   color: '#dc2626', size: 4 },
      { type: 'point', id: 'Q', coords: [-2, -1], label: 'Q (−2, −1)', color: '#7c3aed', size: 4 },
    ],
  },

  straight_line_graph: {
    version: 1, kind: 'graph', title: 'Straight-line graph y = 2x + 1',
    bounds: [-4, -6, 4, 10],
    showAxis: true, grid: true,
    elements: [
      { type: 'functiongraph', fn: '2*x + 1', domain: [-4, 4], color: '#1e40af', strokeWidth: 2 },
      { type: 'text', coords: [1, 7.5], content: 'y = 2x + 1', color: '#1e40af' },
    ],
  },

  quadratic_graph: {
    version: 1, kind: 'graph', title: 'Quadratic: y = x² − 4',
    bounds: [-4, -5, 4, 8],
    showAxis: true, grid: true,
    elements: [
      { type: 'functiongraph', fn: 'x^2 - 4', domain: [-4, 4], color: '#7c3aed', strokeWidth: 2.5 },
      // Roots
      { type: 'point', id: 'R1', coords: [-2, 0], label: '(−2, 0)', color: '#dc2626', size: 4 },
      { type: 'point', id: 'R2', coords: [2,  0], label: '(2, 0)',  color: '#dc2626', size: 4 },
      // Minimum
      { type: 'point', id: 'Min', coords: [0, -4], label: 'min (0,−4)', color: '#16a34a', size: 4 },
      { type: 'text', coords: [0.5, 6], content: 'y = x² − 4', color: '#7c3aed' },
    ],
  },

  sine_graph: {
    version: 1, kind: 'graph', title: 'y = sin(x)',
    bounds: [-1, -1.6, 7.5, 1.8],
    showAxis: true, grid: true,
    elements: [
      { type: 'functiongraph', fn: 'sin(x)', domain: [0, 6.28], color: '#1e40af', strokeWidth: 2.5 },
      // Key points
      { type: 'point', coords: [0,    0],    label: '0',    color: '#64748b', size: 3 },
      { type: 'point', coords: [1.57, 1],    label: 'π/2',  color: '#dc2626', size: 3 },
      { type: 'point', coords: [3.14, 0],    label: 'π',    color: '#64748b', size: 3 },
      { type: 'point', coords: [4.71, -1],   label: '3π/2', color: '#dc2626', size: 3 },
      { type: 'point', coords: [6.28, 0],    label: '2π',   color: '#64748b', size: 3 },
      { type: 'text',  coords: [0.5, 1.5],   content: 'y = sin(x)', color: '#1e40af' },
    ],
  },

  unit_circle: {
    version: 1, kind: 'graph', title: 'Unit circle',
    bounds: [-2, -2, 2, 2],
    showAxis: true,
    elements: [
      { type: 'point', id: 'O', coords: [0, 0], label: 'O', color: '#1e293b', size: 3 },
      { type: 'circle', center: 'O', radius: 1, color: '#1e40af', fill: '#dbeafe', fillOpacity: 0.1 },
      // Sample point at 45°
      { type: 'point', id: 'P', coords: [0.707, 0.707], label: 'P', color: '#dc2626', size: 4 },
      { type: 'segment', from: 'O', to: 'P', color: '#dc2626', strokeWidth: 2 },
      // Components
      { type: 'segment', from: [0, 0], to: [0.707, 0], color: '#16a34a', dashed: true, strokeWidth: 1.5 },
      { type: 'segment', from: [0.707, 0], to: 'P',    color: '#7c3aed', dashed: true, strokeWidth: 1.5 },
      { type: 'text', coords: [0.3, -0.15], content: 'cosθ', color: '#16a34a' },
      { type: 'text', coords: [0.76, 0.35], content: 'sinθ', color: '#7c3aed' },
      { type: 'point', id: 'Ax', coords: [0.4, 0], label: '', color: 'transparent' },
      { type: 'angle', vertex: 'O', arm1: 'Ax', arm2: 'P', label: 'θ', color: '#1e40af', radius: 0.35 },
    ],
  },

  simultaneous_equations: {
    version: 1, kind: 'graph', title: 'Simultaneous equations: graphical solution',
    bounds: [-4, -6, 6, 10],
    showAxis: true, grid: true,
    elements: [
      // y = 2x + 1
      { type: 'functiongraph', fn: '2*x + 1', domain: [-4, 6], color: '#1e40af', strokeWidth: 2 },
      { type: 'text', coords: [2, 8], content: 'y = 2x + 1', color: '#1e40af' },
      // y = -x + 4
      { type: 'functiongraph', fn: '-x + 4', domain: [-4, 6], color: '#dc2626', strokeWidth: 2 },
      { type: 'text', coords: [-2, 8], content: 'y = −x + 4', color: '#dc2626' },
      // Intersection point (1, 3)
      { type: 'point', coords: [1, 3], label: '(1, 3)', color: '#16a34a', size: 5 },
      { type: 'segment', from: [1, 0], to: [1, 3], color: '#16a34a', dashed: true, strokeWidth: 1 },
      { type: 'segment', from: [0, 3], to: [1, 3], color: '#16a34a', dashed: true, strokeWidth: 1 },
    ],
  },

  speed_time_graph: {
    version: 1, kind: 'graph', title: 'Speed–time graph (area = distance)',
    bounds: [-0.5, -2, 12, 20],
    showAxis: true,
    elements: [
      // Acceleration phase
      { type: 'point', id: 'O',  coords: [0,  0],  label: 'O', color: '#1e293b', size: 3 },
      { type: 'point', id: 'P',  coords: [4,  16], label: '',  color: '#1e40af' },
      // Constant speed phase
      { type: 'point', id: 'Q',  coords: [8,  16], label: '',  color: '#1e40af' },
      // Deceleration phase
      { type: 'point', id: 'R',  coords: [11, 0],  label: '',  color: '#1e40af' },
      { type: 'segment', from: 'O', to: 'P', color: '#1e40af', strokeWidth: 2.5 },
      { type: 'segment', from: 'P', to: 'Q', color: '#1e40af', strokeWidth: 2.5 },
      { type: 'segment', from: 'Q', to: 'R', color: '#1e40af', strokeWidth: 2.5 },
      // Shaded area under constant speed
      { type: 'polygon', vertices: ['P', 'Q', [8, 0], [4, 0]], fill: '#bfdbfe', color: 'none', fillOpacity: 0.5 },
      // Labels
      { type: 'text', coords: [5.5, 8],  content: 'area = distance', color: '#1e40af' },
      { type: 'text', coords: [-0.5, 17], content: 'speed (m/s)', color: '#1e293b' },
      { type: 'text', coords: [10, -1.5], content: 'time (s)', color: '#1e293b' },
      { type: 'text', coords: [1.5, -1.5], content: 'accel.', color: '#16a34a' },
      { type: 'text', coords: [5.5, -1.5], content: 'constant', color: '#16a34a' },
      { type: 'text', coords: [9.2, -1.5], content: 'decel.', color: '#dc2626' },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // CALCULUS / ANALYSIS
  // ══════════════════════════════════════════════════════════════════════════

  riemann_left: {
    version: 1, kind: 'graph', title: 'Left Riemann sum for y = x²',
    bounds: [-0.5, -0.5, 5, 16],
    showAxis: true, grid: true,
    elements: [
      { type: 'functiongraph', fn: 'x^2', domain: [0, 4], color: '#1e40af', strokeWidth: 2.5 },
      { type: 'riemannsum', fn: 'x^2', n: 4, method: 'left', from: 0, to: 4,
        fill: '#bfdbfe', fillOpacity: 0.6, color: '#1e40af', strokeWidth: 1 },
      { type: 'text', coords: [1.5, 14], content: 'Left Riemann sum  n = 4', color: '#1e40af' },
    ],
  },

  definite_integral: {
    version: 1, kind: 'graph', title: 'Definite integral ∫₁³ x² dx',
    bounds: [-0.5, -1, 5, 10],
    showAxis: true, grid: true,
    elements: [
      { type: 'functiongraph', fn: 'x^2', domain: [0, 4.2], color: '#1e40af', strokeWidth: 2.5 },
      { type: 'integral', fn: 'x^2', from: 1, to: 3, fillColor: '#dbeafe', fillOpacity: 0.7, color: '#1e40af' },
      { type: 'point', coords: [1, 0], label: '1', color: '#1e293b', size: 3 },
      { type: 'point', coords: [3, 0], label: '3', color: '#1e293b', size: 3 },
      { type: 'text',  coords: [1.5, 5], content: '∫₁³ x² dx', color: '#1e40af' },
    ],
  },

  tangent_at_point: {
    version: 1, kind: 'graph', title: 'Tangent to y = x² at x = 2',
    bounds: [-1, -3, 5, 12],
    showAxis: true, grid: true,
    elements: [
      { type: 'functiongraph', fn: 'x^2', domain: [-1, 4], color: '#1e40af', strokeWidth: 2 },
      { type: 'tangentline', fn: 'x^2', at: 2, domain: [0, 4], color: '#dc2626', strokeWidth: 2 },
      { type: 'point', coords: [2, 4], label: '(2, 4)', color: '#dc2626', size: 4 },
      { type: 'text',  coords: [0.5, 10], content: 'tangent at x = 2: y = 4x − 4', color: '#dc2626' },
    ],
  },

  parabola_projectile: {
    version: 1, kind: 'graph', title: 'Projectile motion (parametric)',
    bounds: [-0.5, -0.5, 11, 6],
    showAxis: true,
    elements: [
      // x(t) = 10t·cos30°,  y(t) = 10t·sin30° − 4.9t²
      { type: 'parametric',
        xFn: '10 * t * cos(pi/6)',
        yFn: '10 * t * sin(pi/6) - 4.9 * t^2',
        tMin: 0, tMax: 1.02,
        color: '#7c3aed', strokeWidth: 2.5 },
      { type: 'point', coords: [0, 0],       label: 'launch', color: '#16a34a', size: 4 },
      { type: 'point', coords: [10.2, 0],    label: 'land',   color: '#dc2626', size: 4 },
      { type: 'point', coords: [5.1, 1.276], label: 'peak',   color: '#7c3aed', size: 4 },
      { type: 'text',  coords: [3, 4.8],     content: 'v₀ = 10 m/s, θ = 30°', color: '#7c3aed' },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // STATISTICS
  // ══════════════════════════════════════════════════════════════════════════

  histogram: {
    version: 1, kind: 'stats', title: 'Histogram (frequency density)',
    bounds: [0, 0, 12, 8],
    showAxis: true,
    elements: [
      { type: 'polygon', vertices: [[0,0],[2,0],[2,3.0],[0,3.0]], fill: '#93c5fd', color: '#1e40af', fillOpacity: 0.7 },
      { type: 'polygon', vertices: [[2,0],[5,0],[5,4.0],[2,4.0]], fill: '#93c5fd', color: '#1e40af', fillOpacity: 0.7 },
      { type: 'polygon', vertices: [[5,0],[8,0],[8,6.0],[5,6.0]], fill: '#93c5fd', color: '#1e40af', fillOpacity: 0.7 },
      { type: 'polygon', vertices: [[8,0],[10,0],[10,3.5],[8,3.5]], fill: '#93c5fd', color: '#1e40af', fillOpacity: 0.7 },
      { type: 'polygon', vertices: [[10,0],[11,0],[11,2.0],[10,2.0]], fill: '#93c5fd', color: '#1e40af', fillOpacity: 0.7 },
      { type: 'text', coords: [5.5, -1],  content: 'Class interval',    color: '#1e293b' },
      { type: 'text', coords: [-2,  3.5], content: 'Freq. density',     color: '#1e293b' },
      { type: 'text', coords: [4.5,  7],  content: 'Area of bar = frequency', color: '#64748b' },
    ],
  },

  box_plot: {
    version: 1, kind: 'stats', title: 'Box-and-whisker plot',
    bounds: [0, 0, 120, 6],
    elements: [
      // Whisker lines
      { type: 'segment', from: [20, 3], to: [40, 3], color: '#1e40af', strokeWidth: 2 },
      { type: 'segment', from: [80, 3], to: [100, 3], color: '#1e40af', strokeWidth: 2 },
      // Min / Max whisker caps
      { type: 'segment', from: [20, 2.3], to: [20, 3.7], color: '#1e40af', strokeWidth: 2 },
      { type: 'segment', from: [100, 2.3], to: [100, 3.7], color: '#1e40af', strokeWidth: 2 },
      // Box (Q1 → Q3)
      { type: 'polygon', vertices: [[40, 1.5], [70, 1.5], [70, 4.5], [40, 4.5]],
        fill: '#bfdbfe', color: '#1e40af', fillOpacity: 0.6 },
      // Median
      { type: 'segment', from: [55, 1.5], to: [55, 4.5], color: '#dc2626', strokeWidth: 3 },
      // Labels
      { type: 'text', coords: [17,  1],   content: 'Min', color: '#64748b' },
      { type: 'text', coords: [37,  1],   content: 'Q1',  color: '#1e40af' },
      { type: 'text', coords: [52,  1],   content: 'Med', color: '#dc2626' },
      { type: 'text', coords: [66,  1],   content: 'Q3',  color: '#1e40af' },
      { type: 'text', coords: [96,  1],   content: 'Max', color: '#64748b' },
      { type: 'text', coords: [18,  5.2], content: '20',  color: '#64748b' },
      { type: 'text', coords: [38,  5.2], content: '40',  color: '#64748b' },
      { type: 'text', coords: [53,  5.2], content: '55',  color: '#dc2626' },
      { type: 'text', coords: [68,  5.2], content: '70',  color: '#64748b' },
      { type: 'text', coords: [98,  5.2], content: '100', color: '#64748b' },
    ],
  },

  number_line: {
    version: 1, kind: 'stats', title: 'Number line',
    bounds: [-6, -2, 6, 2],
    elements: [
      // Axis arrow
      { type: 'arrow', from: [-5.5, 0], to: [5.5, 0], color: '#1e293b', strokeWidth: 2 },
      // Tick marks and labels
      ..._nticks(-5, 5, 1).map(v => ([
        { type: 'segment', from: [v, -0.3], to: [v, 0.3], color: '#1e293b', strokeWidth: 1.5 },
        { type: 'text',    coords: [v - 0.15, -0.8], content: String(v), color: '#1e293b' },
      ])).flat(),
      // Example: point at 3
      { type: 'point', coords: [3, 0], label: '3', color: '#dc2626', size: 5 },
    ],
  },

}

// ─── TARA SCHEMA DESCRIPTION ──────────────────────────────────────────────────

export const TARA_DIAGRAM_SCHEMA_PROMPT = `
DIAGRAM SPEC — include "diagram_spec" in your JSON response alongside "feedback" when a diagram genuinely aids the student's understanding. Not every response needs one.

DiagramSpec format:
{
  "version": 1,
  "kind": "geometry" | "graph" | "transform" | "stats",
  "title": "Optional caption",
  "bounds": [xmin, ymin, xmax, ymax],
  "showAxis": false,
  "grid": false,
  "elements": [ ...DiagramElement objects... ]
}

Element types (define points BEFORE referencing them):
  point:          { "type":"point",    "id":"A", "coords":[x,y], "label":"A", "color":"#hex", "size":3 }
  segment:        { "type":"segment",  "from":"A", "to":"B", "color":"#hex", "dashed":false, "strokeWidth":2 }
  line:           { "type":"line",     "from":"A", "to":"B" }  — infinite
  arrow:          { "type":"arrow",    "from":"A", "to":"B" }
  circle:         { "type":"circle",   "center":"O", "radius":3, "fill":"#hex", "fillOpacity":0.2 }
  arc:            { "type":"arc",      "center":"O", "from":"A", "to":"B" }
  angle:          { "type":"angle",    "vertex":"V", "arm1":"A", "arm2":"B", "label":"θ", "square":false }
  polygon:        { "type":"polygon",  "vertices":["A","B","C"], "fill":"#hex", "fillOpacity":0.4 }
  functiongraph:  { "type":"functiongraph", "fn":"x^2 - 4", "domain":[-3,3], "color":"#hex" }
  text:           { "type":"text",     "coords":[x,y], "content":"label", "color":"#hex" }
  ellipse:        { "type":"ellipse",  "center":[cx,cy], "radiusX":3, "radiusY":2 }
  regularpolygon: { "type":"regularpolygon", "center":[cx,cy], "radius":2, "n":6, "rotation":0 }
  sector:         { "type":"sector",   "center":[cx,cy], "radius":3, "from":0, "to":90 }  — degrees
  parametric:     { "type":"parametric", "xFn":"cos(t)", "yFn":"sin(t)", "tMin":0, "tMax":6.28 }
  riemannsum:     { "type":"riemannsum", "fn":"x^2", "n":4, "method":"left", "from":0, "to":4 }
  integral:       { "type":"integral",  "fn":"x^2", "from":1, "to":3, "fillColor":"#dbeafe" }
  tangentline:    { "type":"tangentline", "fn":"x^2", "at":2, "domain":[-1,5] }
  midpoint:       { "type":"midpoint",  "p1":"A", "p2":"B", "label":"M" }
  perpbisector:   { "type":"perpbisector", "p1":"A", "p2":"B" }
  anglebisector:  { "type":"anglebisector", "vertex":"V", "arm1":"A", "arm2":"B" }

Function string rules:
- ^ is accepted for exponentiation (e.g. "x^2")
- sin/cos/tan/sqrt/abs/ln/log/exp accepted (no Math. prefix needed)
- π or pi accepted
- from/to/center/vertex/arm1/arm2/p1/p2 accept element id (string) OR [x,y] coordinate

Example — right-angle triangle:
"diagram_spec": {
  "version":1, "kind":"geometry", "bounds":[0,0,8,6],
  "elements":[
    {"type":"point","id":"A","coords":[1,1],"label":"A"},
    {"type":"point","id":"B","coords":[6,1],"label":"B"},
    {"type":"point","id":"C","coords":[1,4],"label":"C"},
    {"type":"polygon","vertices":["A","B","C"],"fill":"#dbeafe"},
    {"type":"angle","vertex":"A","arm1":"B","arm2":"C","square":true}
  ]
}
`
