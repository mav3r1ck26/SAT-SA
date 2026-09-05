import mongoose from 'mongoose'
import { connectDB } from './config/db'
import { Entity } from './models/Entity'
import { EntityMetric } from './models/EntityMetric'
import { Alert } from './models/Alert'
import { Case } from './models/Case'
import { TelemetryCoverage } from './models/TelemetryCoverage'
import { Finding } from './models/Finding'
import { EvidenceEvent } from './models/EvidenceEvent'
import { AuditLog } from './models/AuditLog'
import { Notification } from './models/Notification'
import { Report } from './models/Report'
import { IngestionBatch } from './models/IngestionBatch'

const entitySeeds = [
  { id: 'CSE-001', name: 'National Power Grid Op.', sector: 'Power', region: 'North', criticality: 'Critical', dataCompleteness: 92, telemetryCoverage: 86, metrics: { riskScore: 58, prevRiskScore: 55, detection: 72, investigation: 65, escalation: 70, operations: 60, governance: 55, resilience: 68, executionGaps: 2, negativeSpace: 1, peerDeviation: 'Low', priority: 'Moderate' } },
  { id: 'CSE-008', name: 'State Telecom Network', sector: 'Telecom', region: 'South', criticality: 'High', dataCompleteness: 88, telemetryCoverage: 79, metrics: { riskScore: 63, prevRiskScore: 58, detection: 74, investigation: 68, escalation: 72, operations: 64, governance: 61, resilience: 70, executionGaps: 2, negativeSpace: 3, peerDeviation: 'Medium', priority: 'Moderate' } },
  { id: 'CSE-014', name: 'Central Power Authority', sector: 'Power', region: 'West', criticality: 'Critical', dataCompleteness: 81, telemetryCoverage: 62, metrics: { riskScore: 87, prevRiskScore: 78, detection: 78, investigation: 91, escalation: 86, operations: 72, governance: 68, resilience: 83, executionGaps: 6, negativeSpace: 4, peerDeviation: 'High', priority: 'Critical' } },
  { id: 'CSE-021', name: 'Regional Transport Alliance', sector: 'Transport', region: 'Central', criticality: 'Medium', dataCompleteness: 95, telemetryCoverage: 90, metrics: { riskScore: 45, prevRiskScore: 48, detection: 68, investigation: 70, escalation: 66, operations: 61, governance: 64, resilience: 65, executionGaps: 1, negativeSpace: 2, peerDeviation: 'Low', priority: 'Normal' } },
  { id: 'CSE-027', name: 'National Banking Services', sector: 'Banking', region: 'West', criticality: 'Critical', dataCompleteness: 94, telemetryCoverage: 78, metrics: { riskScore: 79, prevRiskScore: 71, detection: 84, investigation: 82, escalation: 80, operations: 74, governance: 72, resilience: 77, executionGaps: 4, negativeSpace: 2, peerDeviation: 'Medium', priority: 'High' } },
  { id: 'CSE-034', name: 'Renewable Energy Group', sector: 'Energy', region: 'South', criticality: 'Medium', dataCompleteness: 86, telemetryCoverage: 74, metrics: { riskScore: 52, prevRiskScore: 49, detection: 70, investigation: 66, escalation: 62, operations: 63, governance: 58, resilience: 64, executionGaps: 1, negativeSpace: 3, peerDeviation: 'Low', priority: 'Moderate' } },
  { id: 'CSE-041', name: 'Central Defence Data Ctr', sector: 'Defence', region: 'North', criticality: 'Critical', dataCompleteness: 91, telemetryCoverage: 83, metrics: { riskScore: 71, prevRiskScore: 67, detection: 82, investigation: 76, escalation: 78, operations: 69, governance: 74, resilience: 80, executionGaps: 3, negativeSpace: 1, peerDeviation: 'Medium', priority: 'High' } },
  { id: 'CSE-050', name: 'Govt Digital Services', sector: 'Government', region: 'Central', criticality: 'High', dataCompleteness: 90, telemetryCoverage: 81, metrics: { riskScore: 60, prevRiskScore: 62, detection: 72, investigation: 69, escalation: 65, operations: 67, governance: 70, resilience: 66, executionGaps: 2, negativeSpace: 2, peerDeviation: 'Low', priority: 'Moderate' } },
  { id: 'CSE-058', name: 'National Health Net', sector: 'Health', region: 'East', criticality: 'High', dataCompleteness: 93, telemetryCoverage: 88, metrics: { riskScore: 47, prevRiskScore: 51, detection: 69, investigation: 71, escalation: 67, operations: 65, governance: 66, resilience: 68, executionGaps: 1, negativeSpace: 2, peerDeviation: 'Low', priority: 'Normal' } },
  { id: 'CSE-063', name: 'Metropolitan Water Board', sector: 'Water', region: 'South', criticality: 'High', dataCompleteness: 84, telemetryCoverage: 70, metrics: { riskScore: 55, prevRiskScore: 57, detection: 66, investigation: 63, escalation: 61, operations: 64, governance: 60, resilience: 63, executionGaps: 1, negativeSpace: 3, peerDeviation: 'Low', priority: 'Moderate' } },
  { id: 'CSE-070', name: 'Freight Rail Network', sector: 'Transport', region: 'West', criticality: 'Medium', dataCompleteness: 96, telemetryCoverage: 91, metrics: { riskScore: 41, prevRiskScore: 44, detection: 65, investigation: 67, escalation: 64, operations: 62, governance: 63, resilience: 66, executionGaps: 0, negativeSpace: 1, peerDeviation: 'Low', priority: 'Normal' } }
]

const telemetryCategories = ['Critical systems', 'Security devices', 'Network segments', 'Applications', 'Cloud environments', 'Identity infrastructure', 'OT/ICS environments']
const alertCategories = ['Malware', 'Phishing', 'Network Anomaly', 'Access Anomaly', 'Data Exfiltration', 'Lateral Movement', 'Privilege Escalation']
const assets = ['FW-GW-14', 'EDR-CSE-021', 'IDP-Primary', 'NSM-SEG-27', 'MAIL-GW-08', 'DB-REPLICA', 'AAA-HOST', 'FW-EDGE-02']
const severities = ['Critical', 'High', 'Medium', 'Low']
const investigators = ['Analyst-01', 'Analyst-02', 'Analyst-03', 'Analyst-04', 'Analyst-05']

function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min }
function daysAgoDate(days: number, hourOffset = 0) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(d.getHours() + hourOffset)
  return d
}

async function seed() {
  await connectDB()
  console.log('Dropping existing collections...')
  await Promise.all([
    Entity.deleteMany({}), EntityMetric.deleteMany({}), Alert.deleteMany({}),
    Case.deleteMany({}), TelemetryCoverage.deleteMany({}), Finding.deleteMany({}),
    EvidenceEvent.deleteMany({}), AuditLog.deleteMany({}), Notification.deleteMany({}),
    Report.deleteMany({}), IngestionBatch.deleteMany({})
  ])

  // ---- Entities & Metrics ----
  for (const e of entitySeeds) {
    await Entity.create({
      id: e.id, name: e.name, sector: e.sector, region: e.region, criticality: e.criticality,
      dataCompleteness: e.dataCompleteness, telemetryCoverage: e.telemetryCoverage,
      lastSubmission: daysAgoDate(rand(1, 4)).toISOString(),
      assessmentStatus: e.metrics.priority === 'Critical' || e.metrics.priority === 'High' ? 'Review Required' : e.metrics.priority === 'Moderate' ? 'Monitor' : 'Compliant'
    })
    await EntityMetric.create({ entityId: e.id, period: 'Q2 FY 2026-27', ...e.metrics })
  }

  // ---- Telemetry ----
  const special: Record<string, Record<string, number>> = {
    'CSE-014': { 'OT/ICS environments': 38, 'Critical systems': 62, 'Applications': 58 },
    'CSE-063': { 'OT/ICS environments': 44 },
    'CSE-034': { 'Cloud environments': 51 }
  }
  for (const e of entitySeeds) {
    for (const cat of telemetryCategories) {
      let observed = rand(40, 100)
      if (special[e.id]?.[cat]) observed = special[e.id][cat]
      await TelemetryCoverage.create({
        entityId: e.id, category: cat, expected: 100, observed,
        alertGen: rand(40, 95), investigationEvidence: rand(30, 90), escalationEvidence: rand(20, 85),
        period: 'Q2 FY 2026-27'
      })
    }
  }

  // ---- Alerts & Cases ----
  let alertCounter = 1000000
  let caseCounter = 100000
  for (const e of entitySeeds) {
    const numAlerts = rand(400, 1200)
    for (let i = 0; i < numAlerts; i++) {
      const alertId = `ALERT-${String(alertCounter++).padStart(6, '0')}`
      const severity = severities[rand(0, 3)]
      const category = alertCategories[rand(0, alertCategories.length - 1)]
      const asset = assets[rand(0, assets.length - 1)]
      const createdAt = daysAgoDate(rand(0, 60), -rand(0, 24))
      const acknowledgedAt = new Date(createdAt.getTime() + rand(1, 900) * 60000)
      const invStartedAt = new Date(acknowledgedAt.getTime() + rand(1, 600) * 60000)
      const closedAt = new Date(acknowledgedAt.getTime() + rand(2, 3000) * 60000)

      let escalationPath: string | null = null
      let escalationDelayMin = 0
      if (Math.random() < 0.7) {
        const paths = ['Analyst → Team Lead', 'Analyst → L2 → Team Lead', 'Analyst → Incident Mgr', 'Direct to CERT']
        escalationPath = paths[rand(0, 3)]
        escalationDelayMin = rand(30, 1500)
      }

      let alertToCase = 0
      let caseId: string | null = null
      if (Math.random() < 0.6) {
        caseId = `CASE-${String(caseCounter++).padStart(6, '0')}`
        alertToCase = 1
        const durationMin = Math.round((closedAt.getTime() - createdAt.getTime()) / 60000)
        const depth = rand(0, 5)
        const evidence = rand(0, 8)
        const isTemplate = Math.random() < 0.08 ? 1 : 0
        const reopened = Math.random() < 0.08 ? rand(1, 3) : 0
        let behaviour = 'Normal'
        if (depth === 0) behaviour = 'Superficial'
        else if (isTemplate) behaviour = 'Repetitive'
        else if (durationMin < 12) behaviour = 'Requires Review'
        else if (durationMin < 25) behaviour = 'Unusually Fast'

        // Make CSE-014 look especially anomalous
        if (e.id === 'CSE-014' && Math.random() < 0.4) behaviour = 'Requires Review'

        await Case.create({
          id: caseId, entityId: e.id, alertId, openedAt: createdAt, closedAt,
          investigationStartedAt: invStartedAt,
          investigationEndedAt: new Date(invStartedAt.getTime() + rand(5, 600) * 60000),
          durationMin, investigationDepth: depth, evidenceAttachments: evidence,
          isTemplateReuse: isTemplate, reopenedCount: reopened,
          closureReason: Math.random() < 0.5 ? 'False positive' : 'Resolved',
          investigator: investigators[rand(0, investigators.length - 1)],
          behaviour, status: 'closed'
        })

        // Evidence timeline
        const steps: Array<[string, string, string, Date]> = [
          ['Alert Created', 'System', 'Detection', createdAt],
          ['Acknowledged', investigators[rand(0, investigators.length - 1)], 'Tier 1', acknowledgedAt],
          ['Investigation Started', investigators[rand(0, investigators.length - 1)], 'Tier 1', invStartedAt]
        ]
        if (escalationPath) steps.push(['Escalation', 'System', 'Supervisor', closedAt])
        steps.push(['Closure', investigators[rand(0, investigators.length - 1)], 'Tier 1', closedAt])

        for (const [evt, actor, role, time] of steps) {
          await EvidenceEvent.create({
            caseId, alertId, eventTime: time, actor, role, event: evt,
            metadata: [`Severity: ${severity}`, `Asset: ${asset}`, `Category: ${category}`]
          })
        }
      }

      await Alert.create({
        id: alertId, entityId: e.id, category, asset, severity, status: 'closed',
        createdAt, acknowledgedAt, investigationStartedAt: invStartedAt, closedAt,
        escalationPath, escalationDelayMin, alertToCase,
        closureNote: Math.random() < 0.5 ? 'False positive' : 'Resolved',
        meanAckMin: 4.2, meanInvestigationMin: 42.6, meanClosureMin: 58.3
      })
    }
  }

  // ---- Findings ----
  const findingCounter = { n: 180 }
  const gapSeeds = [
    { type: 'Rapid Closure Without Investigation', title: 'Rapid Closure Without Investigation', entityId: 'CSE-014', controlArea: 'Investigation', severity: 'Critical', confidence: 94, evidenceCount: 14, desc: 'Case closed within 6 minutes without a substantive investigation record.', peer: '2.8× below peer median' },
    { type: 'Critical Alert Without Escalation', title: 'Critical Alert Without Escalation', entityId: 'CSE-014', controlArea: 'Escalation', severity: 'Critical', confidence: 91, evidenceCount: 9, desc: '7 critical alerts resolved with no recorded escalation or incident response reference.', peer: '0 escalation records vs 1.6 median' },
    { type: 'Repeated Template Investigation', title: 'Repeated Template Investigation', entityId: 'CSE-027', controlArea: 'Investigation', severity: 'High', confidence: 87, evidenceCount: 11, desc: '11 cases share near-identical investigation narratives, timestamps, and actions.', peer: 'Similar-pattern incidence 4.1× above peer average' },
    { type: 'Metric-Compliant but Risk-Inconsistent Behaviour', title: 'Metric-Compliant but Risk-Inconsistent Behaviour', entityId: 'CSE-008', controlArea: 'Alert Handling', severity: 'Medium', confidence: 83, evidenceCount: 7, desc: 'SLA metrics are met, but closure occurs before any investigation depth is demonstrated.', peer: 'Investigation depth 42% below peer median' },
    { type: 'Rapid Closure Without Investigation', title: 'Rapid Closure Without Investigation', entityId: 'CSE-041', controlArea: 'Investigation', severity: 'High', confidence: 82, evidenceCount: 6, desc: 'Rapid closure patterns observed across 6 distinct case types.', peer: 'Closure time 60% below peer median' }
  ]
  for (const g of gapSeeds) {
    findingCounter.n++
    await Finding.create({
      id: `EG-${findingCounter.n}`, findingType: g.type, ...g, status: 'In Review', whyMatters: g.desc,
      methodology: 'Comparison of operational evidence against documented capability baselines and peer medians.',
      limitations: 'Indicators may have legitimate non-risk explanations. Requires examiner confirmation.'
    })
  }

  // Negative space findings
  for (const e of entitySeeds) {
    if (e.telemetryCoverage < 65) {
      findingCounter.n++
      await Finding.create({
        id: `NS-${findingCounter.n}`, findingType: 'Missing telemetry from critical systems', title: 'Missing Telemetry',
        entityId: e.id, controlArea: 'Telemetry', severity: 'High', confidence: 86, evidenceCount: 6, status: 'New',
        description: 'Expected telemetry streams absent or incomplete from critical asset groups.',
        whyMatters: 'Critical asset groups are under-monitored, limiting detection and investigation capability.',
        methodology: 'Expected vs observed telemetry compared across infrastructure categories. Coverage <50% flagged.',
        limitations: 'Telemetry may be aggregated or monitored through alternate channels.',
        peerComparison: 'Telemetry coverage 26% below sector median'
      })
    }
  }

  // ---- Notifications ----
  const notifDefs = [
    { type: 'finding', title: 'New high-confidence finding', detail: 'EG-182 identified for CSE-014. Confidence 94%.', severity: 'high' },
    { type: 'risk', title: 'Entity risk increased significantly', detail: 'CSE-014 risk score rose 12% vs previous period.', severity: 'high' },
    { type: 'negative-space', title: 'New negative-space indicator', detail: 'Monitoring blind spot detected for CSE-014 Critical Asset Group.', severity: 'medium' },
    { type: 'data-quality', title: 'Data quality issue', detail: '14% of critical asset records have incomplete telemetry.', severity: 'medium' },
    { type: 'validation', title: 'Validation discrepancy', detail: 'Human-vs-tool agreement dropped to 87% on select findings.', severity: 'medium' },
    { type: 'period', title: 'Assessment period completed', detail: 'Q2 FY 2026-27 data aggregation complete.', severity: 'info' }
  ]
  await Notification.insertMany(notifDefs.map((n, i) => ({ ...n, read: i >= 3, time: daysAgoDate(0, -i) })))

  // ---- Reports ----
  const reportDefs = [
    { id: 'RPT-01', name: 'Entity Assessment Report', desc: 'Comprehensive supervisory assessment for a single entity.', format: 'PDF, CSV, JSON' },
    { id: 'RPT-02', name: 'Cross-Entity Supervisory Report', desc: 'Consolidated supervisory findings across all assessed CSEs.', format: 'PDF, CSV' },
    { id: 'RPT-03', name: 'Execution Gap Report', desc: 'All execution gap indicators with evidence and confidence.', format: 'PDF, CSV, JSON' },
    { id: 'RPT-04', name: 'Negative Space Report', desc: 'Telemetry coverage matrix and monitoring blind spots.', format: 'PDF, CSV' },
    { id: 'RPT-05', name: 'Peer Benchmark Report', desc: 'Peer percentile comparison for key operational metrics.', format: 'PDF, CSV, JSON' },
    { id: 'RPT-06', name: 'Manual Review Summary', desc: 'Summary of manual review queue actions and dispositions.', format: 'PDF' }
  ]
  await Report.insertMany(reportDefs.map(r => ({ ...r, status: 'Ready' })))

  // ---- Audit log ----
  await AuditLog.insertMany([
    { timestamp: new Date(), user: 'Examiner-07', action: 'Finding Reviewed', finding: 'EG-182', entityId: 'CSE-014', status: 'Confirmed' },
    { timestamp: new Date(Date.now() - 20 * 60000), user: 'Examiner-03', action: 'Recommendation Assigned', finding: 'RP-001', entityId: 'CSE-014', status: 'Assigned' },
    { timestamp: new Date(Date.now() - 40 * 60000), user: 'Supervisor-02', action: 'Adding Examiner Note', finding: 'EG-182', entityId: 'CSE-014', status: 'In Progress' },
    { timestamp: new Date(Date.now() - 60 * 60000), user: 'Auto-Ingest', action: 'Data Ingested', entityId: 'CSE-014', status: 'Complete' },
    { timestamp: new Date(Date.now() - 120 * 60000), user: 'Examiner-05', action: 'Recommendation Reviewed', finding: 'RP-003', entityId: 'CSE-027', status: 'Submitted' },
    { timestamp: new Date(Date.now() - 180 * 60000), user: 'Examiner-09', action: 'Finding Reviewed', finding: 'NS-004', entityId: 'CSE-063', status: 'Confirmed' }
  ])

  console.log('=== SEED COMPLETE ===')
  console.log(`Entities: ${await Entity.countDocuments()}`)
  console.log(`Metric:   ${await EntityMetric.countDocuments()}`)
  console.log(`Alerts:   ${await Alert.countDocuments()}`)
  console.log(`Cases:    ${await Case.countDocuments()}`)
  console.log(`Findings: ${await Finding.countDocuments()}`)
  console.log(`Evidence: ${await EvidenceEvent.countDocuments()}`)
  await mongoose.disconnect()
}

seed().catch(err => { console.error(err); process.exit(1) })
