import { Router } from 'express'
import {
  overviewKPIs, riskDistribution, detectExecutionGaps, detectBlindSpots,
  escalationAnalytics, alertAnalytics, investigationAnalytics, peerBenchmark,
  generateReviewQueue, recomputeAllRisks, persistFindings
} from '../services/analytics'

const router = Router()

// Overview KPIs
router.get('/overview', async (req, res) => {
  try {
    const [kpis, distribution] = await Promise.all([overviewKPIs(), riskDistribution()])
    res.json({ kpis, distribution })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Risk distribution
router.get('/risk-distribution', async (req, res) => {
  try { res.json(await riskDistribution()) }
  catch (err) { res.status(500).json({ error: err.message }) }
})

// Alert analytics
router.get('/alerts', async (req, res) => {
  try { res.json(await alertAnalytics()) }
  catch (err) { res.status(500).json({ error: err.message }) }
})

// Investigation analytics
router.get('/investigations', async (req, res) => {
  try { res.json(await investigationAnalytics()) }
  catch (err) { res.status(500).json({ error: err.message }) }
})

// Escalation analytics
router.get('/escalations', async (req, res) => {
  try { res.json(await escalationAnalytics()) }
  catch (err) { res.status(500).json({ error: err.message }) }
})

// Execution gaps
router.get('/gaps', async (req, res) => {
  try {
    const gaps = await detectExecutionGaps(req.query.entityId?.toString())
    res.json(gaps)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// Negative space / blind spots
router.get('/blind-spots', async (req, res) => {
  try { res.json(await detectBlindSpots(req.query.entityId?.toString())) }
  catch (err) { res.status(500).json({ error: err.message }) }
})

// Peer benchmarking
router.get('/benchmark/:entityId', async (req, res) => {
  try { res.json(await peerBenchmark(req.params.entityId)) }
  catch (err) { res.status(400).json({ error: err.message }) }
})

// Review prioritisation queue
router.get('/review-queue', async (req, res) => {
  try { res.json(await generateReviewQueue()) }
  catch (err) { res.status(500).json({ error: err.message }) }
})

// Recompute all risk scores
router.post('/recompute', async (req, res) => {
  try {
    await recomputeAllRisks()
    res.json({ success: true, message: 'All risk scores recomputed' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

export default router
