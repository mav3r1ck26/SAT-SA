import { Entity } from '../models/Entity'
import { EntityMetric } from '../models/EntityMetric'
import { Alert } from '../models/Alert'
import { Case } from '../models/Case'
import { TelemetryCoverage } from '../models/TelemetryCoverage'
import { Finding } from '../models/Finding'
import { EvidenceEvent } from '../models/EvidenceEvent'
import { AuditLog } from '../models/AuditLog'
import { getConfig, getConfigurationRevision } from './configuration'
import { ASSESSMENT_FRAMEWORK, buildEntityAssessment, getFrameworkDimensionWeights } from './assessmentFramework'

interface ConfigValues {
  rapidClosurePercentile: number
  criticalNoEscalationThreshold: number
  templateReuseThreshold: number
  zeroDepthThreshold: number
  telemetryCoverageWarning: number
  negativeSpaceCriticalThreshold: number
  negativeSpaceWarningThreshold: number
  negativeSpaceHistoricalDeviation: number
  negativeSpacePeerDeviation: number
  peerDeviationSignificant: number
  peerMinSampleSize: number
  riskWeights: Record<string, number>
  confidenceFactors: Record<string, number>
  reviewPriorityWeights: Record<string, number>
  anomalyIQRMultiplier: number
  anomalyZScoreThreshold: number
  anomalyPercentileLow: number
  anomalyPercentileHigh: number
  mlEnabled: boolean
  mlRiskThreshold: number
  mlConfidenceThreshold: number
}

let configCache: ConfigValues | null = null
let configCacheRevision = -1

async function loadConfig(): Promise<ConfigValues> {
  const revision = getConfigurationRevision()
  if (configCache && configCacheRevision === revision) return configCache
  const configs = await Promise.all([
    getConfig('rapidClosurePercentile'),
    getConfig('criticalNoEscalationThreshold'),
    getConfig('templateReuseThreshold'),
    getConfig('zeroDepthThreshold'),
    getConfig('telemetryCoverageWarning'),
    getConfig('negativeSpaceCriticalThreshold'),
    getConfig('negativeSpaceWarningThreshold'),
    getConfig('negativeSpaceHistoricalDeviation'),
    getConfig('negativeSpacePeerDeviation'),
    getConfig('peerDeviationSignificant'),
    getConfig('peerMinSampleSize'),
    getConfig('riskWeights'),
    getConfig('confidenceFactors'),
    getConfig('reviewPriorityWeights'),
    getConfig('anomalyIQRMultiplier'),
    getConfig('anomalyZScoreThreshold'),
    getConfig('anomalyPercentileLow'),
    getConfig('anomalyPercentileHigh'),
    getConfig('mlEnabled'),
    getConfig('mlRiskThreshold'),
    getConfig('mlConfidenceThreshold')
  ])
  const keys = [
    'rapidClosurePercentile', 'criticalNoEscalationThreshold', 'templateReuseThreshold',
    'zeroDepthThreshold', 'telemetryCoverageWarning', 'negativeSpaceCriticalThreshold',
    'negativeSpaceWarningThreshold', 'negativeSpaceHistoricalDeviation', 'negativeSpacePeerDeviation',
    'peerDeviationSignificant', 'peerMinSampleSize', 'riskWeights',
    'confidenceFactors', 'reviewPriorityWeights', 'anomalyIQRMultiplier', 'anomalyZScoreThreshold',
    'anomalyPercentileLow', 'anomalyPercentileHigh', 'mlEnabled', 'mlRiskThreshold', 'mlConfidenceThreshold'
  ]
  configCache = Object.fromEntries(keys.map((k, i) => [k, configs[i]])) as unknown as ConfigValues
  configCacheRevision = revision
  return configCache
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const idx = Math.ceil(p / 100 * sorted.length) - 1
  return sorted[Math.max(0, idx)]
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0
  const s = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0
  const m = arr.reduce((a, b) => a + b, 0) / arr.length
  return Math.sqrt(arr.reduce((a, b) => a + Math.pow(b - m, 2), 0) / arr.length)
}

function iqrOutliers(arr: number[], mult = 1.5): number[] {
  if (arr.length < 4) return []
  const sorted = [...arr].sort((a, b) => a - b)
  const q1 = percentile(sorted, 25)
  const q3 = percentile(sorted, 75)
  const iqr = q3 - q1
  const lower = q1 - mult * iqr
  const upper = q3 + mult * iqr
  return sorted.filter(v => v < lower || v > upper)
}

async function peerStats(period: string, sector?: string) {
  const filter = sector ? { sector } : {}
  const metrics = await EntityMetric.find({ period }).lean()
  const entities = await Entity.find(filter).lean()
  const entityIds = new Set(entities.map(e => e.id))
  const g = metrics.filter(m => entityIds.has(m.entityId))
  if (g.length === 0) return null
  const numericMedian = (values: Array<number | null | undefined>) => {
    const finite = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
    return finite.length ? median(finite) : null
  }
  return {
    count: g.length,
    riskMedian: numericMedian(g.map(m => m.riskScore)),
    threatDetectionMedian: numericMedian(g.map(m => m.threatDetection)),
    investigationMedian: numericMedian(g.map(m => m.investigation)),
    escalationMedian: numericMedian(g.map(m => m.escalation)),
    incidentResponseMedian: numericMedian(g.map(m => m.incidentResponse)),
    securityOperationsMedian: numericMedian(g.map(m => m.securityOperations)),
    governanceOversightMedian: numericMedian(g.map(m => m.governanceOversight)),
    operationalDisciplineMedian: numericMedian(g.map(m => m.operationalDiscipline)),
    cyberResilienceMedian: numericMedian(g.map(m => m.cyberResilience)),
    execGapsMedian: numericMedian(g.map(m => m.executionGapCount)),
    negSpaceMedian: numericMedian(g.map(m => m.negativeSpaceCount))
  }
}

function percentileRank(value: number, population: number[]): number {
  if (population.length === 0) return 50
  const below = population.filter(v => v < value).length
  const equal = population.filter(v => v === value).length
  return Math.round(((below + equal / 2) / population.length) * 100)
}

export async function recomputeEntityRisk(entityId: string, period: string) {
  const metric = await EntityMetric.findOne({ entityId, period })
  if (!metric) return null
  const newScore = computeRiskScore(metric, getFrameworkDimensionWeights(), (await loadConfig()).riskWeights)
  if (newScore === null) return null
  const assessment = buildEntityAssessment(metric)
  const needsSave = newScore !== metric.riskScore || metric.maturityScore !== assessment.maturityScore ||
    metric.assessmentFrameworkId !== ASSESSMENT_FRAMEWORK.id || metric.assessmentFrameworkVersion !== ASSESSMENT_FRAMEWORK.version
  if (needsSave) {
    metric.riskScore = newScore
    metric.riskLevel = riskLevel(newScore)
    metric.maturityScore = assessment.maturityScore
    metric.assessmentFrameworkId = ASSESSMENT_FRAMEWORK.id
    metric.assessmentFrameworkVersion = ASSESSMENT_FRAMEWORK.version
    await metric.save()
  }
  return newScore
}

export async function recomputeAllRisks(period: string) {
  const config = await loadConfig()
  const metrics = await EntityMetric.find({ period })
  for (const m of metrics) {
    const newScore = computeRiskScore(m, getFrameworkDimensionWeights(), config.riskWeights)
    if (newScore === null) continue
    const assessment = buildEntityAssessment(m)
    if (newScore !== m.riskScore || m.maturityScore !== assessment.maturityScore ||
      m.assessmentFrameworkId !== ASSESSMENT_FRAMEWORK.id || m.assessmentFrameworkVersion !== ASSESSMENT_FRAMEWORK.version) {
      m.riskScore = newScore
      m.riskLevel = riskLevel(newScore)
      m.maturityScore = assessment.maturityScore
      m.assessmentFrameworkId = ASSESSMENT_FRAMEWORK.id
      m.assessmentFrameworkVersion = ASSESSMENT_FRAMEWORK.version
      await m.save()
    }
  }
}

function computeRiskScore(metrics: any, dimensionWeights: Record<string, number>, riskWeights: Record<string, number>): number | null {
  const dims: Record<string, number> = {
    threatDetection: metrics.threatDetection,
    investigation: metrics.investigation,
    escalation: metrics.escalation,
    incidentResponse: metrics.incidentResponse,
    securityOperations: metrics.securityOperations,
    governanceOversight: metrics.governanceOversight,
    operationalDiscipline: metrics.operationalDiscipline,
    cyberResilience: metrics.cyberResilience
  }
  if (Object.values(dims).some(value => !Number.isFinite(value))) return null
  const dimensionWeightTotal = Object.values(dimensionWeights).reduce((total, weight) => total + weight, 0)
  if (dimensionWeightTotal <= 0) return null
  const dimensionRisk = Object.entries(dimensionWeights).reduce((score, [key, weight]) => {
    const dimension = dims[key]
    return score + (100 - dimension) * weight
  }, 0) / dimensionWeightTotal

  const peerRisk: Record<string, number> = {
    'Significantly Below': 100,
    Below: 70,
    'In Range': 30,
    Above: 15,
    'Significantly Above': 0
  }
  const components: Record<string, number | undefined> = {
    executionGaps: metrics.executionGapCount == null ? undefined : Math.min(100, metrics.executionGapCount * 10),
    negativeSpace: metrics.negativeSpaceCount == null ? undefined : Math.min(100, metrics.negativeSpaceCount * 10),
    peerDeviation: peerRisk[metrics.peerDeviation],
    mlRiskProbability: metrics.scoreComponents?.mlRiskProbability,
    anomalyIndicators: metrics.anomalyCount == null ? undefined : Math.min(100, metrics.anomalyCount * 10),
    dataQuality: metrics.dataQualityIssues == null ? undefined : Math.max(0, 100 - metrics.dataQualityIssues * 10)
  }
  let adjustment = 0
  for (const [key, value] of Object.entries(components)) {
    if (value !== undefined && Number.isFinite(value)) adjustment += (value - 50) * (riskWeights[key] ?? 0)
  }
  return Math.min(99, Math.max(0, Math.round(dimensionRisk + adjustment)))
}

type RiskLevel = 'Critical' | 'High' | 'Moderate' | 'Low' | 'Normal'

function riskLevel(score: number): RiskLevel {
  if (score >= 85) return 'Critical'
  if (score >= 70) return 'High'
  if (score >= 55) return 'Moderate'
  if (score >= 40) return 'Low'
  return 'Normal'
}

function computeConfidence(factors: {
  dataCompleteness: number
  evidenceCount: number
  signalConsistency: number
  modelConfidence: number
  peerSampleSize: number
  historicalConsistency: number
  ruleReliability: number
}, weights: Record<string, number>): number {
  const scores = {
    dataCompleteness: Math.min(100, factors.dataCompleteness),
    evidenceCount: Math.min(100, factors.evidenceCount * 10),
    signalConsistency: Math.min(100, factors.signalConsistency),
    modelConfidence: factors.modelConfidence,
    peerSampleSize: Math.min(100, factors.peerSampleSize * 10),
    historicalConsistency: Math.min(100, factors.historicalConsistency),
    ruleReliability: Math.min(100, factors.ruleReliability * 20)
  }
  let total = 0, weightSum = 0
  for (const [k, w] of Object.entries(weights)) {
    total += (scores[k as keyof typeof scores] ?? 0) * w
    weightSum += w
  }
  return weightSum > 0 ? Math.round(total / weightSum) : 50
}

function anomalyScoreIQR(value: number, population: number[], mult = 1.5): number {
  if (population.length < 4) return 0
  const outliers = iqrOutliers(population, 1.5)
  if (outliers.length === 0) return 0
  const sorted = [...population].sort((a, b) => a - b)
  const q1 = percentile(sorted, 25)
  const q3 = percentile(sorted, 75)
  const iqr = q3 - q1
  if (value < sorted[0]) return Math.min(100, ((sorted[0] - value) / (iqr || 1)) * 25)
  if (value > sorted[sorted.length - 1]) return Math.min(100, ((value - sorted[sorted.length - 1]) / (iqr || 1)) * 25)
  return 0
}

function anomalyScoreZScore(value: number, population: number[], threshold = 3): number {
  if (population.length < 2) return 0
  const m = population.reduce((a, b) => a + b, 0) / population.length
  const sd = stdDev(population)
  if (sd === 0) return 0
  const z = Math.abs((value - m) / sd)
  return Math.min(100, Math.round((z / threshold) * 100))
}

function anomalyScorePercentile(value: number, population: number[], low = 5, high = 95): number {
  if (population.length === 0) return 0
  const pLow = percentile(population, low)
  const pHigh = percentile(population, high)
  if (value < pLow) return Math.min(100, Math.round(((pLow - value) / (pLow || 1)) * 100))
  if (value > pHigh) return Math.min(100, Math.round(((value - pHigh) / (pHigh || 1)) * 100))
  return 0
}

// ============================================================
// EXECUTION GAP DETECTION
// ============================================================
export async function detectExecutionGaps(period: string, entityId?: string) {
  const config = await loadConfig()
  const filter: any = {}
  if (entityId) filter.entityId = entityId
  const entities = entityId ? [entityId] : (await Entity.find().lean()).map(e => e.id)
  const gaps: any[] = []

  for (const eid of entities) {
    const cases = await Case.find({ entityId: eid, period }).lean()
    const total = cases.length

    const fast = cases.filter(c => c.behaviour === 'Unusually Fast' || c.behaviour === 'Requires Review').length
    const template = cases.filter(c => c.isTemplateReuse === 1).length
    const zeroDepth = cases.filter(c => c.investigationDepth === 0).length

    if (total > 0) {
      // Rapid closure - percentile-based
      const durations = cases.map(c => c.durationMin).filter(d => d != null) as number[]
      const fastPct = durations.length ? percentile(durations, config.rapidClosurePercentile) : 0
      const fastCases = cases.filter(c => (c.durationMin ?? 9999) <= fastPct).length

      if (fastCases > 0 && fastCases / total > 0.1) {
        const ratio = fastCases / total
        const supportingCases = cases
          .filter(c => (c.durationMin ?? 9999) <= fastPct)
          .map(c => c.id)
          .slice(0, 100)
        gaps.push({
          findingType: 'EXECUTION_GAP',
          period,
          title: 'Rapid Closure Without Investigation',
          entityId: eid,
          controlArea: 'Investigation',
          severity: ratio > 0.4 ? 'Critical' : 'High',
          confidence: Math.min(96, Math.round(60 + ratio * 80)),
          evidenceCount: fastCases,
          evidenceReferences: supportingCases,
          description: `${fastCases} cases closed below ${config.rapidClosurePercentile}th percentile duration (${fastPct} min).`,
          methodology: `Closure duration compared against ${config.rapidClosurePercentile}th percentile of entity historical baseline and peer distribution.`,
          limitations: 'Short closure may reflect efficient automated triage rather than a gap.',
          peerComparison: 'Investigation duration significantly below peer baseline',
          recommendation: 'Manual examination of rapidly closed cases recommended.'
        })
      }

      if (template / total > config.templateReuseThreshold) {
        const supportingCases = cases.filter(c => c.isTemplateReuse === 1).map(c => c.id).slice(0, 100)
        gaps.push({
          findingType: 'EXECUTION_GAP',
          period,
          title: 'Repeated Template Investigation',
          entityId: eid,
          controlArea: 'Investigation',
          severity: template / total > 0.2 ? 'High' : 'Medium',
          confidence: Math.min(92, Math.round(60 + (template / total) * 100)),
          evidenceCount: template,
          evidenceReferences: supportingCases,
          description: `${template} cases share near-identical investigation narratives.`,
          methodology: 'N-gram similarity over investigation note text. Cases with >90% similarity flagged.',
          limitations: 'Similar incidents may legitimately yield similar notes.',
          peerComparison: 'Template reuse above peer average',
          recommendation: 'Review investigation templates for over-reliance on boilerplate text.'
        })
      }

      if (zeroDepth / total > config.zeroDepthThreshold) {
        const supportingCases = cases.filter(c => c.investigationDepth === 0).map(c => c.id).slice(0, 100)
        gaps.push({
          findingType: 'EXECUTION_GAP',
          period,
          title: 'Superficial Investigation',
          entityId: eid,
          controlArea: 'Alert Handling',
          severity: 'Medium',
          confidence: Math.min(90, Math.round(55 + (zeroDepth / total) * 80)),
          evidenceCount: zeroDepth,
          evidenceReferences: supportingCases,
          description: `${zeroDepth} cases closed with zero investigation depth.`,
          methodology: 'Investigation depth proxy (actions, notes, evidence attachments) compared against closure.',
          limitations: 'Depth indicators may not capture offline analysis.',
          peerComparison: 'Investigation depth below peer median',
          recommendation: 'Verify investigation depth recording for low-depth cases.'
        })
      }
    }

    const alerts = await Alert.find({ entityId: eid, period, severity: 'Critical' }).lean()
    const critTotal = alerts.length
    const criticalAlertsWithoutEscalation = alerts.filter(a => !a.escalationPath)
    const critNoEsc = criticalAlertsWithoutEscalation.length

    const e = await Entity.findOne({ id: eid }).lean()
    const sector = e?.sector
    const ps = await peerStats(period, sector)

    if (critTotal > 0 && critNoEsc / critTotal > config.criticalNoEscalationThreshold) {
      const ratio = critNoEsc / critTotal
      gaps.push({
        findingType: 'EXECUTION_GAP',
        period,
        title: 'Critical Alert Without Escalation',
        entityId: eid,
        controlArea: 'Escalation',
        severity: ratio > 0.3 ? 'Critical' : 'High',
        confidence: Math.min(95, Math.round(60 + ratio * 80)),
        evidenceCount: critNoEsc,
        evidenceReferences: criticalAlertsWithoutEscalation.map(alert => alert.id).slice(0, 100),
        description: `${critNoEsc} critical alerts resolved with no recorded escalation.`,
        methodology: 'Critical-alert resolution cross-referenced against escalation events in case timeline.',
        limitations: 'Escalation may occur outside the system of record.',
        peerComparison: 'Escalation rate below peer baseline',
        recommendation: 'Verify escalation procedures for critical alerts.'
      })
    }
  }

  return gaps
}

export async function persistFindings(gaps: any[]) {
  for (const g of gaps) {
    const existing = await Finding.findOne({ findingType: g.findingType, entityId: g.entityId, period: g.period, title: g.title })
    if (existing) {
      Object.assign(existing, g)
      await existing.save()
    } else {
      const count = await Finding.countDocuments()
      await Finding.create({
        id: `EG-${180 + count + 1}`,
        ...g,
        status: 'New',
        whyItMatters: g.description,
        recommendation: g.recommendation
      })
    }
  }
}

// ============================================================
// NEGATIVE SPACE / BLIND SPOTS
// ============================================================
export async function detectBlindSpots(period: string, entityId?: string) {
  const config = await loadConfig()
  const filter: any = {}
  if (entityId) filter.entityId = entityId
  filter.period = period
  const rows = await TelemetryCoverage.find(filter).lean()
  const blindSpots: any[] = []

  for (const r of rows) {
    const observed = r.observedCoverage ?? r.observed
    if (observed == null) continue
    // Critical threshold
    if (observed < config.negativeSpaceCriticalThreshold) {
      blindSpots.push({
        entityId: r.entityId,
        assetGroup: r.assetGroup,
        category: r.category,
        observedPct: observed,
        severity: 'Critical',
        confidence: Math.min(95, 50 + (config.negativeSpaceCriticalThreshold - observed)),
        description: `Only ${observed}% of expected telemetry observed for ${r.category} (critical threshold: ${config.negativeSpaceCriticalThreshold}%).`,
        methodology: `Observed coverage compared against critical threshold (${config.negativeSpaceCriticalThreshold}%) and peer median.`,
        limitations: 'Telemetry may be aggregated or monitored through alternate channels.',
        peerComparison: `Coverage ${Math.round(50 - observed)}% below sector median`,
        recommendation: 'Immediate telemetry deployment review for critical asset group.'
      })
    }
    // Warning threshold
    else if (observed < config.negativeSpaceWarningThreshold) {
      blindSpots.push({
        entityId: r.entityId,
        assetGroup: r.assetGroup,
        category: r.category,
        observedPct: observed,
        severity: 'High',
        confidence: Math.min(90, 40 + (config.negativeSpaceWarningThreshold - observed)),
        description: `Only ${observed}% of expected telemetry observed for ${r.category} (warning threshold: ${config.negativeSpaceWarningThreshold}%).`,
        methodology: `Observed coverage compared against warning threshold (${config.negativeSpaceWarningThreshold}%) and historical baseline.`,
        limitations: 'Telemetry may be aggregated or monitored through alternate channels.',
        peerComparison: `Coverage below sector median`,
        recommendation: 'Schedule telemetry enhancement for this asset group.'
      })
    }
  }
  return blindSpots.sort((a, b) => a.observedPct - b.observedPct)
}

// ============================================================
// ESCALATION ANALYTICS
type AlertSeverity = 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational'
type CaseBehaviour = 'Normal' | 'Unusually Fast' | 'Superficial' | 'Repetitive' | 'Requires Review'

// ============================================================
export async function escalationAnalytics(period: string, entityId?: string) {
  const scope = { period, ...(entityId ? { entityId } : {}) }
  const critTotal = await Alert.countDocuments({ ...scope, severity: 'Critical' as const })
  const critEsc = await Alert.countDocuments({ ...scope, severity: 'Critical' as const, escalationPath: { $exists: true, $nin: [null, ''] } })

  const severities: AlertSeverity[] = ['Critical', 'High', 'Medium', 'Low', 'Informational']
  const severityMatrix = []
  for (const sev of severities) {
    const total = await Alert.countDocuments({ ...scope, severity: sev })
    const esc = await Alert.countDocuments({ ...scope, severity: sev, escalationPath: { $exists: true, $nin: [null, ''] } })
    severityMatrix.push({ severity: sev, escalated: esc, notEscalated: total - esc })
  }

  const pathsAgg = await Alert.aggregate([
    { $match: { ...scope, escalationPath: { $exists: true, $nin: [null, ''] } } },
    { $group: { _id: '$escalationPath', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ])

  const delayDist = await Alert.aggregate([
    { $match: { ...scope, escalationDelayMin: { $gte: 0 } } },
    { $bucket: { groupBy: '$escalationDelayMin', boundaries: [0, 60, 240, 1440, 10080, Infinity], default: 'Other', output: { count: { $sum: 1 } } } }
  ])

  const delayRanges = [
    { label: '< 1 hour', severity: 'On time', color: '#10b981' },
    { label: '1–4 hours', severity: 'Low delay', color: '#06b6d4' },
    { label: '4–24 hours', severity: 'Elevated delay', color: '#f59e0b' },
    { label: '1–7 days', severity: 'Late', color: '#f97316' },
    { label: '> 7 days', severity: 'Severe delay', color: '#ef4444' },
  ]
  const escalatedWithin24h = await Alert.countDocuments({ ...scope, escalationPath: { $exists: true, $nin: [null, ''] }, escalationDelayMin: { $lte: 1440 } })
  const escalationOver24h = await Alert.countDocuments({ ...scope, escalationPath: { $exists: true, $nin: [null, ''] }, escalationDelayMin: { $gt: 1440 } })

  return {
    escalatedCritical: critEsc,
    notEscalatedCritical: critTotal - critEsc,
    severityMatrix,
    escalatedWithin24h,
    escalationOver24h,
    paths: pathsAgg.filter(p => p._id).map(p => ({ path: p._id, count: p.count })),
    delayDistribution: delayDist.filter(d => Number.isFinite(d._id)).map(d => ({ ...delayRanges[[0, 60, 240, 1440, 10080].indexOf(Number(d._id))], count: d.count })),
    anomalies: severityMatrix
      .filter(s => s.severity === 'Critical' || s.severity === 'High')
      .filter(s => (s.notEscalated / (s.escalated + s.notEscalated || 1)) > 0.2)
      .map(s => ({ label: `${s.severity} + No escalation`, count: s.notEscalated, severity: s.severity }))
  }
}

// ============================================================
// ALERT ANALYTICS
// ============================================================
export async function alertAnalytics(period: string, entityId?: string) {
  const scope = { period, ...(entityId ? { entityId } : {}) }
  const total = await Alert.countDocuments(scope)
  const severities: AlertSeverity[] = ['Critical', 'High', 'Medium', 'Low', 'Informational']
  const distribution = []
  for (const sev of severities) {
    distribution.push({ severity: sev, count: await Alert.countDocuments({ ...scope, severity: sev }) })
  }

  const [alertCategories, linkedCases] = await Promise.all([
    Alert.find(scope).select({ id: 1, category: 1 }).lean(),
    Case.find({ ...scope, alertId: { $ne: null } }).select({ alertId: 1 }).lean(),
  ])
  const linkedAlertIds = new Set(linkedCases.map(item => item.alertId).filter(Boolean))
  const conversions = new Map<string, { category: string; alerts: number; cases: number }>()
  for (const alert of alertCategories) {
    const row = conversions.get(alert.category) || { category: alert.category, alerts: 0, cases: 0 }
    row.alerts++
    if (linkedAlertIds.has(alert.id)) row.cases++
    conversions.set(alert.category, row)
  }
  const conversionAgg = [...conversions.values()].sort((a, b) => b.alerts - a.alerts)

  const ackAvg = await Alert.aggregate([{ $match: { ...scope, acknowledgementTimeMin: { $ne: null } } }, { $group: { _id: null, v: { $avg: '$acknowledgementTimeMin' } } }])
  const invAvg = await Alert.aggregate([{ $match: { ...scope, investigationTimeMin: { $ne: null } } }, { $group: { _id: null, v: { $avg: '$investigationTimeMin' } } }])
  const cloAvg = await Alert.aggregate([{ $match: { ...scope, closureTimeMin: { $ne: null } } }, { $group: { _id: null, v: { $avg: '$closureTimeMin' } } }])
  const linkedCaseCount = await Case.countDocuments({ ...scope, alertId: { $ne: null } })
  const criticalClosureCount = await Alert.countDocuments({ ...scope, severity: 'Critical', status: 'closed' })

  const monthlySeverity = await Alert.aggregate([
    { $match: { ...scope, createdAt: { $ne: null } } },
    { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, severity: '$severity' }, count: { $sum: 1 } } },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ])
  const volumeByMonthMap = new Map<string, any>()
  for (const row of monthlySeverity) {
    const monthLabel = `${row._id.year}-${String(row._id.month).padStart(2, '0')}`
    const bucket = volumeByMonthMap.get(monthLabel) || { month: monthLabel, critical: 0, high: 0, medium: 0, low: 0, total: 0 }
    const key = String(row._id.severity || '').toLowerCase()
    if (key in bucket) bucket[key] = row.count
    bucket.total += row.count
    volumeByMonthMap.set(monthLabel, bucket)
  }
  const dispositionAgg = await Alert.aggregate([
    { $match: { period } },
    { $group: { _id: { $ifNull: ['$disposition', '$closureNote'] }, count: { $sum: 1 } } },
    { $sort: { count: -1 } }, { $limit: 8 }
  ])

  const lifecycle = []
  if (ackAvg.length) lifecycle.push({ stage: 'Acknowledgment', meanMin: +ackAvg[0].v.toFixed(1) })
  if (invAvg.length) lifecycle.push({ stage: 'Investigation Start', meanMin: +invAvg[0].v.toFixed(1) })
  if (cloAvg.length) lifecycle.push({ stage: 'Closure', meanMin: +cloAvg[0].v.toFixed(1) })

  // Repeat alerts by asset
  const repeatAlerts = await Alert.aggregate([
    { $match: scope },
    { $group: { _id: '$asset', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ])

  // Critical closure patterns
  const criticalClosure = await Alert.aggregate([
    { $match: { period, severity: 'Critical' as const, status: 'closed' } },
    { $group: { _id: '$closureNote', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ])

  return {
    total,
    kpis: {
      totalAlerts: total,
      meanAckTime: ackAvg[0] ? `${ackAvg[0].v.toFixed(1)} min` : '—',
      meanClosure: cloAvg[0] ? `${cloAvg[0].v.toFixed(1)} min` : '—',
      alertToCase: total ? `${((linkedCaseCount / total) * 100).toFixed(1)}%` : '0%',
      criticalClosures: criticalClosureCount,
    },
    volumeByMonth: [...volumeByMonthMap.values()],
    severityDistribution: distribution,
    conversion: conversionAgg.map(c => ({ category: c.category, alerts: c.alerts, cases: c.cases, rate: c.alerts ? +((c.cases / c.alerts) * 100).toFixed(1) : 0 })),
    disposition: dispositionAgg.filter(x => x._id).map(x => ({ disposition: x._id, count: x.count })),
    lifecycle,
    repeatAlerts: repeatAlerts.map(a => ({ asset: a._id, count: a.count })),
    criticalClosure: criticalClosure.map(c => ({ pattern: c._id, count: c.count }))
  }
}

// ============================================================
// INVESTIGATION ANALYTICS
// ============================================================
export async function investigationAnalytics(period: string, entityId?: string) {
  const scope = { period, ...(entityId ? { entityId } : {}) }
  const total = await Case.countDocuments(scope)
  const behaviours: CaseBehaviour[] = ['Normal', 'Superficial', 'Repetitive', 'Unusually Fast', 'Requires Review']
  const behaviour = []
  for (const b of behaviours) {
    behaviour.push({ classification: b, count: await Case.countDocuments({ ...scope, behaviour: b }) })
  }

  const duration = await Case.aggregate([
    { $match: { ...scope, closedAt: { $ne: null } } },
    { $group: {
      _id: null,
      d1: { $sum: { $cond: [{ $lt: [{ $ifNull: ['$durationMin', 99999] }, 10] }, 1, 0] } },
      d2: { $sum: { $cond: [{ $and: [{ $gte: [{ $ifNull: ['$durationMin', 0] }, 10] }, { $lt: [{ $ifNull: ['$durationMin', 0] }, 30] }] }, 1, 0] } },
      d3: { $sum: { $cond: [{ $and: [{ $gte: [{ $ifNull: ['$durationMin', 0] }, 30] }, { $lt: [{ $ifNull: ['$durationMin', 0] }, 60] }] }, 1, 0] } },
      d4: { $sum: { $cond: [{ $and: [{ $gte: [{ $ifNull: ['$durationMin', 0] }, 60] }, { $lt: [{ $ifNull: ['$durationMin', 0] }, 240] }] }, 1, 0] } },
      d5: { $sum: { $cond: [{ $and: [{ $gte: [{ $ifNull: ['$durationMin', 0] }, 240] }, { $lt: [{ $ifNull: ['$durationMin', 0] }, 1440] }] }, 1, 0] } },
      d6: { $sum: { $cond: [{ $gte: [{ $ifNull: ['$durationMin', 0] }, 1440] }, 1, 0] } }
    }}
  ])

  const reopening = await Case.aggregate([
    { $match: scope }, { $group: { _id: '$entityId', reopened: { $sum: '$reopenedCount' }, total: { $sum: 1 } } }
  ])

  const depth = await Case.aggregate([
    { $match: scope }, { $group: { _id: '$investigationDepth', count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ])

  const evidenceFreq = await Case.aggregate([
    { $match: scope }, { $group: { _id: '$evidenceCount', avgPerCase: { $avg: '$evidenceCount' }, cases: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ])

  const workload = await Case.aggregate([
    { $match: { ...scope, investigator: { $ne: null } } },
    { $group: { _id: '$investigator', cases: { $sum: 1 }, avgDuration: { $avg: '$durationMin' } } },
    { $sort: { cases: -1 } }
  ])

  const [durationAverage, reopenedCases, casesRequiringReview] = await Promise.all([
    Case.aggregate([{ $match: scope }, { $group: { _id: null, value: { $avg: '$durationMin' } } }]),
    Case.countDocuments({ ...scope, reopenedCount: { $gt: 0 } }),
    Case.countDocuments({ ...scope, behaviour: 'Requires Review' }),
  ])

  const d = duration[0] || { d1: 0, d2: 0, d3: 0, d4: 0, d5: 0, d6: 0 }
  const meanDuration = durationAverage[0]?.value || 0
  const patterns = behaviour
    .filter(row => row.classification !== 'Normal' && row.count > 0)
    .map(row => ({
      pattern: row.classification === 'Repetitive' ? 'Repeated investigation templates' : row.classification,
      severity: row.classification === 'Requires Review' ? 'Critical' : row.classification === 'Repetitive' || row.classification === 'Superficial' ? 'High' : 'Medium',
      count: row.count,
    }))

  return {
    total,
    kpis: {
      totalCases: total,
      meanDuration: `${meanDuration.toFixed(1)} min`,
      investigationToClosure: total ? `${((await Case.countDocuments({ ...scope, status: 'closed' }) / total) * 100).toFixed(1)}%` : '0%',
      caseReopening: total ? `${((reopenedCases / total) * 100).toFixed(1)}%` : '0%',
      requiresReview: casesRequiringReview,
    },
    behaviour,
    patterns,
    durationDistribution: [
      { range: '< 10 min', count: d.d1 },
      { range: '10–30 min', count: d.d2 },
      { range: '30–60 min', count: d.d3 },
      { range: '1–4 hrs', count: d.d4 },
      { range: '4–24 hrs', count: d.d5 },
      { range: '> 24 hrs', count: d.d6 }
    ],
    reopening: reopening.map(r => ({ entity: r._id, reopened: r.reopened, total: r.total, rate: r.total ? +((r.reopened / r.total) * 100).toFixed(1) : 0 })),
    depth: depth.map(d => ({ depth: d._id, count: d.count })),
    evidenceFrequency: evidenceFreq.map(e => ({ category: `${e._id ?? 0} evidence artifacts`, avgPerCase: +e.avgPerCase.toFixed(1), cases: e.cases })),
    workload: workload.map(w => ({ investigator: w._id, cases: w.cases, avgDuration: +w.avgDuration.toFixed(1) }))
  }
}

// ============================================================
// PEER BENCHMARKING
// ============================================================
export async function peerBenchmark(entityId: string, period: string) {
  const e = await Entity.findOne({ id: entityId }).lean()
  if (!e) throw new Error('Entity not found')
  const em = await EntityMetric.findOne({ entityId, period }).lean()

  const allMetrics = await EntityMetric.find({ period }).lean()
  const allEntities = await Entity.find().lean()
  const entitySector = new Map(allEntities.map(x => [x.id, x.sector]))
  const dimensionKeys = ASSESSMENT_FRAMEWORK.dimensions.map(dimension => dimension.key)
  let peers = allMetrics.filter(metric =>
    metric.entityId !== entityId &&
    entitySector.get(metric.entityId) === e.sector &&
    dimensionKeys.every(key => Number.isFinite((metric as any)[key]))
  )
  if (peers.length < 2) peers = allMetrics.filter(metric =>
    metric.entityId !== entityId && dimensionKeys.every(key => Number.isFinite((metric as any)[key]))
  )

  const [alertCounts, caseDurations, escalationRates, telemetryRows] = await Promise.all([
    Alert.aggregate([{ $match: { period } }, { $group: { _id: '$entityId', count: { $sum: 1 } } }]),
    Case.aggregate([{ $match: { period, durationMin: { $ne: null } } }, { $group: { _id: '$entityId', average: { $avg: '$durationMin' } } }]),
    Alert.aggregate([
      { $match: { period } },
      { $group: { _id: '$entityId', rate: { $avg: { $cond: [{ $ne: ['$escalationPath', null] }, 1, 0] } } } }
    ]),
    TelemetryCoverage.find({ period }).select({ entityId: 1, observedCoverage: 1, observed: 1 }).lean()
  ])
  const alertCountMap = new Map(alertCounts.map(row => [row._id, row.count as number]))
  const durationMap = new Map(caseDurations.filter(row => Number.isFinite(row.average)).map(row => [row._id, row.average as number]))
  const escalationMap = new Map(escalationRates.filter(row => Number.isFinite(row.rate)).map(row => [row._id, row.rate as number]))
  const coverageMap = new Map<string, number[]>()
  for (const row of telemetryRows) {
    const observed = row.observedCoverage ?? row.observed
    if (observed == null) continue
    const values = coverageMap.get(row.entityId) || []
    values.push(observed)
    coverageMap.set(row.entityId, values)
  }
  const averageCoverage = (id: string) => {
    const values = coverageMap.get(id)
    return values?.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
  }
  const maturityScore = buildEntityAssessment(em).maturityScore
  const pMaturity = peers.map(metric => buildEntityAssessment(metric).maturityScore).filter((value): value is number => typeof value === 'number' && Number.isFinite(value))

  const mk = (
    metric: string,
    ev: number | null,
    display: string,
    pv: Array<number | null | undefined>,
    assess: (pct: number) => string
  ) => {
    const validPeers = pv.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
    const peerMedian = validPeers.length ? median(validPeers) : null
    const pct = ev == null || !validPeers.length ? null : percentileRank(ev, [...validPeers, ev])
    return {
      metric,
      entityValue: ev,
      entityDisplay: display,
      peerMedian,
      peerMedianDisplay: peerMedian == null ? '—' : String(Math.round(peerMedian)),
      percentile: pct,
      assessment: pct == null ? 'Insufficient period data' : assess(pct)
    }
  }

  const assessNorm = (pct: number) => pct >= 80 ? 'Significantly above peer range' : pct >= 60 ? 'Above peer range' : pct >= 40 ? 'In peer range' : pct >= 20 ? 'Below peer range' : 'Significantly below peer range'
  const assessInv = (pct: number) => pct <= 20 ? 'Significantly below peer range' : pct <= 40 ? 'Below peer range' : pct <= 60 ? 'In peer range' : pct <= 80 ? 'Above peer range' : 'Significantly above peer range'

  const entityAlertCount = alertCountMap.get(entityId) ?? null
  const entityDuration = durationMap.get(entityId) ?? null
  const entityEscalationRate = escalationMap.get(entityId) ?? null
  const entityCoverage = averageCoverage(entityId)
  const peerCoverage = allEntities.filter(item => item.sector === e.sector && item.id !== entityId).map(item => averageCoverage(item.id))
  return [
    mk('Alert Volume', entityAlertCount, entityAlertCount == null ? 'Not available' : entityAlertCount.toLocaleString(), peers.map(peer => alertCountMap.get(peer.entityId)), assessNorm),
    mk('Investigation Duration', entityDuration, entityDuration == null ? 'Not available' : `${Math.round(entityDuration)} min`, peers.map(peer => durationMap.get(peer.entityId)), assessInv),
    mk('Escalation Rate', entityEscalationRate == null ? null : +(entityEscalationRate * 100).toFixed(1), entityEscalationRate == null ? 'Not available' : `${(entityEscalationRate * 100).toFixed(1)}%`, peers.map(peer => escalationMap.get(peer.entityId)).map(value => value == null ? null : +(value * 100).toFixed(1)), assessInv),
    mk('Telemetry Coverage', entityCoverage, entityCoverage == null ? 'Not available' : `${entityCoverage.toFixed(1)}%`, peerCoverage, assessInv),
    mk('Investigation Score', em?.investigation ?? null, em?.investigation == null ? 'Not available' : String(em.investigation), peers.map(peer => peer.investigation), assessInv),
    mk('SOC Maturity Score', maturityScore, maturityScore == null ? 'Not available' : `${maturityScore}/100`, pMaturity, assessNorm)
  ]
}

// ============================================================
// REVIEW PRIORITISATION
// ============================================================
export async function generateReviewQueue(period: string, entityId?: string) {
  const config = await loadConfig()
  const blindSpots = await detectBlindSpots(period, entityId)

  const findingScope = { period, ...(entityId ? { entityId } : {}) }
  const queueFindings = await Finding.find({ ...findingScope, status: { $in: ['New', 'In Review'] } }).lean()
  const allFindings = queueFindings.map(finding => ({
      ...finding,
      ref: finding.id,
      findingId: finding.id,
      reason: finding.description || finding.title,
      reasons: [finding.description || finding.title],
      source: 'persisted_finding',
      mitre: (finding as any).mitreTechnique,
      alertCategory: (finding.supportingMetrics as any)?.alertCategory
  }))
  const includedBlindSpots = new Set<string>()
  for (const [index, blindSpot] of blindSpots.entries()) {
    const key = `${blindSpot.entityId}\u0000${blindSpot.category}\u0000${blindSpot.assetGroup}`
    if (includedBlindSpots.has(key)) continue
    includedBlindSpots.add(key)
    const id = `NS-${period.replace(/[^A-Za-z0-9]/g, '')}-${blindSpot.entityId}-${index + 1}`
    allFindings.push({
      ...blindSpot,
      id,
      findingId: id,
      ref: id,
      reason: blindSpot.description || blindSpot.category,
      reasons: [blindSpot.description || blindSpot.category],
      status: 'New',
      source: 'negative_space',
      findingType: 'NEGATIVE_SPACE'
    })
  }

  const weights = config.reviewPriorityWeights

  const prioritized = allFindings
    .filter(f => f.severity === 'Critical' || f.severity === 'High')
    .map(f => {
      const severityScore = f.severity === 'Critical' ? 100 : 70
      const confidenceScore = f.confidence
      const riskScore = f.severity === 'Critical' ? 90 : 60
      const evidenceScore = Math.min(100, (f.evidenceCount || 0) * 10)
      const noveltyScore = f.source === 'negative_space' ? 80 : 50
      const peerDevScore = f.peerComparison?.includes('Significantly') ? 80 : f.peerComparison?.includes('Above') ? 60 : 30
      const impactScore = f.severity === 'Critical' ? 95 : 70

      const composite = (
        weights.severity * severityScore +
        weights.confidence * confidenceScore +
        weights.riskContribution * riskScore +
        weights.evidenceStrength * evidenceScore +
        weights.novelty * noveltyScore +
        weights.peerDeviation * peerDevScore +
        weights.supervisoryImpact * impactScore
      ) / Object.values(weights).reduce((a, b) => a + b, 1)

      return {
        ...f,
        priority: 0,
        riskScore: Math.round(composite),
        reasoning: `${f.title}: ${f.description} Evidence: ${f.evidenceCount || 0} items. Confidence: ${f.confidence}%. ${f.peerComparison || 'Peer comparison pending.'}`,
        suggestedAction: f.recommendation || 'Manual examination recommended.'
      }
    })
    .sort((a, b) => b.riskScore - a.riskScore)
    .filter((() => {
      const typeCounts = new Map<string, number>()
      const seenTitles = new Set<string>()
      return (finding: any) => {
        const title = String(finding.title || finding.reason || finding.findingType).toLowerCase()
        const type = String(finding.findingType || 'OTHER')
        if (seenTitles.has(title) || (typeCounts.get(type) || 0) >= 2) return false
        seenTitles.add(title)
        typeCounts.set(type, (typeCounts.get(type) || 0) + 1)
        return true
      }
    })())
    .map((f, i) => ({ ...f, priority: i + 1 }))

  return prioritized
}

// ============================================================
// TELEMETRY COVERAGE MATRIX (DYNAMIC HEATMAP)
// ============================================================
export async function telemetryCoverageMatrix(period: string, entityId?: string) {
  const filter: any = { period }
  if (entityId && entityId !== 'ALL') filter.entityId = entityId
  const records = await TelemetryCoverage.find(filter).lean()
  
  const categories = Array.from(new Set(records.map(r => r.category))).filter(Boolean)
  const columns = ['Expected Telemetry', 'Observed Telemetry', 'Alert Gen. Stream', 'Case Evidence', 'Escalation Logs']
  
  const matrix = categories.map(cat => {
    const matching = records.filter(r => r.category === cat)
    const avg = (fn: (r: any) => number | undefined) => {
      const vals = matching.map(fn).filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
      return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null
    }
    return [
      avg(r => r.expectedCoverage ?? r.expected),
      avg(r => r.observedCoverage ?? r.observed),
      avg(r => r.alertGeneration),
      avg(r => r.investigationEvidence),
      avg(r => r.escalationEvidence)
    ]
  })

  return { categories, columns, matrix }
}


// ============================================================
// ANOMALY DETECTION
// ============================================================
export async function detectAnomalies(period: string, entityId?: string) {
  const config = await loadConfig()
  const filter: any = { period }
  if (entityId) filter.entityId = entityId

  const alerts = await Alert.find(filter).lean()
  const cases = await Case.find(filter).lean()

  const anomalies: any[] = []

  // Alert volume anomalies
  const alertVolumes = alerts.reduce((acc, a) => { acc[a.entityId] = (acc[a.entityId] || 0) + 1; return acc }, {} as Record<string, number>)
  const volValues = Object.values(alertVolumes)
  for (const [eid, vol] of Object.entries(alertVolumes)) {
    const z = anomalyScoreZScore(vol, volValues, config.anomalyZScoreThreshold)
    if (z > 50) {
      anomalies.push({
        entityId: eid,
        type: 'VOLUME_SPIKE',
        severity: z > 80 ? 'Critical' : 'High',
        confidence: z,
        description: `Alert volume (${vol}) is ${((vol / (median(Object.values(alertVolumes)) || 1)) * 100).toFixed(0)}% of peer median.`,
        anomalyScore: z
      })
    }
  }

  // Investigation duration anomalies
  const invDurations = cases.filter(c => c.durationMin != null).map(c => c.durationMin!) as number[]
  for (const c of cases) {
    if (c.durationMin != null) {
      const z = anomalyScoreZScore(c.durationMin, invDurations, config.anomalyZScoreThreshold)
      if (z > 50) {
        anomalies.push({
          entityId: c.entityId,
          caseId: c.id,
          type: 'DURATION_ANOMALY',
          severity: z > 80 ? 'Critical' : 'High',
          confidence: z,
          description: `Investigation duration ${c.durationMin} min (peer median: ${median(invDurations)} min).`,
          anomalyScore: z
        })
      }
    }
  }

  // Evidence count anomalies
  const evCounts = cases.filter(c => c.evidenceCount != null).map(c => c.evidenceCount!) as number[]
  for (const c of cases) {
    if (c.evidenceCount != null) {
      const z = anomalyScoreZScore(c.evidenceCount, evCounts, config.anomalyZScoreThreshold)
      if (z > 50 && c.evidenceCount < median(evCounts)) {
        anomalies.push({
          entityId: c.entityId,
          caseId: c.id,
          type: 'LOW_EVIDENCE',
          severity: z > 80 ? 'Critical' : 'High',
          confidence: z,
          description: `Only ${c.evidenceCount} evidence items (peer median: ${median(evCounts)}).`,
          anomalyScore: z
        })
      }
    }
  }

  return anomalies.sort((a, b) => b.confidence - a.confidence)
}

// ============================================================
// DATA QUALITY
// ============================================================
export async function assessDataQuality(period: string, entityId?: string) {
  const filter: any = { period }
  if (entityId) filter.entityId = entityId

  const alerts = await Alert.find(filter).lean()
  const cases = await Case.find(filter).lean()
  const telemetry = await TelemetryCoverage.find(filter).lean()

  const issues: any[] = []

  // Missing fields
  const alertsMissingFields = alerts.filter(a => !a.category || !a.asset || !a.severity).length
  const casesMissingFields = cases.filter(c => !c.investigator || !c.closureReason).length
  if (alertsMissingFields > 0) issues.push({ type: 'Missing Field', severity: 'High', count: alertsMissingFields, description: `${alertsMissingFields} alerts missing required fields (category, asset, severity)` })
  if (casesMissingFields > 0) issues.push({ type: 'Missing Field', severity: 'High', count: casesMissingFields, description: `${casesMissingFields} cases missing investigator or closure reason` })

  // Invalid timestamps
  const invalidTimestamps = alerts.filter(a => a.closedAt && a.createdAt && new Date(a.closedAt) < new Date(a.createdAt)).length
  if (invalidTimestamps > 0) issues.push({ type: 'Invalid Timestamp', severity: 'Critical', count: invalidTimestamps, description: `${invalidTimestamps} alerts closed before creation` })

  // Negative durations
  const negDurations = cases.filter(c => c.durationMin != null && c.durationMin < 0).length
  if (negDurations > 0) issues.push({ type: 'Negative Duration', severity: 'Critical', count: negDurations, description: `${negDurations} cases have negative investigation duration` })

  // Closed before opened
  const closedBeforeOpened = cases.filter(c => c.closedAt && c.openedAt && new Date(c.closedAt) < new Date(c.openedAt)).length
  if (closedBeforeOpened > 0) issues.push({ type: 'Impossible Sequence', severity: 'Critical', count: closedBeforeOpened, description: `${closedBeforeOpened} cases closed before opening` })

  // Broken relationships
  const alertIds = new Set(alerts.map(a => a.id))
  const casesWithMissingAlerts = cases.filter(c => c.alertId && !alertIds.has(c.alertId)).length
  if (casesWithMissingAlerts > 0) issues.push({ type: 'Broken Relationship', severity: 'High', count: casesWithMissingAlerts, description: `${casesWithMissingAlerts} cases reference non-existent alerts` })

  // Missing escalation data
  const criticalAlerts = alerts.filter(a => a.severity === 'Critical')
  const missingEscalation = criticalAlerts.filter(a => a.escalationRequired && !a.escalationPath).length
  if (missingEscalation > 0) issues.push({ type: 'Missing Escalation Data', severity: 'High', count: missingEscalation, description: `${missingEscalation} critical alerts require escalation but have no escalation path recorded` })

  // Missing telemetry data
  const zeroCoverage = telemetry.filter(t => t.observedCoverage === 0).length
  if (zeroCoverage > 0) issues.push({ type: 'Missing Telemetry', severity: 'High', count: zeroCoverage, description: `${zeroCoverage} telemetry categories report 0% coverage` })

  // Duplicate detection
  const alertIdsSeen = new Set<string>()
  let duplicateAlerts = 0
  for (const a of alerts) { if (alertIdsSeen.has(a.id)) duplicateAlerts++; else alertIdsSeen.add(a.id) }
  if (duplicateAlerts > 0) issues.push({ type: 'Duplicate Record', severity: 'Medium', count: duplicateAlerts, description: `${duplicateAlerts} duplicate alert IDs found` })

  const totalAlerts = alerts.length
  const totalCases = cases.length
  const totalTelemetry = telemetry.length
  const issueCount = issues.reduce((sum, i) => sum + i.count, 0)
  const qualityPct = Math.max(0, Math.round(100 - (issueCount / Math.max(1, totalAlerts + totalCases + totalTelemetry)) * 100))

  return {
    overallScore: qualityPct,
    totalAlerts,
    totalCases,
    totalTelemetry,
    issues,
    warnings: issues.filter(i => i.severity === 'High' || i.severity === 'Critical').map(i => ({ message: i.description, severity: i.severity }))
  }
}

// ============================================================
// OVERVIEW KPIs
// ============================================================
export async function overviewKPIs(period: string, entityId?: string) {
  const scope = { period, ...(entityId ? { entityId } : {}) }
  const metrics = await EntityMetric.find(scope).lean()
  const cses = new Set(metrics.filter(metric => Number.isFinite(metric.maturityScore)).map(metric => metric.entityId)).size
  const attention = metrics.filter(metric => ['Critical', 'High'].includes(metric.priority || '')).length
  const highRisk = metrics.filter(metric => Number.isFinite(metric.riskScore) && metric.riskScore! >= 70).length
  const gapTotal = metrics.reduce((sum, metric) => sum + (metric.executionGapCount ?? 0), 0)
  const negativeSpaceTotal = metrics.reduce((sum, metric) => sum + (metric.negativeSpaceCount ?? 0), 0)
  const alerts = await Alert.countDocuments(scope)
  const cases = await Case.countDocuments(scope)
  const prioritySamples = await Case.countDocuments({ ...scope, behaviour: 'Requires Review' })

  const kpis = [
    { label: 'CSEs Assessed', value: cses, display: String(cses), trend: null, icon: 'building', threshold: 'neutral' },
    { label: 'Entities Requiring Attention', value: attention, display: String(attention), trend: null, icon: 'alert', threshold: 'watched' },
    { label: 'High-Risk Entities', value: highRisk, display: String(highRisk), trend: null, icon: 'shield', threshold: 'bad' },
    { label: 'Execution Gap Indicators', value: gapTotal, display: String(gapTotal), trend: null, icon: 'gap', threshold: 'watched' },
    { label: 'Negative Space Indicators', value: negativeSpaceTotal, display: String(negativeSpaceTotal), trend: null, icon: 'space', threshold: 'watched' },
    { label: 'Alerts Reviewed', value: alerts, display: alerts.toLocaleString(), trend: null, icon: 'alerts', threshold: 'neutral' },
    { label: 'Cases Analysed', value: cases, display: cases.toLocaleString(), trend: null, icon: 'cases', threshold: 'neutral' },
    { label: 'Priority Samples', value: prioritySamples, display: prioritySamples.toLocaleString(), trend: null, icon: 'samples', threshold: 'watched' }
  ]

  return kpis
}

export async function riskDistribution(period: string, entityId?: string) {
  const metrics = (await EntityMetric.find({ period, ...(entityId ? { entityId } : {}) }).lean()).filter(metric => Number.isFinite(metric.riskScore))
  const buckets = [
    { level: 'Critical', color: '#dc2626', count: 0 },
    { level: 'High', color: '#f97316', count: 0 },
    { level: 'Moderate', color: '#f59e0b', count: 0 },
    { level: 'Low', color: '#3b82f6', count: 0 },
    { level: 'Normal', color: '#10b981', count: 0 }
  ]
  for (const m of metrics) {
    const lvl = riskLevel(m.riskScore!)
    const idx = buckets.findIndex(b => b.level === lvl)
    if (idx >= 0) buckets[idx].count++
  }
  return buckets
}
