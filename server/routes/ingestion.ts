import { Router } from 'express'
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

// Get current data quality summary
router.get('/quality', async (req, res) => {
  try {
    const recent = await IngestionBatch.find().sort({ createdAt: -1 }).limit(5).lean()
    const totalAlerts = await Alert.countDocuments()
    const totalCases = await Case.countDocuments()
    res.json({
      batches: recent,
      totals: { alerts: totalAlerts, cases: totalCases }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Upload & validate a data file (CSV/JSON)
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file
    if (!file) return res.status(400).json({ error: 'No file uploaded' })

    const content = fs.readFileSync(file.path, 'utf8')
    const source = req.body.source || 'file'
    const ext = path.extname(file.originalname).toLowerCase()

    let records: any[] = []
    if (ext === '.json') {
      const parsed = JSON.parse(content)
      records = Array.isArray(parsed) ? parsed : (parsed.records || [])
    } else if (ext === '.csv') {
      records = parseCSV(content)
    } else {
      return res.status(400).json({ error: 'Unsupported file type. Use CSV or JSON.' })
    }

    // Validate & ingest
    const validation = validateRecords(records)
    const result = await persistValidated(records, validation.valid, source, file.originalname)

    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Ingest from API (JSON payload)
router.post('/api', async (req, res) => {
  try {
    const records = req.body.records || req.body
    if (!Array.isArray(records)) return res.status(400).json({ error: 'Records must be an array' })
    const validation = validateRecords(records)
    const result = await persistValidated(records, validation.valid, 'API', null)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
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
      await Alert.create(r)
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