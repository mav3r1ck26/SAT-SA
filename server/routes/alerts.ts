import { Router, Response } from 'express'
import { Alert } from '../models/Alert'
import { resolveAssessmentPeriod } from '../services/configuration'
import { safeErrorMessage } from '../services/errorHandling'

const router = Router()

function handleError(err: unknown, res: Response) {
  const status = typeof err === 'object' && err !== null && 'statusCode' in err ? Number(err.statusCode) : 500
  const message = safeErrorMessage(err, status)
  res.status(status).json({ success: false, error: { code: status === 400 ? 'INVALID_PERIOD' : 'INTERNAL_ERROR', message } })
}

// List alerts with filters & pagination
router.get('/', async (req, res) => {
  try {
    const { entityId, severity, category, status, limit = 100, offset = 0 } = req.query
    const filter: any = { period: await resolveAssessmentPeriod(req.query.period) }
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
    const alert = await Alert.findOne({ id: req.params.id, period: await resolveAssessmentPeriod(req.query.period) }).lean()
    if (!alert) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Alert not found' } })
    res.json({ success: true, data: alert })
  } catch (err) { handleError(err, res) }
})

// Create an alert (ingested data)
router.post('/', async (req, res) => {
  try {
    const period = await resolveAssessmentPeriod(req.body.period)
    await Alert.create({ ...req.body, period, dataProvenance: 'submitted' })
    res.status(201).json({ success: true, message: 'Alert created' })
  } catch (err) { handleError(err, res) }
})

export default router