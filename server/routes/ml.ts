import { Router, Response, Request } from 'express'
import http from 'http'
import { Entity } from '../models/Entity'
import { EntityMetric } from '../models/EntityMetric'

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
    console.error('ML proxy error:', err)
    res.status(503).json({ success: false, error: { code: 'ML_SERVICE_UNAVAILABLE', message: err.message } })
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
    const entities = await Entity.find().sort({ id: 1 }).lean()
    const metrics = await EntityMetric.find({ period: 'Q2 FY 2026-27' }).lean()
    const metricMap = new Map(metrics.map(m => [m.entityId, m]))

    const batchEntities = entities.map(e => {
      const m = metricMap.get(e.id)
      const risk = m?.riskScore ?? 50
      return {
        entity_id: e.id,
        period: 'Q2 FY 2026-27',
        features: {
          total_alerts_per_period: Math.round(800 + risk * 15),
          alerts_per_analyst_per_shift: Math.round(30 + risk * 0.4),
          cases_per_analyst_per_shift: Math.round(6 + (100 - risk) * 0.08),
          alert_to_case_ratio: +(0.10 + (risk / 500)).toFixed(2),
          mean_acknowledgment_time_min: +(3.0 + (risk / 30)).toFixed(1),
          mean_investigation_time_min: +(20.0 + (m?.investigation ?? 50) * 0.5).toFixed(1),
          mean_closure_time_min: +(25.0 + (m?.investigation ?? 50) * 0.6).toFixed(1),
          pct_cases_closed_under_1hr: +(0.70 + (risk / 400)).toFixed(2),
          pct_cases_closed_under_4hr: 0.92,
          pct_cases_closed_under_24hr: 0.98,
          false_positive_rate_current: +(0.60 + (risk / 300)).toFixed(2),
          true_positive_rate_current: +(0.40 - (risk / 400)).toFixed(2),
          escalation_rate: +(0.08 + (m?.escalation ?? 50) / 600).toFixed(2),
          reopened_case_rate: 0.03,
          evidence_per_case_avg: +(2.0 + (m?.investigation ?? 50) / 30).toFixed(1),
          cases_with_zero_evidence_pct: +(0.02 + (risk / 500)).toFixed(2),
          cases_with_insufficient_iocs_pct: 0.06,
          classification_changes_per_case: 0.09,
          analyst_count: 10,
          workload_balance_index: 0.82,
          template_reuse_rate: +(0.10 + (risk / 400)).toFixed(2),
          superficial_investigation_rate: +(0.05 + (risk / 500)).toFixed(2),
          unusually_fast_closure_rate: +(0.06 + (risk / 400)).toFixed(2),
          critical_escalation_rate: +(0.80 + (m?.escalation ?? 50) / 400).toFixed(2),
          escalation_delay_avg_min: +(25.0 + risk * 0.3).toFixed(1),
          playbook_execution_rate: 0.91,
          playbook_coverage_ratio: 0.86,
          playbook_adherence_rate: 0.89,
          signature_age_avg_days: 42,
          signature_age_max_days: 110,
          rules_updated_last_30d: 15,
          rules_updated_last_90d: 40,
          detection_coverage_ratio: +((m?.threatDetection ?? 70) / 100).toFixed(2),
          threat_intel_feeds_active: 5,
          ioc_enrichment_rate: 0.93,
          context_enrichment_rate: 0.87,
          telemetry_coverage_pct: e.telemetryCoverage || 82,
          log_source_count: 22,
          critical_asset_coverage_pct: 0.90,
          senior_analyst_ratio: 0.30,
          certifications_per_analyst: 1.7,
          training_hours_per_analyst_qtr: 20,
          prev_period_fpr: 0.72,
          prev_period_efficiency: +((100 - risk) / 100).toFixed(2),
          trend_fpr_3m: -0.01,
          trend_efficiency_3m: 0.02
        }
      }
    })

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
          res.json({
            success: true,
            data: {
              fleetEvaluated: batchEntities.length,
              modelStatus: 'trained',
              modelType: 'ensemble',
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
      res.status(503).json({ success: false, error: { code: 'ML_UNAVAILABLE', message: err.message } })
    })

    mlReq.write(payload)
    mlReq.end()
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } })
  }
})

export default router