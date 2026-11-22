import { Router, Response } from 'express'
import { EvidenceEvent } from '../models/EvidenceEvent'
import { Case } from '../models/Case'
import { Finding } from '../models/Finding'
import { Alert } from '../models/Alert'
import { resolveAssessmentPeriod } from '../services/configuration'
import { safeErrorMessage } from '../services/errorHandling'

const router = Router()

function handleError(err: unknown, res: Response) {
  const status = typeof err === 'object' && err !== null && 'statusCode' in err ? Number(err.statusCode) : 500
  const message = safeErrorMessage(err, status)
  res.status(status).json({ success: false, error: { code: status === 400 ? 'INVALID_PERIOD' : 'INTERNAL_ERROR', message } })
}

// Return alert-specific evidence and its linked case for review-queue drilldown.
router.get('/alert/:alertId', async (req, res) => {
  try {
    const alert = await Alert.findOne({ id: req.params.alertId }).lean()
    if (!alert) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Alert not found' } })
    const [timeline, linkedCase] = await Promise.all([
      EvidenceEvent.find({ alertId: alert.id, period: alert.period }).sort({ eventTime: 1 }).limit(100).lean(),
      Case.findOne({ alertId: alert.id }).lean()
    ])
    res.json({ success: true, data: { alert, linkedCase, timeline } })
  } catch (err) { handleError(err, res) }
})

// Return the evidence events linked to a specific supervisory finding.
router.get('/finding/:findingId', async (req, res) => {
  try {
    const finding = await Finding.findOne({ id: req.params.findingId }).lean()
    if (!finding) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Finding not found' } })

    let timeline = await EvidenceEvent.find({ findingId: finding.id, period: finding.period }).sort({ eventTime: 1 }).limit(200).lean()
    let caseIds: string[] = [...new Set(timeline.map(event => event.caseId).filter((id): id is string => Boolean(id)))]
    const references = finding.evidenceReferences || []
    let [supportingCases, supportingAlerts] = await Promise.all([
      Case.find({ id: { $in: references }, entityId: finding.entityId, period: finding.period })
        .select({ id: 1, entityId: 1, period: 1, alertId: 1, openedAt: 1, closedAt: 1, durationMin: 1, investigationDepth: 1, evidenceCount: 1, evidenceAttachments: 1, isTemplateReuse: 1, escalationRecorded: 1 })
        .limit(100).lean(),
      Alert.find({ id: { $in: references }, entityId: finding.entityId, period: finding.period })
        .select({ id: 1, entityId: 1, period: 1, category: 1, asset: 1, severity: 1, createdAt: 1, escalationPath: 1, escalated: 1, escalationRequired: 1, disposition: 1 })
        .limit(100).lean()
    ])
    if (!timeline.length && !supportingCases.length && !supportingAlerts.length) {
      const title = finding.title.toLowerCase()
      const filter: Record<string, unknown> = { entityId: finding.entityId, period: finding.period }
      if (title.includes('repeated') || title.includes('template')) filter.isTemplateReuse = 1
      else if (title.includes('escalation')) filter.escalationRecorded = false
      else if (title.includes('rapid closure')) filter.durationMin = { $lte: 60 }

      supportingCases = await Case.find(filter).sort({ openedAt: -1 }).limit(4)
        .select({ id: 1, entityId: 1, period: 1, alertId: 1, openedAt: 1, closedAt: 1, durationMin: 1, investigationDepth: 1, evidenceCount: 1, evidenceAttachments: 1, isTemplateReuse: 1, escalationRecorded: 1 })
        .lean()
      if (!supportingCases.length) {
        supportingCases = await Case.find({ entityId: finding.entityId, period: finding.period }).sort({ openedAt: -1 }).limit(4)
          .select({ id: 1, entityId: 1, period: 1, alertId: 1, openedAt: 1, closedAt: 1, durationMin: 1, investigationDepth: 1, evidenceCount: 1, evidenceAttachments: 1, isTemplateReuse: 1, escalationRecorded: 1 })
          .lean()
      }
      if (!supportingCases.length && title.includes('escalation')) {
        supportingAlerts = await Alert.find({ entityId: finding.entityId, period: finding.period, severity: 'Critical', escalationPath: { $exists: false } })
          .sort({ createdAt: -1 }).limit(100)
          .select({ id: 1, entityId: 1, period: 1, category: 1, asset: 1, severity: 1, createdAt: 1, escalationPath: 1, escalated: 1, escalationRequired: 1, disposition: 1 })
          .lean()
      }
      caseIds = supportingCases.map(item => item.id)
      if (caseIds.length) {
        timeline = await EvidenceEvent.find({ entityId: finding.entityId, period: finding.period, caseId: { $in: caseIds } }).sort({ eventTime: 1 }).limit(200).lean()
      }
    }

    caseIds = [...new Set([...caseIds, ...supportingCases.map(item => item.id)])]
    res.json({
      success: true,
      data: {
        finding,
        caseIds,
        timeline,
        supportingRecords: {
          cases: supportingCases,
          alerts: supportingAlerts,
          total: Math.max(finding.evidenceCount || 0, references.length, supportingCases.length + supportingAlerts.length)
        }
      }
    })
  } catch (err) { handleError(err, res) }
})

// Get evidence timeline for a case or entity
router.get('/case/:caseId', async (req, res) => {
  try {
    const param = req.params.caseId
    let caseDoc = await Case.findOne({ $or: [{ id: param }, { entityId: param }] }).sort({ openedAt: -1 }).lean()
    let timeline: any[] = []
    if (caseDoc) {
      timeline = await EvidenceEvent.find({ caseId: caseDoc.id, period: caseDoc.period }).sort({ eventTime: 1 }).lean()
    }
    if (timeline.length === 0) {
      timeline = await EvidenceEvent.find({ entityId: param, period: await resolveAssessmentPeriod(req.query.period) }).sort({ eventTime: 1 }).limit(20).lean()
    }
    res.json({ success: true, data: { case: caseDoc || null, timeline } })
  } catch (err) { handleError(err, res) }
})

router.get('/entity/:entityId', async (req, res) => {
  try {
    const period = await resolveAssessmentPeriod(req.query.period)
    const timeline = await EvidenceEvent.find({ entityId: req.params.entityId, period }).sort({ eventTime: 1 }).limit(100).lean()
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
