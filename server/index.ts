import express from 'express'
import cors from 'cors'
import { connectDB, isConnected } from './config/db'
import authRouter from './routes/auth'
import { authorizeApiRequest, enforceAssignedEntityScope, parseCookies, requireAuth } from './middleware/auth'
import { createRateLimitMiddleware, environmentLimit, requestDiagnostics } from './middleware/rateLimit'

// Routes
import entitiesRouter from './routes/entities'
import alertsRouter from './routes/alerts'
import casesRouter from './routes/cases'
import findingsRouter from './routes/findings'
import analyticsRouter from './routes/analytics'
import auditRouter from './routes/audit'
import notificationsRouter from './routes/notifications'
import reportsRouter from './routes/reports'
import ingestionRouter from './routes/ingestion'
import evidenceRouter from './routes/evidence'
import validationRouter from './routes/validation'
import mlRouter from './routes/ml'
import configurationRouter from './routes/configuration'
import assessmentFrameworkRouter from './routes/assessmentFramework'

const app = express()
const PORT = process.env.API_PORT || 3500
const HOST = process.env.API_HOST || '127.0.0.1'
const allowedOrigins = new Set((process.env.CLIENT_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',').map(origin => origin.trim()).filter(Boolean))

app.disable('x-powered-by')
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('Cache-Control', 'no-store')
  if (process.env.NODE_ENV === 'production') res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  next()
})
app.use(cors({
  origin(origin, callback) {
    callback(null, !origin || allowedOrigins.has(origin))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Retry-After', 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset']
}))
app.use((req, res, next) => {
  const origin = req.get('origin')
  if (origin && !allowedOrigins.has(origin)) return res.status(403).json({ success: false, error: { code: 'ORIGIN_DENIED', message: 'Request origin is not allowed.' } })
  next()
})
app.use(express.json({ limit: '2mb' }))
app.use(parseCookies)

app.use('/api', requestDiagnostics)

const authRateLimit = createRateLimitMiddleware({
  identify: req => req.ip || req.socket.remoteAddress || 'unknown',
  policy: req => {
    if (req.path === '/login') return { category: 'auth-login', limit: environmentLimit('SATSA_RATE_LIMIT_AUTH_LOGIN', 10, 1, 1000), windowMs: 15 * 60 * 1000 }
    if (req.path === '/setup') return { category: 'auth-setup', limit: environmentLimit('SATSA_RATE_LIMIT_AUTH_SETUP', 5, 1, 100), windowMs: 60 * 60 * 1000 }
    if (req.path === '/register') return { category: 'auth-register', limit: environmentLimit('SATSA_RATE_LIMIT_AUTH_REGISTER', 5, 1, 100), windowMs: 60 * 60 * 1000 }
    return { category: 'auth', limit: environmentLimit('SATSA_RATE_LIMIT_AUTH', 60, 1), windowMs: 15 * 60 * 1000 }
  }
})
app.use('/api/auth', authRateLimit)

// Health check
app.get('/api/health', (_req, res) => {
  const status = isConnected() ? 'ok' : 'degraded'
  res.status(status === 'ok' ? 200 : 503).json({
    status,
    name: 'SAT-SA API',
    database: isConnected() ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  })
})

// API Routes
app.use('/api/auth', authRouter)
const apiRateLimit = createRateLimitMiddleware({
  identify: req => req.user?.id || req.ip || req.socket.remoteAddress || 'unknown',
  policy: req => {
    const path = req.originalUrl.split('?')[0]
    if (path.startsWith('/api/ingestion/')) {
      return { category: 'ingestion', limit: environmentLimit('SATSA_RATE_LIMIT_INGESTION', 60, 1), windowMs: 15 * 60 * 1000 }
    }
    if (path.startsWith('/api/analytics/')) {
      const recompute = req.method === 'POST' && path === '/api/analytics/recompute'
      return recompute
        ? { category: 'analytics-write', limit: environmentLimit('SATSA_RATE_LIMIT_ANALYTICS_WRITE', 10, 1), windowMs: 15 * 60 * 1000 }
        : { category: 'analytics', limit: environmentLimit('SATSA_RATE_LIMIT_ANALYTICS', 300, 1), windowMs: 15 * 60 * 1000 }
    }
    return { category: 'api-read', limit: environmentLimit('SATSA_RATE_LIMIT_API_READ', 600, 1), windowMs: 15 * 60 * 1000 }
  }
})
app.use('/api', requireAuth, apiRateLimit, authorizeApiRequest, enforceAssignedEntityScope)
app.use('/api/entities', entitiesRouter)
app.use('/api/alerts', alertsRouter)
app.use('/api/cases', casesRouter)
app.use('/api/findings', findingsRouter)
app.use('/api/analytics', analyticsRouter)
app.use('/api/audit', auditRouter)
app.use('/api/notifications', notificationsRouter)
app.use('/api/reports', reportsRouter)
app.use('/api/ingestion', ingestionRouter)
app.use('/api/evidence', evidenceRouter)
app.use('/api/validation', validationRouter)
app.use('/api/ml', mlRouter)
app.use('/api/configuration', configurationRouter)
app.use('/api/assessment-framework', assessmentFrameworkRouter)
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[API] Request failed:', err instanceof Error ? err.message : 'Unknown error')
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'The request could not be completed.' } })
})

// Start
async function main() {
  await connectDB()
  app.listen(Number(PORT), HOST, () => {
    console.log(`\n[API] SAT-SA Backend running on http://127.0.0.1:${PORT}`)
    console.log(`[API] Health check: http://127.0.0.1:${PORT}/api/health\n`)
  })
}

main().catch(err => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
