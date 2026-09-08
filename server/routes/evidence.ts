import { Router, Response } from 'express'
import { EvidenceEvent } from '../models/EvidenceEvent'
import { Case } from '../models/Case'

const router = Router()

function handleError(err: unknown, res: Response) {
  const message = err instanceof Error ? err.message : 'Unknown error'
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message } })
}

// Get evidence timeline for a case
router.get('/case/:caseId', async (req, res) => {
  try {
    const caseDoc = await Case.findOne({ id: req.params.caseId }).lean()
    if (!caseDoc) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Case not found' } })
    const timeline = await EvidenceEvent.find({ caseId: caseDoc.id }).sort({ eventTime: 1 }).lean()
    res.json({ success: true, data: { case: caseDoc, timeline } })
  } catch (err) { handleError(err, res) }
})

// Search evidence by event/actor/asset
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query
    if (!q) return res.json({ success: true, data: [] })
    const events = await EvidenceEvent.find({
      $or: [
        { event: { $regex: String(q), $options: 'i' } },
        { actor: { $regex: String(q), $options: 'i' } },
        { role: { $regex: String(q), $options: 'i' } }
      ]
    }).sort({ eventTime: -1 }).limit(100).lean()
    res.json({ success: true, data: events })
  } catch (err) { handleError(err, res) }
})

export default router