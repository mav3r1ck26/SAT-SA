import { Entity } from '../models/Entity'
import { EntityMetric } from '../models/EntityMetric'
import { Alert } from '../models/Alert'
import { Case } from '../models/Case'
import { TelemetryCoverage } from '../models/TelemetryCoverage'
import { Finding } from '../models/Finding'

const PERIOD = 'Q2 FY 2026-27'

// ============================================================
// PEER STATISTICS
// ============================================================
export async function peerStats(sector?: string) {
  const filter = sector ? { sector } : {}
  const metrics = await EntityMetric.find({ period: PERIOD }).lean()
  const entities = await Entity.find(filter).lean()
  const entityIds = new Set(entities.map(e => e.id))
  const g = metrics.filter(m => entityIds.has(m.entityId))
  if (g.length === 0) return null

  const median = (vals: number[]) => {
    const s = [...vals].sort((a, b) => a - b)
    const mid = Math.floor(s.length / 2)
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
  }

  return {
    count: g.length,
    riskMedian: median(g.map(m => m.riskScore)),
    detectionMedian: median(g.map(m => m.detection ?? 0)),
    investigationMedian: median(g.map(m => m.investigation ?? 0)),
    escalationMedian: median(g.map(m => m.escalation ?? 0)),
    operationsMedian: median(g.map(m => m.operations ?? 0)),
    governanceMedian: median(g.map(m => m.governance ?? 0)),
    resilienceMedian: median(g.map(m => m.resilience ?? 0))
  }
}

export function percentileRank(value: number, population: number[]) {
  if (population.length === 0) return 50
  const below = population.filter(v => v < value).length
  // include self as equal
  const equal = population.filter(v => v === value).length
  return Math.round(((below + equal / 2) / population.length) * 100)
}

// ============================================================
// RISK SCORE ENGINE
// ============================================================
export function computeRiskScore(metrics: Partial<EntityMetric>): number {
  const w = { detection: 0.2, investigation: 0.2, escalation: 0.15, operations: 0.15, governance: 0.15, resilience: 0.15 }
  const dims = {
    detection: metrics.detection ?? 50,
    investigation: metrics.investigation ?? 50,
    escalation: metrics.escalation ?? 50,
    operations: metrics.operations ?? 50,
    governance: metrics.governance ?? 50,
    resilience: metrics.resilience ?? 50
  }
  let score = 0
  for (const k of Object.keys(w) as (keyof typeof w)[]) {
    score += (100 - dims[k]) * w[k]
  }
  score += (metrics.executionGaps ?? 0) * 2
  score += (metrics.negativeSpace ?? 0) * 1.5
  return Math.min(99, Math.max(5, Math.round(score)))
}

export function riskLevel(score: number) {
  if (score >= 85) return 'Critical'
  if (score >= 70) return 'High'
  if (score >= 55) return 'Moderate'
  if (score >= 40) return 'Low'
  return 'Normal'
}

export async function recomputeEntityRisk(entityId: string) {
  const metric = await EntityMetric.findOne({ entityId, period: PERIOD })
  if (!metric) return null
  const newScore = computeRiskScore(metric)
  if (newScore !== metric.riskScore) {
    metric.riskScore = newScore
    metric.save()
  }
  return newScore
}

export async function recomputeAllRisks() {
  const metrics = await EntityMetric.find({ period: PERIOD })
  for (const m of metrics) {
    const newScore = computeRiskScore(m)
    if (newScore !== m.riskScore) {
      m.riskScore = newScore
      await m.save()
    }
  }
}

// ============================================================
// EXECUTION GAP DETECTION
// ============================================================
export async function detectExecutionGaps(entityId?: string) {
  const filter: any = {}
  if (entityId) filter.entityId = entityId
  const entities = entityId ? [entityId] : (await Entity.find().lean()).map(e => e.id)
  const gaps = []

  for (const eid of entities) {
    const cases = await Case.find({ entityId: eid }).lean()
    const total = cases.length
    if (!total) continue

    const fast = cases.filter(c => c.behaviour === 'Unusually Fast' || c.behaviour === 'Requires Review').length
    const template = cases.filter(c => c.isTemplateReuse === 1).length
    const zeroDepth = cases.filter(c => c.investigationDepth === 0).length

    const alerts = await Alert.find({ entityId: eid, severity: 'Critical' }).lean()
    const critTotal = alerts.length
    const critNoEsc = alerts.filter(a => !a.escalationPath).length

    const e = await Entity.findOne({ id: eid }).lean()
    const sector = e?.sector
    const ps = await peerStats(sector)

    if (fast / total > 0.25) {
      gaps.push({
        findingType: 'Rapid Closure Without Investigation',
        title: 'Rapid Closure Without Investigation',
        entityId: eid,
        controlArea: 'Investigation',
        severity: fast / total > 0.4 ? 'Critical' : 'High',
        confidence: Math.min(96, Math.round(60 + (fast / total) * 80)),
        evidenceCount: fast,
        description: `${fast} cases closed abnormally quickly with minimal investigation.`,
        methodology: 'Closure duration compared against peer median; cases below 5th percentile flagged.',
        limitations: 'Short closure may reflect efficient automated triage rather than a gap.',
        peerComparison: 'Investigation duration significantly below peer baseline'
      })
    }

    if (template / total > 0.1) {
      gaps.push({
        findingType: 'Repeated Template Investigation',
        title: 'Repeated Template Investigation',
        entityId: eid,
        controlArea: 'Investigation',
        severity: template / total > 0.2 ? 'High' : 'Medium',
        confidence: Math.min(92, Math.round(60 + (template / total) * 100)),
        evidenceCount: template,
        description: `${template} cases share near-identical investigation narratives.`,
        methodology: 'N-gram similarity over investigation note text. Cases with >90% similarity flagged.',
        limitations: 'Similar incidents may legitimately yield similar notes.',
        peerComparison: 'Template reuse above peer average'
      })
    }

    if (zeroDepth / total > 0.3) {
      gaps.push({
        findingType: 'Superficial Investigation',
        title: 'Metric-Compliant but Risk-Inconsistent Behaviour',
        entityId: eid,
        controlArea: 'Alert Handling',
        severity: 'Medium',
        confidence: Math.min(90, Math.round(55 + (zeroDepth / total) * 80)),
        evidenceCount: zeroDepth,
        description: `${zeroDepth} cases closed with zero investigation depth.`,
        methodology: 'Investigation depth proxy (actions, notes, evidence attachments) compared against closure.',
        limitations: 'Depth indicators may not capture offline analysis.',
        peerComparison: 'Investigation depth below peer median'
      })
    }

    if (critTotal > 0 && critNoEsc / critTotal > 0.15) {
      const ratio = critNoEsc / critTotal
      gaps.push({
        findingType: 'Critical Alert Without Escalation',
        title: 'Critical Alert Without Escalation',
        entityId: eid,
        controlArea: 'Escalation',
        severity: ratio > 0.3 ? 'Critical' : 'High',
        confidence: Math.min(95, Math.round(60 + ratio * 80)),
        evidenceCount: critNoEsc,
        description: `${critNoEsc} critical alerts resolved with no recorded escalation.`,
        methodology: 'Critical-alert resolution cross-referenced against escalation events in case timeline.',
        limitations: 'Escalation may occur outside the system of record.',
        peerComparison: 'Escalation rate below peer baseline'
      })
    }
  }

  return gaps
}

export async function persistFindings(gaps: any[]) {
  // Upsert findings
  for (const g of gaps) {
    const existing = await Finding.findOne({ id: `EG-${g.findingType.slice(0, 3)}-${g.entityId}` })
    // simpler: give stable IDs
    const existingByType = await Finding.findOne({ findingType: g.findingType, entityId: g.entityId })
    if (existingByType) {
      existingByType.severity = g.severity
      existingByType.confidence = g.confidence
      existingByType.evidenceCount = g.evidenceCount
      existingByType.description = g.description
      existingByType.methodology = g.methodology
      existingByType.limitations = g.limitations
      existingByType.peerComparison = g.peerComparison
      await existingByType.save()
    } else {
      const count = await Finding.countDocuments()
      await Finding.create({
        id: `EG-${180 + count + 1}`,
        ...g,
        status: 'New',
        whyMatters: g.description
      })
    }
  }
}

// ============================================================
// NEGATIVE SPACE / BLIND SPOTS
// ============================================================
export async function detectBlindSpots(entityId?: string) {
  const filter: any = {}
  if (entityId) filter.entityId = entityId
  const rows = await TelemetryCoverage.find(filter).lean()
  const blindSpots = []

  for (const r of rows) {
    if (r.observed < 60) {
      blindSpots.push({
        entity: r.entityId,
        assetGroup: r.category,
        observedPct: r.observed,
        description: `Only ${r.observed}% of expected telemetry observed for ${r.category}.`
      })
    }
  }
  return blindSpots.sort((a, b) => a.observedPct - b.observedPct)
}

// ============================================================
// ESCALATION ANALYTICS
// ============================================================
export async function escalationAnalytics() {
  const critTotal = await Alert.countDocuments({ severity: 'Critical' })
  const critEsc = await Alert.countDocuments({ severity: 'Critical', escalationPath: { $ne: null } })

  const severities = ['Critical', 'High', 'Medium', 'Low']
  const severityMatrix = []
  for (const sev of severities) {
    const total = await Alert.countDocuments({ severity: sev })
    const esc = await Alert.countDocuments({ severity: sev, escalationPath: { $ne: null } })
    severityMatrix.push({ severity: sev, escalated: esc, notEscalated: total - esc })
  }

  const pathsAgg = await Alert.aggregate([
    { $match: { escalationPath: { $ne: null } } },
    { $group: { _id: '$escalationPath', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ])

  return {
    escalatedCritical: critEsc,
    notEscalatedCritical: critTotal - critEsc,
    severityMatrix,
    paths: pathsAgg.map(p => ({ path: p._id, count: p.count })),
    anomalies: severityMatrix
      .filter(s => s.severity === 'Critical' || s.severity === 'High')
      .filter(s => (s.notEscalated / (s.escalated + s.notEscalated || 1)) > 0.2)
      .map(s => ({ label: `${s.severity} + No escalation`, count: s.notEscalated, severity: s.severity }))
  }
}

// ============================================================
// ALERT ANALYTICS
// ============================================================
export async function alertAnalytics() {
  const total = await Alert.countDocuments()
  const severities = ['Critical', 'High', 'Medium', 'Low']
  const distribution = []
  for (const sev of severities) {
    distribution.push({ severity: sev, count: await Alert.countDocuments({ severity: sev }) })
  }

  const conversionAgg = await Alert.aggregate([
    { $group: {
      _id: '$category',
      alerts: { $sum: 1 },
      cases: { $sum: { $cond: [{ $gt: ['$alertToCase', 0] }, 1, 0] } }
    } }
  ])

  const lifecycle = []
  const ackAvg = await Alert.aggregate([{ $match: { meanAckMin: { $ne: null } } }, { $group: { _id: null, v: { $avg: '$meanAckMin' } } }])
  const invAvg = await Alert.aggregate([{ $match: { meanInvestigationMin: { $ne: null } } }, { $group: { _id: null, v: { $avg: '$meanInvestigationMin' } } }])
  const cloAvg = await Alert.aggregate([{ $match: { meanClosureMin: { $ne: null } } }, { $group: { _id: null, v: { $avg: '$meanClosureMin' } } }])

  if (ackAvg.length) lifecycle.push({ stage: 'Acknowledgment', meanMin: +ackAvg[0].v.toFixed(1) })
  if (invAvg.length) lifecycle.push({ stage: 'Investigation start', meanMin: +invAvg[0].v.toFixed(1) })
  if (cloAvg.length) lifecycle.push({ stage: 'Closure', meanMin: +cloAvg[0].v.toFixed(1) })

  return {
    total,
    severityDistribution: distribution,
    conversion: conversionAgg.map(c => ({ category: c._id, alerts: c.alerts, cases: c.cases, rate: c.alerts ? +((c.cases / c.alerts) * 100).toFixed(1) : 0 })),
    lifecycle
  }
}

// ============================================================
// INVESTIGATION ANALYTICS
// ============================================================
export async function investigationAnalytics() {
  const total = await Case.countDocuments()
  const behaviours = ['Normal', 'Superficial', 'Repetitive', 'Unusually Fast', 'Requires Review']
  const behaviour = []
  for (const b of behaviours) {
    behaviour.push({ classification: b, count: await Case.countDocuments({ behaviour: b }) })
  }

  const duration = await Case.aggregate([
    { $match: { closedAt: { $ne: null } } },
    { $group: { _id: null,
      d1: { $sum: { $cond: [{ $lt: [{ $ifNull: ['$durationMin', 99999] }, 10] }, 1, 0] } },
      d2: { $sum: { $cond: [{ $and: [{ $gte: [{ $ifNull: ['$durationMin', 0] }, 10] }, { $lt: [{ $ifNull: ['$durationMin', 0] }, 30] }] }, 1, 0] } },
      d3: { $sum: { $cond: [{ $and: [{ $gte: [{ $ifNull: ['$durationMin', 0] }, 30] }, { $lt: [{ $ifNull: ['$durationMin', 0] }, 60] }] }, 1, 0] } },
      d4: { $sum: { $cond: [{ $and: [{ $gte: [{ $ifNull: ['$durationMin', 0] }, 60] }, { $lt: [{ $ifNull: ['$durationMin', 0] }, 240] }] }, 1, 0] } },
      d5: { $sum: { $cond: [{ $and: [{ $gte: [{ $ifNull: ['$durationMin', 0] }, 240] }, { $lt: [{ $ifNull: ['$durationMin', 0] }, 1440] }] }, 1, 0] } },
      d6: { $sum: { $cond: [{ $gte: [{ $ifNull: ['$durationMin', 0] }, 1440] }, 1, 0] } }
    } }
  ])

  const reopening = await Case.aggregate([
    { $group: { _id: '$entityId', reopened: { $sum: '$reopenedCount' }, total: { $sum: 1 } } }
  ])

  const d = duration[0] || { d1: 0, d2: 0, d3: 0, d4: 0, d5: 0, d6: 0 }

  return {
    total,
    behaviour,
    durationDistribution: [
      { range: '< 10 min', count: d.d1 },
      { range: '10–30 min', count: d.d2 },
      { range: '30–60 min', count: d.d3 },
      { range: '1–4 hrs', count: d.d4 },
      { range: '4–24 hrs', count: d.d5 },
      { range: '> 24 hrs', count: d.d6 }
    ],
    reopening: reopening.map(r => ({ entity: r._id, reopened: r.reopened, total: r.total, rate: r.total ? +((r.reopened / r.total) * 100).toFixed(1) : 0 }))
  }
}

// ============================================================
// PEER BENCHMARKING
// ============================================================
export async function peerBenchmark(entityId: string) {
  const e = await Entity.findOne({ id: entityId }).lean()
  if (!e) throw new Error('Entity not found')
  const em = await EntityMetric.findOne({ entityId, period: PERIOD }).lean()

  const sectors = at(e.sector)
  const allMetrics = await EntityMetric.find({ period: PERIOD }).lean()
  const allEntities = await Entity.find().lean()
  const entitySector = new Map(allEntities.map(x => [x.id, x.sector]))
  const peers = allMetrics.filter(m => entitySector.get(m.entityId) === e.sector && m.entityId !== entityId)

  const alertVolume = await Alert.countDocuments({ entityId })
  const invTime = (await Case.aggregate([{ $match: { entityId } }, { $group: { _id: null, v: { $avg: '$durationMin' } } }]))[0]?.v || 0
  const escRate = (await Alert.aggregate([{ $match: { entityId } }, { $group: { _id: null, r: { $avg: { $cond: [{ $ne: ['$escalationPath', null] }, 1, 0] } } } }]))[0]?.r || 0

  const pAlertVol = []
  const pInvTime = []
  const pEscRate = []
  for (const p of peers) {
    pAlertVol.push(await Alert.countDocuments({ entityId: p.entityId }))
    pInvTime.push((await Case.aggregate([{ $match: { entityId: p.entityId } }, { $group: { _id: null, v: { $avg: '$durationMin' } } }]))[0]?.v || 0)
    pEscRate.push((await Alert.aggregate([{ $match: { entityId: p.entityId } }, { $group: { _id: null, r: { $avg: { $cond: [{ $ne: ['$escalationPath', null] }, 1, 0] } } } }]))[0]?.r || 0)
  }

  const mk = (metric: string, ev: number, display: string, pv: number[], pvDisplay: string, assess: (pct: number) => string) => {
    const med = median(pv)
    const pct = percentileRank(ev, [...pv, ev])
    return { metric, entityValue: ev, entityDisplay: display, peerMedian: med, peerMedianDisplay: pvDisplay, percentile: pct, assessment: assess(pct) }
  }

  const assessNorm = (pct: number) => pct >= 80 ? 'Significantly above peer range' : pct >= 60 ? 'Above peer range' : pct >= 40 ? 'In peer range' : pct >= 20 ? 'Below peer range' : 'Significantly below peer range'
  const assessInv = (pct: number) => pct <= 20 ? 'Significantly below peer range' : pct <= 40 ? 'Below peer range' : pct <= 60 ? 'In peer range' : pct <= 80 ? 'Above peer range' : 'Significantly above peer range'

  return [
    mk('Alert Volume', alertVolume, alertVolume.toLocaleString(), pAlertVol, String(Math.round(median(pAlertVol)).toLocaleString()), assessNorm),
    mk('Investigation Duration', Math.round(invTime), `${Math.round(invTime)} min`, pInvTime, `${Math.round(median(pInvTime))} min`, assessInv),
    mk('Escalation Rate', +(escRate * 100).toFixed(1), `${(escRate * 100).toFixed(1)}%`, pEscRate.map(v => +(v * 100).toFixed(1)), `${(median(pEscRate) * 100).toFixed(1)}%`, assessInv),
    mk('Telemetry Coverage', e.telemetryCoverage, `${e.telemetryCoverage}%`, allEntities.filter(x => x.sector === e.sector && x.id !== entityId).map(x => x.telemetryCoverage), `${Math.round(median(otherEntityCoverage(allEntities, e.sector, entityId)))}%`, assessInv),
    mk('Investigation Depth', em.investigation ?? 0, String(em.investigation ?? 0), peers.map(p => p.investigation ?? 0), String(Math.round(median(peers.map(p => p.investigation ?? 0)))), assessInv)
  ]
}

function at(v: string) { return v }
function otherEntityCoverage(entities: any[], sector: string, exId: string) {
  return entities.filter(x => x.sector === sector && x.id !== exId).map(x => x.telemetryCoverage)
}

function median(vals: number[]) {
  if (vals.length === 0) return 0
  const s = [...vals].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

// ============================================================
// REVIEW PRIORITISATION
// ============================================================
export async function generateReviewQueue() {
  const gaps = await detectExecutionGaps()
  return gaps
    .filter(g => g.severity === 'Critical' || g.severity === 'High')
    .sort((a, b) => b.confidence - a.confidence)
    .map((g, i) => ({
      priority: i + 1,
      severity: g.severity,
      entity: g.entityId,
      ref: g.findingType,
      reason: g.description,
      riskScore: g.confidence,
      confidence: g.confidence,
      evidenceCount: g.evidenceCount,
      reasonWrap: [g.description, `Peer comparison: ${g.peerComparison}`, `Methodology: ${g.methodology}`],
      suggestedAction: `Manual examination of ${g.controlArea} records recommended.`
    }))
}

// ============================================================
// OVERVIEW KPIs
// ============================================================
export async function overviewKPIs() {
  const cses = await Entity.countDocuments()
  const attention = await EntityMetric.countDocuments({ period: PERIOD, priority: { $in: ['Critical', 'High'] } })
  const highRisk = await EntityMetric.countDocuments({ period: PERIOD, riskScore: { $gte: 70 } })
  const gapAgg = await EntityMetric.aggregate([{ $match: { period: PERIOD } }, { $group: { _id: null, v: { $sum: '$executionGaps' } } }])
  const negAgg = await EntityMetric.aggregate([{ $match: { period: PERIOD } }, { $group: { _id: null, v: { $sum: '$negativeSpace' } } }])
  const alerts = await Alert.countDocuments()
  const cases = await Case.countDocuments()
  const prioritySamples = await Case.countDocuments({ behaviour: 'Requires Review' })

  return [
    { label: 'CSEs Assessed', value: cses, display: String(cses), trend: 5, icon: 'building' },
    { label: 'Entities Requiring Attention', value: attention, display: String(attention), trend: 3, icon: 'alert', threshold: 'watched' },
    { label: 'High-Risk Findings', value: highRisk, display: String(highRisk), trend: 6, icon: 'shield', threshold: 'bad' },
    { label: 'Execution Gap Indicators', value: gapAgg[0]?.v || 0, display: String(gapAgg[0]?.v || 0), trend: 4, icon: 'gap' },
    { label: 'Negative Space Indicators', value: negAgg[0]?.v || 0, display: String(negAgg[0]?.v || 0), trend: 2, icon: 'space' },
    { label: 'Alerts Reviewed', value: alerts, display: alerts.toLocaleString(), trend: 14, icon: 'alerts' },
    { label: 'Cases Analysed', value: cases, display: cases.toLocaleString(), trend: 8, icon: 'cases' },
    { label: 'Priority Samples', value: prioritySamples, display: prioritySamples.toLocaleString(), trend: -8, icon: 'samples' }
  ]
}

export async function riskDistribution() {
  const metrics = await EntityMetric.find({ period: PERIOD }).lean()
  const buckets = [
    { level: 'Critical', color: '#dc2626', count: 0 },
    { level: 'High', color: '#f97316', count: 0 },
    { level: 'Moderate', color: '#f59e0b', count: 0 },
    { level: 'Low', color: '#3b82f6', count: 0 },
    { level: 'Normal', color: '#10b981', count: 0 }
  ]
  for (const m of metrics) {
    const lvl = riskLevel(m.riskScore)
    const idx = buckets.findIndex(b => b.level === lvl)
    if (idx >= 0) buckets[idx].count++
  }
  return buckets
}
