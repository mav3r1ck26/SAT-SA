import { Router, Response } from 'express'
import { Alert } from '../models/Alert'

const router = Router()

function handleError(err: unknown, res: Response) {
  const message = err instanceof Error ? err.message : 'Unknown error'
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message } })
}

// List alerts with filters & pagination
router.get('/', async (req, res) => {
  try {
    const { entityId, severity, category, status, limit = 100, offset = 0 } = req.query
    const filter: any = {}
    if (entityId) filter.entityId = entityId
    if (severity) filter.severity = severity
    if (category) filter.category = category
    if (status) filter.status = status

    const total = await Alert.countDocuments(filter)
    const alerts = await Alert.find(filter)
      .sort({ createdAt: -1 })
      .skip(Number(offset))
      .limit(Number(limit))
      .lean()

    res.json({ success: true, data: { total, alerts } })
  } catch (err) { handleError(err, res) }
})

// Drill-down: get alert with its case and evidence timeline
router.get('/:id/timeline', async (req, res) => {
  try {
    const alert = await Alert.findOne({ id: req.params.id }).lean()
    if (!alert) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Alert not found' } })
    res.json({ success: true, data: alert })
  } catch (err) { handleError(err, res) }
})

// Create an alert (ingested data)
router.post('/', async (req, res) => {
  try {
    await Alert.create(req.body)
    res.status(201).json({ success: true, message: 'Alert created' })
  } catch (err) { handleError(err, res) }
})

export default router