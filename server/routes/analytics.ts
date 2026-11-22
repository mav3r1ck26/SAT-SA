import { Router, Request, Response } from 'express'
import {
  overviewKPIs, riskDistribution, detectExecutionGaps, detectBlindSpots,
  escalationAnalytics, alertAnalytics, investigationAnalytics, peerBenchmark,
  generateReviewQueue, recomputeAllRisks, persistFindings,
  detectAnomalies, assessDataQuality, telemetryCoverageMatrix
} from '../services/analytics'
import { resolveAssessmentPeriod } from '../services/configuration'
import { safeErrorMessage } from '../services/errorHandling'

const router = Router()

async function timedAnalytics<T>(req: Request, operation: string, run: () => Promise<T>): Promise<T> {
  const startedAt = Date.now()
  try {
    return await run()
  } finally {
    console.info(JSON.stringify({
      event: 'analytics.execution',
      operation,
      durationMs: Date.now() - startedAt,
      ...(typeof req.query.entityId === 'string' ? { entityId: req.query.entityId } : {}),
      ...(typeof req.query.period === 'string' ? { assessmentPeriod: req.query.period } : {})
    }))
  }
}

function handleError(err: unknown, res: Response) {
  const status = typeof err === 'object' && err !== null && 'statusCode' in err ? Number(err.statusCode) : 500
  const message = safeErrorMessage(err, status)
  res.status(status).json({ success: false, error: { code: status === 400 ? 'INVALID_PERIOD' : 'INTERNAL_ERROR', message } })
}

// Overview KPIs
router.get('/overview', async (req, res) => {
  try {
    const period = await resolveAssessmentPeriod(req.query.period)
    const entityId = req.query.entityId?.toString()
    const [kpis, distribution] = await timedAnalytics(req, 'overview', () => Promise.all([overviewKPIs(period, entityId), riskDistribution(period, entityId)]))
    res.json({ success: true, data: { kpis, distribution } })
  } catch (err) { handleError(err, res) }
})

// Risk distribution
router.get('/risk-distribution', async (req, res) => {
  try { res.json({ success: true, data: await timedAnalytics(req, 'risk-distribution', async () => riskDistribution(await resolveAssessmentPeriod(req.query.period), req.query.entityId?.toString())) }) }
  catch (err) { handleError(err, res) }
})

// Alert analytics
router.get('/alerts', async (req, res) => {
  try { res.json({ success: true, data: await timedAnalytics(req, 'alerts', async () => alertAnalytics(await resolveAssessmentPeriod(req.query.period), req.query.entityId?.toString())) }) }
  catch (err) { handleError(err, res) }
})

// Investigation analytics
router.get('/investigations', async (req, res) => {
  try { res.json({ success: true, data: await timedAnalytics(req, 'investigations', async () => investigationAnalytics(await resolveAssessmentPeriod(req.query.period), req.query.entityId?.toString())) }) }
  catch (err) { handleError(err, res) }
})

// Escalation analytics
router.get('/escalations', async (req, res) => {
  try { res.json({ success: true, data: await timedAnalytics(req, 'escalations', async () => escalationAnalytics(await resolveAssessmentPeriod(req.query.period), req.query.entityId?.toString())) }) }
  catch (err) { handleError(err, res) }
})

// Execution gaps
router.get('/gaps', async (req, res) => {
  try {
    const period = await resolveAssessmentPeriod(req.query.period)
    const gaps = await timedAnalytics(req, 'gaps', () => detectExecutionGaps(period, req.query.entityId?.toString()))
    res.json({ success: true, data: gaps })
  } catch (err) { handleError(err, res) }
})

// Negative space / blind spots
router.get('/blind-spots', async (req, res) => {
  try {
    const period = await resolveAssessmentPeriod(req.query.period)
    res.json({ success: true, data: await timedAnalytics(req, 'blind-spots', () => detectBlindSpots(period, req.query.entityId?.toString())) })
  }
  catch (err) { handleError(err, res) }
})

// Dynamic Telemetry Coverage Matrix
router.get('/coverage-matrix', async (req, res) => {
  try {
    const period = await resolveAssessmentPeriod(req.query.period)
    res.json({ success: true, data: await timedAnalytics(req, 'coverage-matrix', () => telemetryCoverageMatrix(period, req.query.entityId?.toString())) })
  }
  catch (err) { handleError(err, res) }
})

// Anomalies
router.get('/anomalies', async (req, res) => {
  try {
    const period = await resolveAssessmentPeriod(req.query.period)
    const all = await timedAnalytics(req, 'anomalies', () => detectAnomalies(period, req.query.entityId?.toString()))
    const severity = req.query.severity?.toString()
    const type = req.query.type?.toString()
    const search = req.query.search?.toString().trim().toLowerCase()
    const filtered = all.filter(item =>
      (!severity || item.severity === severity) &&
      (!type || item.type === type) &&
      (!search || `${item.entityId} ${item.caseId || ''} ${item.type} ${item.description}`.toLowerCase().includes(search))
    )
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 50))
    const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
    const page = Math.min(pageCount, Math.max(1, Number(req.query.page) || 1))
    const summary = {
      total: filtered.length,
      volumeSpikes: filtered.filter(item => item.type === 'VOLUME_SPIKE').length,
      durationAnomalies: filtered.filter(item => item.type === 'DURATION_ANOMALY').length,
      lowEvidence: filtered.filter(item => item.type === 'LOW_EVIDENCE').length,
    }
    res.json({ success: true, data: { anomalies: filtered.slice((page - 1) * pageSize, page * pageSize), total: filtered.length, page, pageSize, pageCount, summary } })
  }
  catch (err) { handleError(err, res) }
})

// Data quality
router.get('/data-quality', async (req, res) => {
  try {
    const period = await resolveAssessmentPeriod(req.query.period)
    res.json({ success: true, data: await timedAnalytics(req, 'data-quality', () => assessDataQuality(period, req.query.entityId?.toString())) })
  }
  catch (err) { handleError(err, res) }
})

// Peer benchmarking
router.get('/benchmark/:entityId', async (req, res) => {
  try {
    const period = await resolveAssessmentPeriod(req.query.period)
    res.json({ success: true, data: await timedAnalytics(req, 'benchmark', () => peerBenchmark(req.params.entityId, period)) })
  }
  catch (err) { handleError(err, res) }
})

// Review prioritisation queue
router.get('/review-queue', async (req, res) => {
  try {
    const period = await resolveAssessmentPeriod(req.query.period)
    res.json({ success: true, data: await timedAnalytics(req, 'review-queue', () => generateReviewQueue(period, req.query.entityId?.toString())) })
  }
  catch (err) { handleError(err, res) }
})

// Recompute all risk scores
router.post('/recompute', async (req, res) => {
  try {
    await timedAnalytics(req, 'recompute', async () => recomputeAllRisks(await resolveAssessmentPeriod(req.body.period)))
    res.json({ success: true, message: 'All risk scores recomputed' })
  } catch (err) { handleError(err, res) }
})

export default router
