import { Router, Response } from 'express'
import {
  overviewKPIs, riskDistribution, detectExecutionGaps, detectBlindSpots,
  escalationAnalytics, alertAnalytics, investigationAnalytics, peerBenchmark,
  generateReviewQueue, recomputeAllRisks, persistFindings,
  detectAnomalies, assessDataQuality, telemetryCoverageMatrix
} from '../services/analytics'

const router = Router()

function handleError(err: unknown, res: Response) {
  const message = err instanceof Error ? err.message : 'Unknown error'
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message } })
}

// Overview KPIs
router.get('/overview', async (req, res) => {
  try {
    const [kpis, distribution] = await Promise.all([overviewKPIs(), riskDistribution()])
    res.json({ success: true, data: { kpis, distribution } })
  } catch (err) { handleError(err, res) }
})

// Risk distribution
router.get('/risk-distribution', async (req, res) => {
  try { res.json({ success: true, data: await riskDistribution() }) }
  catch (err) { handleError(err, res) }
})

// Alert analytics
router.get('/alerts', async (req, res) => {
  try { res.json({ success: true, data: await alertAnalytics() }) }
  catch (err) { handleError(err, res) }
})

// Investigation analytics
router.get('/investigations', async (req, res) => {
  try { res.json({ success: true, data: await investigationAnalytics() }) }
  catch (err) { handleError(err, res) }
})

// Escalation analytics
router.get('/escalations', async (req, res) => {
  try { res.json({ success: true, data: await escalationAnalytics() }) }
  catch (err) { handleError(err, res) }
})

// Execution gaps
router.get('/gaps', async (req, res) => {
  try {
    const gaps = await detectExecutionGaps(req.query.entityId?.toString())
    res.json({ success: true, data: gaps })
  } catch (err) { handleError(err, res) }
})

// Negative space / blind spots
router.get('/blind-spots', async (req, res) => {
  try { res.json({ success: true, data: await detectBlindSpots(req.query.entityId?.toString()) }) }
  catch (err) { handleError(err, res) }
})

// Dynamic Telemetry Coverage Matrix
router.get('/coverage-matrix', async (req, res) => {
  try { res.json({ success: true, data: await telemetryCoverageMatrix(req.query.entityId?.toString()) }) }
  catch (err) { handleError(err, res) }
})

// Anomalies
router.get('/anomalies', async (req, res) => {
  try {
    const all = await detectAnomalies(req.query.entityId?.toString())
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
      total: all.length,
      volumeSpikes: all.filter(item => item.type === 'VOLUME_SPIKE').length,
      durationAnomalies: all.filter(item => item.type === 'DURATION_ANOMALY').length,
      lowEvidence: all.filter(item => item.type === 'LOW_EVIDENCE').length,
    }
    res.json({ success: true, data: { anomalies: filtered.slice((page - 1) * pageSize, page * pageSize), total: filtered.length, page, pageSize, pageCount, summary } })
  }
  catch (err) { handleError(err, res) }
})

// Data quality
router.get('/data-quality', async (req, res) => {
  try { res.json({ success: true, data: await assessDataQuality(req.query.entityId?.toString()) }) }
  catch (err) { handleError(err, res) }
})

// Peer benchmarking
router.get('/benchmark/:entityId', async (req, res) => {
  try { res.json({ success: true, data: await peerBenchmark(req.params.entityId) }) }
  catch (err) { handleError(err, res) }
})

// Review prioritisation queue
router.get('/review-queue', async (req, res) => {
  try { res.json({ success: true, data: await generateReviewQueue() }) }
  catch (err) { handleError(err, res) }
})

// Recompute all risk scores
router.post('/recompute', async (req, res) => {
  try {
    await recomputeAllRisks()
    res.json({ success: true, message: 'All risk scores recomputed' })
  } catch (err) { handleError(err, res) }
})

export default router
