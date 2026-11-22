import type { NextFunction, Request, Response } from 'express'

export interface RateLimitPolicy {
  category: string
  limit: number
  windowMs: number
}

interface RateLimitWindow extends RateLimitPolicy {
  count: number
  resetAt: number
}

interface RateLimitOptions {
  identify: (req: Request) => string
  policy: (req: Request) => RateLimitPolicy
  now?: () => number
}

export function environmentLimit(name: string, fallback: number, minimum = 1, maximum = 100000): number {
  const parsed = Number(process.env[name])
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback
}

export function createRateLimitMiddleware({ identify, policy, now = Date.now }: RateLimitOptions) {
  const windows = new Map<string, RateLimitWindow>()

  return (req: Request, res: Response, next: NextFunction) => {
    const selected = policy(req)
    const timestamp = now()
    const key = `${selected.category}:${identify(req)}`
    let window = windows.get(key)

    if (!window || window.resetAt <= timestamp) {
      window = { ...selected, count: 0, resetAt: timestamp + selected.windowMs }
      windows.set(key, window)
    }

    window.count++
    if (windows.size > 10000) {
      for (const [entryKey, entry] of windows) {
        if (entry.resetAt <= timestamp) windows.delete(entryKey)
      }
    }

    const retryAfterSeconds = Math.max(1, Math.ceil((window.resetAt - timestamp) / 1000))
    res.setHeader('RateLimit-Limit', String(window.limit))
    res.setHeader('RateLimit-Remaining', String(Math.max(0, window.limit - window.count)))
    res.setHeader('RateLimit-Reset', String(Math.ceil(window.resetAt / 1000)))

    if (window.count > window.limit) {
      res.setHeader('Retry-After', String(retryAfterSeconds))
      console.warn(JSON.stringify({
        event: 'rate_limit.rejected',
        category: window.category,
        method: req.method,
        path: req.path,
        statusCode: 429,
        retryAfterSeconds,
        actorId: req.user?.id
      }))
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: `The ${window.category} request limit was reached. Retry after ${retryAfterSeconds} seconds.`,
          retryAfterSeconds
        }
      })
    }

    next()
  }
}

export function requestDiagnostics(req: Request, res: Response, next: NextFunction) {
  const startedAt = Date.now()
  res.on('finish', () => {
    const entityId = typeof req.query.entityId === 'string'
      ? req.query.entityId
      : typeof req.body?.entityId === 'string'
        ? req.body.entityId
        : req.params.entityId
    const period = typeof req.query.period === 'string'
      ? req.query.period
      : typeof req.body?.period === 'string'
        ? req.body.period
        : undefined

    console.info(JSON.stringify({
      event: 'http.request',
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
      actorId: req.user?.id,
      ...(entityId ? { entityId } : {}),
      ...(period ? { assessmentPeriod: period } : {})
    }))
  })
  next()
}
