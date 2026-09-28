import { Router, Response } from 'express'
import { AuditLog } from '../models/AuditLog'

const router = Router()

function handleError(err: unknown, res: Response) {
  const message = err instanceof Error ? err.message : 'Unknown error'
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message } })
}

// List audit trail with filters
router.get('/', async (req, res) => {
  try {
    const { user, action, entityId, search, limit = 100 } = req.query
    const filter: any = {}
    if (user) filter.user = user
    if (action) filter.action = action
    if (entityId) filter.entityId = entityId
    if (search) {
      filter.$or = [
        { user: { $regex: String(search), $options: 'i' } },
        { action: { $regex: String(search), $options: 'i' } },
        { finding: { $regex: String(search), $options: 'i' } }
      ]
    }
    const records = await AuditLog.find(filter).sort({ timestamp: -1 }).limit(Number(limit)).lean()
    res.json({ success: true, data: records })
  } catch (err) { handleError(err, res) }
})

// Export audit trail (returns raw records for CSV generation)
router.get('/export', async (req, res) => {
  try {
    const records = await AuditLog.find().sort({ timestamp: -1 }).limit(500).lean()
    res.json({ success: true, data: records })
  } catch (err) { handleError(err, res) }
})

// Create an audit entry
router.post('/', async (req, res) => {
  try {
    const { user, action, entityId, findingId, detail, status, actionCategory } = req.body
    const record = await AuditLog.create({
      user: user || 'Examiner',
      action: action || 'Manual Action',
      actionCategory: actionCategory || 'Finding',
      entityId,
      findingId,
      detail: detail || '',
      status: status || 'Success',
      timestamp: new Date()
    })
    res.status(201).json({ success: true, data: record })
  } catch (err) { handleError(err, res) }
})

export default router