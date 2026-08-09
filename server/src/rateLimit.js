/**
 * Simple in-memory sliding-window rate limiter middleware factory.
 * @param {{ windowMs: number, max: number }} opts
 */
export function rateLimit({ windowMs = 60_000, max = 60 } = {}) {
  /** @type {Map<string, number[]>} */
  const hits = new Map()

  return function rateLimitMiddleware(req, res, next) {
    const key = req.ip || req.socket?.remoteAddress || 'unknown'
    const now = Date.now()
    const windowStart = now - windowMs
    let timestamps = hits.get(key) || []
    timestamps = timestamps.filter((t) => t > windowStart)

    if (timestamps.length >= max) {
      hits.set(key, timestamps)
      res.setHeader('Retry-After', String(Math.ceil(windowMs / 1000)))
      return res.status(429).json({ error: 'Too many requests' })
    }

    timestamps.push(now)
    hits.set(key, timestamps)
    next()
  }
}
