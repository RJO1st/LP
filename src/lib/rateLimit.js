// In-memory rate limiter using sliding window
// NOTE: For multi-instance production, replace with Upstash Redis.
// This implementation is thread-safe enough for Node.js single thread.

export class RateLimiter {
  constructor({ windowMs, maxRequests }) {
    this.windowMs = windowMs
    this.maxRequests = maxRequests
    this.requests = new Map() // Map<key, timestamp[]>
  }

  check(key) {
    const now = Date.now()
    let timestamps = this.requests.get(key) || []

    // Remove timestamps older than the window
    timestamps = timestamps.filter(ts => now - ts < this.windowMs)

    if (timestamps.length >= this.maxRequests) {
      // Rate limit exceeded
      const resetAt = timestamps[0] + this.windowMs
      return {
        allowed: false,
        remaining: 0,
        resetAt,
      }
    }

    // Add current timestamp
    timestamps.push(now)
    this.requests.set(key, timestamps)

    return {
      allowed: true,
      remaining: this.maxRequests - timestamps.length,
      resetAt: now + this.windowMs,
    }
  }

  // Cleanup old entries periodically (optional, for memory management)
  cleanup() {
    const now = Date.now()
    const keysToDelete = []

    for (const [key, timestamps] of this.requests.entries()) {
      const validTimestamps = timestamps.filter(ts => now - ts < this.windowMs)
      if (validTimestamps.length === 0) {
        keysToDelete.push(key)
      } else {
        this.requests.set(key, validTimestamps)
      }
    }

    keysToDelete.forEach(key => this.requests.delete(key))
  }
}

// Pre-configured limiter instances
export const authLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10,
})

export const forgotLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 5,
})

export const taraLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30,
})

export const generateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5,
})

export const apiLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
})

// Helper to extract real IP from request
export function getRealIp(request) {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  const ip = request.headers.get('x-real-ip') || request.headers.get('cf-connecting-ip')
  if (ip) {
    return ip.trim()
  }

  return 'unknown'
}
