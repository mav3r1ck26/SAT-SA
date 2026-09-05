import { Router } from 'express'
import { Finding } from '../models/Finding'
import { AuditLog } from '../models/AuditLog'
import { detectExecutionGaps, persistFindings } from '../services/analytics'

const router = Router()

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
    res.json(findings)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Run execution gap detection and persist generated findings
router.post('/detect', async (req, res) => {
  try {
    const gaps = await detectExecutionGaps(req.body?.entityId)
    await persistFindings(gaps)
    res.json({ detected: gaps.length, gaps })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Review a finding (mark reviewed / confirm / dismiss)
router.post('/:id/review', async (req, res) => {
  try {
    const { status, reviewer, note } = req.body
    const f = await Finding.findOne({ id: req.params.id })
    if (!f) return res.status(404).json({ error: 'Finding not found' })
    f.status = status || f.status
    f.reviewedBy = reviewer || f.reviewedBy
    f.reviewedAt = new Date()
    if (note) f.examinerNote = note
    await f.save()

    // Audit log
    await AuditLog.create({ user: reviewer || 'Examiner', action: 'Finding Reviewed', finding: f.id, entityId: f.entityId, status: f.status })

    res.json({ success: true, finding: f })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
