import { Router, Response } from 'express'
import { Finding } from '../models/Finding'
import { detectExecutionGaps, persistFindings } from '../services/analytics'
import { appendAuditEvent } from '../services/audit'
import { resolveAssessmentPeriod } from '../services/configuration'
import { safeErrorMessage } from '../services/errorHandling'

const router = Router()

function handleError(err: unknown, res: Response) {
  const status = typeof err === 'object' && err !== null && 'statusCode' in err ? Number(err.statusCode) : 500
  const message = safeErrorMessage(err, status)
  res.status(status).json({ success: false, error: { code: status === 400 ? 'INVALID_PERIOD' : 'INTERNAL_ERROR', message } })
}

// List findings with filters
router.get('/', async (req, res) => {
  try {
    const { entityId, severity, status, searching } = req.query
    const filter: any = { period: await resolveAssessmentPeriod(req.query.period) }
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
    const period = await resolveAssessmentPeriod(req.body?.period)
    const gaps = await detectExecutionGaps(period, req.body?.entityId)
    await persistFindings(gaps)
    res.json({ success: true, data: { detected: gaps.length, gaps } })
  } catch (err) { handleError(err, res) }
})

// Review a finding (mark reviewed / confirm / dismiss)
router.post('/:id/review', async (req, res) => {
  try {
    const { status, note } = req.body
    if (!req.user) return res.status(401).json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Authentication required.' } })
    const f = await Finding.findOne({ id: req.params.id })
    if (!f) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Finding not found' } })
    f.status = status || f.status
    f.reviewedBy = req.user.displayName
    f.reviewedAt = new Date()
    if (note) f.examinerNote = note
    await f.save()

    // Audit log
    await appendAuditEvent({
      actor: req.user,
      action: 'Finding Reviewed',
      actionCategory: 'Finding',
      findingId: f.id,
      entityId: f.entityId,
      status: f.status,
      detail: note,
      sessionId: req.sessionId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    })

    res.json({ success: true, data: { finding: f } })
  } catch (err) { handleError(err, res) }
})

export default router