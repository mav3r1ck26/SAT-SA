import express from 'express'
import cors from 'cors'
import { connectDB } from './config/db'

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

const app = express()
const PORT = process.env.API_PORT || 3001

// Middleware
app.use(cors())
app.use(express.json({ limit: '50mb' }))

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    name: 'SAT-SA API',
    version: '1.0.0',
    environment: 'NCIIPC Controlled Environment',
    connectivity: 'Local Processing Only',
    timestamp: new Date().toISOString()
  })
})

// API Routes
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

// Start
async function main() {
  await connectDB()
  app.listen(PORT, () => {
    console.log(`\n[API] SAT-SA Backend running on http://localhost:${PORT}`)
    console.log(`[API] Health check: http://localhost:${PORT}/api/health\n`)
  })
}

main().catch(err => {
  console.error('Failed to start server:', err)
  process.exit(1)
})