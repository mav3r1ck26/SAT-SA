import { Router, Response } from 'express'
import { Case } from '../models/Case'
import { EvidenceEvent } from '../models/EvidenceEvent'

const router = Router()

function handleError(err: unknown, res: Response) {
  const message = err instanceof Error ? err.message : 'Unknown error'
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message } })
}

// List cases
router.get('/', async (req, res) => {
  try {
    const { entityId, behaviour, status, limit = 100, offset = 0 } = req.query
    const filter: any = {}
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
    const caseDoc = await Case.findOne({ id: req.params.id }).lean()
    if (!caseDoc) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Case not found' } })
    const timeline = await EvidenceEvent.find({ caseId: caseDoc.id }).sort({ eventTime: 1 }).lean()
    res.json({ success: true, data: { ...caseDoc, timeline } })
  } catch (err) { handleError(err, res) }
})

export default router