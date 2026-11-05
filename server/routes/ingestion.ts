import { Router, Response } from 'express'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import { createHash, randomUUID } from 'crypto'
import { fileURLToPath } from 'url'
import { IngestionBatch } from '../models/IngestionBatch'
import { IngestionRecord } from '../models/IngestionRecord'
import { Alert } from '../models/Alert'
import { Case } from '../models/Case'
import { Entity } from '../models/Entity'
import { EntityMetric } from '../models/EntityMetric'
import { isSocCoverageRecord, isSocFeatureVector, runIngestionInference } from '../services/ingestionInference'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadDir = path.join(__dirname, '..', '..', 'data', 'uploads')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

const upload = multer({
  storage: multer.diskStorage({ destination: uploadDir, filename: (_r, file, cb) => cb(null, `${Date.now()}-${randomUUID()}-${path.basename(file.originalname)}`) }),
  limits: { files: 20 }
})

const router = Router()

function handleError(err: unknown, res: Response) {
  const message = err instanceof Error ? err.message : 'Unknown error'
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message } })
}

// Get current data quality summary
router.get('/quality', async (req, res) => {
  try {
    const recent = await IngestionBatch.find().sort({ createdAt: -1 }).limit(5).lean()
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

    const result = await ingestDataset(records, 'Test Dataset: ' + filename, filename)
    res.json({ success: true, data: result })
  } catch (err) { handleError(err, res) }
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
        const result = await ingestDataset(records, file.originalname, file.originalname, batch)
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
                mlInference: { status: 'failed', source: 'none', inputRecords: latest?.recordsReceived || 0, evaluatedEntities: 0, error: message, completedAt: new Date() }
              },
              ...(!hasStoredRecords ? { $unset: { fileHash: 1 } } : {})
            }
          )
        } catch { /* Keep the original file error visible even if status persistence also fails. */ }
        const failedBatch = await IngestionBatch.findById(batch._id).lean().catch(() => null)
        fileResults.push({ success: false, fileName: file.originalname, batch: toPublicBatch(failedBatch), error: message })
      }
    }

    const inserted = fileResults.reduce((sum, result) => sum + (result.inserted || 0), 0)
    const persistedRecords = fileResults.reduce((sum, result) => sum + (result.persistedRecords || 0), 0)
    const sourceRecordsStored = fileResults.reduce((sum, result) => sum + (result.sourceRecordsStored || 0), 0)
    const validRecords = fileResults.reduce((sum, result) => sum + (result.validRecords || 0), 0)
    const totalRecords = fileResults.reduce((sum, result) => sum + (result.total || 0), 0)
    const failedFiles = fileResults.filter(result => !result.success).length
    const partialFiles = fileResults.filter(result => result.batch?.status === 'partial' || result.persistenceStatus === 'partial').length
    res.json({
      success: failedFiles === 0,
      data: { files: fileResults, fileCount: files.length, failedFiles, partialFiles, inserted, persistedRecords, sourceRecordsStored, validRecords, totalRecords }
    })
  } catch (err) { handleError(err, res) }
})

// Ingest from API (JSON payload)
router.post('/api', async (req, res) => {
  try {
    const records = req.body.records || req.body
    if (!Array.isArray(records)) return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Records must be an array' } })
    const result = await ingestDataset(records, 'API', null)
    res.json({ success: true, data: result })
  } catch (err) { handleError(err, res) }
})

// ---- Helpers ----

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
  return publicBatch
}

async function removeTemporaryUpload(filePath: string): Promise<void> {
  await fs.promises.unlink(filePath).catch(() => {})
}

function parseUploadedFile(file: Express.Multer.File): any[] {
  const content = fs.readFileSync(file.path, 'utf8')
  const ext = path.extname(file.originalname).toLowerCase()
  if (ext === '.json') {
    const parsed = JSON.parse(content)
    const rows = Array.isArray(parsed) ? parsed : (parsed.records || parsed.alerts || parsed.cases || parsed.data || parsed)
    const records = Array.isArray(rows) ? rows : [rows]
    if (!records.length) throw new Error('The JSON file contains no records.')
    if (records.some(record => !record || typeof record !== 'object' || Array.isArray(record))) {
      throw new Error('The JSON file must contain an array of record objects or an object with a records, alerts, cases, or data array.')
    }
    return records
  }
  if (ext === '.csv') return parseCSV(content)
  throw new Error('Unsupported file type. Upload CSV or JSON files.')
}

function parseCSV(csv: string): any[] {
  const text = csv.replace(/^\uFEFF/, '')
  if (!text.trim()) throw new Error('The CSV file is empty.')
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false
  for (let index = 0; index < text.length; index++) {
    const char = text[index]
    if (char === '"') {
      if (inQuotes && text[index + 1] === '"') { cell += '"'; index++ }
      else inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      row.push(cell); cell = ''
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && text[index + 1] === '\n') index++
      row.push(cell)
      if (row.some(value => value.trim() !== '')) rows.push(row)
      row = []; cell = ''
    } else {
      cell += char
    }
  }
  if (inQuotes) throw new Error('The CSV file contains an unclosed quoted field.')
  row.push(cell)
  if (row.some(value => value.trim() !== '')) rows.push(row)
  if (rows.length < 2) throw new Error('The CSV file must contain a header row and at least one data record.')

  const headers = rows[0].map(header => header.trim())
  return rows.slice(1).map(cells => {
    const record: any = {}
    headers.forEach((header, index) => { if (header) record[header] = (cells[index] || '').trim() })
    return record
  })
}

interface ValidationResult { valid: any[]; validCount: number; invalidCount: number; missingFields: number; duplicateCount: number; warnings: string[]; recordStatuses: string[] }

async function ingestDataset(records: any[], source: string, filename: string | null, reservedBatch?: any) {
  const { records: resolvedRecords, assignedEntities } = await assignEntityIds(records)
  const inferenceOnlyRecords = resolvedRecords.filter(record => isSocFeatureVector(record) || isSocCoverageRecord(record))
  const telemetryRecords = resolvedRecords.filter(record => !isSocFeatureVector(record) && !isSocCoverageRecord(record))
  const validation = validateRecords(telemetryRecords)
  let telemetryIndex = 0
  const recordStatuses = resolvedRecords.map(record => {
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
  let nextCseNumber = existing.reduce((max, entity) => {
    const match = /^CSE-(\d+)$/i.exec(entity.id)
    return match ? Math.max(max, Number(match[1])) : max
  }, 0) + 1
  const resolvedNames = new Map<string, { name: string; id: string; created: boolean }>()

  const resolvedRecords: any[] = []
  for (const record of records) {
    const name = String(record.entityName || record.cseName || record.organizationName || record.legalEntityName || record.institutionName || '').trim()
    const suppliedId = String(record.entityId || record.entity_id || '').trim()
    const isIngestibleRecord = isSocFeatureVector(record) || isSocCoverageRecord(record) || Boolean(
      record.severity || record.category || record.caseId || record.openedAt || record.investigationDepth !== undefined ||
      (record.id && String(record.id).startsWith('CASE-'))
    )
    if (!name || !isIngestibleRecord) {
      resolvedRecords.push({ ...record })
      continue
    }

    const nameKey = name.toLowerCase()
    let resolution = resolvedNames.get(nameKey)
    if (!resolution) {
      const byName = entitiesByName.get(nameKey)
      const byId = suppliedId ? entitiesById.get(suppliedId) : undefined
      const matched = byId || byName
      if (matched) {
        resolution = { name: matched.name, id: matched.id, created: false }
      } else {
        const criticality = ['Critical', 'High', 'Medium', 'Low'].includes(record.criticality) ? record.criticality : 'Medium'
        let createdEntity: any
        while (!createdEntity) {
          const id = `CSE-${String(nextCseNumber++).padStart(3, '0')}`
          try {
            createdEntity = await Entity.create({
              id,
              name,
              sector: record.sector || 'Unclassified',
              region: record.region || 'Unspecified',
              criticality,
              dataCompleteness: Number.isFinite(Number(record.dataCompleteness)) ? Number(record.dataCompleteness) : 0,
              telemetryCoverage: Number.isFinite(Number(record.telemetryCoverage)) ? Number(record.telemetryCoverage) : 0,
              assessmentStatus: 'Review Required',
              lastSubmission: new Date()
            })
          } catch (error: any) {
            if (error?.code === 11000) continue
            throw error
          }
        }
        await EntityMetric.findOneAndUpdate(
          { entityId: createdEntity.id, period: record.period || 'Q2 FY 2026-27' },
          { $setOnInsert: { entityId: createdEntity.id, period: record.period || 'Q2 FY 2026-27' } },
          { upsert: true, setDefaultsOnInsert: true }
        )
        resolution = { name: createdEntity.name, id: createdEntity.id, created: true }
        entitiesById.set(createdEntity.id, createdEntity)
        entitiesByName.set(nameKey, createdEntity)
      }
      resolvedNames.set(nameKey, resolution)
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
  const recordStatuses: string[] = []

  for (const r of records) {
    const id = r.id || r.alertId || r.caseId
    const missing = ['severity', 'category'].filter(k => !r[k.toLowerCase()] && !r[k]).length
    if (missing) missingFields++
    if (id && seen.has(id)) { duplicateCount++; recordStatuses.push('duplicate'); continue }
    if (id) seen.add(id)
    const caseRecord = Boolean(r.caseId || r.openedAt || r.investigationDepth !== undefined || (id && String(id).startsWith('CASE-')))
    if (!r.severity && !r.category && !caseRecord) { invalidCount++; recordStatuses.push('invalid'); continue }
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

  return { valid, validCount, invalidCount, missingFields, duplicateCount, warnings, recordStatuses }
}

function normalizeRecord(r: any): any {
  return {
    id: r.id || r.alertId || `ALERT-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
    entityId: r.entityId || r.entity_id || r.entity || 'CSE-000',
    category: r.category || 'Unknown',
    asset: r.asset || 'Unknown',
    severity: r.severity || 'Low',
    status: r.status || 'closed',
    createdAt: r.createdAt || r.created_at || new Date().toISOString(),
    ...r
  }
}

async function persistValidated(records: any[], valid: any[], source: string, filename: string | null, inferenceOnlyRecords: any[], validation: ValidationResult, assignedEntities: any[], recordStatuses: string[], reservedBatch?: any) {
  const acceptedRecords = valid.length + inferenceOnlyRecords.length
  const inferenceRecords = [...valid, ...inferenceOnlyRecords]
  const batchData = {
    source, filename,
    recordsReceived: records.length,
    validRecords: acceptedRecords,
    persistedRecords: 0,
    sourceRecordsStored: 0,
    invalidRecords: records.length - acceptedRecords,
    missingFields: validation.missingFields,
    duplicateRecords: validation.duplicateCount,
    entitiesDetected: new Set(inferenceRecords.map(r => r.entityId || r.entity_id || r.entity || 'CSE-000')).size,
    status: 'processing',
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

  let inserted = 0
  let duplicateWriteCount = 0
  const persistenceErrors: any[] = []
  let operationalRecordsProcessed = 0
  for (const r of valid) {
    try {
      if (r.caseId || r.openedAt || r.investigationDepth !== undefined || (r.id && String(r.id).startsWith('CASE-'))) {
        await Case.create(r)
      } else {
        await Alert.create(r)
      }
      inserted++
    } catch (error: any) {
      if (error?.code === 11000) duplicateWriteCount++
      else persistenceErrors.push({ id: r.id || r.caseId || null, entityId: r.entityId || r.entity_id || null, message: error instanceof Error ? error.message : 'Database write failed.' })
    }
    operationalRecordsProcessed++
    if (operationalRecordsProcessed % 50 === 0 || operationalRecordsProcessed === valid.length) {
      batch.persistedRecords = inserted
      batch.duplicateRecords = validation.duplicateCount + duplicateWriteCount
      batch.persistenceErrorCount = persistenceErrors.length
      batch.persistenceErrors = persistenceErrors.slice(0, 20)
      await batch.save()
    }
  }

  batch.persistedRecords = inserted
  batch.duplicateRecords = validation.duplicateCount + duplicateWriteCount
  batch.persistenceErrorCount = persistenceErrors.length
  batch.persistenceErrors = persistenceErrors.slice(0, 20)
  await batch.save()

  const sourceRecordDocs = records.map((record, index) => ({
    batchId: batch._id,
    recordIndex: index,
    source,
    filename: filename || source,
    entityId: String(record.entityId || record.entity_id || record.entity || '') || undefined,
    recordType: isSocFeatureVector(record) ? 'soc_feature_vector' : isSocCoverageRecord(record) ? 'coverage' :
      (record.caseId || record.openedAt || record.investigationDepth !== undefined || String(record.id || '').startsWith('CASE-')) ? 'case' :
        (record.severity || record.category) ? 'alert' : 'unknown',
    processingStatus: recordStatuses[index] || 'invalid',
    recordData: record
  }))
  const sourcePersistenceErrors: any[] = []
  for (let offset = 0; offset < sourceRecordDocs.length; offset += 500) {
    try {
      await IngestionRecord.insertMany(sourceRecordDocs.slice(offset, offset + 500), { ordered: false })
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
  const allPersistenceErrors = [...persistenceErrors, ...sourcePersistenceErrors]
  const persistenceStatus = allPersistenceErrors.length
    ? (inserted || sourceRecordsStored || duplicateWriteCount ? 'partial' : 'failed')
    : 'persisted'
  batch.sourceRecordsStored = sourceRecordsStored
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

  return { batch, inserted, validRecords: acceptedRecords, persistedRecords: inserted, sourceRecordsStored, persistenceStatus, persistenceErrors: allPersistenceErrors.slice(0, 20), total: records.length, assignedEntities, mlInference }
}

export default router
