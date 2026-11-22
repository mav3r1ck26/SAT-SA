import { Router, Response, type Request } from 'express'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import { createHash, randomUUID } from 'crypto'
import { fileURLToPath } from 'url'
import { Types } from 'mongoose'
import { IngestionBatch } from '../models/IngestionBatch'
import { IngestionRecord, type IngestionRecordType } from '../models/IngestionRecord'
import { UploadedDocument } from '../models/UploadedDocument'
import { DocumentIngestion } from '../models/DocumentIngestion'
import { GeneratedReportRun } from '../models/GeneratedReportRun'
import { Alert } from '../models/Alert'
import { Case } from '../models/Case'
import { Entity } from '../models/Entity'
import { TelemetryCoverage } from '../models/TelemetryCoverage'
import { requireRoles } from '../middleware/auth'
import { isSocCoverageRecord, isSocFeatureVector, runIngestionInference } from '../services/ingestionInference'
import { detectExecutionGaps, persistFindings } from '../services/analytics'
import { isAssessmentPeriod, normalizeAssessmentPeriod } from '../services/assessmentPeriods'
import { appendAuditEvent } from '../services/audit'
import { INGESTION_LIMITS, IngestionValidationError, parseCSV as parseCSVWithLimits, validateRecordLimits } from '../services/ingestionValidation'
import { classifyDocument, recordMatchesBundleCategory } from '../services/documentClassification'
import { DOCUMENT_BUNDLE_CATEGORIES, type DocumentBundleCategory } from '../../shared/ingestionCategories'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadDir = path.join(__dirname, '..', '..', 'data', 'uploads')
const documentStorageDir = path.join(uploadDir, 'documents')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })
if (!fs.existsSync(documentStorageDir)) fs.mkdirSync(documentStorageDir, { recursive: true })
const upload = multer({
  storage: multer.diskStorage({ destination: uploadDir, filename: (_r, file, cb) => cb(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`) }),
  limits: { files: 20, fileSize: INGESTION_LIMITS.maxUploadBytes, fields: 10, fieldSize: 1024, parts: 30 },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase()
    if (file.originalname.length > 255 || !['.csv', '.json'].includes(extension)) {
      callback(Object.assign(new Error('Only CSV and JSON files with a filename under 255 characters are accepted.'), { statusCode: 400 }))
      return
    }
    callback(null, true)
  }
})

const router = Router()
const documentAccess = requireRoles('Super Admin', 'Supervisor', 'Examiner', 'SOC Manager')

function handleError(err: unknown, res: Response) {
  const typedError = err as { statusCode?: number; code?: string } | null
  const statusCode = Number(typedError?.statusCode)
  const multerStatus = typedError?.code === 'LIMIT_FILE_SIZE' ? 413 : typedError?.code?.startsWith('LIMIT_') ? 400 : 500
  const status = Number.isInteger(statusCode) && statusCode >= 400 && statusCode < 500 ? statusCode : multerStatus
  if (status === 500) console.error('[ingestion] Request failed:', err instanceof Error ? err.name : 'Unknown error')
  const message = status < 500 && err instanceof Error ? err.message : 'The ingestion request could not be completed.'
  const code = status === 413 ? 'UPLOAD_TOO_LARGE' : status === 400 ? 'INVALID_INGESTION' : 'INTERNAL_ERROR'
  res.status(status).json({ success: false, error: { code, message } })
}

// Get current data quality summary
router.get('/quality', async (req, res) => {
  try {
    const recent = await IngestionBatch.find().sort({ createdAt: -1 }).limit(20).lean()
    // Older uploads used a generic source label. Keep their original filename
    // visible in the stream without rewriting historical database records.
    const batches = recent.map(batch => {
      const publicBatch = { ...batch }
      delete publicBatch.fileHash
      publicBatch.source = ['manual ingestion', 'file', 'upload'].includes(batch.source.toLowerCase())
        ? (batch.filename || 'Filename unavailable')
        : batch.source
      return publicBatch
    })
    const totalAlerts = await Alert.countDocuments()
    const totalCases = await Case.countDocuments()
    res.json({ success: true, data: { batches, totals: { alerts: totalAlerts, cases: totalCases } } })
  } catch (err) { handleError(err, res) }
})

// List available preloaded sample datasets
router.get('/samples', async (req, res) => {
  try {
    const samplesDir = path.join(__dirname, '..', '..', 'data', 'testing_datasets')
    if (!fs.existsSync(samplesDir)) return res.json({ success: true, data: [] })
    const files = fs.readdirSync(samplesDir).filter(f => f.endsWith('.json') || f.endsWith('.csv'))
    const list = files.map(filename => {
      const stats = fs.statSync(path.join(samplesDir, filename))
      let title = filename
      let description = 'Testing dataset'
      let type = 'Alerts'
      if (filename.includes('scada')) {
        title = 'SCADA / OT Grid Breach Telemetry'
        description = '120 critical SCADA alerts testing rapid closure (<3m) and exfiltration gaps'
        type = 'SIEM JSON'
      } else if (filename.includes('corebanking')) {
        title = 'Core Banking Syslog CEF Anomaly Stream'
        description = '150 CEF alerts testing statutory CERT-In 6h delay breach and repetitive templates'
        type = 'CEF CSV'
      } else if (filename.includes('powergrid')) {
        title = 'Power Grid Forensic Audit Cases'
        description = '100 case records testing investigation depth, attachments, and closure rigor'
        type = 'Cases CSV'
      } else if (filename.includes('ml_batch')) {
        title = 'SOC Efficiency ML Evaluation Batch'
        description = '22 quarterly feature vectors across 11 CSEs for ML inference benchmarking'
        type = 'ML CSV'
      } else if (filename.includes('blindspot')) {
        title = 'Negative Space & Blind Spot Matrix'
        description = 'Sector-wide sensor blackout and suppressed telemetry audit matrix'
        type = 'Matrix JSON'
      }
      return {
        id: filename,
        filename,
        title,
        description,
        type,
        sizeKb: Math.max(1, Math.round(stats.size / 1024))
      }
    })
    res.json({ success: true, data: list })
  } catch (err) { handleError(err, res) }
})

// Ingest a sample bundle directly by filename
router.post('/load-sample', async (req, res) => {
  let reservedBatchId: any
  try {
    const { filename } = req.body
    if (!filename) return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Filename required' } })
    const samplesDir = path.join(__dirname, '..', '..', 'data', 'testing_datasets')
    const filePath = path.join(samplesDir, path.basename(filename))
    if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Sample bundle not found' } })

    const content = fs.readFileSync(filePath, 'utf8')
    const ext = path.extname(filename).toLowerCase()
    let records: any[] = []
    if (ext === '.json') {
      const parsed = JSON.parse(content)
      records = Array.isArray(parsed) ? parsed : (parsed.records || parsed.alerts || parsed.cases || [parsed])
    } else if (ext === '.csv') {
      records = parseCSV(content)
    }

    const fileHash = await getFileHash(filePath)
    await IngestionBatch.init()
    const existing = await IngestionBatch.findOne({ fileHash }).select({ _id: 1 }).lean()
    if (existing) return res.status(409).json({ success: false, error: { code: 'DUPLICATE_BATCH', message: 'A file with the same hash is already present.' } })
    const batch = await IngestionBatch.create({
      source: 'Test Dataset: ' + filename,
      filename,
      fileHash,
      status: 'processing',
      analyticsStatus: 'pending'
    })
    reservedBatchId = batch._id
    const result = await ingestDataset(records, 'Test Dataset: ' + filename, filename, batch, req.body.period)
    const analytics = await refreshIngestionFindings(result.analyticsScope)
    await IngestionBatch.updateOne({ _id: result.batch._id }, {
      $set: { analyticsStatus: analytics.status, ...(analytics.error ? { analyticsError: analytics.error } : {}) }
    })
    result.batch.analyticsStatus = analytics.status
    result.batch.analyticsError = analytics.error
    if (req.user) await appendAuditEvent({
      actor: req.user,
      action: 'Sample ingestion completed',
      actionCategory: 'Data',
      detail: `Sample batch ${result.batch.id}; records received ${result.total}; status ${result.batch.status}.`,
      sessionId: req.sessionId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    })
    const { analyticsScope: _analyticsScope, ...publicResult } = result
    res.json({ success: result.persistenceStatus !== 'failed', data: publicResult })
  } catch (err) {
    if (reservedBatchId) {
      try {
        const message = err instanceof Error ? err.message : 'Sample ingestion failed.'
        await IngestionBatch.updateOne(
          { _id: reservedBatchId },
          { $set: { status: 'failed', analyticsStatus: 'failed', analyticsError: message, warnings: [message] } }
        )
      } catch (statusError) {
        console.error('[ingestion] Could not update failed sample batch status:', statusError instanceof Error ? statusError.name : 'Unknown error')
      }
    }
    handleError(err, res)
  }
})

router.post('/documents/classify', documentAccess, upload.single('file'), async (req, res) => {
  const file = req.file
  if (!file) return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Select a CSV or JSON document to classify.' } })
  try {
    const result = await classifyUploadedDocument(file, authenticatedActor(req), req.body.period, req)
    res.status(201).json({ success: true, data: result })
  } catch (error) {
    handleError(error, res)
  } finally {
    await removeTemporaryUpload(file.path)
  }
})

router.post('/documents/:documentId/classify', documentAccess, async (req, res) => {
  try {
    if (!Types.ObjectId.isValid(req.params.documentId)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_DOCUMENT_ID', message: 'The document identifier is invalid.' } })
    }
    const document = await UploadedDocument.findById(req.params.documentId)
    if (!document) return res.status(404).json({ success: false, error: { code: 'DOCUMENT_NOT_FOUND', message: 'The document was not found.' } })
    const storedPath = getStoredDocumentPath(document.storageKey)
    const classification = await classifyStoredDocument(document, storedPath, authenticatedActor(req), req.body.period, req)
    res.status(201).json({ success: true, data: classification })
  } catch (error) {
    handleError(error, res)
  }
})

router.post('/documents/instances/:instanceId/confirm', documentAccess, async (req, res) => {
  try {
    const actor = authenticatedActor(req)
    if (!Types.ObjectId.isValid(req.params.instanceId)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INGESTION_ID', message: 'The document ingestion identifier is invalid.' } })
    }
    const instance = await DocumentIngestion.findById(req.params.instanceId)
    if (!instance) return res.status(404).json({ success: false, error: { code: 'INGESTION_NOT_FOUND', message: 'The document ingestion was not found.' } })
    if (instance.status !== 'Awaiting User Confirmation') {
      return res.status(409).json({ success: false, error: { code: 'CONFIRMATION_NOT_AVAILABLE', message: 'This document ingestion is not awaiting category confirmation.' } })
    }

    const category = req.body.category as DocumentBundleCategory
    if (!DOCUMENT_BUNDLE_CATEGORIES.includes(category)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_BUNDLE_CATEGORY', message: 'Select one of the supported document categories.' } })
    }
    if (!instance.compatibleCategories.includes(category)) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'INCOMPATIBLE_BUNDLE_CATEGORY',
          message: `This document does not contain compatible records for ${category}.`,
          details: { compatibleCategories: instance.compatibleCategories, missingFields: instance.missingFields, incompatibleFields: instance.incompatibleFields }
        }
      })
    }
    const period = normalizeAssessmentPeriod(typeof req.body.period === 'string' ? req.body.period : instance.assessmentPeriod || '')
    if (!isAssessmentPeriod(period)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_ASSESSMENT_PERIOD', message: 'Select a supported assessment period before ingesting records.' } })
    }

    const document = await UploadedDocument.findById(instance.documentId)
    if (!document) return res.status(404).json({ success: false, error: { code: 'DOCUMENT_NOT_FOUND', message: 'The original document is no longer available.' } })
    const records = parseDocumentAtPath(getStoredDocumentPath(document.storageKey), instance.originalFilename)
    const categoryRecords = records.filter(record => recordMatchesBundleCategory(record, category))
    if (!categoryRecords.length) {
      return res.status(422).json({ success: false, error: { code: 'NO_CATEGORY_RECORDS', message: `No records in this document match ${category}.` } })
    }
    if (!(await enforceDocumentEntityScope(req, categoryRecords, res))) return

    const existing = await DocumentIngestion.find({
      _id: { $ne: instance._id },
      documentId: instance.documentId,
      category,
      status: { $in: ['Validating', 'Processing'] }
    }).select({ _id: 1 }).lean()
    if (existing.length) {
      return res.status(409).json({ success: false, error: { code: 'CATEGORY_INGESTION_IN_PROGRESS', message: 'An ingestion for this document and category is already in progress.' } })
    }
    const previousCompleted = await DocumentIngestion.findOne({
      _id: { $ne: instance._id },
      documentId: instance.documentId,
      category,
      status: { $in: ['Completed', 'Completed with Warnings'] }
    }).sort({ createdAt: -1 }).lean()
    const reprocess = req.body.reprocess === true
    if (previousCompleted && !reprocess) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_CATEGORY_ASSIGNMENT',
          message: `This document has already been processed as ${category}. Confirm intentional reprocessing to create a new ingestion instance.`,
          details: { existingIngestionId: String(previousCompleted._id), category }
        }
      })
    }

    instance.category = category
    instance.assessmentPeriod = period
    instance.confirmedBy = actor.username
    instance.selectedAt = new Date()
    instance.reprocess = reprocess
    instance.status = 'Validating'
    instance.errorMessage = undefined
    instance.warnings = []
    await instance.save()

    const selectedClassification = classifyDocument(instance.originalFilename, categoryRecords)
    instance.missingFields = selectedClassification.missingFields
    instance.incompatibleFields = selectedClassification.incompatibleFields
    instance.classificationReason = selectedClassification.reason
    instance.classificationConfidence = selectedClassification.confidence
    instance.entityIds = await resolveDocumentEntityIds(categoryRecords)
    await instance.save()
    await appendAuditEvent({
      actor,
      action: instance.recommendedCategory === category ? 'Document category confirmed' : 'Document category changed',
      actionCategory: 'Data',
      detail: `Document ${String(document._id)}; category ${category}; ingestion ${String(instance._id)}.`,
      sessionId: req.sessionId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    })
    const excludedRecords = records.length - categoryRecords.length
    const result = await executeDocumentIngestion(instance, document, categoryRecords, req, excludedRecords)
    const { analyticsScope: _analyticsScope, ...publicResult } = result
    res.json({
      success: true,
      data: {
        ...publicResult,
        batch: toPublicBatch(result.batch),
        documentIngestion: instance.toObject(),
        category,
        excludedRecords
      }
    })
  } catch (error) {
    handleError(error, res)
  }
})

router.post('/documents/instances/:instanceId/retry', documentAccess, async (req, res) => {
  try {
    const actor = authenticatedActor(req)
    if (!Types.ObjectId.isValid(req.params.instanceId)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INGESTION_ID', message: 'The document ingestion identifier is invalid.' } })
    }
    const instance = await DocumentIngestion.findById(req.params.instanceId)
    if (!instance) return res.status(404).json({ success: false, error: { code: 'INGESTION_NOT_FOUND', message: 'The document ingestion was not found.' } })
    if (!['Failed', 'Completed with Warnings'].includes(instance.status) || !instance.category || !instance.assessmentPeriod) {
      return res.status(409).json({ success: false, error: { code: 'INGESTION_NOT_RETRYABLE', message: 'Only a failed or warning-state confirmed ingestion can be retried.' } })
    }
    const document = await UploadedDocument.findById(instance.documentId)
    if (!document) return res.status(404).json({ success: false, error: { code: 'DOCUMENT_NOT_FOUND', message: 'The original document is no longer available.' } })
    const allRecords = parseDocumentAtPath(getStoredDocumentPath(document.storageKey), instance.originalFilename)
    const records = allRecords.filter(record => recordMatchesBundleCategory(record, instance.category!))
    if (!records.length) return res.status(422).json({ success: false, error: { code: 'NO_CATEGORY_RECORDS', message: `No records in this document match ${instance.category}.` } })
    if (!(await enforceDocumentEntityScope(req, records, res))) return

    const active = await DocumentIngestion.exists({
      _id: { $ne: instance._id },
      documentId: instance.documentId,
      category: instance.category,
      status: { $in: ['Validating', 'Processing'] }
    })
    if (active) return res.status(409).json({ success: false, error: { code: 'CATEGORY_INGESTION_IN_PROGRESS', message: 'An ingestion for this document and category is already in progress.' } })

    instance.status = 'Validating'
    instance.retryCount += 1
    instance.errorMessage = undefined
    await instance.save()
    await appendAuditEvent({
      actor,
      action: 'Ingestion retry initiated',
      actionCategory: 'Data',
      detail: `Document ingestion ${String(instance._id)}; retry ${instance.retryCount}; category ${instance.category}.`,
      sessionId: req.sessionId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    })
    const result = await executeDocumentIngestion(instance, document, records, req)
    const { analyticsScope: _analyticsScope, ...publicResult } = result
    res.json({ success: true, data: { ...publicResult, batch: toPublicBatch(result.batch), documentIngestion: instance.toObject() } })
  } catch (error) {
    handleError(error, res)
  }
})

router.get('/documents', documentAccess, async (req, res) => {
  try {
    const documents = await UploadedDocument.find().sort({ uploadedAt: -1 }).lean()
    const ids = documents.map(document => document._id)
    const [instances, reportRuns] = await Promise.all([
      DocumentIngestion.find({ documentId: { $in: ids } }).sort({ createdAt: -1 }).lean(),
      GeneratedReportRun.find({ 'sourceDocuments.documentId': { $in: ids } }).select({
        _id: 1, reportDefinitionId: 1, name: 1, generatedAt: 1, assessmentPeriod: 1, entityScope: 1
      }).sort({ generatedAt: -1 }).lean()
    ])
    const visibleDocuments = filterDocumentsForUser(req, documents, instances)
    const data = visibleDocuments.map(document => {
      const documentInstances = instances.filter(instance => String(instance.documentId) === String(document._id))
      const associatedReports = reportRuns.filter(report => report.sourceDocuments.some(source => String(source.documentId) === String(document._id)))
      const batches = documentInstances.flatMap(instance => instance.batchIds || (instance.batchId ? [instance.batchId] : []))
      return {
        id: String(document._id),
        originalFilename: document.originalFilename,
        fileType: document.extension.slice(1).toUpperCase(),
        fileHash: document.fileHash,
        uploadedAt: document.uploadedAt,
        uploadedBy: document.uploadedBy,
        categories: [...new Set(documentInstances.map(instance => instance.category).filter(Boolean))],
        assessmentPeriods: [...new Set(documentInstances.map(instance => instance.assessmentPeriod).filter(Boolean))],
        entityIds: [...new Set(documentInstances.flatMap(instance => instance.entityIds || []))],
        status: documentInstances[0]?.status || 'Uploaded',
        processedRecords: documentInstances.reduce((sum, instance) => sum + instance.recordsProcessed, 0),
        rejectedRecords: documentInstances.reduce((sum, instance) => sum + instance.rejectedRecords, 0),
        ingestionIds: documentInstances.map(instance => String(instance._id)),
        batchIds: [...new Set(batches.map(String))],
        reportCount: associatedReports.length
      }
    })
    res.json({ success: true, data })
  } catch (error) {
    handleError(error, res)
  }
})

router.get('/documents/:documentId/download', documentAccess, async (req, res) => {
  try {
    if (!Types.ObjectId.isValid(req.params.documentId)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_DOCUMENT_ID', message: 'The document identifier is invalid.' } })
    }
    const document = await UploadedDocument.findById(req.params.documentId).lean()
    if (!document) return res.status(404).json({ success: false, error: { code: 'DOCUMENT_NOT_FOUND', message: 'The document was not found.' } })
    const instances = await DocumentIngestion.find({ documentId: document._id }).select({ entityIds: 1, uploadedBy: 1 }).lean()
    if (!canAccessDocument(req, document, instances)) {
      return res.status(403).json({ success: false, error: { code: 'DOCUMENT_SCOPE_DENIED', message: 'You do not have permission to download this document.' } })
    }
    const storedPath = getStoredDocumentPath(document.storageKey)
    if (!fs.existsSync(storedPath)) return res.status(404).json({ success: false, error: { code: 'DOCUMENT_FILE_NOT_FOUND', message: 'The retained original file is unavailable.' } })
    await appendAuditEvent({
      actor: authenticatedActor(req),
      action: 'Document downloaded',
      actionCategory: 'Data',
      detail: `Document ${String(document._id)}; ${document.originalFilename}.`,
      sessionId: req.sessionId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    })
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.download(storedPath, document.originalFilename)
  } catch (error) {
    handleError(error, res)
  }
})

router.get('/documents/:documentId', documentAccess, async (req, res) => {
  try {
    if (!Types.ObjectId.isValid(req.params.documentId)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_DOCUMENT_ID', message: 'The document identifier is invalid.' } })
    }
    const document = await UploadedDocument.findById(req.params.documentId).lean()
    if (!document) return res.status(404).json({ success: false, error: { code: 'DOCUMENT_NOT_FOUND', message: 'The document was not found.' } })
    const instances = await DocumentIngestion.find({ documentId: document._id }).sort({ createdAt: -1 }).lean()
    if (!canAccessDocument(req, document, instances)) {
      return res.status(403).json({ success: false, error: { code: 'DOCUMENT_SCOPE_DENIED', message: 'You do not have permission to view this document.' } })
    }
    const batchIds = [...new Set(instances.flatMap(instance => instance.batchIds || (instance.batchId ? [instance.batchId] : [])).map(String))]
    const [batches, reports] = await Promise.all([
      IngestionBatch.find({ _id: { $in: batchIds } }).sort({ createdAt: -1 }).lean(),
      GeneratedReportRun.find({ 'sourceDocuments.documentId': document._id }).sort({ generatedAt: -1 }).select({
        _id: 1, reportDefinitionId: 1, name: 1, generatedAt: 1, assessmentPeriod: 1, entityScope: 1
      }).lean()
    ])
    const visibleInstances = filterInstancesForUser(req, instances)
    res.json({
      success: true,
      data: {
        id: String(document._id),
        originalFilename: document.originalFilename,
        fileType: document.extension.slice(1).toUpperCase(),
        fileHash: document.fileHash,
        sizeBytes: document.sizeBytes,
        uploadedAt: document.uploadedAt,
        uploadedBy: document.uploadedBy,
        ingestionHistory: visibleInstances.map(instance => ({
          ...instance,
          batchDetails: batches.filter(batch => String(batch.documentIngestionId) === String(instance._id)),
          reports: reports.filter(report => report.sourceDocuments.some(source =>
            String(source.documentIngestionId) === String(instance._id)
          ))
        }))
      }
    })
  } catch (error) {
    handleError(error, res)
  }
})

// Upload & validate a data file (CSV/JSON)
router.post('/upload', upload.fields([{ name: 'files', maxCount: 20 }, { name: 'file', maxCount: 20 }]), async (req, res) => {
  try {
    const uploaded = req.files as { files?: Express.Multer.File[]; file?: Express.Multer.File[] } | undefined
    const files = [...(uploaded?.files || []), ...(uploaded?.file || [])]
    if (!files.length) return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'No files uploaded' } })

    const fileResults: any[] = []
    for (const file of files) {
      let fileHash: string
      let batch: any
      try {
        fileHash = await getFileHash(file.path)
        // Build the unique index before checking/claiming the hash so concurrent uploads cannot both pass.
        await IngestionBatch.init()
        const existing = await IngestionBatch.findOne({ fileHash }).select({ _id: 1 }).lean()
        if (existing) {
          await removeTemporaryUpload(file.path)
          fileResults.push({ success: false, fileName: file.originalname, duplicate: true, error: 'A file with the same hash is already present' })
          continue
        }
        batch = await IngestionBatch.create({
          source: file.originalname,
          filename: file.originalname,
          fileHash,
          recordsReceived: 0,
          validRecords: 0,
          persistedRecords: 0,
          sourceRecordsStored: 0,
          status: 'processing',
          analyticsStatus: 'pending',
          qualityPct: 0,
          warnings: [],
          mlInference: { status: 'processing', source: 'parsing', inputRecords: 0, evaluatedEntities: 0 }
        })
      } catch (error) {
        if (isDuplicateHashError(error)) {
          await removeTemporaryUpload(file.path)
          fileResults.push({ success: false, fileName: file.originalname, duplicate: true, error: 'A file with the same hash is already present' })
          continue
        }
        const message = error instanceof Error ? error.message : 'Unable to hash or register uploaded file.'
        await removeTemporaryUpload(file.path)
        fileResults.push({ success: false, fileName: file.originalname, error: message })
        continue
      }

      try {
        const records = parseUploadedFile(file)
        const result = await ingestDataset(records, file.originalname, file.originalname, batch, req.body.period)
        if (req.user) await appendAuditEvent({
          actor: req.user,
          action: 'File ingestion completed',
          actionCategory: 'Data',
          detail: `Batch ${result.batch.id}; records received ${result.total}; status ${result.batch.status}.`,
          sessionId: req.sessionId,
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        })
        fileResults.push({ ...result, batch: toPublicBatch(result.batch), success: result.persistenceStatus !== 'failed', fileName: file.originalname })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to process uploaded file.'
        try {
          const latest = await IngestionBatch.findById(batch._id)
          const hasStoredRecords = Boolean(latest?.sourceRecordsStored || latest?.persistedRecords)
          await IngestionBatch.updateOne(
            { _id: batch._id },
            {
              $set: {
                status: 'failed',
                warnings: [message],
                analyticsStatus: 'failed',
                analyticsError: message,
                mlInference: { status: 'failed', source: 'none', inputRecords: latest?.recordsReceived || 0, evaluatedEntities: 0, error: message, completedAt: new Date() }
              },
              ...(!hasStoredRecords ? { $unset: { fileHash: 1 } } : {})
            }
          )
        } catch { /* Keep the original file error visible even if status persistence also fails. */ }
        const failedBatch = await IngestionBatch.findById(batch._id).lean().catch(() => null)
        fileResults.push({ success: false, fileName: file.originalname, batch: toPublicBatch(failedBatch), error: message })
      } finally {
        await removeTemporaryUpload(file.path)
      }
    }

    const analytics = await refreshIngestionFindings(fileResults
      .filter(result => result.success)
      .flatMap(result => result.analyticsScope || []))
    for (const result of fileResults) {
      const batchId = result.batch?._id
      if (!batchId) continue
      const analyticsStatus = analytics.status
      await IngestionBatch.updateOne({ _id: batchId }, {
        $set: { analyticsStatus, ...(analytics.error ? { analyticsError: analytics.error } : {}) }
      })
      result.batch.analyticsStatus = analyticsStatus
      result.batch.analyticsError = analytics.error
      delete result.analyticsScope
    }

    const inserted = fileResults.reduce((sum, result) => sum + (result.inserted || 0), 0)
    const persistedRecords = fileResults.reduce((sum, result) => sum + (result.persistedRecords || 0), 0)
    const telemetryRecordsStored = fileResults.reduce((sum, result) => sum + (result.telemetryRecordsStored || 0), 0)
    const sourceRecordsStored = fileResults.reduce((sum, result) => sum + (result.sourceRecordsStored || 0), 0)
    const validRecords = fileResults.reduce((sum, result) => sum + (result.validRecords || 0), 0)
    const totalRecords = fileResults.reduce((sum, result) => sum + (result.total || 0), 0)
    const failedFiles = fileResults.filter(result => !result.success).length
    const partialFiles = fileResults.filter(result => result.batch?.status === 'partial' || result.persistenceStatus === 'partial').length
    res.json({
      success: failedFiles === 0,
      data: { files: fileResults, fileCount: files.length, failedFiles, partialFiles, inserted, persistedRecords, telemetryRecordsStored, sourceRecordsStored, validRecords, totalRecords }
    })
  } catch (err) { handleError(err, res) }
})

router.post('/batches/:batchId/reprocess', async (req, res) => {
  try {
    if (!Types.ObjectId.isValid(req.params.batchId)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_BATCH_ID', message: 'The ingestion batch ID is invalid.' } })
    }

    const batch = await IngestionBatch.findById(req.params.batchId)
    if (!batch) return res.status(404).json({ success: false, error: { code: 'BATCH_NOT_FOUND', message: 'The ingestion batch was not found.' } })

    const retryableEntityWarning = batch.warnings.length === 1 && /unknown or inconsistent entity ID/.test(batch.warnings[0])
    if (batch.status !== 'partial' || batch.persistedRecords !== 0 || batch.telemetryRecordsStored !== 0 ||
      batch.sourceRecordsStored === 0 || !retryableEntityWarning) {
      return res.status(409).json({
        success: false,
        error: { code: 'BATCH_NOT_REPROCESSABLE', message: 'Only batches rejected solely because their entities were not registered can be reprocessed.' }
      })
    }

    const sourceRecords = await IngestionRecord.find({ batchId: batch._id }).sort({ recordIndex: 1 }).lean()
    if (!sourceRecords.length) {
      return res.status(409).json({ success: false, error: { code: 'SOURCE_RECORDS_UNAVAILABLE', message: 'The retained source records for this batch are unavailable.' } })
    }
    const records = sourceRecords.map(sourceRecord => {
      const record = { ...(sourceRecord.recordData as Record<string, any>) }
      delete record.entityResolutionError
      delete record.validationError
      return record
    })
    const entityIds = [...new Set(records
      .map(record => String(record.entityId || record.entity_id || '').trim())
      .filter(Boolean))]
    const registeredEntities = await Entity.find({ id: { $in: entityIds } }).select({ id: 1 }).lean()
    const registeredIds = new Set(registeredEntities.map(entity => entity.id))
    const unregisteredIds = entityIds.filter(id => !registeredIds.has(id))
    if (unregisteredIds.length) {
      return res.status(409).json({
        success: false,
        error: { code: 'ENTITIES_NOT_REGISTERED', message: `Register these entities before retrying: ${unregisteredIds.join(', ')}.` }
      })
    }

    const claimedBatch = await IngestionBatch.findOneAndUpdate(
      { _id: batch._id, status: 'partial', persistedRecords: 0, telemetryRecordsStored: 0 },
      { $set: { status: 'processing', analyticsStatus: 'processing' } },
      { returnDocument: 'after' }
    )
    if (!claimedBatch) {
      return res.status(409).json({ success: false, error: { code: 'BATCH_ALREADY_PROCESSING', message: 'This batch has already changed or is being reprocessed.' } })
    }

    let result: Awaited<ReturnType<typeof ingestDataset>>
    try {
      result = await ingestDataset(records, batch.source, batch.filename || batch.source, claimedBatch)
    } catch (error) {
      await IngestionBatch.updateOne(
        { _id: claimedBatch._id, status: 'processing' },
        { $set: { status: 'partial', analyticsStatus: 'failed', analyticsError: 'Batch reprocessing failed.' } }
      )
      throw error
    }

    const analytics = await refreshIngestionFindings(result.analyticsScope)
    await IngestionBatch.updateOne({ _id: result.batch._id }, {
      $set: { analyticsStatus: analytics.status, ...(analytics.error ? { analyticsError: analytics.error } : {}) }
    })
    result.batch.analyticsStatus = analytics.status
    result.batch.analyticsError = analytics.error
    if (req.user) await appendAuditEvent({
      actor: req.user,
      action: 'Ingestion batch reprocessed',
      actionCategory: 'Data',
      detail: `Batch ${result.batch.id}; status ${result.batch.status}.`,
      sessionId: req.sessionId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    })
    const { analyticsScope: _analyticsScope, ...publicResult } = result
    res.json({ success: result.persistenceStatus !== 'failed', data: { ...publicResult, batch: toPublicBatch(result.batch) } })
  } catch (err) { handleError(err, res) }
})

// Ingest from API (JSON payload)
router.post('/api', async (req, res) => {
  try {
    const records = req.body.records || req.body
    if (!Array.isArray(records)) return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Records must be an array' } })
    const result = await ingestDataset(records, 'API', null, undefined, req.body.period)
    const analytics = await refreshIngestionFindings(result.analyticsScope)
    await IngestionBatch.updateOne({ _id: result.batch._id }, {
      $set: { analyticsStatus: analytics.status, ...(analytics.error ? { analyticsError: analytics.error } : {}) }
    })
    result.batch.analyticsStatus = analytics.status
    result.batch.analyticsError = analytics.error
    if (req.user) await appendAuditEvent({
      actor: req.user,
      action: 'API ingestion completed',
      actionCategory: 'Data',
      detail: `Batch ${result.batch.id}; records received ${result.total}; status ${result.batch.status}.`,
      sessionId: req.sessionId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    })
    const { analyticsScope: _analyticsScope, ...publicResult } = result
    res.status(result.persistenceStatus === 'failed' ? 500 : 200).json({ success: result.persistenceStatus !== 'failed', data: publicResult })
  } catch (err) { handleError(err, res) }
})

// ---- Helpers ----

function authenticatedActor(req: Request) {
  if (!req.user) throw Object.assign(new Error('Authentication is required.'), { statusCode: 401 })
  return req.user
}

function getStoredDocumentPath(storageKey: string): string {
  if (!/^[a-f0-9]{64}$/.test(storageKey)) {
    throw Object.assign(new Error('The retained document reference is invalid.'), { statusCode: 500 })
  }
  return path.join(documentStorageDir, storageKey)
}

async function classifyUploadedDocument(
  file: Express.Multer.File,
  actor: NonNullable<Request['user']>,
  period: unknown,
  req: Request
) {
  const fileHash = await getFileHash(file.path)
  let createdStorageFile = false
  const storageKey = fileHash
  const storedPath = getStoredDocumentPath(storageKey)
  try {
    await fs.promises.copyFile(file.path, storedPath, fs.constants.COPYFILE_EXCL)
    createdStorageFile = true
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
  }
  if (await getFileHash(storedPath) !== fileHash) {
    throw Object.assign(new Error('The retained document failed its SHA-256 integrity check.'), { statusCode: 500 })
  }

  const existing = await UploadedDocument.findOne({ fileHash })
  let document = existing
  let reused = Boolean(existing)
  if (!document) {
    try {
      document = await UploadedDocument.create({
        fileHash,
        storageKey,
        originalFilename: file.originalname,
        extension: path.extname(file.originalname).toLowerCase(),
        contentType: path.extname(file.originalname).toLowerCase() === '.csv' ? 'text/csv' : 'application/json',
        sizeBytes: file.size,
        uploadedBy: actor.username
      })
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) {
        if (createdStorageFile && !(await UploadedDocument.exists({ fileHash }))) await removeTemporaryUpload(storedPath)
        throw error
      }
      document = await UploadedDocument.findOne({ fileHash })
      if (!document) throw error
      reused = true
    }
  }
  if (!document) throw new Error('The uploaded document could not be registered.')

  const instance = await DocumentIngestion.create({
    documentId: document._id,
    originalFilename: file.originalname,
    fileHash,
    uploadedBy: actor.username,
    assessmentPeriod: typeof period === 'string' ? normalizeAssessmentPeriod(period) : undefined,
    status: 'Classification Pending'
  })
  await appendAuditEvent({
    actor,
    action: reused ? 'Document reused' : 'Document uploaded',
    actionCategory: 'Data',
    detail: `Document ${String(document._id)}; ingestion ${String(instance._id)}; SHA-256 ${fileHash}.`,
    sessionId: req.sessionId,
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  })
  return completeDocumentClassification(document, instance, storedPath, reused, actor, req)
}

async function classifyStoredDocument(
  document: { _id: Types.ObjectId; fileHash: string; storageKey: string; originalFilename: string },
  storedPath: string,
  actor: NonNullable<Request['user']>,
  period: unknown,
  req: Request
) {
  const fileHash = await getFileHash(storedPath)
  if (fileHash !== document.fileHash) {
    throw Object.assign(new Error('The retained document failed its SHA-256 integrity check.'), { statusCode: 500 })
  }
  const instance = await DocumentIngestion.create({
    documentId: document._id,
    originalFilename: document.originalFilename,
    fileHash,
    uploadedBy: actor.username,
    assessmentPeriod: typeof period === 'string' ? normalizeAssessmentPeriod(period) : undefined,
    status: 'Classification Pending'
  })
  await appendAuditEvent({
    actor,
    action: 'Document reused',
    actionCategory: 'Data',
    detail: `Document ${String(document._id)}; ingestion ${String(instance._id)}; SHA-256 ${fileHash}.`,
    sessionId: req.sessionId,
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  })
  return completeDocumentClassification(document, instance, storedPath, true, actor, req)
}

async function completeDocumentClassification(
  document: { _id: Types.ObjectId; fileHash: string; originalFilename: string; extension?: string; sizeBytes?: number },
  instance: InstanceType<typeof DocumentIngestion>,
  storedPath: string,
  reused: boolean,
  actor: NonNullable<Request['user']>,
  req: Request
) {
  try {
    const records = parseDocumentAtPath(storedPath, instance.originalFilename)
    if (!(await enforceDocumentEntityScope(req, records, undefined))) {
      throw Object.assign(new Error('The document contains entities outside your assigned scope.'), { statusCode: 403 })
    }
    const classification = classifyDocument(instance.originalFilename, records)
    const entityIds = await resolveDocumentEntityIds(records)
    instance.recommendedCategory = classification.recommendedCategory || undefined
    instance.compatibleCategories = classification.compatibleCategories
    instance.classificationConfidence = classification.confidence
    instance.classificationReason = classification.reason
    instance.classificationWarning = classification.warning
    instance.missingFields = classification.missingFields
    instance.incompatibleFields = classification.incompatibleFields
    instance.recordCounts = classification.recordCounts
    instance.entityIds = entityIds
    instance.status = 'Awaiting User Confirmation'
    if (classification.warning) instance.warnings = [classification.warning]
    await instance.save()
    await appendAuditEvent({
      actor,
      action: 'Document classified',
      actionCategory: 'Data',
      detail: `Document ${String(document._id)}; recommendation ${classification.recommendedCategory || 'none'}; confidence ${classification.confidence}%.`,
      sessionId: req.sessionId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    })
    const existingInstances = await DocumentIngestion.find({ documentId: document._id })
      .sort({ createdAt: -1 })
      .select({ category: 1, status: 1, assessmentPeriod: 1, batchId: 1, batchIds: 1, createdAt: 1 })
      .lean()
    return {
      documentId: String(document._id),
      ingestionId: String(instance._id),
      filename: instance.originalFilename,
      fileHash: document.fileHash,
      fileType: path.extname(instance.originalFilename).slice(1).toUpperCase(),
      sizeBytes: document.sizeBytes,
      reused,
      status: instance.status,
      classification,
      existingInstances: existingInstances
        .filter(item => String(item._id) !== String(instance._id))
        .map(item => ({ ...item, _id: String(item._id), batchId: item.batchId ? String(item.batchId) : undefined }))
    }
  } catch (error) {
    instance.status = 'Failed'
    instance.errorMessage = error instanceof Error ? error.message : 'Document classification failed.'
    await instance.save()
    await appendAuditEvent({
      actor,
      action: 'Document classification failed',
      actionCategory: 'Data',
      detail: `Document ${String(document._id)}; ingestion ${String(instance._id)}; ${instance.errorMessage}.`,
      status: 'Failed',
      sessionId: req.sessionId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    })
    throw error
  }
}

async function enforceDocumentEntityScope(req: Request, records: Array<Record<string, any>>, res?: Response): Promise<boolean> {
  if (req.user?.role !== 'SOC Manager') return true
  const { entityIds, unresolved } = await resolveDocumentEntities(records)
  const assigned = new Set(req.user.assignedEntityIds)
  if (!entityIds.length || unresolved.length || entityIds.some(entityId => !assigned.has(entityId))) {
    if (res) res.status(403).json({ success: false, error: { code: 'DOCUMENT_SCOPE_DENIED', message: 'The document contains entities outside your assigned scope or could not be scoped safely.' } })
    return false
  }
  return true
}

async function resolveDocumentEntities(records: Array<Record<string, any>>) {
  const entities = await Entity.find().select({ id: 1, name: 1 }).lean()
  const byId = new Map(entities.map(entity => [entity.id, entity.id]))
  const byName = new Map(entities.map(entity => [entity.name.trim().toLowerCase(), entity.id]))
  const resolved = new Set<string>()
  const unresolved = new Set<string>()
  for (const record of records) {
    const suppliedId = String(record.entityId || record.entity_id || '').trim()
    const suppliedName = String(record.entityName || record.cseName || record.organizationName || record.legalEntityName || record.institutionName || '').trim()
    if (!suppliedId && !suppliedName) continue
    const idFromId = suppliedId ? byId.get(suppliedId) : undefined
    const idFromName = suppliedName ? byName.get(suppliedName.toLowerCase()) : undefined
    if (idFromId && idFromName && idFromId !== idFromName) {
      unresolved.add(`${suppliedId}/${suppliedName}`)
    } else {
      const entityId = idFromId || (!suppliedId ? idFromName : undefined)
      if (entityId) resolved.add(entityId)
      else unresolved.add(suppliedId || suppliedName)
    }
  }
  return { entityIds: [...resolved], unresolved: [...unresolved] }
}

async function resolveDocumentEntityIds(records: Array<Record<string, any>>): Promise<string[]> {
  return (await resolveDocumentEntities(records)).entityIds
}

function canAccessInstance(req: Request, instance: { entityIds?: string[]; uploadedBy?: string }): boolean {
  if (req.user?.role !== 'SOC Manager') return true
  const assigned = new Set(req.user.assignedEntityIds)
  if (!instance.entityIds?.length) return instance.uploadedBy === req.user.username
  return instance.entityIds.every(entityId => assigned.has(entityId))
}

function canAccessDocument(
  req: Request,
  document: { uploadedBy: string },
  instances: Array<{ entityIds?: string[]; uploadedBy?: string }>
): boolean {
  if (req.user?.role !== 'SOC Manager') return true
  if (!instances.length) return document.uploadedBy === req.user.username
  return instances.every(instance => canAccessInstance(req, instance))
}

function filterInstancesForUser<T extends { entityIds?: string[]; uploadedBy?: string }>(req: Request, instances: T[]): T[] {
  return instances.filter(instance => canAccessInstance(req, instance))
}

function filterDocumentsForUser<T extends { _id: Types.ObjectId; uploadedBy: string }>(
  req: Request,
  documents: T[],
  instances: Array<{ documentId: Types.ObjectId; entityIds?: string[]; uploadedBy?: string }>
): T[] {
  return documents.filter(document => canAccessDocument(
    req,
    document,
    instances.filter(instance => String(instance.documentId) === String(document._id))
  ))
}

function getFileHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    const stream = fs.createReadStream(filePath)
    stream.on('data', chunk => hash.update(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolve(hash.digest('hex')))
  })
}

function isDuplicateHashError(error: any): boolean {
  return error?.code === 11000 && Boolean(error?.keyPattern?.fileHash || error?.keyValue?.fileHash)
}

function toPublicBatch(batch: any): any {
  if (!batch) return null
  const publicBatch = typeof batch.toObject === 'function' ? batch.toObject() : { ...batch }
  delete publicBatch.fileHash
  delete publicBatch.sourceDocumentHash
  return publicBatch
}

async function removeTemporaryUpload(filePath: string): Promise<void> {
  try {
    await fs.promises.unlink(filePath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
}

function parseUploadedFile(file: Express.Multer.File): any[] {
  return parseDocumentAtPath(file.path, file.originalname)
}

function parseDocumentAtPath(filePath: string, filename: string): any[] {
  const bytes = fs.readFileSync(filePath)
  let content: string
  try {
    content = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    throw new IngestionValidationError('The upload is not valid UTF-8 text.')
  }
  const ext = path.extname(filename).toLowerCase()
  if (ext === '.json') {
    let parsed: any
    try {
      parsed = JSON.parse(content)
    } catch {
      throw new IngestionValidationError('The JSON file is not valid JSON.')
    }
    const rows = Array.isArray(parsed) ? parsed : (parsed.records || parsed.alerts || parsed.cases || parsed.data || parsed)
    const records = Array.isArray(rows) ? rows : [rows]
    if (!records.length) throw new IngestionValidationError('The JSON file contains no records.')
    if (records.some(record => !record || typeof record !== 'object' || Array.isArray(record))) {
      throw new IngestionValidationError('The JSON file must contain an array of record objects or an object with a records, alerts, cases, or data array.')
    }
    validateRecordLimits(records)
    return records
  }
  if (ext === '.csv') return parseCSV(content)
  throw new IngestionValidationError('Unsupported file type. Upload CSV or JSON files.')
}

function parseCSV(csv: string): any[] {
  return parseCSVWithLimits(csv)
}

interface ValidationResult { valid: any[]; validCount: number; invalidCount: number; missingFields: number; duplicateCount: number; warnings: string[]; recordStatuses: IngestionRecordType['processingStatus'][] }

async function ingestDataset(records: any[], source: string, filename: string | null, reservedBatch?: any, selectedPeriod?: unknown) {
  validateRecordLimits(records)
  const requestedPeriod = typeof selectedPeriod === 'string' && selectedPeriod.trim()
    ? normalizeAssessmentPeriod(selectedPeriod)
    : undefined
  if (requestedPeriod && !isAssessmentPeriod(requestedPeriod)) {
    throw new IngestionValidationError('Select a supported assessment period before ingesting records.')
  }
  const periodRecords = records.map(record => {
    const providedPeriod = record.period
    const hasProvidedPeriod = typeof providedPeriod === 'string' && providedPeriod.trim().length > 0
    const periodValue = hasProvidedPeriod ? providedPeriod : requestedPeriod
    const period = periodValue ? normalizeAssessmentPeriod(periodValue) : ''
    const validationError = providedPeriod != null && typeof providedPeriod !== 'string'
      ? 'invalid_period'
      : !periodValue
        ? 'missing_period'
        : !isAssessmentPeriod(period)
          ? 'invalid_period'
          : undefined
    return { ...record, period, ...(validationError ? { validationError } : {}) }
  })
  const { records: resolvedRecords, assignedEntities } = await assignEntityIds(periodRecords)
  const inferenceOnlyRecords = resolvedRecords.filter(record =>
    !record.validationError && !record.entityResolutionError && (isSocFeatureVector(record) || isSocCoverageRecord(record))
  )
  const telemetryRecords = resolvedRecords.filter(record => record.validationError || record.entityResolutionError || (!isSocFeatureVector(record) && !isSocCoverageRecord(record)))
  const validation = validateRecords(telemetryRecords)
  let telemetryIndex = 0
  const recordStatuses: IngestionRecordType['processingStatus'][] = resolvedRecords.map(record => {
    if (record.validationError || record.entityResolutionError) return 'invalid'
    if (isSocFeatureVector(record) || isSocCoverageRecord(record)) return 'inference_input'
    return validation.recordStatuses[telemetryIndex++] || 'invalid'
  })
  return persistValidated(resolvedRecords, validation.valid, source, filename, inferenceOnlyRecords, validation, assignedEntities, recordStatuses, reservedBatch)
}

async function assignEntityIds(records: any[]) {
  if (!records.length) return { records, assignedEntities: [] as any[] }

  const existing = await Entity.find().select({ id: 1, name: 1 }).lean()
  const entitiesById = new Map(existing.map(entity => [entity.id, entity]))
  const entitiesByName = new Map(existing.map(entity => [String(entity.name).trim().toLowerCase(), entity]))
  const resolvedNames = new Map<string, { name: string; id: string; created: boolean }>()

  const resolvedRecords: any[] = []
  for (const record of records) {
    const name = String(record.entityName || record.cseName || record.organizationName || record.legalEntityName || record.institutionName || '').trim()
    const suppliedId = String(record.entityId || record.entity_id || '').trim()
    const isIngestibleRecord = isSocFeatureVector(record) || isSocCoverageRecord(record) || Boolean(
      record.severity || record.category || record.caseId || record.openedAt || record.investigationDepth !== undefined ||
      (record.id && String(record.id).startsWith('CASE-'))
    )
    if (!isIngestibleRecord) {
      resolvedRecords.push({ ...record })
      continue
    }

    const nameKey = name.toLowerCase()
    const resolutionKey = name || suppliedId
    let resolution = resolutionKey ? resolvedNames.get(resolutionKey) : undefined
    if (!resolution) {
      const byName = name ? entitiesByName.get(nameKey) : undefined
      const byId = suppliedId ? entitiesById.get(suppliedId) : undefined
      const inconsistent = Boolean(byId && ((byName && byId.id !== byName.id) || (name && byId.name.trim().toLowerCase() !== nameKey)))
      const matched = byId || (!suppliedId ? byName : undefined)
      if (matched && !inconsistent) resolution = { name: matched.name, id: matched.id, created: false }
      if (resolution && resolutionKey) resolvedNames.set(resolutionKey, resolution)
    }
    if (!resolution) {
      resolvedRecords.push({ ...record, entityResolutionError: 'unknown_or_inconsistent_entity' })
      continue
    }
    resolvedRecords.push({ ...record, entityId: resolution.id })
  }

  return { records: resolvedRecords, assignedEntities: [...resolvedNames.values()] }
}

function validateRecords(records: any[]): ValidationResult {
  const seen = new Set<string>()
  let validCount = 0
  let invalidCount = 0
  let missingFields = 0
  let duplicateCount = 0
  const warnings: string[] = []
  const valid: any[] = []
  const recordStatuses: IngestionRecordType['processingStatus'][] = []

  for (const r of records) {
    if (r.validationError || r.entityResolutionError) {
      invalidCount++
      recordStatuses.push('invalid')
      continue
    }
    const id = r.id || r.alertId || r.caseId
    const missing = ['severity', 'category'].filter(k => !r[k.toLowerCase()] && !r[k]).length
    if (missing) missingFields++
    if (id && seen.has(id)) { duplicateCount++; recordStatuses.push('duplicate'); continue }
    if (id) seen.add(id)
    const caseRecord = Boolean(r.caseId || r.openedAt || r.investigationDepth !== undefined || (id && String(id).startsWith('CASE-')))
    const validDate = (value: unknown) => typeof value === 'string' || value instanceof Date
      ? !Number.isNaN(new Date(value).getTime())
      : false
    const validCaseClosureReasons = ['Resolved', 'False Positive', 'False positive', 'Escalated', 'Duplicate', 'Deferred', 'Insufficient Evidence']
    const validAlert = !caseRecord && Boolean(typeof id === 'string' && id.length <= INGESTION_LIMITS.maxFieldLength && r.severity && r.category && r.asset && validDate(r.createdAt || r.created_at))
    const validCase = caseRecord && Boolean(typeof id === 'string' && id.length <= INGESTION_LIMITS.maxFieldLength && validDate(r.openedAt) && validCaseClosureReasons.includes(r.closureReason))
    if ((!validAlert && !validCase) || !r.entityId || !isAssessmentPeriod(r.period)) {
      invalidCount++
      recordStatuses.push('invalid')
      continue
    }
    if (r.severity && !['Critical', 'High', 'Medium', 'Low', 'Informational'].includes(r.severity)) {
      invalidCount++
      recordStatuses.push('invalid')
      continue
    }
    valid.push(normalizeRecord(r))
    recordStatuses.push('accepted')
    validCount++
  }

  const criticalMissing = records.filter(r => (r.criticality === 'Critical' || r.severity === 'Critical') && (!r.asset && !r.telemetry)).length
  if (criticalMissing / (records.length || 1) > 0.1) {
    warnings.push(`${Math.round((criticalMissing / (records.length || 1)) * 100)}% of critical asset records contain incomplete telemetry information.`)
  }
  if (missingFields / (records.length || 1) > 0.05) {
    warnings.push(`${((missingFields / (records.length || 1)) * 100).toFixed(1)}% of alert records lack asset attribution.`)
  }
  const unknownEntities = records.filter(record => record.entityResolutionError).length
  if (unknownEntities) {
    warnings.push(`${unknownEntities} records reference an unknown or inconsistent entity ID; register the entity or correct the supplied ID before ingestion.`)
  }
  const missingPeriods = records.filter(record => record.validationError === 'missing_period').length
  if (missingPeriods) warnings.push(`${missingPeriods} records have no assessment period. Select a period explicitly or add a period to each record.`)
  const invalidPeriods = records.filter(record => record.validationError === 'invalid_period').length
  if (invalidPeriods) warnings.push(`${invalidPeriods} records use an unsupported assessment period and were not persisted.`)

  return { valid, validCount, invalidCount, missingFields, duplicateCount, warnings, recordStatuses }
}

function normalizeRecord(r: any): any {
  return {
    id: r.id || r.alertId || r.caseId,
    entityId: r.entityId || r.entity_id,
    category: r.category || 'Unknown',
    asset: r.asset || 'Unknown',
    severity: r.severity || 'Low',
    status: r.status || 'closed',
    createdAt: r.createdAt || r.created_at,
    period: r.period,
    ...r
  }
}

async function persistValidated(records: any[], valid: any[], source: string, filename: string | null, inferenceOnlyRecords: any[], validation: ValidationResult, assignedEntities: any[], recordStatuses: IngestionRecordType['processingStatus'][], reservedBatch?: any) {
  const acceptedRecords = valid.length + inferenceOnlyRecords.length
  const inferenceRecords = [...valid, ...inferenceOnlyRecords]
  const batchData = {
    source, filename,
    recordsReceived: records.length,
    validRecords: acceptedRecords,
    persistedRecords: 0,
    telemetryRecordsStored: 0,
    sourceRecordsStored: 0,
    invalidRecords: records.length - acceptedRecords,
    missingFields: validation.missingFields,
    duplicateRecords: validation.duplicateCount,
    entitiesDetected: new Set(inferenceRecords.map(r => r.entityId || r.entity_id || r.entity || 'CSE-000')).size,
    entityIds: [...new Set(records.map(record => String(record.entityId || record.entity_id || record.entity || '').trim()).filter(Boolean))],
    assessmentPeriods: [...new Set(records.map(record => String(record.period || '').trim()).filter(Boolean))],
    status: 'processing',
    analyticsStatus: 'pending',
    qualityPct: records.length ? Math.round((acceptedRecords / records.length) * 100) : 0,
    warnings: validation.warnings,
    assignedEntities,
    persistenceErrorCount: 0,
    persistenceErrors: [],
    mlInference: { status: 'processing', source: 'pending', inputRecords: inferenceRecords.length, evaluatedEntities: 0 }
  }
  const batch = reservedBatch || new IngestionBatch()
  Object.assign(batch, batchData)
  await batch.save()

  const telemetryErrors: any[] = []
  const coverageOperations = inferenceOnlyRecords.filter(isSocCoverageRecord).map(record => {
    const category = firstText(record, ['category', 'mitreTactic', 'expectedTelemetry'])
    const assetGroup = firstText(record, ['assetGroup', 'asset'])
    if (!category || !assetGroup) {
      telemetryErrors.push({
        entityId: String(record.entityId || record.entity_id || ''),
        message: 'Telemetry coverage requires a category and asset group.'
      })
      return null
    }

    const key = {
      entityId: String(record.entityId || record.entity_id),
      category,
      assetGroup,
      period: record.period
    }
    const observedCoverage = numericField(record, ['observedCoverage', 'observed', 'coveragePct', 'telemetryCoveragePct'])
    const expectedCoverage = numericField(record, ['expectedCoverage', 'expected'])
    const notes = [
      firstText(record, ['expectedTelemetry']),
      firstText(record, ['observedTelemetry']),
      firstText(record, ['statutoryImpact']),
      firstText(record, ['auditRecommendation'])
    ].filter(Boolean).join('\n')
    const status = ['Monitored', 'Partially Monitored', 'Unmonitored', 'Unknown', 'Data Missing'].includes(record.status)
      ? record.status
      : 'Unknown'
    return {
      key,
      document: {
        ...key,
        ...(observedCoverage !== undefined ? { observedCoverage } : {}),
        ...(expectedCoverage !== undefined ? { expectedCoverage } : {}),
        ...(validTelemetryCriticality(record.criticality) ? { criticality: record.criticality } : {}),
        status,
        evidence: { source, lastUpdated: new Date(), ...(notes ? { notes } : {}) }
      }
    }
  }).filter((operation): operation is NonNullable<typeof operation> => operation !== null)
  let telemetryRecordsStored = 0
  const uniqueCoverageKeys = [...new Map(coverageOperations.map(operation => [
    `${operation.key.entityId}\u0000${operation.key.period}\u0000${operation.key.category}\u0000${operation.key.assetGroup}`,
    operation.key
  ])).values()]
  if (coverageOperations.length) {
    try {
      await TelemetryCoverage.bulkWrite(coverageOperations.map(({ key, document }) => ({
        updateOne: { filter: key, update: { $set: document }, upsert: true }
      })))
    } catch (error) {
      telemetryErrors.push({
        message: error instanceof Error ? error.message : 'Could not persist telemetry coverage records.'
      })
    }
    telemetryRecordsStored = await TelemetryCoverage.countDocuments({ $or: uniqueCoverageKeys })
    if (telemetryRecordsStored < uniqueCoverageKeys.length) {
      telemetryErrors.push({
        message: `${uniqueCoverageKeys.length - telemetryRecordsStored} telemetry coverage records were not persisted.`
      })
    }
  }

  let inserted = 0
  let duplicateWriteCount = 0
  const persistenceErrors: any[] = []
  let operationalRecordsProcessed = 0
  for (const r of valid) {
    try {
      if (r.caseId || r.openedAt || r.investigationDepth !== undefined || (r.id && String(r.id).startsWith('CASE-'))) {
        await Case.create({
          ...r,
          dataProvenance: source.startsWith('Test Dataset:') ? 'sample' : 'submitted',
          ingestionBatchId: batch._id
        })
      } else {
        await Alert.create({
          ...r,
          dataProvenance: source.startsWith('Test Dataset:') ? 'sample' : 'submitted',
          ingestionBatchId: batch._id
        })
      }
      inserted++
    } catch (error: any) {
      if (error?.code === 11000) duplicateWriteCount++
      else persistenceErrors.push({ id: r.id || r.caseId || null, entityId: r.entityId || r.entity_id || null, message: error instanceof Error ? error.message : 'Database write failed.' })
    }
    operationalRecordsProcessed++
    if (operationalRecordsProcessed % 50 === 0 || operationalRecordsProcessed === valid.length) {
      batch.persistedRecords = inserted
      batch.telemetryRecordsStored = telemetryRecordsStored
      batch.duplicateRecords = validation.duplicateCount + duplicateWriteCount
      batch.persistenceErrorCount = persistenceErrors.length
      batch.persistenceErrors = persistenceErrors.slice(0, 20)
      await batch.save()
    }
  }

  batch.persistedRecords = inserted
  batch.telemetryRecordsStored = telemetryRecordsStored
  batch.duplicateRecords = validation.duplicateCount + duplicateWriteCount
  batch.persistenceErrorCount = persistenceErrors.length
  batch.persistenceErrors = persistenceErrors.slice(0, 20)
  await batch.save()

  const sourceRecordDocs = records.map((record, index) => {
    const recordType: IngestionRecordType['recordType'] = isSocFeatureVector(record) ? 'soc_feature_vector' : isSocCoverageRecord(record) ? 'coverage' :
      (record.caseId || record.openedAt || record.investigationDepth !== undefined || String(record.id || '').startsWith('CASE-')) ? 'case' :
        (record.severity || record.category) ? 'alert' : 'unknown'
    return {
      batchId: batch._id,
      recordIndex: index,
      source,
      filename: filename || source,
      entityId: String(record.entityId || record.entity_id || record.entity || '') || undefined,
      recordType,
      processingStatus: recordStatuses[index] || 'invalid',
      recordData: record,
      retentionExpiresAt: new Date(Date.now() + INGESTION_LIMITS.sourceRecordRetentionDays * 24 * 60 * 60 * 1000)
    }
  })
  const sourcePersistenceErrors: any[] = []
  for (let offset = 0; offset < sourceRecordDocs.length; offset += 500) {
    try {
      await IngestionRecord.bulkWrite(sourceRecordDocs.slice(offset, offset + 500).map(sourceRecord => ({
        updateOne: {
          filter: { batchId: sourceRecord.batchId, recordIndex: sourceRecord.recordIndex },
          update: { $set: sourceRecord },
          upsert: true
        }
      })), { ordered: false })
    } catch (error: any) {
      const failures = error?.writeErrors || error?.result?.getWriteErrors?.() || []
      if (failures.length) {
        sourcePersistenceErrors.push(...failures.slice(0, 20).map((failure: any) => ({
          recordIndex: offset + (failure.index ?? 0),
          message: failure.err?.message || failure.message || 'Could not store parsed source record.'
        })))
      } else {
        sourcePersistenceErrors.push({ recordIndex: offset, message: error instanceof Error ? error.message : 'Could not store parsed source records.' })
      }
    }
    batch.sourceRecordsStored = await IngestionRecord.countDocuments({ batchId: batch._id })
    batch.persistenceErrorCount = persistenceErrors.length + sourcePersistenceErrors.length
    batch.persistenceErrors = [...persistenceErrors, ...sourcePersistenceErrors].slice(0, 20)
    await batch.save()
  }
  const sourceRecordsStored = await IngestionRecord.countDocuments({ batchId: batch._id })
  const allPersistenceErrors = [...persistenceErrors, ...sourcePersistenceErrors, ...telemetryErrors]
  const persistenceStatus = allPersistenceErrors.length
    ? (inserted || sourceRecordsStored || duplicateWriteCount ? 'partial' : 'failed')
    : 'persisted'
  batch.sourceRecordsStored = sourceRecordsStored
  batch.telemetryRecordsStored = telemetryRecordsStored
  batch.persistenceErrorCount = allPersistenceErrors.length
  batch.persistenceErrors = allPersistenceErrors.slice(0, 20)
  batch.status = persistenceStatus === 'failed'
    ? 'failed'
    : (persistenceStatus === 'partial' || validation.invalidCount > 0 || validation.duplicateCount > 0 || duplicateWriteCount > 0 ? 'partial' : 'persisted')
  if (persistenceStatus === 'failed' && !inserted && !sourceRecordsStored && batch.fileHash) {
    await IngestionBatch.updateOne({ _id: batch._id }, { $unset: { fileHash: 1 } })
    batch.fileHash = undefined
  }
  const mlInference = await runIngestionInference(inferenceRecords)
  batch.mlInference = mlInference
  await batch.save()

  console.info(JSON.stringify({
    event: 'ingestion.batch.completed',
    batchId: batch._id.toString(),
    status: batch.status,
    recordsReceived: records.length,
    persistedRecords: inserted,
    telemetryRecordsStored,
    sourceRecordsStored,
    entityIds: [...new Set(inferenceRecords.map(record => String(record.entityId || '')).filter(Boolean))],
    assessmentPeriods: [...new Set(records.map(record => String(record.period || '')).filter(Boolean))]
  }))

  const analyticsScope = [...new Map(valid.map(record => [
    `${record.entityId}\u0000${record.period}`,
    { entityId: String(record.entityId), period: String(record.period), batchId: batch._id }
  ])).values()]

  return {
    batch,
    inserted,
    validRecords: acceptedRecords,
    persistedRecords: inserted,
    telemetryRecordsStored,
    sourceRecordsStored,
    persistenceStatus,
    persistenceErrors: allPersistenceErrors.slice(0, 20),
    total: records.length,
    assignedEntities,
    mlInference,
    analyticsScope
  }
}

async function refreshIngestionFindings(scopes: Array<{ entityId: string; period: string; batchId: any }>) {
  const uniqueScopes = [...new Map(scopes.map(scope => [
    `${scope.entityId}\u0000${scope.period}`,
    scope
  ])).values()]
  const batchIds = [...new Set(scopes.map(scope => String(scope.batchId)))]
  if (!uniqueScopes.length) return { status: 'completed' as const }

  await IngestionBatch.updateMany(
    { _id: { $in: batchIds } },
    { $set: { analyticsStatus: 'processing' }, $unset: { analyticsError: 1 } }
  )
  try {
    for (const scope of uniqueScopes) {
      const gaps = await detectExecutionGaps(scope.period, scope.entityId)
      await persistFindings(gaps)
    }
    await IngestionBatch.updateMany({ _id: { $in: batchIds } }, { $set: { analyticsStatus: 'completed' } })
    return { status: 'completed' as const }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Analytics refresh failed.'
    await IngestionBatch.updateMany(
      { _id: { $in: batchIds } },
      { $set: { analyticsStatus: 'failed', analyticsError: message } }
    )
    console.error('[ingestion] Analytics refresh failed:', error instanceof Error ? error.name : 'Unknown error')
    return { status: 'failed' as const, error: message }
  }
}

function firstText(record: any, keys: string[]): string {
  for (const key of keys) {
    if (typeof record[key] === 'string' && record[key].trim()) return record[key].trim()
  }
  return ''
}

function numericField(record: any, keys: string[]): number | undefined {
  for (const key of keys) {
    if (record[key] === undefined || record[key] === null || record[key] === '') continue
    const value = typeof record[key] === 'number' ? record[key] : Number(record[key])
    if (Number.isFinite(value)) return value
  }
  return undefined
}

function validTelemetryCriticality(value: unknown): value is 'Critical' | 'High' | 'Medium' | 'Low' {
  return value === 'Critical' || value === 'High' || value === 'Medium' || value === 'Low'
}

export default router
