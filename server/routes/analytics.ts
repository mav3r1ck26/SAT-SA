import { Router, Response } from 'express'
import {
  overviewKPIs, riskDistribution, detectExecutionGaps, detectBlindSpots,
  escalationAnalytics, alertAnalytics, investigationAnalytics, peerBenchmark,
  generateReviewQueue, recomputeAllRisks, persistFindings,
  detectAnomalies, assessDataQuality
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

// Anomalies
router.get('/anomalies', async (req, res) => {
  try { res.json({ success: true, data: await detectAnomalies(req.query.entityId?.toString()) }) }
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