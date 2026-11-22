export interface IngestionLimits {
  maxUploadSizeMB: number
  maxUploadBytes: number
  maxRecords: number
  maxFields: number
  maxFieldLength: number
  sourceRecordRetentionDays: number
}

export class IngestionValidationError extends Error {
  readonly statusCode = 400
}

function boundedEnvironmentNumber(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number(value)
  return Math.min(max, Math.max(min, Number.isFinite(parsed) && parsed !== 0 ? parsed : fallback))
}

const maxUploadSizeMB = boundedEnvironmentNumber(process.env.UPLOAD_MAX_SIZE_MB, 50, 1, 100)

export const INGESTION_LIMITS: IngestionLimits = {
  maxUploadSizeMB,
  maxUploadBytes: maxUploadSizeMB * 1024 * 1024,
  maxRecords: boundedEnvironmentNumber(process.env.INGESTION_MAX_RECORDS, 10000, 1, 100000),
  maxFields: boundedEnvironmentNumber(process.env.INGESTION_MAX_FIELDS, 100, 1, 500),
  maxFieldLength: boundedEnvironmentNumber(process.env.INGESTION_MAX_FIELD_LENGTH, 10000, 1, 100000),
  sourceRecordRetentionDays: boundedEnvironmentNumber(process.env.SOURCE_RECORD_RETENTION_DAYS, 365, 30, 3650)
}

export function validateRecordLimits(records: unknown[], limits: IngestionLimits = INGESTION_LIMITS): void {
  if (records.length > limits.maxRecords) throw new IngestionValidationError(`The submission exceeds the ${limits.maxRecords} record limit.`)
  if (records.some(record =>
    !record ||
    typeof record !== 'object' ||
    Array.isArray(record) ||
    Object.keys(record).length > limits.maxFields ||
    Object.values(record).some(value => typeof value === 'string' && value.length > limits.maxFieldLength)
  )) {
    throw new IngestionValidationError(`Submission contains invalid records or exceeds ${limits.maxFields} fields or ${limits.maxFieldLength} characters per field.`)
  }
}

export function parseCSV(csv: string, limits: IngestionLimits = INGESTION_LIMITS): Record<string, string>[] {
  const text = csv.replace(/^\uFEFF/, '')
  if (!text.trim()) throw new IngestionValidationError('The CSV file is empty.')
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
  if (inQuotes) throw new IngestionValidationError('The CSV file contains an unclosed quoted field.')
  row.push(cell)
  if (row.some(value => value.trim() !== '')) rows.push(row)
  if (rows.length < 2) throw new IngestionValidationError('The CSV file must contain a header row and at least one data record.')

  const headers = rows[0].map(header => header.trim())
  if (headers.length > limits.maxFields) throw new IngestionValidationError(`The CSV file exceeds the ${limits.maxFields} field limit.`)
  if (headers.some(header => !header) || new Set(headers).size !== headers.length) throw new IngestionValidationError('The CSV header contains an empty or duplicate field name.')
  if (rows.length - 1 > limits.maxRecords) throw new IngestionValidationError(`The CSV file exceeds the ${limits.maxRecords} record limit.`)
  if (rows.some(values => values.length !== headers.length)) throw new IngestionValidationError('The CSV file contains rows with a different number of fields than its header.')
  if (rows.some(values => values.some(value => value.length > limits.maxFieldLength))) throw new IngestionValidationError(`A CSV field exceeds the ${limits.maxFieldLength} character limit.`)
  return rows.slice(1).map(cells => {
    const record: Record<string, string> = {}
    headers.forEach((header, index) => { if (header) record[header] = (cells[index] || '').trim() })
    return record
  })
}
