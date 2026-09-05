export const SECTORS = ['Banking', 'Power', 'Telecom', 'Transport', 'Energy', 'Government', 'Defence', 'Health', 'Water'] as const
export type Sector = typeof SECTORS[number]

export const REGIONS = ['North', 'South', 'East', 'West', 'Central'] as const
export type Region = typeof REGIONS[number]

export interface Entity {
  id: string
  name: string
  sector: Sector
  region: Region
  criticality: 'Critical' | 'High' | 'Medium' | 'Low'
  riskScore: number
  prevRiskScore: number
  executionGaps: number
  negativeSpace: number
  peerDeviation: 'Low' | 'Medium' | 'High' | 'Very High'
  priority: 'Normal' | 'Moderate' | 'High' | 'Critical'
  status: 'Compliant' | 'Monitor' | 'Review Required' | 'Escalated'
  detection: number
  investigation: number
  escalation: number
  operations: number
  governance: number
  resilience: number
  dataCompleteness: number
  lastSubmission: string
  telemetryCoverage: number
}

export const entities: Entity[] = [
  { id: 'CSE-001', name: 'National Power Grid Op.', sector: 'Power', region: 'North', criticality: 'Critical', riskScore: 58, prevRiskScore: 55, executionGaps: 2, negativeSpace: 1, peerDeviation: 'Low', priority: 'Moderate', status: 'Monitor', detection: 72, investigation: 65, escalation: 70, operations: 60, governance: 55, resilience: 68, dataCompleteness: 92, lastSubmission: '01 Sep 2026', telemetryCoverage: 86 },
  { id: 'CSE-008', name: 'State Telecom Network', sector: 'Telecom', region: 'South', criticality: 'High', riskScore: 63, prevRiskScore: 58, executionGaps: 2, negativeSpace: 3, peerDeviation: 'Medium', priority: 'Moderate', status: 'Monitor', detection: 74, investigation: 68, escalation: 72, operations: 64, governance: 61, resilience: 70, dataCompleteness: 88, lastSubmission: '29 Aug 2026', telemetryCoverage: 79 },
  { id: 'CSE-014', name: 'Central Power Authority', sector: 'Power', region: 'West', criticality: 'Critical', riskScore: 87, prevRiskScore: 78, executionGaps: 6, negativeSpace: 4, peerDeviation: 'High', priority: 'Critical', status: 'Review Required', detection: 78, investigation: 91, escalation: 86, operations: 72, governance: 68, resilience: 83, dataCompleteness: 81, lastSubmission: '30 Aug 2026', telemetryCoverage: 62 },
  { id: 'CSE-021', name: 'Regional Transport Alliance', sector: 'Transport', region: 'Central', criticality: 'Medium', riskScore: 45, prevRiskScore: 48, executionGaps: 1, negativeSpace: 2, peerDeviation: 'Low', priority: 'Normal', status: 'Compliant', detection: 68, investigation: 70, escalation: 66, operations: 61, governance: 64, resilience: 65, dataCompleteness: 95, lastSubmission: '02 Sep 2026', telemetryCoverage: 90 },
  { id: 'CSE-027', name: 'National Banking Services', sector: 'Banking', region: 'West', criticality: 'Critical', riskScore: 79, prevRiskScore: 71, executionGaps: 4, negativeSpace: 2, peerDeviation: 'Medium', priority: 'High', status: 'Review Required', detection: 84, investigation: 82, escalation: 80, operations: 74, governance: 72, resilience: 77, dataCompleteness: 94, lastSubmission: '31 Aug 2026', telemetryCoverage: 78 },
  { id: 'CSE-034', name: 'Renewable Energy Group', sector: 'Energy', region: 'South', criticality: 'Medium', riskScore: 52, prevRiskScore: 49, executionGaps: 1, negativeSpace: 3, peerDeviation: 'Low', priority: 'Moderate', status: 'Monitor', detection: 70, investigation: 66, escalation: 62, operations: 63, governance: 58, resilience: 64, dataCompleteness: 86, lastSubmission: '29 Aug 2026', telemetryCoverage: 74 },
  { id: 'CSE-041', name: 'Central Defence Data Ctr', sector: 'Defence', region: 'North', criticality: 'Critical', riskScore: 71, prevRiskScore: 67, executionGaps: 3, negativeSpace: 1, peerDeviation: 'Medium', priority: 'High', status: 'Review Required', detection: 82, investigation: 76, escalation: 78, operations: 69, governance: 74, resilience: 80, dataCompleteness: 91, lastSubmission: '01 Sep 2026', telemetryCoverage: 83 },
  { id: 'CSE-050', name: 'Govt Digital Services', sector: 'Government', region: 'Central', criticality: 'High', riskScore: 60, prevRiskScore: 62, executionGaps: 2, negativeSpace: 2, peerDeviation: 'Low', priority: 'Moderate', status: 'Monitor', detection: 72, investigation: 69, escalation: 65, operations: 67, governance: 70, resilience: 66, dataCompleteness: 90, lastSubmission: '30 Aug 2026', telemetryCoverage: 81 },
  { id: 'CSE-058', name: 'National Health Net', sector: 'Health', region: 'East', criticality: 'High', riskScore: 47, prevRiskScore: 51, executionGaps: 1, negativeSpace: 2, peerDeviation: 'Low', priority: 'Normal', status: 'Compliant', detection: 69, investigation: 71, escalation: 67, operations: 65, governance: 66, resilience: 68, dataCompleteness: 93, lastSubmission: '02 Sep 2026', telemetryCoverage: 88 },
  { id: 'CSE-063', name: 'Metropolitan Water Board', sector: 'Water', region: 'South', criticality: 'High', riskScore: 55, prevRiskScore: 57, executionGaps: 1, negativeSpace: 3, peerDeviation: 'Low', priority: 'Moderate', status: 'Monitor', detection: 66, investigation: 63, escalation: 61, operations: 64, governance: 60, resilience: 63, dataCompleteness: 84, lastSubmission: '28 Aug 2026', telemetryCoverage: 70 },
  { id: 'CSE-070', name: 'Freight Rail Network', sector: 'Transport', region: 'West', criticality: 'Medium', riskScore: 41, prevRiskScore: 44, executionGaps: 0, negativeSpace: 1, peerDeviation: 'Low', priority: 'Normal', status: 'Compliant', detection: 65, investigation: 67, escalation: 64, operations: 62, governance: 63, resilience: 66, dataCompleteness: 96, lastSubmission: '02 Sep 2026', telemetryCoverage: 91 }
]

export interface KPI {
  label: string
  value: number
  display: string
  trend: number
  icon: string
  threshold?: 'good' | 'watched' | 'bad'
}

export const overviewKPIs: KPI[] = [
  { label: 'CSEs Assessed', value: 42, display: '42', trend: 5, icon: 'building' },
  { label: 'Entities Requiring Attention', value: 11, display: '11', trend: 3, icon: 'alert', threshold: 'watched' },
  { label: 'High-Risk Findings', value: 27, display: '27', trend: 6, icon: 'shield', threshold: 'bad' },
  { label: 'Execution Gap Indicators', value: 18, display: '18', trend: 4, icon: 'gap' },
  { label: 'Negative Space Indicators', value: 13, display: '13', trend: 2, icon: 'space' },
  { label: 'Alerts Reviewed', value: 184620, display: '184,620', trend: 14, icon: 'alerts' },
  { label: 'Cases Analysed', value: 32481, display: '32,481', trend: 8, icon: 'cases' },
  { label: 'Priority Samples', value: 1240, display: '1,240', trend: -8, icon: 'samples' }
]

export const riskDistribution = [
  { level: 'Critical', count: 3, value: 3 },
  { level: 'High', count: 5, value: 5 },
  { level: 'Moderate', count: 8, value: 8 },
  { level: 'Low', count: 11, value: 11 },
  { level: 'Normal', count: 15, value: 15 }
]

export interface SupervisoryConcern {
  title: string
  severity: 'Critical' | 'High' | 'Medium'
  affectedEntities: number
  confidence: number
  evidenceCount: number
  description: string
}

export const topConcerns: SupervisoryConcern[] = [
  { title: 'Critical alerts closed without escalation', severity: 'Critical', affectedEntities: 7, confidence: 92, evidenceCount: 214, description: 'High-severity alerts resolved with no recorded escalation path across multiple entities.' },
  { title: 'Unusually rapid case closure', severity: 'High', affectedEntities: 6, confidence: 89, evidenceCount: 187, description: 'Cases closed significantly faster than peer baseline, suggesting shallow investigation.' },
  { title: 'Missing telemetry from critical systems', severity: 'High', affectedEntities: 5, confidence: 86, evidenceCount: 92, description: 'Expected telemetry streams absent or incomplete from critical asset groups.' },
  { title: 'Repetitive investigation patterns', severity: 'Medium', affectedEntities: 4, confidence: 78, evidenceCount: 143, description: 'Template-like investigation notes and actions across distinct incident cases.' },
  { title: 'Significant peer deviation', severity: 'Medium', affectedEntities: 6, confidence: 81, evidenceCount: 76, description: 'Operational metrics substantially outside peer range for comparable entities.' }
]

export interface EscalationStat {
  label: string
  value: number
}

export const entityRiskDistribution = [
  { entity: 'CSE-014', score: 87, sector: 'Power' },
  { entity: 'CSE-027', score: 79, sector: 'Banking' },
  { entity: 'CSE-041', score: 71, sector: 'Defence' },
  { entity: 'CSE-008', score: 63, sector: 'Telecom' },
  { entity: 'CSE-050', score: 60, sector: 'Government' },
  { entity: 'CSE-001', score: 58, sector: 'Power' },
  { entity: 'CSE-063', score: 55, sector: 'Water' },
  { entity: 'CSE-034', score: 52, sector: 'Energy' },
  { entity: 'CSE-058', score: 47, sector: 'Health' },
  { entity: 'CSE-021', score: 45, sector: 'Transport' },
  { entity: 'CSE-070', score: 41, sector: 'Transport' }
]

export interface ExecutionFinding {
  id: string
  finding: string
  entity: string
  controlArea: string
  evidenceCount: number
  confidence: number
  severity: 'Critical' | 'High' | 'Medium' | 'Low'
  status: 'New' | 'In Review' | 'Confirmed' | 'Dismissed'
  description: string
  methodology: string
  limitations: string
  peerComparison: string
}

export const executionFindings: ExecutionFinding[] = [
  { id: 'EG-182', finding: 'Rapid Closure Without Investigation', entity: 'CSE-014', controlArea: 'Investigation', evidenceCount: 14, confidence: 94, severity: 'Critical', status: 'In Review', description: 'Case closed within 6 minutes without a substantive investigation record.', methodology: 'Closure duration compared against peer median; duration <5th percentile of peers flags anomaly. No investigation narrative detected in case log.', limitations: 'Duration alone cannot confirm underlying investigation quality. Short closure may reflect automated triage.', peerComparison: '2.8× below peer median closure time' },
  { id: 'EG-183', finding: 'Critical Alert Without Escalation', entity: 'CSE-014', controlArea: 'Escalation', evidenceCount: 9, confidence: 91, severity: 'Critical', status: 'New', description: '7 critical alerts resolved with no recorded escalation or incident response reference.', methodology: 'Alert severity mappings cross-referenced against escalation events in the case timeline. Absence of escalation event treated as signal.', limitations: 'Escalation may be handled outside the surveyed workflow (e.g., verbal, offline).', peerComparison: '0 escalation records vs 1.6 median for peer group' },
  { id: 'EG-186', finding: 'Repeated Template Investigation', entity: 'CSE-027', controlArea: 'Investigation', evidenceCount: 11, confidence: 87, severity: 'High', status: 'In Review', description: '11 cases share near-identical investigation narratives, timestamps, and actions.', methodology: 'N-gram similarity over investigation note text. Cases with >90% similarity flagged as repetitive template.', limitations: 'Similar incidents may legitimately yield similar notes. Pattern alone is not conclusive.', peerComparison: 'Similar-pattern incidence 4.1× above peer average' },
  { id: 'EG-188', finding: 'Metric-Compliant but Risk-Inconsistent Behaviour', entity: 'CSE-008', controlArea: 'Alert Handling', evidenceCount: 7, confidence: 83, severity: 'Medium', status: 'New', description: 'SLA metrics are met, but closure occurs before any investigation depth is demonstrated.', methodology: 'Metric-level compliance (closure within SLA) compared against investigation-depth proxy (actions, notes, evidence attachments). Low depth despite compliance flagged.', limitations: 'SLA compliance is not inherently a gap; combination signal could be coincidental.', peerComparison: 'Investigation depth 42% below peer median' },
  { id: 'EG-190', finding: 'Rapid Closure Without Investigation', entity: 'CSE-041', controlArea: 'Investigation', evidenceCount: 6, confidence: 82, severity: 'High', status: 'Confirmed', description: 'Rapid closure patterns observed across 6 distinct case types.', methodology: 'Earliest/latest event timestamps compared; investigation window below 3rd percentile flagged.', limitations: 'Different case types legitimately have different durations.', peerComparison: 'Closure time 60% below peer median' },
  { id: 'EG-194', finding: 'Critical Alert Without Escalation', entity: 'CSE-027', controlArea: 'Escalation', evidenceCount: 5, confidence: 85, severity: 'High', status: 'New', description: 'Critical alerts closed without documented escalation path.', methodology: 'Critical-alert resolution events checked for escalation linkage.', limitations: 'Escalation may occur outside the system of record.', peerComparison: '2.0× below peer escalation rate' },
  { id: 'EG-197', finding: 'Repeated Template Investigation', entity: 'CSE-041', controlArea: 'Investigation', evidenceCount: 4, confidence: 76, severity: 'Medium', status: 'Dismissed', description: 'Repeated investigation patterns identified across similar incidents.', methodology: 'Textual similarity scoring across investigation records.', limitations: 'Legitimate similarity possible for recurring incident types.', peerComparison: 'Similar-pattern incidence 2.4× above peer average' }
]

export interface NegativeSpaceRow {
  category: string
  expectedTelemetry: number
  observedTelemetry: number
  alertGeneration: number
  investigationEvidence: number
  escalationEvidence: number
}

export const negativeSpaceMatrix: NegativeSpaceRow[] = [
  { category: 'Critical systems', expectedTelemetry: 100, observedTelemetry: 62, alertGeneration: 71, investigationEvidence: 58, escalationEvidence: 44 },
  { category: 'Security devices', expectedTelemetry: 100, observedTelemetry: 74, alertGeneration: 68, investigationEvidence: 61, escalationEvidence: 52 },
  { category: 'Network segments', expectedTelemetry: 100, observedTelemetry: 81, alertGeneration: 76, investigationEvidence: 69, escalationEvidence: 63 },
  { category: 'Applications', expectedTelemetry: 100, observedTelemetry: 58, alertGeneration: 64, investigationEvidence: 55, escalationEvidence: 47 },
  { category: 'Cloud environments', expectedTelemetry: 100, observedTelemetry: 66, alertGeneration: 60, investigationEvidence: 53, escalationEvidence: 49 },
  { category: 'Identity infrastructure', expectedTelemetry: 100, observedTelemetry: 71, alertGeneration: 73, investigationEvidence: 66, escalationEvidence: 58 },
  { category: 'OT/ICS environments', expectedTelemetry: 100, observedTelemetry: 38, alertGeneration: 42, investigationEvidence: 33, escalationEvidence: 27 }
]

export interface BlindSpot {
  entity: string
  assetGroup: string
  observedPct: number
  description: string
}

export const blindSpots: BlindSpot[] = [
  { entity: 'CSE-014', assetGroup: 'Critical Asset Group', observedPct: 38, description: 'Only 38% of expected telemetry observed for critical systems.' },
  { entity: 'CSE-063', assetGroup: 'SCADA Control Systems', observedPct: 44, description: 'Low telemetry coverage across SCADA/ICS environments.' },
  { entity: 'CSE-034', assetGroup: 'Renewable Generation Farm', observedPct: 51, description: 'Incomplete cloud environment telemetry.' },
  { entity: 'CSE-008', assetGroup: 'Core Network Segments', observedPct: 55, description: 'Network segments under-monitored during peak load.' },
  { entity: 'CSE-027', assetGroup: 'Identity Infrastructure', observedPct: 68, description: 'Identity infrastructure coverage below expected threshold.' }
]

export interface AlertAnalytics {
  volumeByMonth: { month: string; critical: number; high: number; medium: number; low: number }[]
  severityDistribution: { severity: string; count: number }[]
  disposition: { disposition: string; count: number }[]
  lifecycle: { stage: string; meanMin: number }[]
  conversion: { category: string; alerts: number; cases: number; rate: number }[]
  repeatAlerts: { asset: string; count: number }[]
  criticalClosure: { pattern: string; count: number }[]
}

export const alertAnalytics: AlertAnalytics = {
  volumeByMonth: [
    { month: 'Apr', critical: 4200, high: 8900, medium: 12400, low: 16700 },
    { month: 'May', critical: 3800, high: 9200, medium: 13800, low: 18200 },
    { month: 'Jun', critical: 4600, high: 10400, medium: 15100, low: 19900 },
    { month: 'Jul', critical: 5200, high: 11800, medium: 16400, low: 21400 },
    { month: 'Aug', critical: 6100, high: 12600, medium: 17800, low: 23600 },
    { month: 'Sep', critical: 5800, high: 11900, medium: 16900, low: 22800 }
  ],
  severityDistribution: [
    { severity: 'Critical', count: 2890 },
    { severity: 'High', count: 6480 },
    { severity: 'Medium', count: 9240 },
    { severity: 'Low', count: 12260 }
  ],
  disposition: [
    { disposition: 'Resolved', count: 28400 },
    { disposition: 'False positive', count: 19800 },
    { disposition: 'Dismissed', count: 6400 },
    { disposition: 'Escalated to incident', count: 4200 },
    { disposition: 'Duplicate', count: 1800 }
  ],
  lifecycle: [
    { stage: 'Acknowledgment', meanMin: 4.2 },
    { stage: 'Investigation start', meanMin: 14.8 },
    { stage: 'Investigation completion', meanMin: 42.6 },
    { stage: 'Closure', meanMin: 58.3 }
  ],
  conversion: [
    { category: 'Malware', alerts: 4820, cases: 712, rate: 14.8 },
    { category: 'Phishing', alerts: 8610, cases: 934, rate: 10.8 },
    { category: 'Network Anomaly', alerts: 7290, cases: 521, rate: 7.1 },
    { category: 'Access Anomaly', alerts: 5420, cases: 618, rate: 11.4 },
    { category: 'Data Exfiltration', alerts: 2140, cases: 342, rate: 16.0 }
  ],
  repeatAlerts: [
    { asset: 'FW-GW-14', count: 64 },
    { asset: 'EDR-CSE-021', count: 51 },
    { asset: 'IDP-Primary', count: 43 },
    { asset: 'NSM-SEG-27', count: 38 },
    { asset: 'MAIL-GW-08', count: 31 },
    { asset: 'DB-REPLICA', count: 27 }
  ],
  criticalClosure: [
    { pattern: 'Closed without escalation', count: 214 },
    { pattern: 'Closed within 10 min', count: 172 },
    { pattern: 'Closed with template notes', count: 143 },
    { pattern: 'Closed after peer deviation', count: 87 },
    { pattern: 'Closed after reopening', count: 34 }
  ]
}

export interface InvestigationAnalytics {
  durationDistribution: { range: string; count: number }[]
  depth: { depth: string; count: number }[]
  patterns: { pattern: string; count: number; severity: string }[]
  evidenceFrequency: { category: string; avgPerCase: number }[]
  closureRatio: { entity: string; investigationCount: number; closureCount: number }[]
  workload: { investigator: string; cases: number; avgDuration: number }[]
  reopening: { entity: string; reopened: number; total: number }[]
  behaviour: { classification: string; count: number }[]
}

export const investigationAnalytics: InvestigationAnalytics = {
  durationDistribution: [
    { range: '< 10 min', count: 2140 },
    { range: '10–30 min', count: 4820 },
    { range: '30–60 min', count: 6410 },
    { range: '1–4 hrs', count: 8370 },
    { range: '4–24 hrs', count: 5920 },
    { range: '> 24 hrs', count: 2820 }
  ],
  depth: [
    { depth: 'Basic (log check only)', count: 6420 },
    { depth: 'Standard (log + review)', count: 12840 },
    { depth: 'Extended (multi-source)', count: 7230 },
    { depth: 'Comprehensive (forensic)', count: 2890 }
  ],
  patterns: [
    { pattern: 'Template note reuse', count: 1430, severity: 'High' },
    { pattern: 'Minimal evidence attachment', count: 980, severity: 'High' },
    { pattern: 'Rapid close (no actions)', count: 640, severity: 'Critical' },
    { pattern: 'Single-source verification', count: 820, severity: 'Medium' }
  ],
  evidenceFrequency: [
    { category: 'Screenshots', avgPerCase: 1.2 },
    { category: 'Log excerpts', avgPerCase: 2.4 },
    { category: 'Network captures', avgPerCase: 0.6 },
    { category: 'File hashes', avgPerCase: 0.9 },
    { category: 'User statements', avgPerCase: 0.3 },
    { category: 'System reports', avgPerCase: 1.8 }
  ],
  closureRatio: [
    { entity: 'CSE-014', investigationCount: 128, closureCount: 142 },
    { entity: 'CSE-027', investigationCount: 243, closureCount: 251 },
    { entity: 'CSE-041', investigationCount: 187, closureCount: 190 },
    { entity: 'CSE-008', investigationCount: 321, closureCount: 318 },
    { entity: 'CSE-034', investigationCount: 154, closureCount: 158 }
  ],
  workload: [
    { investigator: 'Analyst-01', cases: 342, avgDuration: 21 },
    { investigator: 'Analyst-02', cases: 289, avgDuration: 45 },
    { investigator: 'Analyst-03', cases: 275, avgDuration: 38 },
    { investigator: 'Analyst-04', cases: 243, avgDuration: 52 },
    { investigator: 'Analyst-05', cases: 218, avgDuration: 19 },
    { investigator: 'Analyst-06', cases: 195, avgDuration: 44 }
  ],
  reopening: [
    { entity: 'CSE-014', reopened: 24, total: 142 },
    { entity: 'CSE-027', reopened: 18, total: 251 },
    { entity: 'CSE-008', reopened: 12, total: 318 },
    { entity: 'CSE-041', reopened: 15, total: 190 },
    { entity: 'CSE-034', reopened: 4, total: 158 }
  ],
  behaviour: [
    { classification: 'Normal', count: 22140 },
    { classification: 'Superficial', count: 6430 },
    { classification: 'Repetitive', count: 2140 },
    { classification: 'Unusually Fast', count: 1210 },
    { classification: 'Requires Review', count: 560 }
  ]
}

export interface EscalationAnalytics {
  escalatedCritical: number
  notEscalatedCritical: number
  delayDistribution: { hours: string; count: number }[]
  paths: { path: string; count: number }[]
  severityMatrix: { severity: string; escalated: number; notEscalated: number }[]
  anomalies: { label: string; count: number; severity: string }[]
}

export const escalationAnalytics: EscalationAnalytics = {
  escalatedCritical: 2210,
  notEscalatedCritical: 680,
  delayDistribution: [
    { hours: '< 1 hr', count: 780 },
    { hours: '1–4 hrs', count: 542 },
    { hours: '4–12 hrs', count: 318 },
    { hours: '12–24 hrs', count: 264 },
    { hours: '> 24 hrs', count: 306 }
  ],
  paths: [
    { path: 'Analyst → Team Lead', count: 1440 },
    { path: 'Analyst → L2 → Team Lead', count: 620 },
    { path: 'Analyst → Incident Mgr', count: 480 },
    { path: 'Direct to CERT', count: 290 },
    { path: 'No path recorded', count: 680 }
  ],
  severityMatrix: [
    { severity: 'Critical', escalated: 2210, notEscalated: 680 },
    { severity: 'High', escalated: 4820, notEscalated: 1660 },
    { severity: 'Medium', escalated: 5240, notEscalated: 4000 },
    { severity: 'Low', escalated: 1820, notEscalated: 10440 }
  ],
  anomalies: [
    { label: 'Critical + No escalation', count: 680, severity: 'Critical' },
    { label: 'High + No escalation', count: 1660, severity: 'High' },
    { label: 'Escalation delay > 24 hrs', count: 306, severity: 'High' },
    { label: 'No escalation path recorded', count: 680, severity: 'High' }
  ]
}

export interface PeerMetrics {
  metric: string
  entityValue: number
  entityDisplay: string
  peerMedian: number
  peerMedianDisplay: string
  percentile: number
  assessment: string
}

export const peerMetrics: PeerMetrics[] = [
  { metric: 'Alert Volume', entityValue: 18420, entityDisplay: '18,420', peerMedian: 12400, peerMedianDisplay: '12,400', percentile: 82, assessment: 'Above peer range' },
  { metric: 'Critical Alert %', entityValue: 3.1, entityDisplay: '3.1%', peerMedian: 1.8, peerMedianDisplay: '1.8%', percentile: 88, assessment: 'Significantly above peer range' },
  { metric: 'Investigation Duration', entityValue: 7, entityDisplay: '7 min', peerMedian: 42, peerMedianDisplay: '42 min', percentile: 8, assessment: 'Significantly below peer range' },
  { metric: 'Closure Time', entityValue: 11, entityDisplay: '11 min', peerMedian: 58, peerMedianDisplay: '58 min', percentile: 6, assessment: 'Significantly below peer range' },
  { metric: 'Escalation Rate', entityValue: 2.4, entityDisplay: '2.4%', peerMedian: 11.8, peerMedianDisplay: '11.8%', percentile: 12, assessment: 'Below peer range' },
  { metric: 'Repeated Alerts', entityValue: 32, entityDisplay: '32%', peerMedian: 12, peerMedianDisplay: '12%', percentile: 91, assessment: 'Significantly above peer range' },
  { metric: 'Telemetry Coverage', entityValue: 62, entityDisplay: '62%', peerMedian: 84, peerMedianDisplay: '84%', percentile: 9, assessment: 'Significantly below peer range' },
  { metric: 'Investigation Depth', entityValue: 1.8, entityDisplay: '1.8', peerMedian: 3.2, peerMedianDisplay: '3.2', percentile: 14, assessment: 'Below peer range' }
]

export interface ReviewItem {
  priority: number
  severity: 'Critical' | 'High' | 'Medium'
  entity: string
  ref: string
  reason: string
  riskScore: number
  confidence: number
  evidenceCount: number
  reasonWrap: string[]
  suggestedAction: string
}

export const reviewQueue: ReviewItem[] = [
  { priority: 1, severity: 'Critical', entity: 'CSE-014', ref: 'CASE-84921', reason: 'Critical alert closed in 6 minutes without recorded escalation.', riskScore: 94, confidence: 94, evidenceCount: 14, reasonWrap: ['Closure time significantly below peer baseline', 'No escalation record', 'High-severity alert', 'Similar pattern observed 7 times'], suggestedAction: 'Examine investigation record and escalation disposition.' },
  { priority: 2, severity: 'Critical', entity: 'CSE-014', ref: 'ALERT-102938', reason: 'Critical alert on core asset without telemetry corroboration.', riskScore: 91, confidence: 91, evidenceCount: 9, reasonWrap: ['Missing telemetry for affected asset group', 'Multiple critical assets under-monitored', 'Alert-close sequence abnormally short'], suggestedAction: 'Verify telemetry coverage and asset monitoring status.' },
  { priority: 3, severity: 'High', entity: 'CSE-027', ref: 'CASE-84231', reason: 'Investigation narrative flagged as repeated template across 11 cases.', riskScore: 87, confidence: 87, evidenceCount: 11, reasonWrap: ['Near-identical investigation notes', 'Timestamps clustered within minutes', 'No distributed evidence attachments'], suggestedAction: 'Review investigation quality across affected cases.' },
  { priority: 4, severity: 'High', entity: 'CSE-041', ref: 'CASE-83817', reason: 'Rapid closure without investigation across multiple alerts.', riskScore: 82, confidence: 82, evidenceCount: 6, reasonWrap: ['Closure time below peer 3rd percentile', 'Investigation start not recorded', 'Prior related findings'], suggestedAction: 'Examine closure rationale and evidence trail.' },
  { priority: 5, severity: 'Medium', entity: 'CSE-008', ref: 'ALERT-98213', reason: 'SLA-compliant closure with minimal investigation depth.', riskScore: 76, confidence: 78, evidenceCount: 7, reasonWrap: ['Metrics within SLA', 'Investigation depth below peer median', 'Evidence attachment below threshold'], suggestedAction: 'Sample audit closure quality.' }
]

export interface EvidenceEvent {
  time: string
  actor: string
  role: string
  event: string
  meta: string[]
}

export const evidenceTimeline: EvidenceEvent[] = [
  { time: '17:48:02', actor: 'System', role: 'Detection', event: 'Alert Created', meta: ['Severity: Critical', 'Category: Lateral Movement', 'Asset: FW-GW-14'] },
  { time: '17:49:11', actor: 'Analyst-04', role: 'Tier 1', event: 'Acknowledged', meta: ['SLA: 4.2 min'] },
  { time: '17:50:40', actor: 'Analyst-04', role: 'Tier 1', event: 'Investigation Started', meta: ['No investigation narrative'] },
  { time: '—', actor: '—', role: '—', event: 'Escalation', meta: ['No escalation record found'] },
  { time: '—', actor: '—', role: '—', event: 'Containment', meta: ['No containment record found'] },
  { time: '17:54:33', actor: 'Analyst-04', role: 'Tier 1', event: 'Closure', meta: ['Closure note: "False positive"', 'No evidence attached'] }
]

export interface AuditRecord {
  timestamp: string
  user: string
  action: string
  finding: string
  entity: string
  status: string
}

export const auditRecords: AuditRecord[] = [
  { timestamp: '03 Sep 2026 18:31', user: 'Examiner-07', action: 'Finding Reviewed', finding: 'EG-182', entity: 'CSE-014', status: 'Confirmed' },
  { timestamp: '03 Sep 2026 18:12', user: 'Examiner-03', action: 'Recommendation Assigned', finding: 'RP-001', entity: 'CSE-014', status: 'Assigned' },
  { timestamp: '03 Sep 2026 17:55', user: 'Supervisor-02', action: 'Adding Examiner Note', finding: 'EG-182', entity: 'CSE-014', status: 'In Progress' },
  { timestamp: '03 Sep 2026 17:40', user: 'Auto-Ingest', action: 'Data Ingested', finding: '—', entity: 'CSE-014', status: 'Complete' },
  { timestamp: '03 Sep 2026 16:22', user: 'Examiner-05', action: 'Recommendation Reviewed', finding: 'RP-003', entity: 'CSE-027', status: 'Submitted' },
  { timestamp: '03 Sep 2026 15:48', user: 'Examiner-09', action: 'Finding Reviewed', finding: 'NS-004', entity: 'CSE-063', status: 'Confirmed' },
  { timestamp: '03 Sep 2026 15:20', user: 'Supervisor-01', action: 'Risk Score Recalculated', finding: '—', entity: 'CSE-014', status: 'Complete' },
  { timestamp: '03 Sep 2026 14:58', user: 'Examiner-02', action: 'Evidence Added', finding: 'EG-186', entity: 'CSE-027', status: 'In Progress' },
  { timestamp: '03 Sep 2026 14:11', user: 'Examiner-07', action: 'Finding Dismissed', finding: 'EG-197', entity: 'CSE-041', status: 'Dismissed' },
  { timestamp: '03 Sep 2026 13:45', user: 'Auto-Ingest', action: 'Data Validated', finding: '—', entity: 'CSE-008', status: 'Warning' }
]

export interface Notification {
  id: string
  type: 'finding' | 'risk' | 'negative-space' | 'data-quality' | 'validation' | 'period'
  title: string
  detail: string
  time: string
  read: boolean
  severity: 'high' | 'medium' | 'info'
}

export const notifications: Notification[] = [
  { id: 'N-001', type: 'finding', title: 'New high-confidence finding', detail: 'EG-182 identified for CSE-014. Confidence 94%.', time: '18:32', read: false, severity: 'high' },
  { id: 'N-002', type: 'risk', title: 'Entity risk increased significantly', detail: 'CSE-014 risk score rose 12% vs previous period.', time: '18:05', read: false, severity: 'high' },
  { id: 'N-003', type: 'negative-space', title: 'New negative-space indicator', detail: 'Monitoring blind spot detected for CSE-014 Critical Asset Group.', time: '17:40', read: false, severity: 'medium' },
  { id: 'N-004', type: 'data-quality', title: 'Data quality issue', detail: '14% of critical asset records have incomplete telemetry.', time: '16:22', read: true, severity: 'medium' },
  { id: 'N-005', type: 'validation', title: 'Validation discrepancy', detail: 'Human-vs-tool agreement dropped to 87% on select findings.', time: '15:58', read: true, severity: 'medium' },
  { id: 'N-006', type: 'period', title: 'Assessment period completed', detail: 'Q2 FY 2026–27 data aggregation complete.', time: '14:00', read: true, severity: 'info' }
]

export interface ReportDefinition {
  id: string
  name: string
  description: string
  status: 'Ready' | 'Generating' | 'Available' | 'Not Generated'
  generatedDate: string
  format: string[]
}

export const reportDefinitions: ReportDefinition[] = [
  { id: 'RPT-01', name: 'Entity Assessment Report', description: 'Comprehensive supervisory assessment for a single entity.', status: 'Available', generatedDate: '03 Sep 2026', format: ['PDF', 'CSV', 'JSON'] },
  { id: 'RPT-02', name: 'Cross-Entity Supervisory Report', description: 'Consolidated supervisory findings across all assessed CSEs.', status: 'Generating', generatedDate: 'In progress', format: ['PDF', 'CSV'] },
  { id: 'RPT-03', name: 'Execution Gap Report', description: 'All execution gap indicators with evidence and confidence.', status: 'Ready', generatedDate: 'Not generated', format: ['PDF', 'CSV', 'JSON'] },
  { id: 'RPT-04', name: 'Negative Space Report', description: 'Telemetry coverage matrix and monitoring blind spots.', status: 'Ready', generatedDate: 'Not generated', format: ['PDF', 'CSV'] },
  { id: 'RPT-05', name: 'Peer Benchmark Report', description: 'Peer percentile comparison for key operational metrics.', status: 'Available', generatedDate: '02 Sep 2026', format: ['PDF', 'CSV', 'JSON'] },
  { id: 'RPT-06', name: 'Manual Review Summary', description: 'Summary of manual review queue actions and dispositions.', status: 'Ready', generatedDate: 'Not generated', format: ['PDF'] }
]

export interface DataQualitySummary {
  recordsReceived: number
  validRecords: number
  invalidRecords: number
  missingFields: number
  duplicateRecords: number
  entitiesDetected: number
  dateRange: string
  warnings: { severity: string; message: string }[]
}

export const dataQualitySummary: DataQualitySummary = {
  recordsReceived: 68420,
  validRecords: 64810,
  invalidRecords: 3610,
  missingFields: 12480,
  duplicateRecords: 1420,
  entitiesDetected: 42,
  dateRange: '31 Jul 2026 – 31 Aug 2026',
  warnings: [
    { severity: 'High', message: '14% of critical asset records contain incomplete telemetry information.' },
    { severity: 'Medium', message: '5% of alert records lack asset attribution.' },
    { severity: 'Low', message: '2% of investigation notes contain template-like text.' }
  ]
}

export interface ValidationMetrics {
  expertFindings: number
  toolFindings: number
  truePositives: number
  falsePositives: number
  missedFindings: number
  precision: number
  recall: number
  agreement: number
  confusionMatrix: number[][]
}

export const validationMetrics: ValidationMetrics = {
  expertFindings: 84,
  toolFindings: 92,
  truePositives: 73,
  falsePositives: 19,
  missedFindings: 11,
  precision: 79.3,
  recall: 86.9,
  agreement: 87.4,
  confusionMatrix: [
    [73, 19],
    [11, 5]
  ]
}
