import path from 'path'
import { DOCUMENT_BUNDLE_CATEGORIES, type DocumentBundleCategory } from '../../shared/ingestionCategories'

type IngestionRow = Record<string, unknown>

export interface DocumentClassification {
  recommendedCategory: DocumentBundleCategory | null
  confidence: number
  reason: string
  warning?: string
  compatibleCategories: DocumentBundleCategory[]
  missingFields: string[]
  incompatibleFields: string[]
  recordCounts: Partial<Record<DocumentBundleCategory, number>>
}

const alertRequiredFields = [
  ['id', 'alertId'],
  ['entityId', 'entity_id', 'entityName', 'cseName', 'organizationName', 'legalEntityName', 'institutionName'],
  ['severity'],
  ['category'],
  ['asset'],
  ['createdAt', 'created_at']
]

const caseRequiredFields = [
  ['id', 'caseId'],
  ['entityId', 'entity_id', 'entityName', 'cseName', 'organizationName', 'legalEntityName', 'institutionName'],
  ['openedAt'],
  ['closureReason']
]

function hasValue(record: IngestionRow, fields: string[]): boolean {
  return fields.some(field => {
    const value = record[field]
    return value !== undefined && value !== null && String(value).trim() !== ''
  })
}

function isCaseRecord(record: IngestionRow): boolean {
  const id = String(record.id || '').toUpperCase()
  return hasValue(record, ['caseId', 'openedAt', 'investigationDepth', 'evidenceAttachments']) ||
    id.startsWith('CASE-')
}

export function recordMatchesBundleCategory(record: IngestionRow, category: DocumentBundleCategory): boolean {
  if (category === 'Cases CSV') return isCaseRecord(record)
  if (isCaseRecord(record)) return false
  return hasValue(record, ['id', 'alertId']) &&
    hasValue(record, ['severity']) &&
    hasValue(record, ['category']) &&
    hasValue(record, ['asset']) &&
    hasValue(record, ['createdAt', 'created_at'])
}

function missingFields(records: IngestionRow[], requiredGroups: string[][]): string[] {
  return requiredGroups
    .filter(fields => !records.every(record => hasValue(record, fields)))
    .map(fields => fields[0])
}

function candidateScore(records: IngestionRow[], requiredGroups: string[][]): number {
  const presentGroups = requiredGroups.filter(fields => records.every(record => hasValue(record, fields))).length
  return Math.round((presentGroups / requiredGroups.length) * 100)
}

export function classifyDocument(filename: string, records: IngestionRow[]): DocumentClassification {
  const extension = path.extname(filename).toLowerCase()
  const compatibleCategories: DocumentBundleCategory[] = []
  const recordCounts: Partial<Record<DocumentBundleCategory, number>> = {}
  const missingByCategory = new Map<DocumentBundleCategory, string[]>()
  const scores = new Map<DocumentBundleCategory, number>()

  for (const category of DOCUMENT_BUNDLE_CATEGORIES) {
    const formatMatches = category === 'SIEM JSON' ? extension === '.json' : extension === '.csv'
    if (!formatMatches) continue

    const matchingRecords = records.filter(record => recordMatchesBundleCategory(record, category))
    if (!matchingRecords.length) continue

    compatibleCategories.push(category)
    recordCounts[category] = matchingRecords.length
    const requiredGroups = category === 'Cases CSV' ? caseRequiredFields : alertRequiredFields
    missingByCategory.set(category, missingFields(matchingRecords, requiredGroups))
    scores.set(category, candidateScore(matchingRecords, requiredGroups))
  }

  if (!compatibleCategories.length) {
    const formatExpected = extension === '.json' ? 'SIEM JSON' : extension === '.csv' ? 'CEF CSV or Cases CSV' : 'CSV or JSON'
    return {
      recommendedCategory: null,
      confidence: 0,
      reason: 'The document does not contain a recognizable alert or case record structure.',
      warning: `No supported category matched this document. ${extension || 'This file'} must contain the fields expected for ${formatExpected}.`,
      compatibleCategories: [],
      missingFields: ['alert ID, entity, severity, category, asset and created time; or case ID, entity, opened time and closure reason'],
      incompatibleFields: [],
      recordCounts: {}
    }
  }

  const ranked = compatibleCategories
    .map(category => ({ category, count: recordCounts[category] || 0, score: scores.get(category) || 0 }))
    .sort((left, right) => right.count - left.count || right.score - left.score)
  const tied = ranked.length > 1 && ranked[0].count === ranked[1].count && ranked[0].score === ranked[1].score
  const recommendedCategory = tied ? null : ranked[0].category
  const selectedForExplanation = recommendedCategory || ranked[0].category
  const otherCount = records.length - (recordCounts[selectedForExplanation] || 0)
  const reason = selectedForExplanation === 'Cases CSV'
    ? `Found ${recordCounts[selectedForExplanation]} case-like CSV row(s) with case investigation fields.`
    : `Found ${recordCounts[selectedForExplanation]} alert-like ${extension.slice(1).toUpperCase()} row(s) with alert severity, category, asset and timestamp fields.`
  const warning = tied
    ? 'The document contains an equal mix of supported record types. Choose a category to process only its matching rows.'
    : undefined

  return {
    recommendedCategory,
    confidence: tied ? Math.min(...ranked.slice(0, 2).map(item => item.score)) : ranked[0].score,
    reason: otherCount > 0 ? `${reason} ${otherCount} row(s) belong to another category and will not be ingested in this assignment.` : reason,
    ...(warning ? { warning } : {}),
    compatibleCategories,
    missingFields: missingByCategory.get(selectedForExplanation) || [],
    incompatibleFields: otherCount > 0 ? ['Rows matching another category are excluded from this assignment.'] : [],
    recordCounts
  }
}
