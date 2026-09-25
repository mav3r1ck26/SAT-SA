import { Router, Response } from 'express'
import { EvidenceEvent } from '../models/EvidenceEvent'
import { Case } from '../models/Case'

const router = Router()

function handleError(err: unknown, res: Response) {
  const message = err instanceof Error ? err.message : 'Unknown error'
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message } })
}

// Get evidence timeline for a case or entity
router.get('/case/:caseId', async (req, res) => {
  try {
    const param = req.params.caseId
    let caseDoc = await Case.findOne({ $or: [{ id: param }, { entityId: param }] }).sort({ openedAt: -1 }).lean()
    let timeline: any[] = []
    if (caseDoc) {
      timeline = await EvidenceEvent.find({ caseId: caseDoc.id }).sort({ eventTime: 1 }).lean()
    }
    if (timeline.length === 0) {
      timeline = await EvidenceEvent.find({ entityId: param }).sort({ eventTime: 1 }).limit(20).lean()
    }
    if (!caseDoc && timeline.length === 0) {
      caseDoc = await Case.findOne().sort({ openedAt: -1 }).lean()
      if (caseDoc) {
        timeline = await EvidenceEvent.find({ caseId: caseDoc.id }).sort({ eventTime: 1 }).lean()
      }
    }
    res.json({ success: true, data: { case: caseDoc || null, timeline } })
  } catch (err) { handleError(err, res) }
})

router.get('/entity/:entityId', async (req, res) => {
  try {
    const timeline = await EvidenceEvent.find({ entityId: req.params.entityId }).sort({ eventTime: 1 }).limit(20).lean()
    res.json({ success: true, data: { timeline } })
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