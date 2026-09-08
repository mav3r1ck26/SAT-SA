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
import { Configuration } from './models/Configuration'

type Criticality = 'Critical' | 'High' | 'Medium' | 'Low'
type Priority = 'Critical' | 'High' | 'Moderate' | 'Normal' | 'Low'
type PeerDeviation = 'Significantly Above' | 'Above' | 'In Range' | 'Below' | 'Significantly Below'
type Severity = 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational'
type Behaviour = 'Normal' | 'Unusually Fast' | 'Superficial' | 'Repetitive' | 'Requires Review'
type TelemetryCriticality = 'Critical' | 'High' | 'Medium' | 'Low'
type FindingType = 'EXECUTION_GAP' | 'NEGATIVE_SPACE' | 'ANOMALY' | 'PEER_DEVIATION' | 'DATA_QUALITY' | 'RISK_INDICATOR' | 'ML_RISK'
type FindingSeverity = 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational'
type FindingStatus = 'New' | 'In Review' | 'Confirmed' | 'Rejected' | 'Deferred' | 'Examiner Confirmed' | 'Examiner Rejected'
type CaseBehaviour = 'Normal' | 'Unusually Fast' | 'Superficial' | 'Repetitive' | 'Requires Review'
type AlertSeverity = 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational'
type CaseClosureReason = 'Resolved' | 'False Positive' | 'Escalated' | 'Duplicate' | 'Deferred' | 'Insufficient Evidence'
type CaseStatus = 'open' | 'investigating' | 'closed' | 'reopened' | 'escalated'

const entitySeeds = [
  { id: 'CSE-001', name: 'National Power Grid Op.', sector: 'Power', region: 'North', criticality: 'Critical' as Criticality, dataCompleteness: 92, telemetryCoverage: 86, metrics: { threatDetection: 72, investigation: 65, escalation: 70, incidentResponse: 60, securityOperations: 55, governanceOversight: 55, operationalDiscipline: 68, cyberResilience: 68, riskScore: 58, prevRiskScore: 55, executionGapCount: 2, negativeSpaceCount: 1, peerDeviation: 'In Range' as PeerDeviation, priority: 'Normal' as Priority } },
  { id: 'CSE-008', name: 'State Telecom Network', sector: 'Telecom', region: 'South', criticality: 'High' as Criticality, dataCompleteness: 88, telemetryCoverage: 79, metrics: { threatDetection: 74, investigation: 68, escalation: 72, incidentResponse: 64, securityOperations: 61, governanceOversight: 61, operationalDiscipline: 70, cyberResilience: 70, riskScore: 63, prevRiskScore: 58, executionGapCount: 2, negativeSpaceCount: 3, peerDeviation: 'Below' as PeerDeviation, priority: 'Normal' as Priority } },
  { id: 'CSE-014', name: 'Central Power Authority', sector: 'Power', region: 'West', criticality: 'Critical' as Criticality, dataCompleteness: 81, telemetryCoverage: 62, metrics: { threatDetection: 78, investigation: 91, escalation: 86, incidentResponse: 72, securityOperations: 68, governanceOversight: 68, operationalDiscipline: 83, cyberResilience: 83, riskScore: 87, prevRiskScore: 78, executionGapCount: 6, negativeSpaceCount: 4, peerDeviation: 'Significantly Below' as PeerDeviation, priority: 'Critical' as Priority } },
  { id: 'CSE-021', name: 'Regional Transport Alliance', sector: 'Transport', region: 'Central', criticality: 'Medium' as Criticality, dataCompleteness: 95, telemetryCoverage: 90, metrics: { threatDetection: 68, investigation: 70, escalation: 66, incidentResponse: 61, securityOperations: 64, governanceOversight: 64, operationalDiscipline: 65, cyberResilience: 65, riskScore: 45, prevRiskScore: 48, executionGapCount: 1, negativeSpaceCount: 2, peerDeviation: 'In Range' as PeerDeviation, priority: 'Normal' as Priority } },
  { id: 'CSE-027', name: 'National Banking Services', sector: 'Banking', region: 'West', criticality: 'Critical' as Criticality, dataCompleteness: 94, telemetryCoverage: 78, metrics: { threatDetection: 84, investigation: 82, escalation: 80, incidentResponse: 74, securityOperations: 72, governanceOversight: 72, operationalDiscipline: 77, cyberResilience: 77, riskScore: 79, prevRiskScore: 71, executionGapCount: 4, negativeSpaceCount: 2, peerDeviation: 'Below' as PeerDeviation, priority: 'High' as Priority } },
  { id: 'CSE-034', name: 'Renewable Energy Group', sector: 'Energy', region: 'South', criticality: 'Medium' as Criticality, dataCompleteness: 86, telemetryCoverage: 74, metrics: { threatDetection: 70, investigation: 66, escalation: 62, incidentResponse: 63, securityOperations: 58, governanceOversight: 58, operationalDiscipline: 64, cyberResilience: 64, riskScore: 52, prevRiskScore: 49, executionGapCount: 1, negativeSpaceCount: 3, peerDeviation: 'In Range' as PeerDeviation, priority: 'Normal' as Priority } },
  { id: 'CSE-041', name: 'Central Defence Data Ctr', sector: 'Defence', region: 'North', criticality: 'Critical' as Criticality, dataCompleteness: 91, telemetryCoverage: 83, metrics: { threatDetection: 82, investigation: 76, escalation: 78, incidentResponse: 69, securityOperations: 74, governanceOversight: 74, operationalDiscipline: 80, cyberResilience: 80, riskScore: 71, prevRiskScore: 67, executionGapCount: 3, negativeSpaceCount: 1, peerDeviation: 'Below' as PeerDeviation, priority: 'High' as Priority } },
  { id: 'CSE-050', name: 'Govt Digital Services', sector: 'Government', region: 'Central', criticality: 'High' as Criticality, dataCompleteness: 90, telemetryCoverage: 81, metrics: { threatDetection: 72, investigation: 69, escalation: 65, incidentResponse: 67, securityOperations: 70, governanceOversight: 70, operationalDiscipline: 66, cyberResilience: 66, riskScore: 60, prevRiskScore: 62, executionGapCount: 2, negativeSpaceCount: 2, peerDeviation: 'In Range' as PeerDeviation, priority: 'Normal' as Priority } },
  { id: 'CSE-058', name: 'National Health Net', sector: 'Health', region: 'East', criticality: 'High' as Criticality, dataCompleteness: 93, telemetryCoverage: 88, metrics: { threatDetection: 69, investigation: 71, escalation: 67, incidentResponse: 65, securityOperations: 66, governanceOversight: 66, operationalDiscipline: 68, cyberResilience: 68, riskScore: 47, prevRiskScore: 51, executionGapCount: 1, negativeSpaceCount: 2, peerDeviation: 'In Range' as PeerDeviation, priority: 'Normal' as Priority } },
  { id: 'CSE-063', name: 'Metropolitan Water Board', sector: 'Water', region: 'South', criticality: 'High' as Criticality, dataCompleteness: 84, telemetryCoverage: 70, metrics: { threatDetection: 66, investigation: 63, escalation: 61, incidentResponse: 64, securityOperations: 60, governanceOversight: 60, operationalDiscipline: 63, cyberResilience: 63, riskScore: 55, prevRiskScore: 57, executionGapCount: 1, negativeSpaceCount: 3, peerDeviation: 'In Range' as PeerDeviation, priority: 'Normal' as Priority } },
  { id: 'CSE-070', name: 'Freight Rail Network', sector: 'Transport', region: 'West', criticality: 'Medium' as Criticality, dataCompleteness: 96, telemetryCoverage: 91, metrics: { threatDetection: 65, investigation: 67, escalation: 64, incidentResponse: 62, securityOperations: 63, governanceOversight: 63, operationalDiscipline: 66, cyberResilience: 66, riskScore: 41, prevRiskScore: 44, executionGapCount: 0, negativeSpaceCount: 1, peerDeviation: 'In Range' as PeerDeviation, priority: 'Normal' as Priority } }
] as const

const telemetryCategories = [
  { category: 'Critical systems', assetGroup: 'Critical Systems', criticality: 'Critical' as TelemetryCriticality },
  { category: 'Security devices', assetGroup: 'Security Devices', criticality: 'High' as TelemetryCriticality },
  { category: 'Network segments', assetGroup: 'Network Segments', criticality: 'High' as TelemetryCriticality },
  { category: 'Applications', assetGroup: 'Applications', criticality: 'Medium' as TelemetryCriticality },
  { category: 'Cloud environments', assetGroup: 'Cloud Environments', criticality: 'Medium' as TelemetryCriticality },
  { category: 'Identity infrastructure', assetGroup: 'Identity Infrastructure', criticality: 'High' as TelemetryCriticality },
  { category: 'OT/ICS environments', assetGroup: 'OT/ICS Environments', criticality: 'Critical' as TelemetryCriticality }
] as const

const alertCategories = ['Malware', 'Phishing', 'Network Anomaly', 'Access Anomaly', 'Data Exfiltration', 'Lateral Movement', 'Privilege Escalation'] as const
const assets = ['FW-GW-14', 'EDR-CSE-021', 'IDP-Primary', 'NSM-SEG-27', 'MAIL-GW-08', 'DB-REPLICA', 'AAA-HOST', 'FW-EDGE-02'] as const
const severities = ['Critical', 'High', 'Medium', 'Low'] as const
const investigators = ['Analyst-01', 'Analyst-02', 'Analyst-03', 'Analyst-04', 'Analyst-05'] as const

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
    Report.deleteMany({}), IngestionBatch.deleteMany({}), Configuration.deleteMany({})
  ])

  // ---- Configuration ----
  const { initializeConfiguration } = await import('./services/configuration')
  await initializeConfiguration()

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
      if (special[e.id]?.[cat.category]) observed = special[e.id][cat.category]
      await TelemetryCoverage.create({
        entityId: e.id, category: cat.category, assetGroup: cat.assetGroup, criticality: cat.criticality,
        expected: 100, observed,
        alertGeneration: rand(40, 95), investigationEvidence: rand(30, 90), escalationEvidence: rand(20, 85),
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
      const severity = severities[rand(0, severities.length - 1)] as AlertSeverity
      const category = alertCategories[rand(0, alertCategories.length - 1)]
      const asset = assets[rand(0, assets.length - 1)]
      const createdAt = daysAgoDate(rand(0, 60), -rand(0, 24))
      const acknowledgedAt = new Date(createdAt.getTime() + rand(1, 900) * 60000)
      const invStartedAt = new Date(acknowledgedAt.getTime() + rand(1, 600) * 60000)
      const closedAt = new Date(acknowledgedAt.getTime() + rand(2, 3000) * 60000)

      let escalationPath: string | null = null
      let escalationDelayMin = 0
      let escalationRequired = false
      let escalated = false
      if (Math.random() < 0.7) {
        const paths = ['Analyst → Team Lead', 'Analyst → L2 → Team Lead', 'Analyst → Incident Mgr', 'Direct to CERT']
        escalationPath = paths[rand(0, 3)]
        escalationDelayMin = rand(30, 1500)
        escalationRequired = true
        escalated = Math.random() < 0.6
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
        let behaviour = 'Normal' as CaseBehaviour
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
          evidenceCount: evidence,
          isTemplateReuse: isTemplate, reopenedCount: reopened,
          closureReason: (Math.random() < 0.5 ? 'False positive' : 'Resolved') as CaseClosureReason,
          investigator: investigators[rand(0, investigators.length - 1)],
          behaviour, status: 'closed' as CaseStatus,
          rootCauseIdentified: Math.random() < 0.7,
          remediationRecorded: Math.random() < 0.6,
          escalationRecorded: !!escalationPath
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
            entityId: e.id,
            caseId, alertId, eventTime: time, actor, role, event: evt, eventType: evt as any,
            metadata: [`Severity: ${severity}`, `Asset: ${asset}`, `Category: ${category}`]
          })
        }
      }

      await Alert.create({
        id: alertId, entityId: e.id, category, asset, severity, status: 'closed' as const,
        createdAt, acknowledgedAt, investigationStartedAt: invStartedAt, closedAt,
        escalationPath, escalationDelayMin, escalationRequired, escalated, alertToCase,
        closureNote: Math.random() < 0.5 ? 'False positive' : 'Resolved',
        meanAckMin: 4.2, meanInvestigationMin: 42.6, meanClosureMin: 58.3,
        period: 'Q2 FY 2026-27'
      } as any)
    }
  }

  // ---- Findings ----
  const findingCounter = { n: 180 }
  const gapSeeds = [
    { type: 'EXECUTION_GAP' as FindingType, title: 'Rapid Closure Without Investigation', entityId: 'CSE-014', controlArea: 'Investigation', severity: 'Critical' as FindingSeverity, confidence: 94, evidenceCount: 14, description: 'Case closed within 6 minutes without a substantive investigation record.', peer: '2.8× below peer median' },
    { type: 'EXECUTION_GAP' as FindingType, title: 'Critical Alert Without Escalation', entityId: 'CSE-014', controlArea: 'Escalation', severity: 'Critical' as FindingSeverity, confidence: 91, evidenceCount: 9, description: '7 critical alerts resolved with no recorded escalation or incident response reference.', peer: '0 escalation records vs 1.6 median' },
    { type: 'EXECUTION_GAP' as FindingType, title: 'Repeated Template Investigation', entityId: 'CSE-027', controlArea: 'Investigation', severity: 'High' as FindingSeverity, confidence: 87, evidenceCount: 11, description: '11 cases share near-identical investigation narratives, timestamps, and actions.', peer: 'Similar-pattern incidence 4.1× above peer average' },
    { type: 'EXECUTION_GAP' as FindingType, title: 'Metric-Compliant but Risk-Inconsistent Behaviour', entityId: 'CSE-008', controlArea: 'Alert Handling', severity: 'Medium' as FindingSeverity, confidence: 83, evidenceCount: 7, description: 'SLA metrics are met, but closure occurs before any investigation depth is demonstrated.', peer: 'Investigation depth 42% below peer median' },
    { type: 'EXECUTION_GAP' as FindingType, title: 'Rapid Closure Without Investigation', entityId: 'CSE-041', controlArea: 'Investigation', severity: 'High' as FindingSeverity, confidence: 82, evidenceCount: 6, description: 'Rapid closure patterns observed across 6 distinct case types.', peer: 'Closure time 60% below peer median' }
  ]
  for (const g of gapSeeds) {
    findingCounter.n++
    await Finding.create({
      id: `EG-${findingCounter.n}`, findingType: g.type, title: g.title, entityId: g.entityId, controlArea: g.controlArea,
      severity: g.severity, confidence: g.confidence, evidenceCount: g.evidenceCount, status: 'In Review' as FindingStatus, description: g.description, whyItMatters: g.description,
      methodology: 'Comparison of operational evidence against documented capability baselines and peer medians.',
      limitations: 'Indicators may have legitimate non-risk explanations. Requires examiner confirmation.',
      peerComparison: g.peer, recommendation: 'Manual examination of investigation records recommended.'
    })
  }

  // Negative space findings
  for (const e of entitySeeds) {
    if (e.telemetryCoverage < 65) {
      findingCounter.n++
      await Finding.create({
        id: `NS-${findingCounter.n}`, findingType: 'NEGATIVE_SPACE' as FindingType, title: 'Missing Telemetry',
        entityId: e.id, controlArea: 'Telemetry', severity: 'High' as FindingSeverity, confidence: 86, evidenceCount: 6, status: 'New' as FindingStatus,
        description: 'Expected telemetry streams absent or incomplete from critical asset groups.',
        whyItMatters: 'Critical asset groups are under-monitored, limiting detection and investigation capability.',
        methodology: 'Expected vs observed telemetry compared across infrastructure categories. Coverage <50% flagged.',
        limitations: 'Telemetry may be aggregated or monitored through alternate channels.',
        peerComparison: 'Telemetry coverage 26% below sector median',
        recommendation: 'Verify telemetry collection for critical asset groups.'
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
    { timestamp: new Date(), user: 'Examiner-07', action: 'Finding Reviewed', findingId: 'EG-182', entityId: 'CSE-014', status: 'Confirmed' },
    { timestamp: new Date(Date.now() - 20 * 60000), user: 'Examiner-03', action: 'Recommendation Assigned', findingId: 'RP-001', entityId: 'CSE-014', status: 'Assigned' },
    { timestamp: new Date(Date.now() - 40 * 60000), user: 'Supervisor-02', action: 'Adding Examiner Note', findingId: 'EG-182', entityId: 'CSE-014', status: 'In Progress' },
    { timestamp: new Date(Date.now() - 60 * 60000), user: 'Auto-Ingest', action: 'Data Ingested', entityId: 'CSE-014', status: 'Complete' },
    { timestamp: new Date(Date.now() - 120 * 60000), user: 'Examiner-05', action: 'Recommendation Reviewed', findingId: 'RP-003', entityId: 'CSE-027', status: 'Submitted' },
    { timestamp: new Date(Date.now() - 180 * 60000), user: 'Examiner-09', action: 'Finding Reviewed', findingId: 'NS-004', entityId: 'CSE-063', status: 'Confirmed' }
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