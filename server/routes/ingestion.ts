import { Router, Response } from 'express'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { IngestionBatch } from '../models/IngestionBatch'
import { Alert } from '../models/Alert'
import { Case } from '../models/Case'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadDir = path.join(__dirname, '..', '..', 'data', 'uploads')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

const upload = multer({ storage: multer.diskStorage({ destination: uploadDir, filename: (_r, file, cb) => cb(null, Date.now() + '-' + file.originalname) }) })

const router = Router()

function handleError(err: unknown, res: Response) {
  const message = err instanceof Error ? err.message : 'Unknown error'
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message } })
}

// Get current data quality summary
router.get('/quality', async (req, res) => {
  try {
    const recent = await IngestionBatch.find().sort({ createdAt: -1 }).limit(5).lean()
    const totalAlerts = await Alert.countDocuments()
    const totalCases = await Case.countDocuments()
    res.json({ success: true, data: { batches: recent, totals: { alerts: totalAlerts, cases: totalCases } } })
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

    const validation = validateRecords(records)
    const result = await persistValidated(records, validation.valid, 'Test Dataset: ' + filename, filename)
    res.json({ success: true, data: result })
  } catch (err) { handleError(err, res) }
})

// Upload & validate a data file (CSV/JSON)
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file
    if (!file) return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'No file uploaded' } })

    const content = fs.readFileSync(file.path, 'utf8')
    const source = req.body.source || 'file'
    const ext = path.extname(file.originalname).toLowerCase()

    let records: any[] = []
    if (ext === '.json') {
      const parsed = JSON.parse(content)
      records = Array.isArray(parsed) ? parsed : (parsed.records || parsed.alerts || parsed.cases || [parsed])
    } else if (ext === '.csv' || ext === '.cef' || ext === '.txt' || ext === '.log') {
      records = parseCSV(content)
    } else if (ext === '.zip' || ext === '.gz' || ext === '.tar') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ARCHIVE_EXTRACTION_REQUIRED',
          message: 'Compressed archive bundles (.zip/.tar.gz) must be extracted before air-gap ingestion. Please extract and upload the contained CSV, CEF, or JSON telemetry files directly.'
        }
      })
    } else {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Unsupported file type. Use CSV, CEF, or JSON.' } })
    }

    // Validate & ingest
    const validation = validateRecords(records)
    const result = await persistValidated(records, validation.valid, source, file.originalname)

    res.json({ success: true, data: result })
  } catch (err) { handleError(err, res) }
})

// Ingest from API (JSON payload)
router.post('/api', async (req, res) => {
  try {
    const records = req.body.records || req.body
    if (!Array.isArray(records)) return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Records must be an array' } })
    const validation = validateRecords(records)
    const result = await persistValidated(records, validation.valid, 'API', null)
    res.json({ success: true, data: result })
  } catch (err) { handleError(err, res) }
})

// ---- Helpers ----

function parseCSV(csv: string): any[] {
  const lines = csv.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim())
  return lines.slice(1).map(line => {
    const obj: any = {}
    const cells = splitCSVLine(line)
    headers.forEach((h, i) => { obj[h] = cells[i]?.trim() })
    return obj
  })
}

function splitCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; continue }
    if (ch === ',' && !inQuotes) { result.push(current); current = ''; continue }
    current += ch
  }
  result.push(current)
  return result
}

interface ValidationResult { valid: any[]; validCount: number; invalidCount: number; missingFields: number; duplicateCount: number; warnings: string[] }

function validateRecords(records: any[]): ValidationResult {
  const seen = new Set<string>()
  let validCount = 0
  let invalidCount = 0
  let missingFields = 0
  let duplicateCount = 0
  const warnings: string[] = []
  const valid: any[] = []

  for (const r of records) {
    const id = r.id || r.alertId || r.caseId
    const missing = ['severity', 'category'].filter(k => !r[k.toLowerCase()] && !r[k]).length
    if (missing) missingFields++
    if (id && seen.has(id)) { duplicateCount++; continue }
    if (id) seen.add(id)
    if (!r.severity && !r.category) { invalidCount++; continue }
    valid.push(normalizeRecord(r))
    validCount++
  }

  const criticalMissing = records.filter(r => (r.criticality === 'Critical' || r.severity === 'Critical') && (!r.asset && !r.telemetry)).length
  if (criticalMissing / (records.length || 1) > 0.1) {
    warnings.push(`${Math.round((criticalMissing / (records.length || 1)) * 100)}% of critical asset records contain incomplete telemetry information.`)
  }
  if (missingFields / (records.length || 1) > 0.05) {
    warnings.push(`${((missingFields / (records.length || 1)) * 100).toFixed(1)}% of alert records lack asset attribution.`)
  }

  return { valid, validCount, invalidCount, missingFields, duplicateCount, warnings }
}

function normalizeRecord(r: any): any {
  return {
    id: r.id || r.alertId || `ALERT-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
    entityId: r.entityId || r.entity || 'CSE-000',
    category: r.category || 'Unknown',
    asset: r.asset || 'Unknown',
    severity: r.severity || 'Low',
    status: r.status || 'closed',
    createdAt: r.createdAt || r.created_at || new Date().toISOString(),
    ...r
  }
}

async function persistValidated(records: any[], valid: any[], source: string, filename: string | null) {
  let inserted = 0
  for (const r of valid) {
    try {
      if (r.closureReason || r.investigationDepth !== undefined || (r.id && String(r.id).startsWith('CASE-'))) {
        await Case.create(r)
      } else {
        await Alert.create(r)
      }
      inserted++
    } catch { /* duplicate or bad record */ }
  }

  const batch = await IngestionBatch.create({
    source, filename,
    recordsReceived: records.length,
    validRecords: valid.length,
    invalidRecords: records.length - valid.length,
    missingFields: 0,
    duplicateRecords: records.length - inserted,
    entitiesDetected: new Set(valid.map(r => r.entityId)).size,
    status: 'validated',
    qualityPct: records.length ? Math.round((valid.length / records.length) * 100) : 0,
    warnings: []
  })

  return { batch, inserted, total: records.length }
}

export default router