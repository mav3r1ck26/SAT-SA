import { Router, Response } from 'express'
import { Case } from '../models/Case'
import { EvidenceEvent } from '../models/EvidenceEvent'
import { resolveAssessmentPeriod } from '../services/configuration'
import { safeErrorMessage } from '../services/errorHandling'

const router = Router()

function handleError(err: unknown, res: Response) {
  const status = typeof err === 'object' && err !== null && 'statusCode' in err ? Number(err.statusCode) : 500
  const message = safeErrorMessage(err, status)
  res.status(status).json({ success: false, error: { code: status === 400 ? 'INVALID_PERIOD' : 'INTERNAL_ERROR', message } })
}

// List cases
router.get('/', async (req, res) => {
  try {
    const { entityId, behaviour, status, limit = 100, offset = 0 } = req.query
    const filter: any = { period: await resolveAssessmentPeriod(req.query.period) }
    if (entityId) filter.entityId = entityId
    if (behaviour) filter.behaviour = behaviour
    if (status) filter.status = status

    const total = await Case.countDocuments(filter)
    const cases = await Case.find(filter).sort({ openedAt: -1 }).skip(Number(offset)).limit(Number(limit)).lean()
    res.json({ success: true, data: { total, cases } })
  } catch (err) { handleError(err, res) }
})

// Get case with evidence timeline
router.get('/:id/evidence', async (req, res) => {
  try {
    const caseDoc = await Case.findOne({ id: req.params.id, period: await resolveAssessmentPeriod(req.query.period) }).lean()
    if (!caseDoc) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Case not found' } })
    const timeline = await EvidenceEvent.find({ caseId: caseDoc.id, period: caseDoc.period }).sort({ eventTime: 1 }).lean()
    res.json({ success: true, data: { ...caseDoc, timeline } })
  } catch (err) { handleError(err, res) }
})

export default router