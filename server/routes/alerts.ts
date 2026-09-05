import { Router } from 'express'
import { Alert } from '../models/Alert'

const router = Router()

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

    res.json({ total, alerts })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Drill-down: get alert with its case and evidence timeline
router.get('/:id/timeline', async (req, res) => {
  try {
    const alert = await Alert.findOne({ id: req.params.id }).lean()
    if (!alert) return res.status(404).json({ error: 'Alert not found' })
    res.json(alert)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Create an alert (ingested data)
router.post('/', async (req, res) => {
  try {
    await Alert.create(req.body)
    res.status(201).json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
