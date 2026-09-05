import { Router } from 'express'
import { Case } from '../models/Case'
import { EvidenceEvent } from '../models/EvidenceEvent'

const router = Router()

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
    res.json({ total, cases })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get case with evidence timeline
router.get('/:id/evidence', async (req, res) => {
  try {
    const caseDoc = await Case.findOne({ id: req.params.id }).lean()
    if (!caseDoc) return res.status(404).json({ error: 'Case not found' })
    const timeline = await EvidenceEvent.find({ caseId: caseDoc.id }).sort({ eventTime: 1 }).lean()
    res.json({ ...caseDoc, timeline })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
