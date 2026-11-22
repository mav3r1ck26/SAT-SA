import { Router, Response } from 'express'
import { AuditLog } from '../models/AuditLog'
import { appendAuditEvent, verifyAuditChain } from '../services/audit'
import { requireRoles } from '../middleware/auth'
import { safeErrorMessage } from '../services/errorHandling'

const router = Router()

function handleError(err: unknown, res: Response) {
  const message = safeErrorMessage(err, 500)
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

router.get('/verify', requireRoles('Super Admin', 'Supervisor', 'Auditor'), async (_req, res) => {
  try {
    const result = await verifyAuditChain()
    res.status(result.valid ? 200 : 409).json({ success: result.valid, data: result })
  } catch (err) { handleError(err, res) }
})

router.post('/', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Authentication required.' } })
    if (typeof req.body?.action !== 'string' || req.body.action.length > 200) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_AUDIT_EVENT', message: 'A valid action is required.' } })
    }
    const record = await appendAuditEvent({
      actor: req.user,
      action: req.body.action,
      actionCategory: ['Finding', 'Evidence', 'Entity', 'Report', 'Data', 'Analytics', 'Model', 'Configuration', 'User', 'System'].includes(req.body.actionCategory) ? req.body.actionCategory : 'System',
      entityId: typeof req.body.entityId === 'string' ? req.body.entityId : undefined,
      findingId: typeof req.body.findingId === 'string' ? req.body.findingId : undefined,
      detail: typeof req.body.detail === 'string' ? req.body.detail.slice(0, 1000) : undefined,
      status: 'Success',
      sessionId: req.sessionId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    })
    res.status(201).json({ success: true, data: record })
  } catch (err) { handleError(err, res) }
})

export default router