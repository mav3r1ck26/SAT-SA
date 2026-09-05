import { Router } from 'express'
import { EvidenceEvent } from '../models/EvidenceEvent'
import { Case } from '../models/Case'

const router = Router()

// Get evidence timeline for a case
router.get('/case/:caseId', async (req, res) => {
  try {
    const caseDoc = await Case.findOne({ id: req.params.caseId }).lean()
    if (!caseDoc) return res.status(404).json({ error: 'Case not found' })
    const timeline = await EvidenceEvent.find({ caseId: caseDoc.id }).sort({ eventTime: 1 }).lean()
    res.json({ case: caseDoc, timeline })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Search evidence by event/actor/asset
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query
    if (!q) return res.json([])
    const events = await EvidenceEvent.find({
      $or: [
        { event: { $regex: String(q), $options: 'i' } },
        { actor: { $regex: String(q), $options: 'i' } },
        { role: { $regex: String(q), $options: 'i' } }
      ]
    }).sort({ eventTime: -1 }).limit(100).lean()
    res.json(events)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router