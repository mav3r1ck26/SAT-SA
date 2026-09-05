import { Router } from 'express'
import { Entity } from '../models/Entity'
import { EntityMetric } from '../models/EntityMetric'

const router = Router()

// List entities with risk metrics
router.get('/', async (req, res) => {
  try {
    const { sector, criticality, search } = req.query
    const filter: any = {}
    if (sector) filter.sector = sector
    if (criticality) filter.criticality = criticality
    if (search) {
      filter.$or = [
        { id: { $regex: String(search), $options: 'i' } },
        { name: { $regex: String(search), $options: 'i' } }
      ]
    }
    const entities = await Entity.find(filter).sort({ _id: 1 }).lean()
    const metrics = await EntityMetric.find({ period: 'Q2 FY 2026-27' }).lean()
    const metricMap = new Map(metrics.map(m => [m.entityId, m]))

    const result = entities.map(e => {
      const m = metricMap.get(e.id)
      return {
        id: e.id, name: e.name, sector: e.sector, region: e.region, criticality: e.criticality,
        riskScore: m?.riskScore ?? 50, prevRiskScore: m?.prevRiskScore,
        executionGaps: m?.executionGaps ?? 0, negativeSpace: m?.negativeSpace ?? 0,
        peerDeviation: m?.peerDeviation ?? 'Low', priority: m?.priority ?? 'Normal',
        status: e.assessmentStatus, detection: m?.detection, investigation: m?.investigation,
        escalation: m?.escalation, operations: m?.operations, governance: m?.governance, resilience: m?.resilience,
        dataCompleteness: e.dataCompleteness, telemetryCoverage: e.telemetryCoverage, lastSubmission: e.lastSubmission
      }
    })
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get single entity
router.get('/:id', async (req, res) => {
  try {
    const e = await Entity.findOne({ id: req.params.id }).lean()
    if (!e) return res.status(404).json({ error: 'Entity not found' })
    const m = await EntityMetric.findOne({ entityId: e.id, period: 'Q2 FY 2026-27' }).lean()
    res.json({ ...e, metrics: m })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Create a new entity (with metrics)
router.post('/', async (req, res) => {
  try {
    const { id, name, sector, region, criticality, metrics } = req.body
    await Entity.create({ id, name, sector, region, criticality, dataCompleteness: req.body.dataCompleteness ?? 100, telemetryCoverage: req.body.telemetryCoverage ?? 100 })
    await EntityMetric.create({ entityId: id, period: 'Q2 FY 2026-27', ...(metrics || {}) })
    res.status(201).json({ success: true, id })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
