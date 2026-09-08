import { Entity } from '../models/Entity'
import { EntityMetric } from '../models/EntityMetric'
import { Alert } from '../models/Alert'
import { Case } from '../models/Case'
import { Finding } from '../models/Finding'
import { TelemetryCoverage } from '../models/TelemetryCoverage'
import { peerBenchmark, overviewKPIs, detectExecutionGaps, detectBlindSpots, riskDistribution } from './analytics'

// ============================================================
// REPORT GENERATION
// Generates structured report content (JSON), CSV export, and
// builds in-memory content that can be served/downloaded.
// ============================================================

export function toCSV(rows: Record<string, any>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const escape = (v: any) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [headers.join(',')]
  for (const r of rows) lines.push(headers.map(h => escape(r[h])).join(','))
  return lines.join('\n')
}

export interface GeneratedReport {
  id: string
  name: string
  generatedAt: string
  data: any
}

// ---- Entity Assessment Report ----
export async function entityAssessmentReport(entityId: string): Promise<GeneratedReport> {
  const entity = await Entity.findOne({ id: entityId }).lean()
  if (!entity) throw new Error(`Entity ${entityId} not found`)
  const metric = await EntityMetric.findOne({ entityId, period: 'Q2 FY 2026-27' }).lean()
  if (!metric) throw new Error(`Metric for ${entityId} not found`)
  const findings = await Finding.find({ entityId }).lean()
  const benchmark = await peerBenchmark(entityId)

  const alerts = await Alert.countDocuments({ entityId })
  const cases = await Case.countDocuments({ entityId })
  const telemetry = await TelemetryCoverage.find({ entityId }).lean()

  return {
    id: `RPT-${Date.now()}`,
    name: `Entity Assessment Report — ${entityId}`,
    generatedAt: new Date().toISOString(),
    data: {
      entity: { id: entity.id, name: entity.name, sector: entity.sector, criticality: entity.criticality, telemetryCoverage: entity.telemetryCoverage },
      riskScore: metric.riskScore,
      prevRiskScore: metric.prevRiskScore,
      scoreBreakdown: { threatDetection: metric.threatDetection, investigation: metric.investigation, escalation: metric.escalation, incidentResponse: metric.incidentResponse, securityOperations: metric.securityOperations, governanceOversight: metric.governanceOversight, operationalDiscipline: metric.operationalDiscipline, cyberResilience: metric.cyberResilience },
      operationalVolume: { alerts, cases },
      findings: findings.map(f => ({ id: f.id, title: f.title, severity: f.severity, confidence: f.confidence, status: f.status })),
      benchmark,
      telemetry: telemetry.map(t => ({ category: t.category, observed: t.observed }))
    }
  }
}

// ---- Cross-Entity Supervisory Report ----
export async function crossEntityReport(): Promise<GeneratedReport> {
  const kpis = await overviewKPIs()
  const distribution = await riskDistribution()
  const entities = await Entity.find().lean()
  const metrics = await EntityMetric.find({ period: 'Q2 FY 2026-27' }).lean()
  const metricMap = new Map(metrics.map(m => [m.entityId, m]))

  return {
    id: `RPT-${Date.now()}`,
    name: 'Cross-Entity Supervisory Report',
    generatedAt: new Date().toISOString(),
    data: {
      kpis,
      distribution,
      entities: entities.map(e => ({
        id: e.id, sector: e.sector, criticality: e.criticality,
        riskScore: metricMap.get(e.id)?.riskScore,
        priority: metricMap.get(e.id)?.priority,
        telemetryCoverage: e.telemetryCoverage
      }))
    }
  }
}

// ---- Execution Gap Report ----
export async function executionGapReport(): Promise<GeneratedReport> {
  const findings = await Finding.find({}).lean()
  return {
    id: `RPT-${Date.now()}`,
    name: 'Execution Gap Report',
    generatedAt: new Date().toISOString(),
    data: {
      summary: {
        total: findings.length,
        critical: findings.filter(f => f.severity === 'Critical').length,
        high: findings.filter(f => f.severity === 'High').length,
        highConfidence: findings.filter(f => f.confidence >= 90).length
      },
      findings: findings.map(f => ({ id: f.id, title: f.title, entityId: f.entityId, controlArea: f.controlArea, severity: f.severity, confidence: f.confidence, status: f.status }))
    }
  }
}

// ---- Negative Space Report ----
export async function negativeSpaceReport(): Promise<GeneratedReport> {
  const blindSpots = await detectBlindSpots()
  const telemetry = await TelemetryCoverage.find().lean()
  const categories = [...new Set(telemetry.map(t => t.category))]

  const matrix = categories.map(cat => {
    const rows = telemetry.filter(t => t.category === cat)
    const avg = (k: string) => rows.length ? Math.round(rows.reduce((s, r) => s + ((r as any)[k] ?? 0), 0) / rows.length) : 0
    return { category: cat, expected: 100, observed: avg('observedCoverage'), alertGeneration: avg('alertGeneration'), investigationEvidence: avg('investigationEvidence'), escalationEvidence: avg('escalationEvidence') }
  })

  return {
    id: `RPT-${Date.now()}`,
    name: 'Negative Space Report',
    generatedAt: new Date().toISOString(),
    data: { blindSpots, coverageMatrix: matrix }
  }
}

// ---- Peer Benchmark Report ----
export async function peerBenchmarkReport(): Promise<GeneratedReport> {
  const entities = await Entity.find().lean()
  const rows = []
  for (const e of entities) {
    const b = await peerBenchmark(e.id)
    rows.push({ entity: e.id, sector: e.sector, benchmark: b })
  }
  return {
    id: `RPT-${Date.now()}`,
    name: 'Peer Benchmark Report',
    generatedAt: new Date().toISOString(),
    data: { entities: rows }
  }
}

// ---- Manual Review Summary ----
export async function manualReviewSummary(): Promise<GeneratedReport> {
  const findings = await Finding.find({ status: { $in: ['New', 'In Review'] } }).lean()
  return {
    id: `RPT-${Date.now()}`,
    name: 'Manual Review Summary',
    generatedAt: new Date().toISOString(),
    data: {
      pendingCount: findings.length,
      findings: findings.map(f => ({ id: f.id, title: f.title, entityId: f.entityId, severity: f.severity, confidence: f.confidence, suggestedAction: `Manual examination of ${f.controlArea || 'records'} recommended.` }))
    }
  }
}

export async function generateReport(reportId: string): Promise<GeneratedReport> {
  switch (reportId) {
    case 'RPT-01': return entityAssessmentReport('CSE-014')
    case 'RPT-02': return crossEntityReport()
    case 'RPT-03': return executionGapReport()
    case 'RPT-04': return negativeSpaceReport()
    case 'RPT-05': return peerBenchmarkReport()
    case 'RPT-06': return manualReviewSummary()
    default: throw new Error('Unknown report id: ' + reportId)
  }
}
