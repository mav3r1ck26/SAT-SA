import { Router, Response, Request } from 'express'
import http from 'http'
import { Entity } from '../models/Entity'
import { Alert } from '../models/Alert'
import { Case } from '../models/Case'
import { TelemetryCoverage } from '../models/TelemetryCoverage'
import { resolveAssessmentPeriod } from '../services/configuration'

const ML_API_URL = process.env.ML_API_URL || 'http://127.0.0.1:8000'

const router = Router()

function parseUrl(url: string): { hostname: string; port: number; path: string } {
  const u = new URL(url)
  return {
    hostname: u.hostname,
    port: parseInt(u.port) || (u.protocol === 'https:' ? 443 : 80),
    path: u.pathname + u.search
  }
}

function proxyRequest(req: Request, res: Response, endpoint: string) {
  const url = `${ML_API_URL}${endpoint}`
  const { hostname, port, path } = parseUrl(url)

  const payload = req.method !== 'GET' && req.method !== 'HEAD' && req.body ? JSON.stringify(req.body) : null

  const options: http.RequestOptions = {
    hostname,
    port,
    path,
    method: req.method,
    headers: {
      'Content-Type': 'application/json',
      ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
    }
  }

  const proxyReq = http.request(options, (proxyRes) => {
    let data = ''
    proxyRes.on('data', (chunk) => { data += chunk })
    proxyRes.on('end', () => {
      try {
        const jsonData = data ? JSON.parse(data) : {}
        res.status(proxyRes.statusCode || 200).json(jsonData)
      } catch {
        res.status(500).json({ success: false, error: { code: 'ML_PARSE_ERROR', message: 'Failed to parse ML service response' } })
      }
    })
  })

  proxyReq.on('error', (err) => {
    console.error('ML proxy request failed:', err.name)
    res.status(503).json({ success: false, error: { code: 'ML_SERVICE_UNAVAILABLE', message: 'The ML service is unavailable.' } })
  })

  if (payload) {
    proxyReq.write(payload)
  }
  proxyReq.end()
}

// ML Health check
router.get('/health', async (req, res) => {
  proxyRequest(req, res, '/health')
})

// ML Models info (supports both /models and /model/info)
router.get('/models', async (req, res) => {
  proxyRequest(req, res, '/model/info')
})

router.get('/model/info', async (req, res) => {
  proxyRequest(req, res, '/model/info')
})

// Auto-train model
router.post('/train-auto', async (req, res) => {
  proxyRequest(req, res, '/train-auto')
})

// Batch evaluate JSON
router.post('/evaluate', async (req, res) => {
  proxyRequest(req, res, '/evaluate')
})

// Fleet-wide ML evaluation using live entity data from MongoDB
router.post('/evaluate-fleet', async (req, res) => {
  try {
    const period = await resolveAssessmentPeriod(req.body.period)
    const entityFilter = typeof req.body.entityId === 'string' ? { id: req.body.entityId } : {}
    const entities = await Entity.find(entityFilter).sort({ id: 1 }).lean()
    if (entityFilter.id && !entities.length) return res.status(404).json({ success: false, error: { code: 'ENTITY_NOT_FOUND', message: 'Entity not found.' } })
    const batchEntities = await Promise.all(entities.map(async entity => {
      const [alerts, cases, coverage] = await Promise.all([
        Alert.find({ entityId: entity.id, period }).lean(),
        Case.find({ entityId: entity.id, period }).lean(),
        TelemetryCoverage.find({ entityId: entity.id, period }).lean()
      ])
      const features: Record<string, number> = {}
      const average = (values: Array<number | null | undefined>) => {
        const valid = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
        return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null
      }

      if (alerts.length) {
        features.total_alerts_per_period = alerts.length
        const linkedAlerts = new Set(cases.map(item => item.alertId).filter((value): value is string => Boolean(value)))
        features.alert_to_case_ratio = linkedAlerts.size / alerts.length
        features.escalation_rate = alerts.filter(item => Boolean(item.escalationPath)).length / alerts.length
        const dispositions = alerts.filter(item => Boolean(item.disposition))
        if (dispositions.length) {
          features.false_positive_rate_current = dispositions.filter(item => item.disposition === 'False Positive').length / dispositions.length
        }
        const acknowledgement = average(alerts.map(item => item.acknowledgementTimeMin))
        const investigationTime = average(alerts.map(item => item.investigationTimeMin))
        const closureTime = average(alerts.map(item => item.closureTimeMin))
        if (acknowledgement != null) features.mean_acknowledgment_time_min = acknowledgement
        if (investigationTime != null) features.mean_investigation_time_min = investigationTime
        if (closureTime != null) features.mean_closure_time_min = closureTime
      }
      if (cases.length) {
        const knownEvidence = cases.map(item => item.evidenceCount ?? item.evidenceAttachments).filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
        if (knownEvidence.length) {
          features.evidence_per_case_avg = average(knownEvidence)!
          features.cases_with_zero_evidence_pct = knownEvidence.filter(value => value === 0).length / knownEvidence.length
        }
        const knownReopened = cases.filter(item => Number.isFinite(item.reopenedCount))
        if (knownReopened.length) features.reopened_case_rate = knownReopened.filter(item => item.reopenedCount > 0).length / knownReopened.length
        const knownTemplate = cases.filter(item => typeof item.isTemplateReuse === 'number')
        if (knownTemplate.length) features.template_reuse_rate = knownTemplate.filter(item => item.isTemplateReuse === 1).length / knownTemplate.length
      }
      const coverageValues = coverage.map(item => item.observedCoverage ?? item.observed)
      const telemetryCoverage = average(coverageValues)
      if (telemetryCoverage != null) features.telemetry_coverage_pct = telemetryCoverage

      return { entity_id: entity.id, period, features }
    }))

    const payload = JSON.stringify({ entities: batchEntities })
    const { hostname, port } = parseUrl(ML_API_URL)

    const opt: http.RequestOptions = {
      hostname,
      port,
      path: '/evaluate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }

    const mlReq = http.request(opt, (mlRes) => {
      let data = ''
      mlRes.on('data', chunk => { data += chunk })
      mlRes.on('end', () => {
        try {
          const evalResults = JSON.parse(data)
          if ((mlRes.statusCode || 200) >= 400) {
            return res.status(mlRes.statusCode || 502).json({ success: false, error: { code: 'ML_EVALUATION_FAILED', message: 'ML evaluation request failed.' }, data: evalResults })
          }
          res.json({
            success: true,
            data: {
              period,
              fleetEvaluated: batchEntities.length,
              timestamp: new Date().toISOString(),
              results: evalResults
            }
          })
        } catch {
          res.status(500).json({ success: false, error: { code: 'ML_PARSE_ERROR', message: 'Failed to parse ML evaluation' } })
        }
      })
    })

    mlReq.on('error', err => {
      console.error('Fleet ML evaluation request failed:', err instanceof Error ? err.name : 'Unknown error')
      res.status(503).json({ success: false, error: { code: 'ML_UNAVAILABLE', message: 'The ML service is unavailable.' } })
    })

    mlReq.write(payload)
    mlReq.end()
  } catch (err: any) {
    console.error('Fleet ML evaluation failed:', err instanceof Error ? err.name : 'Unknown error')
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'The ML evaluation request could not be completed.' } })
  }
})

export default router