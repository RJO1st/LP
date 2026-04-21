/**
 * fetchWithCsrf.js
 * Reads the __Host-csrf cookie set by proxy.ts and attaches it as
 * the x-csrf-token header on every state-mutating request.
 *
 * Usage:
 *   import { fetchWithCsrf } from "@/lib/fetchWithCsrf";
 *   const res = await fetchWithCsrf("/api/schools/create", {
 *     method: "POST",
 *     headers: { "Content-Type": "application/json" },
 *     body: JSON.stringify({ ... }),
 *   });
 */

export function getCsrfToken() {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)__Host-csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

/**
 * Drop-in replacement for fetch() that auto-includes the CSRF token header.
 * All other options are passed through unchanged.
 */
export async function fetchWithCsrf(url, options = {}) {
  const token = getCsrfToken();
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      "x-csrf-token": token,
    },
  });
}
