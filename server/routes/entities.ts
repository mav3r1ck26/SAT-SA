import { Router, Response } from 'express'
import { Entity } from '../models/Entity'
import { EntityMetric } from '../models/EntityMetric'

const router = Router()

function handleError(err: unknown, res: Response) {
  const message = err instanceof Error ? err.message : 'Unknown error'
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message } })
}

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
        riskScore: m?.riskScore ?? 50, prevRiskScore: m?.prevRiskScore ?? 50,
        executionGaps: m?.executionGapCount ?? 0, negativeSpace: m?.negativeSpaceCount ?? 0,
        peerDeviation: m?.peerDeviation ?? 'In Range', priority: m?.priority ?? 'Normal',
        status: e.assessmentStatus,
        threatDetection: m?.threatDetection ?? 50,
        investigation: m?.investigation ?? 50,
        escalation: m?.escalation ?? 50,
        incidentResponse: m?.incidentResponse ?? 50,
        securityOperations: m?.securityOperations ?? 50,
        governanceOversight: m?.governanceOversight ?? 50,
        operationalDiscipline: m?.operationalDiscipline ?? 50,
        cyberResilience: m?.cyberResilience ?? 50,
        dataCompleteness: e.dataCompleteness, telemetryCoverage: e.telemetryCoverage, lastSubmission: e.lastSubmission
      }
    })
    res.json({ success: true, data: result })
  } catch (err) { handleError(err, res) }
})

// Get single entity
router.get('/:id', async (req, res) => {
  try {
    const e = await Entity.findOne({ id: req.params.id }).lean()
    if (!e) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Entity not found' } })
    const m = await EntityMetric.findOne({ entityId: e.id, period: 'Q2 FY 2026-27' }).lean()
    res.json({ success: true, data: { ...e, metrics: m } })
  } catch (err) { handleError(err, res) }
})

// Create a new entity (with metrics)
router.post('/', async (req, res) => {
  try {
    const { id, name, sector, region, criticality, metrics } = req.body
    await Entity.create({ id, name, sector, region, criticality, dataCompleteness: req.body.dataCompleteness ?? 100, telemetryCoverage: req.body.telemetryCoverage ?? 100 })
    await EntityMetric.create({ entityId: id, period: 'Q2 FY 2026-27', ...(metrics || {}) })
    res.status(201).json({ success: true, data: { id } })
  } catch (err) { handleError(err, res) }
})

export default router