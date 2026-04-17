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
 *   point       { type, id?, coords, label?, color?, size?, labelColor? }
 *   segment     { type, id?, from, to, color?, strokeWidth?, dashed? }
 *   line        { type, id?, from, to, color?, dashed? }   — infinite line
 *   arrow       { type, id?, from, to, color?, strokeWidth? }
 *   circle      { type, id?, center, radius, color?, fill?, fillOpacity? }
 *   arc         { type, id?, center, from, to, color?, strokeWidth? }
 *   angle       { type, id?, vertex, arm1, arm2, label?, square?, color?, radius? }
 *   polygon     { type, id?, vertices, fill?, color?, fillOpacity? }
 *   functiongraph { type, id?, fn, domain?, color?, strokeWidth? }
 *   text        { type, id?, coords, content, color?, size? }
 *
 * ── COORD REFERENCES ─────────────────────────────────────────────────────────
 *
 *   from / to / center / vertex / arm1 / arm2 accept either:
 *     - string  — references a previously defined element by its id
 *     - [x, y]  — absolute coordinate pair in the diagram's coordinate system
 *
 * ── FUNCTION STRINGS ─────────────────────────────────────────────────────────
 *
 *   fn in functiongraph is a JS-style math expression string:
 *     "2*x + 1"   "Math.sin(x)"   "x**2 - 3"   "Math.sqrt(x)"
 *   Use ** for exponentiation (not ^).
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

// ─── PRE-DEFINED SPECS (replaces all 17 GCLC scripts) ─────────────────────────

export const DIAGRAM_SPECS = {

  // ── GEOMETRY ────────────────────────────────────────────────────────────────

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
      { type: 'text', coords: [5, 4.2],   content: 'c' },
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

  coordinate_axes: {
    version: 1, kind: 'graph', title: 'Coordinate axes',
    bounds: [-5, -5, 5, 5],
    showAxis: true, grid: true,
    elements: [
      { type: 'point', id: 'P', coords: [3, 2], label: 'P (3, 2)', color: '#dc2626', size: 4 },
      { type: 'point', id: 'Q', coords: [-2, -1], label: 'Q (-2, -1)', color: '#7c3aed', size: 4 },
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

  parallel_lines_angles: {
    version: 1, kind: 'geometry', title: 'Parallel lines and angles',
    bounds: [0, 0, 10, 10],
    elements: [
      // Parallel lines
      { type: 'point', id: 'L1a', coords: [0.5, 7],  label: '' },
      { type: 'point', id: 'L1b', coords: [9.5, 7],  label: '' },
      { type: 'point', id: 'L2a', coords: [0.5, 3],  label: '' },
      { type: 'point', id: 'L2b', coords: [9.5, 3],  label: '' },
      { type: 'segment', from: 'L1a', to: 'L1b', color: '#1e293b', strokeWidth: 2 },
      { type: 'segment', from: 'L2a', to: 'L2b', color: '#1e293b', strokeWidth: 2 },
      // Tick marks showing parallel
      { type: 'text', coords: [0.8, 7.3], content: '>', color: '#1e293b' },
      { type: 'text', coords: [0.8, 3.3], content: '>', color: '#1e293b' },
      // Transversal
      { type: 'point', id: 'T1', coords: [3.5, 9.5], label: '' },
      { type: 'point', id: 'T2', coords: [6.5, 0.5], label: '' },
      { type: 'segment', from: 'T1', to: 'T2', color: '#7c3aed', strokeWidth: 2 },
      // Intersection markers
      { type: 'point', id: 'P', coords: [4.4, 7], label: 'P', color: '#dc2626', size: 4 },
      { type: 'point', id: 'Q', coords: [5.6, 3], label: 'Q', color: '#dc2626', size: 4 },
      // Angle labels
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
      // Height indicator
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

  angles_types: {
    version: 1, kind: 'geometry', title: 'Types of angles',
    bounds: [0, 0, 15, 6],
    elements: [
      // Acute angle
      { type: 'point', id: 'V1', coords: [2,   1],   label: '' },
      { type: 'point', id: 'A1', coords: [4.5, 1],   label: '' },
      { type: 'point', id: 'B1', coords: [3,   3.5], label: '' },
      { type: 'segment', from: 'V1', to: 'A1', color: '#1e293b', strokeWidth: 2 },
      { type: 'segment', from: 'V1', to: 'B1', color: '#1e293b', strokeWidth: 2 },
      { type: 'text', coords: [1.2, 0.4], content: 'Acute  (< 90°)', color: '#1e40af' },
      // Right angle
      { type: 'point', id: 'V2', coords: [7,   1],   label: '' },
      { type: 'point', id: 'A2', coords: [9.5, 1],   label: '' },
      { type: 'point', id: 'B2', coords: [7,   3.5], label: '' },
      { type: 'segment', from: 'V2', to: 'A2', color: '#1e293b', strokeWidth: 2 },
      { type: 'segment', from: 'V2', to: 'B2', color: '#1e293b', strokeWidth: 2 },
      { type: 'angle', vertex: 'V2', arm1: 'A2', arm2: 'B2', square: true, color: '#16a34a' },
      { type: 'text', coords: [6.2, 0.4], content: 'Right  (= 90°)', color: '#16a34a' },
      // Obtuse angle
      { type: 'point', id: 'V3', coords: [11,   1],   label: '' },
      { type: 'point', id: 'A3', coords: [14,   1],   label: '' },
      { type: 'point', id: 'B3', coords: [9.8, 3.5], label: '' },
      { type: 'segment', from: 'V3', to: 'A3', color: '#1e293b', strokeWidth: 2 },
      { type: 'segment', from: 'V3', to: 'B3', color: '#1e293b', strokeWidth: 2 },
      { type: 'text', coords: [10.2, 0.4], content: 'Obtuse (90°–180°)', color: '#dc2626' },
    ],
  },

  rotation_90: {
    version: 1, kind: 'transform', title: '90° anticlockwise rotation about origin',
    bounds: [-5, -5, 5, 5],
    showAxis: true, grid: true,
    elements: [
      // Object (blue)
      { type: 'point', id: 'A',  coords: [1, 1], label: 'A',  color: '#1e40af' },
      { type: 'point', id: 'B',  coords: [3, 1], label: 'B',  color: '#1e40af' },
      { type: 'point', id: 'C',  coords: [1, 3], label: 'C',  color: '#1e40af' },
      { type: 'polygon', vertices: ['A', 'B', 'C'], fill: '#dbeafe', color: '#1e40af' },
      // Image after 90° CCW: (x,y) → (−y, x)
      { type: 'point', id: "A'", coords: [-1, 1], label: "A'", color: '#dc2626' },
      { type: 'point', id: "B'", coords: [-1, 3], label: "B'", color: '#dc2626' },
      { type: 'point', id: "C'", coords: [-3, 1], label: "C'", color: '#dc2626' },
      { type: 'polygon', vertices: ["A'", "B'", "C'"], fill: '#fecaca', color: '#dc2626' },
      { type: 'text', coords: [1.2, -0.5], content: 'Object',   color: '#1e40af' },
      { type: 'text', coords: [-3.5, -0.5], content: 'Image',   color: '#dc2626' },
    ],
  },

  reflection_line: {
    version: 1, kind: 'transform', title: 'Reflection in the y-axis',
    bounds: [-6, -4, 6, 6],
    showAxis: true, grid: true,
    elements: [
      // Object (blue)
      { type: 'point', id: 'A',  coords: [2, 1], label: 'A',  color: '#1e40af' },
      { type: 'point', id: 'B',  coords: [4, 1], label: 'B',  color: '#1e40af' },
      { type: 'point', id: 'C',  coords: [3, 4], label: 'C',  color: '#1e40af' },
      { type: 'polygon', vertices: ['A', 'B', 'C'], fill: '#dbeafe', color: '#1e40af' },
      // Reflected image (x → −x)
      { type: 'point', id: "A'", coords: [-2, 1], label: "A'", color: '#dc2626' },
      { type: 'point', id: "B'", coords: [-4, 1], label: "B'", color: '#dc2626' },
      { type: 'point', id: "C'", coords: [-3, 4], label: "C'", color: '#dc2626' },
      { type: 'polygon', vertices: ["A'", "B'", "C'"], fill: '#fecaca', color: '#dc2626' },
      { type: 'text', coords: [-0.5, 5.5], content: 'Mirror line (y-axis)', color: '#16a34a' },
    ],
  },

  similar_triangles: {
    version: 1, kind: 'geometry', title: 'Similar triangles (scale factor 2)',
    bounds: [0, 0, 14, 8],
    elements: [
      // Small triangle
      { type: 'point', id: 'A', coords: [1, 1], label: 'A' },
      { type: 'point', id: 'B', coords: [4, 1], label: 'B' },
      { type: 'point', id: 'C', coords: [1, 3.5], label: 'C' },
      { type: 'polygon', vertices: ['A', 'B', 'C'], fill: '#dbeafe', color: '#1e40af' },
      // Large triangle (×2)
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
      // Side labels (opposite to corresponding vertex)
      { type: 'text', coords: [4.6, 0.3], content: 'c',           color: '#166534' },
      { type: 'text', coords: [7.5, 4],   content: 'b',           color: '#166534' },
      { type: 'text', coords: [2.5, 4],   content: 'a',           color: '#166534' },
      // Angle labels at vertices
      { type: 'text', coords: [1.8, 1.6], content: 'A',           color: '#dc2626' },
      { type: 'text', coords: [7.5, 1.6], content: 'B',           color: '#dc2626' },
      { type: 'text', coords: [5.3, 5.6], content: 'C',           color: '#dc2626' },
    ],
  },

  vector_addition: {
    version: 1, kind: 'geometry', title: 'Vector addition: a + b = resultant',
    bounds: [0, 0, 10, 8],
    elements: [
      { type: 'point', id: 'O', coords: [1, 2],   label: 'O' },
      { type: 'point', id: 'M', coords: [5, 2],   label: '' },
      { type: 'point', id: 'E', coords: [7.5, 6], label: '' },
      // Vector a
      { type: 'arrow', from: 'O', to: 'M', color: '#1e40af', strokeWidth: 2.5 },
      { type: 'text',  coords: [2.8, 1.5], content: 'a', color: '#1e40af' },
      // Vector b
      { type: 'arrow', from: 'M', to: 'E', color: '#16a34a', strokeWidth: 2.5 },
      { type: 'text',  coords: [6.6, 4.3], content: 'b', color: '#16a34a' },
      // Resultant a + b
      { type: 'arrow', from: 'O', to: 'E', color: '#dc2626', strokeWidth: 2.5 },
      { type: 'text',  coords: [3.3, 4.5], content: 'a + b (resultant)', color: '#dc2626' },
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

  loci_equidistant: {
    version: 1, kind: 'geometry', title: 'Locus equidistant from two fixed points',
    bounds: [0, 0, 10, 8],
    elements: [
      { type: 'point', id: 'A', coords: [2, 4], label: 'A', color: '#1e40af', size: 5 },
      { type: 'point', id: 'B', coords: [8, 4], label: 'B', color: '#1e40af', size: 5 },
      // Perpendicular bisector (locus)
      { type: 'segment', from: [5, 0.5], to: [5, 7.5], color: '#dc2626', dashed: true, strokeWidth: 2 },
      // Equal distance lines
      { type: 'segment', from: 'A', to: [5, 4], color: '#94a3b8', dashed: true, strokeWidth: 1.5 },
      { type: 'segment', from: 'B', to: [5, 4], color: '#94a3b8', dashed: true, strokeWidth: 1.5 },
      { type: 'point', id: 'M', coords: [5, 4], label: 'M', color: '#dc2626', size: 4 },
      { type: 'text', coords: [5.3, 7],   content: 'Locus',          color: '#dc2626' },
      { type: 'text', coords: [3,   5.2], content: 'AM = BM always', color: '#64748b' },
    ],
  },

  // ── STATISTICS ───────────────────────────────────────────────────────────────

  histogram: {
    version: 1, kind: 'stats', title: 'Histogram (frequency density)',
    bounds: [0, 0, 12, 8],
    showAxis: true,
    elements: [
      // Bars (x-axis: class interval, y-axis: frequency density)
      { type: 'polygon', vertices: [[0,0],[2,0],[2,3.0],[0,3.0]], fill: '#93c5fd', color: '#1e40af', fillOpacity: 0.7 },
      { type: 'polygon', vertices: [[2,0],[5,0],[5,4.0],[2,4.0]], fill: '#93c5fd', color: '#1e40af', fillOpacity: 0.7 },
      { type: 'polygon', vertices: [[5,0],[8,0],[8,6.0],[5,6.0]], fill: '#93c5fd', color: '#1e40af', fillOpacity: 0.7 },
      { type: 'polygon', vertices: [[8,0],[10,0],[10,3.5],[8,3.5]], fill: '#93c5fd', color: '#1e40af', fillOpacity: 0.7 },
      { type: 'polygon', vertices: [[10,0],[11,0],[11,2.0],[10,2.0]], fill: '#93c5fd', color: '#1e40af', fillOpacity: 0.7 },
      // Axis labels
      { type: 'text', coords: [5.5, -1],  content: 'Class interval',       color: '#1e293b' },
      { type: 'text', coords: [-2,  3.5], content: 'Freq. density',        color: '#1e293b' },
      { type: 'text', coords: [4.5,  7],  content: 'Area of bar = frequency', color: '#64748b' },
    ],
  },

}

// ─── TARA SCHEMA DESCRIPTION ──────────────────────────────────────────────────
// Used in the Tara system prompt so the AI knows how to emit diagram_spec.

export const TARA_DIAGRAM_SCHEMA_PROMPT = `
DIAGRAM SPEC — when a geometry or graph diagram would help the student, include a "diagram_spec" key in your JSON response alongside "feedback".

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

Element types:
  point:         { "type":"point",    "id":"A", "coords":[x,y], "label":"A", "color":"#hex" }
  segment:       { "type":"segment",  "from":"A", "to":"B", "dashed":false }
  arrow:         { "type":"arrow",    "from":"A", "to":"B", "color":"#hex" }
  circle:        { "type":"circle",   "center":"O", "radius":3, "fill":"#hex", "fillOpacity":0.2 }
  arc:           { "type":"arc",      "center":"O", "from":"A", "to":"B" }
  angle:         { "type":"angle",    "vertex":"A", "arm1":"B", "arm2":"C", "square":true }
  polygon:       { "type":"polygon",  "vertices":["A","B","C"], "fill":"#hex" }
  functiongraph: { "type":"functiongraph", "fn":"2*x+1", "domain":[-4,4] }
  text:          { "type":"text",     "coords":[x,y], "content":"label" }

Rules:
- Define points BEFORE referencing them in segments/polygons/etc.
- from/to/center/vertex/arm1/arm2 accept either an element id (string) OR a coordinate pair [x,y]
- fn must be valid JS: use * not ×, ** not ^, Math.sin(x) not sin(x)
- Only include diagram_spec when it genuinely aids understanding (not for every response)

Example (right-angle triangle):
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
