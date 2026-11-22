import { Router, Response, type Request } from 'express'
import { Types } from 'mongoose'
import { Report } from '../models/Report'
import { GeneratedReportRun } from '../models/GeneratedReportRun'
import { IngestionBatch } from '../models/IngestionBatch'
import { generateReport } from '../services/reports'
import { collectReportLineage } from '../services/reportLineage'
import { appendAuditEvent } from '../services/audit'
import { resolveAssessmentPeriod } from '../services/configuration'
import { safeErrorMessage } from '../services/errorHandling'

const router = Router()

function handleError(err: unknown, res: Response) {
  const status = typeof err === 'object' && err !== null && 'statusCode' in err ? Number(err.statusCode) : 500
  const message = safeErrorMessage(err, status)
  res.status(status).json({ success: false, error: { code: status === 400 ? 'INVALID_REPORT_INPUT' : 'INTERNAL_ERROR', message } })
}

// List report definitions
router.get('/', async (req, res) => {
  try {
    const reports = await Report.find().lean()
    res.json({ success: true, data: reports })
  } catch (err) { handleError(err, res) }
})

router.get('/history', async (req, res) => {
  try {
    const filter: Record<string, unknown> = {}
    if (typeof req.query.documentId === 'string') {
      if (!Types.ObjectId.isValid(req.query.documentId)) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_DOCUMENT_ID', message: 'The document identifier is invalid.' } })
      }
      filter['sourceDocuments.documentId'] = new Types.ObjectId(req.query.documentId)
    }
    if (req.user?.role === 'SOC Manager') {
      filter.entityIds = { $in: req.user.assignedEntityIds }
    } else if (typeof req.query.entityId === 'string') {
      filter.entityIds = req.query.entityId
    }
    const runs = await GeneratedReportRun.find(filter).sort({ generatedAt: -1 }).limit(100).lean()
    const latestByScope = new Map<string, string>()
    for (const run of runs) {
      const key = `${run.reportDefinitionId}\u0000${run.assessmentPeriod}\u0000${run.entityScope}`
      if (!latestByScope.has(key)) latestByScope.set(key, String(run._id))
    }
    const data = await Promise.all(runs
      .filter(run => canAccessReport(req, run))
      .map(async run => {
        const key = `${run.reportDefinitionId}\u0000${run.assessmentPeriod}\u0000${run.entityScope}`
        const newerDataQuery = {
          assessmentPeriods: run.assessmentPeriod,
          createdAt: { $gt: run.generatedAt },
          ...(run.entityScope !== 'All entities' ? { entityIds: run.entityScope } : {})
        }
        const newerDataAvailable = Boolean(await IngestionBatch.exists(newerDataQuery))
        return {
          ...run,
          id: String(run._id),
          isHistorical: latestByScope.get(key) !== String(run._id),
          isLatestAvailableData: !newerDataAvailable
        }
      }))
    res.json({ success: true, data })
  } catch (err) { handleError(err, res) }
})

router.get('/history/:runId', async (req, res) => {
  try {
    if (!Types.ObjectId.isValid(req.params.runId)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_REPORT_RUN_ID', message: 'The report run identifier is invalid.' } })
    }
    const run = await GeneratedReportRun.findById(req.params.runId).lean()
    if (!run) return res.status(404).json({ success: false, error: { code: 'REPORT_RUN_NOT_FOUND', message: 'The historical report was not found.' } })
    if (!canAccessReport(req, run)) {
      return res.status(403).json({ success: false, error: { code: 'REPORT_SCOPE_DENIED', message: 'You do not have permission to access this report.' } })
    }
    await appendAuditEvent({
      actor: authenticatedActor(req),
      action: 'Historical report accessed',
      actionCategory: 'Report',
      entityId: run.entityIds.length === 1 ? run.entityIds[0] : undefined,
      detail: `Report run ${String(run._id)}; definition ${run.reportDefinitionId}; period ${run.assessmentPeriod}.`,
      sessionId: req.sessionId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    })
    res.json({ success: true, data: { ...run, id: String(run._id) } })
  } catch (err) { handleError(err, res) }
})

// Generate a report
router.post('/:id/generate', async (req, res) => {
  try {
    const report = await Report.findOne({ id: req.params.id })
    if (!report) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Report not found' } })

    const period = await resolveAssessmentPeriod(req.body.period)
    const entityId = typeof req.body.entityId === 'string' ? req.body.entityId : undefined
    report.status = 'Generating'
    await report.save()

    let generated
    try {
      generated = await generateReport(report.id, entityId, period)
    } catch (error) {
      report.status = 'Failed'
      await report.save()
      throw error
    }
    report.status = 'Available'
    report.generatedAt = new Date()
    report.content = generated.data
    await report.save()

    const lineage = await collectReportLineage(period, report.id === 'RPT-01' ? entityId : undefined)
    const reportRun = await GeneratedReportRun.create({
      reportDefinitionId: report.id,
      name: generated.name,
      generatedAt: generated.generatedAt,
      assessmentPeriod: period,
      entityScope: report.id === 'RPT-01' && entityId ? entityId : 'All entities',
      entityIds: lineage.entityIds,
      sourceBatchIds: lineage.sourceBatchIds,
      sourceDocuments: lineage.sourceDocuments,
      lineageAvailable: lineage.lineageAvailable,
      content: generated.data
    })

    if (req.user) await appendAuditEvent({
      actor: req.user,
      action: 'Report Generated',
      actionCategory: 'Report',
      entityId,
      detail: `Generated ${report.name} for ${period}; run ${String(reportRun._id)}; ${lineage.sourceBatchIds.length} source batch(es).`,
      sessionId: req.sessionId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    })

    res.json({
      success: true,
      data: {
        ...generated,
        runId: String(reportRun._id),
        assessmentPeriod: period,
        entityScope: reportRun.entityScope,
        sourceBatchIds: reportRun.sourceBatchIds.map(String),
        sourceDocuments: reportRun.sourceDocuments
      }
    })
  } catch (err) { handleError(err, res) }
})

// Get generated report content
router.get('/:id', async (req, res) => {
  try {
    const report = await Report.findOne({ id: req.params.id }).lean()
    if (!report) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Report not found' } })
    res.json({ success: true, data: report })
  } catch (err) { handleError(err, res) }
})

function authenticatedActor(req: Request) {
  if (!req.user) throw Object.assign(new Error('Authentication is required.'), { statusCode: 401 })
  return req.user
}

function canAccessReport(
  req: Request,
  run: { entityScope: string; entityIds: string[] }
): boolean {
  const user = req.user
  if (user?.role !== 'SOC Manager') return true
  return run.entityScope !== 'All entities' &&
    run.entityIds.length > 0 &&
    run.entityIds.every(entityId => user.assignedEntityIds.includes(entityId))
}

export default router