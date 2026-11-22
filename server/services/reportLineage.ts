import { Alert } from '../models/Alert'
import { Case } from '../models/Case'
import { DocumentIngestion } from '../models/DocumentIngestion'
import { GeneratedReportRun } from '../models/GeneratedReportRun'
import { IngestionBatch } from '../models/IngestionBatch'
import { Report } from '../models/Report'
import { UploadedDocument } from '../models/UploadedDocument'

export async function collectReportLineage(period: string, entityId?: string) {
  const recordScope = { period, ...(entityId ? { entityId } : {}), ingestionBatchId: { $exists: true } }
  const [alertBatchIds, caseBatchIds, alertEntities, caseEntities] = await Promise.all([
    Alert.distinct('ingestionBatchId', recordScope),
    Case.distinct('ingestionBatchId', recordScope),
    Alert.distinct('entityId', { period, ...(entityId ? { entityId } : {}) }),
    Case.distinct('entityId', { period, ...(entityId ? { entityId } : {}) })
  ])
  const sourceBatchIds = [...new Set([...alertBatchIds, ...caseBatchIds]
    .filter(batchId => batchId && typeof batchId === 'object')
    .map(String))]
  const batches = sourceBatchIds.length ? await IngestionBatch.find({ _id: { $in: sourceBatchIds } }).lean() : []
  const linkedBatches = batches.filter(batch => batch.uploadedDocumentId && batch.documentIngestionId)
  const documentIds = [...new Set(linkedBatches.map(batch => String(batch.uploadedDocumentId)))]
  const ingestionIds = [...new Set(linkedBatches.map(batch => String(batch.documentIngestionId)))]
  const [documents, ingestions] = await Promise.all([
    documentIds.length ? UploadedDocument.find({ _id: { $in: documentIds } }).select({ originalFilename: 1 }).lean() : [],
    ingestionIds.length ? DocumentIngestion.find({ _id: { $in: ingestionIds } }).select({ originalFilename: 1, category: 1 }).lean() : []
  ])
  const documentById = new Map(documents.map(document => [String(document._id), document]))
  const ingestionById = new Map(ingestions.map(ingestion => [String(ingestion._id), ingestion]))
  const sourceDocuments = linkedBatches.flatMap(batch => {
    const document = documentById.get(String(batch.uploadedDocumentId))
    const ingestion = ingestionById.get(String(batch.documentIngestionId))
    if (!document || !ingestion) return []
    return [{
      documentId: batch.uploadedDocumentId,
      documentIngestionId: batch.documentIngestionId,
      batchId: batch._id,
      filename: ingestion.originalFilename || document.originalFilename,
      category: batch.bundleCategory || ingestion.category || 'Unknown'
    }]
  })
  const entityIds = [...new Set([...alertEntities, ...caseEntities].filter(Boolean).map(String))]
  return {
    sourceBatchIds: batches.map(batch => batch._id),
    sourceDocuments,
    entityIds: entityId ? [entityId] : entityIds,
    lineageAvailable: batches.every(batch => Boolean(batch.uploadedDocumentId && batch.documentIngestionId))
  }
}

export async function initializeGeneratedReportHistory(): Promise<void> {
  await GeneratedReportRun.init()
  const legacyReports = await Report.find({
    status: 'Available',
    generatedAt: { $type: 'date' },
    content: { $type: 'object' }
  }).lean()
  for (const report of legacyReports) {
    const content = report.content as Record<string, any> | undefined
    const period = typeof content?.assessmentPeriod === 'string' ? content.assessmentPeriod : undefined
    if (!period || !report.generatedAt) continue
    const exists = await GeneratedReportRun.exists({
      reportDefinitionId: report.id,
      generatedAt: report.generatedAt,
      legacySnapshot: true
    })
    if (exists) continue
    const entityId = typeof content.entity?.id === 'string' ? content.entity.id : undefined
    await GeneratedReportRun.create({
      reportDefinitionId: report.id,
      name: report.name,
      generatedAt: report.generatedAt,
      assessmentPeriod: period,
      entityScope: entityId || 'All entities',
      entityIds: entityId ? [entityId] : [],
      sourceBatchIds: [],
      sourceDocuments: [],
      lineageAvailable: false,
      legacySnapshot: true,
      content
    })
  }
}
