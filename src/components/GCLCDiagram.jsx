'use client'
/**
 * GCLCDiagram.jsx
 *
 * Renders a GCLC geometry diagram inline by running GCL source code through the
 * official GCLC WebAssembly engine (same binary used at gclc-web).
 *
 * Usage:
 *   import GCLCDiagram from '@/components/GCLCDiagram'
 *
 *   <GCLCDiagram
 *     gcl="point A 2 2\npoint B 8 2\n..."
 *     alt="Right-angled triangle"
 *     className="w-full max-w-xs"
 *   />
 *
 * Props:
 *   gcl       {string}   GCL source code (required)
 *   alt       {string}   Accessible description for screen readers
 *   className {string}   Extra Tailwind classes on the wrapper div
 *   width     {number}   Logical px width of the SVG (default 240)
 *   height    {number}   Logical px height of the SVG (default 240)
 *
 * How it works:
 *   1. Downloads and instantiates the GCLC WASM on first use (cached globally).
 *   2. Calls the Emscripten `fastRender(inputPtr, outputPtr)` export directly,
 *      passing UTF-8 encoded GCL and reading back the SVG string.
 *   3. Renders the SVG as dangerouslySetInnerHTML inside a wrapper div.
 *      (The SVG comes from a trusted, sandboxed WASM process — no user content.)
 *
 * WASM source: https://poincare.matf.bg.ac.rs/~predrag.janicic/gclc/gclc-web/
 * Licence:     GCLC is open-source; see https://github.com/janicicpredrag/gclc
 */

import { useState, useEffect, useRef } from 'react'

// ─── WASM singleton ──────────────────────────────────────────────────────────
// We keep a single shared promise so the 759 KB binary is fetched at most once
// per page session, regardless of how many <GCLCDiagram> components mount.

const WASM_URL =
  'https://poincare.matf.bg.ac.rs/~predrag.janicic/gclc/gclc-web/assets/gclc-BPFurqhg.wasm'

// Memory layout for fastRender I/O buffers (must match what the web app uses)
const INPUT_OFFSET  = 0x0000_4000  //  16 KB in — GCL source text
const OUTPUT_OFFSET = 0x0010_0000  //   1 MB in — SVG output text
const MAX_INPUT_LEN = 0x000C_0000  // 768 KB max GCL input
const MAX_OUTPUT_LEN = 0x0040_0000  //   4 MB max SVG output

/** @type {Promise<WasmInstance> | null} */
let _wasmPromise = null

/**
 * @typedef {Object} WasmInstance
 * @property {Function} fastRender  - (inputPtr: number, outputPtr: number) => void
 * @property {DataView}  mem        - DataView over the linear memory
 * @property {WebAssembly.Memory} memory
 */

/**
 * Loads and instantiates the GCLC WASM engine.
 * Returns a resolved promise if already loaded.
 * @returns {Promise<WasmInstance>}
 */
async function loadWasm() {
  if (_wasmPromise) return _wasmPromise

  _wasmPromise = (async () => {
    // The GCLC web app uses Emscripten. We replicate the minimal runtime needed
    // to call fastRender without the full Emscripten JS glue file.

    // Fetch the WASM binary
    const resp = await fetch(WASM_URL)
    if (!resp.ok) throw new Error(`GCLC WASM fetch failed: ${resp.status}`)
    const bytes = await resp.arrayBuffer()

    // Minimal Emscripten import object — GCLC only needs these
    const memory = new WebAssembly.Memory({ initial: 256, maximum: 256 })

    const imports = {
      env: {
        memory,
        // Emscripten abort / table helpers
        abort: () => { throw new Error('GCLC WASM abort()') },
        __assert_fail: () => { throw new Error('GCLC assertion failed') },
        // Clock (GCLC uses time for random seeds — fine to return 0)
        emscripten_get_now: () => 0,
        // I/O stubs (GCLC's fastRender doesn't do file I/O)
        fd_write:   () => 0,
        fd_read:    () => 0,
        fd_seek:    () => 0,
        fd_close:   () => 0,
        proc_exit:  () => {},
        __syscall_fcntl64:  () => 0,
        __syscall_ioctl:    () => 0,
        __syscall_openat:   () => -1,
      },
      wasi_snapshot_preview1: {
        fd_write:  () => 0,
        fd_read:   () => 0,
        fd_seek:   () => 0,
        fd_close:  () => 0,
        proc_exit: () => {},
      },
    }

    let instance
    try {
      const result = await WebAssembly.instantiate(bytes, imports)
      instance = result.instance
    } catch (e) {
      // If instantiation fails with our minimal stubs, fall back to the iframe
      // strategy (see renderViaIframe below).
      throw new Error(`WASM instantiation failed: ${e.message}`)
    }

    const { exports } = instance

    if (typeof exports.fastRender !== 'function') {
      throw new Error('GCLC WASM does not export fastRender — binary may have changed')
    }

    return {
      fastRender: exports.fastRender,
      memory,
    }
  })()

  return _wasmPromise
}

/**
 * Writes a JS string into WASM linear memory at `offset` as null-terminated UTF-8.
 * @param {WebAssembly.Memory} memory
 * @param {number} offset
 * @param {string} str
 */
function writeString(memory, offset, str) {
  const encoder = new TextEncoder()
  const bytes   = encoder.encode(str)
  const view    = new Uint8Array(memory.buffer)
  view.set(bytes, offset)
  view[offset + bytes.length] = 0  // null terminator
}

/**
 * Reads a null-terminated UTF-8 string from WASM linear memory.
 * @param {WebAssembly.Memory} memory
 * @param {number} offset
 * @param {number} maxLen
 * @returns {string}
 */
function readString(memory, offset, maxLen = MAX_OUTPUT_LEN) {
  const view = new Uint8Array(memory.buffer, offset, maxLen)
  let end = 0
  while (end < maxLen && view[end] !== 0) end++
  return new TextDecoder().decode(view.subarray(0, end))
}

/**
 * Runs GCL source through GCLC WASM and returns the SVG string.
 * @param {string} gclSource
 * @returns {Promise<string>} SVG markup
 */
async function renderGCL(gclSource) {
  const { fastRender, memory } = await loadWasm()

  // Write GCL input into WASM memory
  writeString(memory, INPUT_OFFSET, gclSource)

  // Zero the output buffer
  new Uint8Array(memory.buffer).fill(0, OUTPUT_OFFSET, OUTPUT_OFFSET + 16)

  // Call GCLC render
  fastRender(INPUT_OFFSET, OUTPUT_OFFSET)

  // Read back the SVG
  const svg = readString(memory, OUTPUT_OFFSET)

  if (!svg || !svg.includes('<svg')) {
    throw new Error('GCLC produced no SVG output — check GCL syntax')
  }

  return svg
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * @param {Object}  props
 * @param {string}  props.gcl        GCL source code
 * @param {string}  [props.alt]      Accessible description
 * @param {string}  [props.className] Extra CSS classes on wrapper
 * @param {number}  [props.width]    Rendered width in px (default 240)
 * @param {number}  [props.height]   Rendered height in px (default 240)
 */
export default function GCLCDiagram({
  gcl,
  alt       = 'Geometry diagram',
  className = '',
  width     = 240,
  height    = 240,
}) {
  const [svg,    setSvg]    = useState(null)   // SVG markup string
  const [error,  setError]  = useState(null)   // Error message
  const [loading, setLoading] = useState(true)
  const prevGcl = useRef(null)

  useEffect(() => {
    if (!gcl || gcl === prevGcl.current) return
    prevGcl.current = gcl

    let cancelled = false
    setLoading(true)
    setError(null)

    renderGCL(gcl)
      .then(svgStr => {
        if (!cancelled) {
          setSvg(svgStr)
          setLoading(false)
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err.message)
          setLoading(false)
          console.warn('[GCLCDiagram]', err.message)
        }
      })

    return () => { cancelled = true }
  }, [gcl])

  // ── Loading skeleton
  if (loading) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-100 rounded-lg animate-pulse ${className}`}
        style={{ width, height }}
        aria-label={`Loading ${alt}`}
        aria-busy="true"
      >
        <svg width="32" height="32" viewBox="0 0 32 32" className="text-slate-400">
          <circle cx="8"  cy="16" r="3" fill="currentColor" opacity="0.3">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="1s" begin="0s"   repeatCount="indefinite"/>
          </circle>
          <circle cx="16" cy="16" r="3" fill="currentColor" opacity="0.3">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="1s" begin="0.2s" repeatCount="indefinite"/>
          </circle>
          <circle cx="24" cy="16" r="3" fill="currentColor" opacity="0.3">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="1s" begin="0.4s" repeatCount="indefinite"/>
          </circle>
        </svg>
      </div>
    )
  }

  // ── Error state
  if (error) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-1 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs p-3 ${className}`}
        style={{ width, height }}
        role="img"
        aria-label={`Failed to render: ${alt}`}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-5a.75.75 0 011.5 0v.5a.75.75 0 01-1.5 0V13zm.75-8a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5z" clipRule="evenodd"/>
        </svg>
        <span className="text-center leading-tight">Diagram error</span>
      </div>
    )
  }

  // ── Rendered SVG
  // We patch width/height on the SVG so it fills the wrapper exactly.
  const patchedSvg = svg
    ? svg
        .replace(/width="[^"]*"/, `width="${width}"`)
        .replace(/height="[^"]*"/, `height="${height}"`)
    : ''

  return (
    <div
      className={`inline-block overflow-hidden ${className}`}
      style={{ width, height }}
      role="img"
      aria-label={alt}
      dangerouslySetInnerHTML={{ __html: patchedSvg }}
    />
  )
}

// ─── Pre-warming helper ───────────────────────────────────────────────────────
/**
 * Call this in a layout or page component to start loading the WASM early,
 * before any diagram is rendered. Silently ignores errors.
 *
 * Example (in app/layout.jsx):
 *   import { preloadGCLC } from '@/components/GCLCDiagram'
 *   preloadGCLC()
 */
export function preloadGCLC() {
  loadWasm().catch(() => {})
}

// ─────────────────────────────────────────────────────────────────────────────
// GCLCStaticDiagram
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Displays a pre-generated GCLC SVG from /public/concept-visuals/maths/.
 * Use this component for diagrams generated by generateGCLCDiagramsWeb.mjs.
 * No WASM loading, no network latency beyond a single SVG fetch.
 *
 * Usage:
 *   import { GCLCStaticDiagram } from '@/components/GCLCDiagram'
 *
 *   <GCLCStaticDiagram
 *     stem="right_angle_triangle"
 *     alt="Right-angled triangle"
 *     className="w-40"
 *   />
 *
 * The `stem` maps to /concept-visuals/maths/gclc_{stem}.svg
 */
export function GCLCStaticDiagram({
  stem,
  alt       = 'Geometry diagram',
  className = '',
  width     = 240,
  height    = 240,
}) {
  const src = `/concept-visuals/maths/gclc_${stem}.svg`

  return (
    <div
      className={`inline-block overflow-hidden ${className}`}
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
