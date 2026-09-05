import { Router } from 'express'
import { AuditLog } from '../models/AuditLog'

const router = Router()

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
    res.json(records)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Export audit trail (returns raw records for CSV generation)
router.get('/export', async (req, res) => {
  try {
    const records = await AuditLog.find().sort({ timestamp: -1 }).limit(500).lean()
    res.json(records)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router