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
 *
 * Architecture:
 *   JSXGraph is loaded dynamically to avoid SSR issues. The board is initialised
 *   once per spec change. A stable random ID on a useRef prevents re-init on
 *   every render. Cleanup frees the board on unmount or spec change.
 */

import { useState, useEffect, useRef } from 'react'

// ─── ELEMENT RENDERER ────────────────────────────────────────────────────────
// Defined outside component to avoid re-creation on every render.

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
 * @param {object} JXG       — JSXGraph namespace
 * @param {object} board     — JSXGraph board instance
 * @param {object} el        — DiagramElement from spec.elements
 * @param {object} elemMap   — mutable map from id → JSXGraph object
 * @param {boolean} interactive
 */
function renderElement(JXG, board, el, elemMap, interactive) {
  const fixed = !interactive
  const res   = (ref) => resolveRef(ref, elemMap)

  let created

  try {
    switch (el.type) {

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
          id:              el.id,
          strokeColor:     el.color ?? '#1e40af',
          strokeWidth:     el.strokeWidth ?? 2,
          lastArrow:       { type: 1, size: 6 },
          fixed,
          highlight:       false,
        })
        break
      }

      case 'circle': {
        // radius can be a number or a point (for dynamic radius)
        const center = res(el.center)
        const radius = el.radius  // number
        created = board.create('circle', [center, radius], {
          id:           el.id,
          strokeColor:  el.color ?? '#1e40af',
          strokeWidth:  el.strokeWidth ?? 2,
          fillColor:    el.fill ?? 'none',
          fillOpacity:  el.fillOpacity ?? 0,
          fixed,
          highlight:    false,
        })
        break
      }

      case 'arc': {
        // JSXGraph arc: [center, startPoint, endPoint]
        // Draws the arc counterclockwise from startPoint to the angular position of endPoint
        const center = res(el.center)
        const from   = res(el.from)
        const to     = res(el.to)
        created = board.create('arc', [center, from, to], {
          id:          el.id,
          strokeColor: el.color ?? '#1e40af',
          strokeWidth: el.strokeWidth ?? 2,
          fixed,
          highlight:   false,
        })
        break
      }

      case 'angle': {
        // JSXGraph angle: [arm1Point, vertexPoint, arm2Point]
        // The angle is measured at vertex, from arm1 to arm2
        const arm1   = res(el.arm1)
        const vertex = res(el.vertex)
        const arm2   = res(el.arm2)
        created = board.create('angle', [arm1, vertex, arm2], {
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
          // Lock individual vertices if not interactive
          vertices: { fixed },
          highlight: false,
        })
        break
      }

      case 'functiongraph': {
        // fn is a math expression string; ** is exponentiation
        // Using new Function is intentional — Tara generates these, not end-users
        const fnSrc = (el.fn ?? 'x').replace(/\^/g, '**')
        let fn
        try {
          // eslint-disable-next-line no-new-func
          fn = new Function('x', `"use strict"; return (${fnSrc})`)
        } catch {
          fn = (x) => x
        }

        const args = el.domain
          ? [fn, el.domain[0], el.domain[1]]
          : [fn]

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
          id:          el.id,
          strokeColor: el.color ?? '#1e293b',
          fontSize:    el.size ?? 13,
          fontWeight:  el.bold ? 'bold' : 'normal',
          fixed,
          highlight:   false,
        })
        break
      }

      default:
        if (process.env.NODE_ENV === 'development') {
          console.warn('[MathsDiagram] Unknown element type:', el.type)
        }
    }
  } catch (err) {
    // Log and skip — never let one bad element break the whole diagram
    if (process.env.NODE_ENV === 'development') {
      console.warn('[MathsDiagram] element render error:', el, err.message)
    }
  }

  if (el.id && created) {
    elemMap[el.id] = created
  }
}

// ─── INLINE MINIMAL STYLES ───────────────────────────────────────────────────
// We inject the minimal JSXGraph box styles once per page rather than
// importing from node_modules (which has SSR/path resolution edge cases).
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
  // Stable board container ID — never changes for the lifetime of this component
  const boardIdRef = useRef(null)
  if (!boardIdRef.current) {
    boardIdRef.current = `jxg-board-${++_boardCounter}`
  }

  const boardRef = useRef(null)
  const JXGRef   = useRef(null)

  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  // Serialize spec for effect dependency — only re-init if spec actually changes
  const specKey = spec ? JSON.stringify(spec) : null

  useEffect(() => {
    if (!specKey) {
      setLoading(false)
      return
    }

    let isMounted = true
    setLoading(true)
    setError(null)

    const init = async () => {
      try {
        injectJsxStyles()

        // Load JSXGraph — dynamic import avoids SSR crash
        if (!JXGRef.current) {
          const mod  = await import('jsxgraph')
          JXGRef.current = mod.JXG ?? mod.default ?? mod
        }
        const JXG = JXGRef.current

        if (!JXG?.JSXGraph?.initBoard) {
          throw new Error('JSXGraph module did not export JSXGraph.initBoard')
        }

        // Free any existing board for this ID
        if (boardRef.current) {
          try { JXG.JSXGraph.freeBoard(boardRef.current) } catch {}
          boardRef.current = null
        }

        const parsedSpec = typeof spec === 'string' ? JSON.parse(spec) : spec
        const [xmin, ymin, xmax, ymax] = parsedSpec.bounds ?? [0, 0, 10, 10]

        const board = JXG.JSXGraph.initBoard(boardIdRef.current, {
          boundingbox:     [xmin, ymax, xmax, ymin], // JSXGraph: [x_left, y_top, x_right, y_bottom]
          axis:            parsedSpec.showAxis ?? false,
          grid:            parsedSpec.grid ?? false,
          showNavigation:  interactive,
          showCopyright:   false,
          zoom:            { enabled: interactive, wheel: interactive, pinchHorizontal: interactive, pinchVertical: interactive },
          pan:             { enabled: interactive, needTwoFingers: false },
          renderer:        'svg',
          resize:          { enabled: false },
          // Prevent auto-resize from fighting our fixed container
          maxBoundingBox:  [xmin - 5, ymax + 5, xmax + 5, ymin - 5],
          defaultAxes: parsedSpec.showAxis ? {
            x: {
              ticks: { visible: true, label: { fontSize: 11 } },
              name: '',
            },
            y: {
              ticks: { visible: true, label: { fontSize: 11 } },
              name: '',
            },
          } : undefined,
        })

        boardRef.current = board

        // Render all elements in order (so later elements can ref earlier ones)
        const elemMap = {}
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
        if (isMounted) {
          setError(err.message)
          setLoading(false)
        }
      }
    }

    init()

    return () => {
      isMounted = false
      // Free board on spec change — will re-init in next effect run
      if (boardRef.current && JXGRef.current) {
        try { JXGRef.current.JSXGraph.freeBoard(boardRef.current) } catch {}
        boardRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specKey, interactive])

  // Final cleanup on unmount
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
      {/* JSXGraph attaches its SVG into this div */}
      <div
        id={boardIdRef.current}
        style={{ width: '100%', height: '100%' }}
      />

      {/* Loading skeleton */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50 rounded-lg">
          <div className="w-6 h-6 border-2 border-slate-300 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50 rounded-lg p-3 text-center">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="#dc2626" className="mb-1 opacity-60">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-5a.75.75 0 011.5 0v.5a.75.75 0 01-1.5 0V13zm.75-8a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5z" clipRule="evenodd" />
          </svg>
          <span className="text-xs text-red-600">Diagram unavailable</span>
        </div>
      )}

      {/* Title caption */}
      {!loading && !error && parsedSpec.title && (
        <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-white/80 backdrop-blur-sm border-t border-slate-100">
          <p className="text-xs text-slate-500 text-center truncate">{parsedSpec.title}</p>
        </div>
      )}
    </div>
  )
}

// ─── NAMED EXPORT: static SVG from pre-generated files ───────────────────────
/**
 * MathsDiagramStatic
 *
 * Renders a pre-generated SVG file from /public/concept-visuals/maths/.
 * Zero JS overhead — just an <img> tag. For concept cards.
 *
 * @param {{ stem: string, alt?: string, className?: string, width?: number, height?: number }} props
 */
export function MathsDiagramStatic({ stem, alt = 'Maths diagram', className = '', width = 320, height = 320 }) {
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
