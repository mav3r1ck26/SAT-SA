import { Router, Response } from 'express'
import { Finding } from '../models/Finding'
import { AuditLog } from '../models/AuditLog'
import { detectExecutionGaps, persistFindings } from '../services/analytics'

const router = Router()

function handleError(err: unknown, res: Response) {
  const message = err instanceof Error ? err.message : 'Unknown error'
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message } })
}

// List findings with filters
router.get('/', async (req, res) => {
  try {
    const { entityId, severity, status, searching } = req.query
    const filter: any = {}
    if (entityId) filter.entityId = entityId
    if (severity) filter.severity = severity
    if (status) filter.status = status
    if (searching) filter.$or = [{ id: { $regex: String(searching), $options: 'i' } }, { title: { $regex: String(searching), $options: 'i' } }]

    const findings = await Finding.find(filter).sort({ createdAt: -1 }).lean()
    res.json({ success: true, data: findings })
  } catch (err) { handleError(err, res) }
})

// Run execution gap detection and persist generated findings
router.post('/detect', async (req, res) => {
  try {
    const gaps = await detectExecutionGaps(req.body?.entityId)
    await persistFindings(gaps)
    res.json({ success: true, data: { detected: gaps.length, gaps } })
  } catch (err) { handleError(err, res) }
})

// Review a finding (mark reviewed / confirm / dismiss)
router.post('/:id/review', async (req, res) => {
  try {
    const { status, reviewer, note } = req.body
    const f = await Finding.findOne({ id: req.params.id })
    if (!f) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Finding not found' } })
    f.status = status || f.status
    f.reviewedBy = reviewer || f.reviewedBy
    f.reviewedAt = new Date()
    if (note) f.examinerNote = note
    await f.save()

    // Audit log
    await AuditLog.create({ user: reviewer || 'Examiner', action: 'Finding Reviewed', findingId: f.id, entityId: f.entityId, status: f.status as any })

    res.json({ success: true, data: { finding: f } })
  } catch (err) { handleError(err, res) }
})

export default router