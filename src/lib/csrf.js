// CSRF double-submit cookie utility using Node.js crypto

import crypto from 'crypto'

export const CSRF_COOKIE = '__Host-csrf'
export const CSRF_HEADER = 'x-csrf-token'

/**
 * Generate a random CSRF token (32 bytes, hex-encoded)
 * @returns {string} A random token
 */
export function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Validate CSRF: check that header token matches cookie token
 * @param {Request} request - The incoming HTTP request
 * @param {Object} cookies - The cookies object (from next/headers)
 * @returns {boolean} True if both present and match
 */
export function validateCsrf(request, cookies) {
  const headerToken = request.headers.get(CSRF_HEADER)
  const cookieToken = cookies.get(CSRF_COOKIE)?.value

  if (!headerToken || !cookieToken) {
    return false
  }

  return headerToken === cookieToken
}

/**
 * Create a NextResponse with the CSRF cookie set
 * @param {Response} response - The NextResponse to modify
 * @param {string} token - The CSRF token to set
 * @returns {Response} The response with CSRF cookie set
 */
export function setCsrfCookie(response, token) {
  response.cookies.set(CSRF_COOKIE, token, {
    httpOnly: false, // Must be readable by JS to include in headers
    secure: process.env.NODE_ENV === 'production', // Only set secure in production
    sameSite: 'strict',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  })

  return response
}
