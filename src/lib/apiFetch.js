/**
 * apiFetch.js
 * CSRF-aware drop-in replacement for fetch() — client-side only.
 *
 * Usage (identical to native fetch):
 *   import { apiFetch } from '@/lib/apiFetch';
 *   const res = await apiFetch('/api/tara', { method: 'POST', body: JSON.stringify({...}) });
 *
 * Behaviour:
 * - For state-changing methods (POST, PUT, PATCH, DELETE) it reads the
 *   __Host-csrf cookie and injects it as x-csrf-token header automatically.
 * - GET / HEAD / OPTIONS pass through unchanged.
 * - Falls back gracefully if the cookie is absent (server will return 403,
 *   which is the correct security behaviour).
 * - Content-Type defaults to application/json for state-changing requests
 *   that carry a body, saving repeated header declarations at call sites.
 */

const STATE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const CSRF_COOKIE   = '__Host-csrf';
const CSRF_HEADER   = 'x-csrf-token';

/**
 * Read a cookie value by name from document.cookie.
 * Returns empty string in SSR / non-browser environments.
 */
function readCookie(name) {
  if (typeof document === 'undefined') return '';
  const prefix = `${name}=`;
  for (const part of document.cookie.split(';')) {
    const c = part.trim();
    if (c.startsWith(prefix)) {
      return decodeURIComponent(c.slice(prefix.length));
    }
  }
  return '';
}

/**
 * apiFetch — wraps native fetch() with automatic CSRF token injection.
 *
 * @param {string | URL} url
 * @param {RequestInit} [options]
 * @returns {Promise<Response>}
 */
export async function apiFetch(url, options = {}) {
  const method  = (options.method ?? 'GET').toUpperCase();
  const headers = new Headers(options.headers);

  if (STATE_METHODS.has(method)) {
    // Default Content-Type for JSON bodies when caller omitted it
    if (!headers.has('Content-Type') && options.body !== undefined) {
      headers.set('Content-Type', 'application/json');
    }
    const csrfToken = readCookie(CSRF_COOKIE);
    if (csrfToken) {
      headers.set(CSRF_HEADER, csrfToken);
    }
  }

  return fetch(url, { ...options, headers });
}

/**
 * Convenience API helpers — typed shortcuts that handle JSON serialisation
 * and Content-Type automatically in addition to CSRF injection.
 *
 * Examples:
 *   import { api } from '@/lib/apiFetch'
 *   const res = await api.post('/api/submit-quest', { subject, answers, timeSpent })
 *   const res = await api.get('/api/exam-papers?page=1')
 */
export const api = {
  get:   (url, opts = {}) => apiFetch(url, { ...opts, method: 'GET' }),
  post:  (url, body, opts = {}) => apiFetch(url, {
    ...opts, method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', ...(opts.headers ?? {}) },
  }),
  patch: (url, body, opts = {}) => apiFetch(url, {
    ...opts, method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', ...(opts.headers ?? {}) },
  }),
  put:   (url, body, opts = {}) => apiFetch(url, {
    ...opts, method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', ...(opts.headers ?? {}) },
  }),
  del:   (url, opts = {}) => apiFetch(url, { ...opts, method: 'DELETE' }),
};

export default apiFetch;
