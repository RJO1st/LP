'use client'
/**
 * MathsDiagram.jsx
 *
 * JSXGraph-powered maths diagram renderer for LaunchPard.
 * Accepts a DiagramSpec JSON object and renders a precise, accessible SVG diagram.
 *
 * Usage:
 *   import MathsDiagram from '@/components/MathsDiagram'
 *   import { getSpec } from '@/lib/diagramSpec'
 *
 *   // From a pre-defined spec:
 *   <MathsDiagram spec={getSpec('right_angle_triangle')} />
 *
 *   // From a Tara response or DB:
 *   <MathsDiagram spec={question.visual_spec} width={300} height={300} />
 *
 *   // Interactive (pan/zoom/drag):
 *   <MathsDiagram spec={spec} interactive />
 *
 * Props:
 *   spec         {DiagramSpec}  Diagram specification object (required)
 *   interactive  {boolean}      Enable pan/zoom/drag (default false)
 *   width        {number}       Container width in px (default 320)
 *   height       {number}       Container height in px (default 320)
 *   className    {string}       Extra Tailwind classes on wrapper
 *   onBoardReady {function}     Called with (board, JXG) after init — for external SVG export
 */

import { useState, useEffect, useRef } from 'react'

// ─── MATH FN BUILDER ──────────────────────────────────────────────────────────
/**
 * Converts a natural-maths expression string to a safe JS function.
 * Handles: ^, sin/cos/tan/sqrt/abs/exp/ln/log, pi/π, e (standalone).
 * Falls back to () => 0 on parse error.
 *
 * @param {string} varName  — variable name used in the expression ('x' or 't')
 * @param {string} src      — expression string
 * @returns {Function}
 */
function makeMathFn(varName, src) {
  if (!src) return () => 0
  try {
    const s = src
      .replace(/\^/g, '**')
      .replace(/\bsin\s*\(/g,  'Math.sin(')
      .replace(/\bcos\s*\(/g,  'Math.cos(')
      .replace(/\btan\s*\(/g,  'Math.tan(')
      .replace(/\bsqrt\s*\(/g, 'Math.sqrt(')
      .replace(/\babs\s*\(/g,  'Math.abs(')
      .replace(/\bexp\s*\(/g,  'Math.exp(')
      .replace(/\bln\s*\(/g,   'Math.log(')
      .replace(/\blog\s*\(/g,  'Math.log10(')
      .replace(/\bpi\b/gi,     'Math.PI')
      .replace(/π/g,           'Math.PI')
      // standalone 'e' (not part of a longer identifier)
      .replace(/(?<![A-Za-z0-9_])e(?![A-Za-z0-9_(])/g, 'Math.E')
    // eslint-disable-next-line no-new-func
    return new Function(varName, `"use strict"; try { return +(${s}); } catch { return 0; }`)
  } catch {
    return () => 0
  }
}

// ─── ELEMENT RENDERER ────────────────────────────────────────────────────────

/**
 * Resolves a coordinate reference:
 *   string  → look up in elemMap (a JSXGraph element object)
 *   [x, y]  → raw coordinate array
 */
function resolveRef(ref, elemMap) {
  if (Array.isArray(ref)) return ref
  if (typeof ref === 'string') return elemMap[ref] ?? ref
  return ref
}

/**
 * Renders a single DiagramElement onto a JSXGraph board.
 * @param {object}  JXG         JSXGraph namespace
 * @param {object}  board       JSXGraph board instance
 * @param {object}  el          DiagramElement from spec.elements
 * @param {object}  elemMap     mutable map from id → JSXGraph object
 * @param {boolean} interactive
 */
function renderElement(JXG, board, el, elemMap, interactive) {
  const fixed = !interactive
  const res   = (ref) => resolveRef(ref, elemMap)

  let created

  try {
    switch (el.type) {

      // ── BASIC GEOMETRY ────────────────────────────────────────────────────

      case 'point': {
        created = board.create('point', el.coords ?? [0, 0], {
          id:          el.id,
          name:        el.label ?? '',
          fixed,
          face:        'o',
          size:        el.size ?? 3,
          strokeColor: el.color ?? '#1e40af',
          fillColor:   el.color ?? '#1e40af',
          label: {
            fontSize:  13,
            color:     el.labelColor ?? el.color ?? '#1e293b',
            offset:    [4, -4],
          },
        })
        break
      }

      case 'segment': {
        created = board.create('segment', [res(el.from), res(el.to)], {
          id:          el.id,
          strokeColor: el.color ?? '#1e293b',
          strokeWidth: el.strokeWidth ?? 2,
          dash:        el.dashed ? 2 : 0,
          fixed,
          highlight:   false,
        })
        break
      }

      case 'line': {
        created = board.create('line', [res(el.from), res(el.to)], {
          id:          el.id,
          strokeColor: el.color ?? '#64748b',
          strokeWidth: el.strokeWidth ?? 1.5,
          dash:        el.dashed ? 2 : 0,
          fixed,
        })
        break
      }

      case 'arrow': {
        created = board.create('arrow', [res(el.from), res(el.to)], {
          id:          el.id,
          strokeColor: el.color ?? '#1e40af',
          strokeWidth: el.strokeWidth ?? 2,
          lastArrow:   { type: 1, size: 6 },
          fixed,
          highlight:   false,
        })
        break
      }

      case 'circle': {
        created = board.create('circle', [res(el.center), el.radius], {
          id:          el.id,
          strokeColor: el.color ?? '#1e40af',
          strokeWidth: el.strokeWidth ?? 2,
          fillColor:   el.fill ?? 'none',
          fillOpacity: el.fillOpacity ?? 0,
          fixed,
          highlight:   false,
        })
        break
      }

      case 'arc': {
        created = board.create('arc', [res(el.center), res(el.from), res(el.to)], {
          id:          el.id,
          strokeColor: el.color ?? '#1e40af',
          strokeWidth: el.strokeWidth ?? 2,
          fixed,
          highlight:   false,
        })
        break
      }

      case 'angle': {
        created = board.create('angle', [res(el.arm1), res(el.vertex), res(el.arm2)], {
          id:          el.id,
          name:        el.label ?? '',
          type:        el.square ? 'square' : 'sector',
          strokeColor: el.color ?? '#dc2626',
          fillColor:   el.fill  ?? (el.square ? 'none' : '#fca5a5'),
          fillOpacity: el.fillOpacity ?? (el.square ? 0 : 0.3),
          radius:      el.radius ?? 0.5,
          fixed,
          highlight:   false,
        })
        break
      }

      case 'polygon': {
        const verts = (el.vertices ?? []).map(res)
        created = board.create('polygon', verts, {
          id:          el.id,
          fillColor:   el.fill ?? '#dbeafe',
          fillOpacity: el.fillOpacity ?? 0.4,
          strokeColor: el.color ?? '#1e40af',
          strokeWidth: el.strokeWidth ?? 2,
          vertices:    { fixed },
          highlight:   false,
        })
        break
      }

      case 'functiongraph': {
        const fn   = makeMathFn('x', el.fn)
        const args = el.domain ? [fn, el.domain[0], el.domain[1]] : [fn]
        created = board.create('functiongraph', args, {
          id:          el.id,
          strokeColor: el.color ?? '#1e40af',
          strokeWidth: el.strokeWidth ?? 2,
          highlight:   false,
        })
        break
      }

      case 'text': {
        created = board.create('text', [
          el.coords?.[0] ?? 0,
          el.coords?.[1] ?? 0,
          el.content ?? '',
        ], {
          id:         el.id,
          strokeColor: el.color ?? '#1e293b',
          fontSize:   el.size ?? 13,
          fontWeight: el.bold ? 'bold' : 'normal',
          fixed,
          highlight:  false,
        })
        break
      }

      // ── NEW ELEMENT TYPES ─────────────────────────────────────────────────

      case 'ellipse': {
        const [cx, cy] = Array.isArray(el.center) ? el.center : [0, 0]
        const a = el.radiusX ?? 3
        const b = el.radiusY ?? 2
        // Compute focal distance: c = sqrt(|a²−b²|)
        const lge = Math.max(a, b)
        const sml = Math.min(a, b)
        const cFocal = Math.sqrt(Math.max(0, lge * lge - sml * sml))
        const horiz  = a >= b
        // Hidden helper points for JSXGraph ellipse constructor
        const f1 = board.create('point', horiz ? [cx - cFocal, cy] : [cx, cy - cFocal],
          { visible: false, fixed: true })
        const f2 = board.create('point', horiz ? [cx + cFocal, cy] : [cx, cy + cFocal],
          { visible: false, fixed: true })
        const pe = board.create('point', horiz ? [cx + a, cy] : [cx, cy + b],
          { visible: false, fixed: true })
        created = board.create('ellipse', [f1, f2, pe], {
          id:          el.id,
          strokeColor: el.color ?? '#1e40af',
          strokeWidth: el.strokeWidth ?? 2,
          fillColor:   el.fill ?? 'none',
          fillOpacity: el.fillOpacity ?? 0,
          highlight:   false,
        })
        break
      }

      case 'regularpolygon': {
        const [cx, cy] = Array.isArray(el.center) ? el.center : [0, 0]
        const r   = el.radius ?? 2
        const n   = el.n ?? 6
        const rot = ((el.rotation ?? 0) * Math.PI) / 180
        // Two adjacent vertices — JSXGraph generates the rest
        const p1 = board.create('point',
          [cx + r * Math.cos(rot), cy + r * Math.sin(rot)],
          { visible: el.showVertices ?? false, fixed: true,
            strokeColor: el.color ?? '#1e40af', fillColor: el.color ?? '#1e40af', size: 3 })
        const p2 = board.create('point',
          [cx + r * Math.cos(rot + (2 * Math.PI) / n), cy + r * Math.sin(rot + (2 * Math.PI) / n)],
          { visible: el.showVertices ?? false, fixed: true,
            strokeColor: el.color ?? '#1e40af', fillColor: el.color ?? '#1e40af', size: 3 })
        created = board.create('regularpolygon', [p1, p2, n], {
          id:          el.id,
          fillColor:   el.fill ?? '#dbeafe',
          fillOpacity: el.fillOpacity ?? 0.4,
          strokeColor: el.color ?? '#1e40af',
          strokeWidth: el.strokeWidth ?? 2,
          vertices:    { visible: el.showVertices ?? false, fixed: true },
          highlight:   false,
        })
        break
      }

      case 'sector': {
        const [cx, cy] = Array.isArray(el.center) ? el.center : [0, 0]
        const r       = el.radius ?? 2
        const fromRad = ((el.from ?? 0)  * Math.PI) / 180
        const toRad   = ((el.to   ?? 90) * Math.PI) / 180
        const ctrPt = board.create('point', [cx, cy],
          { visible: false, fixed: true })
        const ep1   = board.create('point',
          [cx + r * Math.cos(fromRad), cy + r * Math.sin(fromRad)],
          { visible: false, fixed: true })
        const ep2   = board.create('point',
          [cx + r * Math.cos(toRad),   cy + r * Math.sin(toRad)],
          { visible: false, fixed: true })
        created = board.create('sector', [ctrPt, ep1, ep2], {
          id:          el.id,
          strokeColor: el.color ?? '#1e40af',
          strokeWidth: el.strokeWidth ?? 2,
          fillColor:   el.fill ?? '#dbeafe',
          fillOpacity: el.fillOpacity ?? 0.4,
          highlight:   false,
        })
        break
      }

      case 'parametric': {
        const xFn = makeMathFn('t', el.xFn ?? 'cos(t)')
        const yFn = makeMathFn('t', el.yFn ?? 'sin(t)')
        const tMin = el.tMin ?? 0
        const tMax = el.tMax ?? (2 * Math.PI)
        created = board.create('curve', [
          (t) => xFn(t),
          (t) => yFn(t),
          tMin,
          tMax,
        ], {
          id:          el.id,
          strokeColor: el.color ?? '#1e40af',
          strokeWidth: el.strokeWidth ?? 2,
          highlight:   false,
        })
        break
      }

      case 'slider': {
        const pos1  = el.pos?.[0]  ?? [1, -1]
        const pos2  = el.pos?.[1]  ?? [5, -1]
        const range = el.range ?? [0, 1, 5]
        created = board.create('slider', [pos1, pos2, range], {
          id:          el.id,
          name:        el.label ?? '',
          snapWidth:   el.snapWidth ?? 0,
          strokeColor: el.color ?? '#1e40af',
          fillColor:   el.color ?? '#1e40af',
          size:        5,
          label:       { fontSize: 12, color: el.color ?? '#1e40af' },
        })
        break
      }

      case 'midpoint': {
        const mp = board.create('midpoint', [res(el.p1), res(el.p2)], {
          id:          el.id,
          name:        el.label ?? 'M',
          fixed:       true,
          face:        'o',
          size:        el.size ?? 3,
          strokeColor: el.color ?? '#dc2626',
          fillColor:   el.color ?? '#dc2626',
          label:       { fontSize: 13, offset: [4, -4] },
          highlight:   false,
        })
        created = mp
        break
      }

      case 'perpbisector': {
        // JSXGraph perpendicular bisector of segment p1–p2
        created = board.create('perpendicularsegment', [
          board.create('midpoint', [res(el.p1), res(el.p2)], { visible: false, fixed: true }),
          board.create('segment',  [res(el.p1), res(el.p2)], { visible: false }),
        ], {
          id:          el.id,
          strokeColor: el.color ?? '#dc2626',
          strokeWidth: el.strokeWidth ?? 2,
          dash:        el.dashed ? 2 : 0,
          highlight:   false,
        })
        break
      }

      case 'anglebisector': {
        // JSXGraph bisector takes [arm1, vertex, arm2]
        created = board.create('bisector', [res(el.arm1), res(el.vertex), res(el.arm2)], {
          id:          el.id,
          strokeColor: el.color ?? '#dc2626',
          strokeWidth: el.strokeWidth ?? 2,
          dash:        el.dashed ? 2 : 0,
          highlight:   false,
        })
        break
      }

      case 'tangentline': {
        // Numerical tangent: slope = (f(x+h) − f(x−h)) / 2h
        const fn    = makeMathFn('x', el.fn)
        const x0    = el.at ?? 0
        const h     = 1e-5
        const y0    = fn(x0)
        const slope = (fn(x0 + h) - fn(x0 - h)) / (2 * h)
        // Tangent line: y = slope*(x − x0) + y0
        const tangFn = (x) => slope * (x - x0) + y0
        const args   = el.domain
          ? [tangFn, el.domain[0], el.domain[1]]
          : [tangFn]
        created = board.create('functiongraph', args, {
          id:          el.id,
          strokeColor: el.color ?? '#dc2626',
          strokeWidth: el.strokeWidth ?? 2,
          dash:        el.dashed ? 2 : 0,
          highlight:   false,
        })
        break
      }

      case 'integral': {
        const fn   = makeMathFn('x', el.fn)
        const args = el.domain ? [fn, el.domain[0], el.domain[1]] : [fn]
        // First create the base functiongraph (hidden or visible)
        const curve = board.create('functiongraph', args, {
          visible:     false,
          highlight:   false,
        })
        created = board.create('integral', [[el.from ?? 0, el.to ?? 1], curve], {
          id:          el.id,
          fillColor:   el.fillColor ?? '#dbeafe',
          fillOpacity: el.fillOpacity ?? 0.6,
          strokeColor: el.color ?? '#1e40af',
          strokeWidth: el.strokeWidth ?? 1,
          highlight:   false,
          curveLeft:   { visible: false },
          curveRight:  { visible: false },
          baseLeft:    { visible: false },
          baseRight:   { visible: false },
          label:       { visible: false },
        })
        break
      }

      case 'riemannsum': {
        const fn = makeMathFn('x', el.fn ?? 'x')
        created = board.create('riemannsum', [
          fn,
          el.n      ?? 4,
          el.method ?? 'left',
          el.from   ?? 0,
          el.to     ?? 4,
        ], {
          id:          el.id,
          fillColor:   el.fill ?? '#bfdbfe',
          fillOpacity: el.fillOpacity ?? 0.5,
          strokeColor: el.color ?? '#1e40af',
          strokeWidth: el.strokeWidth ?? 1,
          highlight:   false,
        })
        break
      }

      case 'inequality': {
        // el.line — id of an existing 'line' element
        const refLine = elemMap[el.line]
        if (refLine) {
          created = board.create('inequality', [refLine], {
            id:          el.id,
            fillColor:   el.color ?? '#fca5a5',
            fillOpacity: el.fillOpacity ?? 0.25,
            inverse:     !(el.above ?? true),
            highlight:   false,
          })
        }
        break
      }

      default:
        if (process.env.NODE_ENV === 'development') {
          console.warn('[MathsDiagram] Unknown element type:', el.type)
        }
    }
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[MathsDiagram] element render error:', el.type, err.message)
    }
  }

  if (el.id && created) {
    elemMap[el.id] = created
  }
}

// ─── INLINE MINIMAL STYLES ───────────────────────────────────────────────────
let _jsxStyleInjected = false
function injectJsxStyles() {
  if (_jsxStyleInjected || typeof document === 'undefined') return
  _jsxStyleInjected = true
  if (document.getElementById('jxg-minimal-style')) return
  const style = document.createElement('style')
  style.id = 'jxg-minimal-style'
  style.textContent = `
    .jxgbox {
      position: relative !important;
      overflow: hidden !important;
      background-color: transparent !important;
      border: none !important;
      margin: 0 !important;
      padding: 0 !important;
      touch-action: none;
    }
    .JXGtext {
      font-family: Inter, system-ui, sans-serif;
      padding: 0;
      margin: 0;
    }
    .jxgbox svg {
      display: block;
    }
  `
  document.head.appendChild(style)
}

// ─── BOARD ID COUNTER ────────────────────────────────────────────────────────
let _boardCounter = 0

// ─── COMPONENT ───────────────────────────────────────────────────────────────

/**
 * @param {object}   props
 * @param {object}   props.spec          DiagramSpec object
 * @param {boolean}  [props.interactive] Enable pan/zoom (default false)
 * @param {number}   [props.width]       Width in px (default 320)
 * @param {number}   [props.height]      Height in px (default 320)
 * @param {string}   [props.className]   Extra Tailwind classes
 * @param {function} [props.onBoardReady] Called with (board, JXG) after init
 */
export default function MathsDiagram({
  spec,
  interactive  = false,
  width        = 320,
  height       = 320,
  className    = '',
  onBoardReady,
}) {
  const boardIdRef = useRef(null)
  if (!boardIdRef.current) {
    boardIdRef.current = `jxg-board-${++_boardCounter}`
  }

  const boardRef = useRef(null)
  const JXGRef   = useRef(null)

  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const specKey = spec ? JSON.stringify(spec) : null

  useEffect(() => {
    if (!specKey) { setLoading(false); return }

    let isMounted = true
    setLoading(true)
    setError(null)

    const init = async () => {
      try {
        injectJsxStyles()

        if (!JXGRef.current) {
          const mod = await import('jsxgraph')
          JXGRef.current = mod.JXG ?? mod.default ?? mod
        }
        const JXG = JXGRef.current

        if (!JXG?.JSXGraph?.initBoard) {
          throw new Error('JSXGraph module did not export JSXGraph.initBoard')
        }

        if (boardRef.current) {
          try { JXG.JSXGraph.freeBoard(boardRef.current) } catch {}
          boardRef.current = null
        }

        const parsedSpec = typeof spec === 'string' ? JSON.parse(spec) : spec
        const [xmin, ymin, xmax, ymax] = parsedSpec.bounds ?? [0, 0, 10, 10]

        const board = JXG.JSXGraph.initBoard(boardIdRef.current, {
          boundingbox:    [xmin, ymax, xmax, ymin],
          axis:           parsedSpec.showAxis ?? false,
          grid:           parsedSpec.grid ?? false,
          showNavigation: interactive,
          showCopyright:  false,
          zoom:           { enabled: interactive, wheel: interactive,
                            pinchHorizontal: interactive, pinchVertical: interactive },
          pan:            { enabled: interactive, needTwoFingers: false },
          renderer:       'svg',
          resize:         { enabled: false },
          maxBoundingBox: [xmin - 5, ymax + 5, xmax + 5, ymin - 5],
          defaultAxes: parsedSpec.showAxis ? {
            x: { ticks: { visible: true, label: { fontSize: 11 } }, name: '' },
            y: { ticks: { visible: true, label: { fontSize: 11 } }, name: '' },
          } : undefined,
        })

        boardRef.current = board

        const elemMap      = {}
        const parsedElements = parsedSpec.elements ?? []

        for (const el of parsedElements) {
          if (!isMounted) break
          renderElement(JXG, board, el, elemMap, interactive)
        }

        if (isMounted) {
          setLoading(false)
          setError(null)
          onBoardReady?.(board, JXG)
        }
      } catch (err) {
        console.error('[MathsDiagram] init error:', err)
        if (isMounted) { setError(err.message); setLoading(false) }
      }
    }

    init()

    return () => {
      isMounted = false
      if (boardRef.current && JXGRef.current) {
        try { JXGRef.current.JSXGraph.freeBoard(boardRef.current) } catch {}
        boardRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specKey, interactive])

  useEffect(() => {
    return () => {
      if (boardRef.current && JXGRef.current) {
        try { JXGRef.current.JSXGraph.freeBoard(boardRef.current) } catch {}
        boardRef.current = null
      }
    }
  }, [])

  if (!spec) return null

  const parsedSpec = typeof spec === 'string' ? JSON.parse(spec) : spec

  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-white ${className}`}
      style={{ width, height, minWidth: width, minHeight: height }}
      role="img"
      aria-label={parsedSpec.title ?? 'Maths diagram'}
    >
      <div id={boardIdRef.current} style={{ width: '100%', height: '100%' }} />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50 rounded-lg">
          <div className="w-6 h-6 border-2 border-slate-300 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      )}

      {error && !loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50 rounded-lg p-3 text-center">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="#dc2626" className="mb-1 opacity-60">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-5a.75.75 0 011.5 0v.5a.75.75 0 01-1.5 0V13zm.75-8a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5z" clipRule="evenodd" />
          </svg>
          <span className="text-xs text-red-600">Diagram unavailable</span>
        </div>
      )}

      {!loading && !error && parsedSpec.title && (
        <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-white/80 backdrop-blur-sm border-t border-slate-100">
          <p className="text-xs text-slate-500 text-center truncate">{parsedSpec.title}</p>
        </div>
      )}
    </div>
  )
}

// ─── STATIC DIAGRAM (pre-rendered SVG from /public) ──────────────────────────
/**
 * MathsDiagramStatic
 * Renders a pre-generated SVG file from /public/concept-visuals/maths/.
 * Zero JS — just an <img> tag. For concept cards.
 */
export function MathsDiagramStatic({
  stem,
  alt       = 'Maths diagram',
  className = '',
  width     = 320,
  height    = 320,
}) {
  const src = `/concept-visuals/maths/jxg_${stem}.svg`
  return (
    <div
      className={`inline-block overflow-hidden rounded-lg bg-white ${className}`}
      style={{ width, height }}
      role="img"
      aria-label={alt}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    </div>
  )
}
