export type AssessmentDimensionKey =
  | 'threatDetection'
  | 'investigation'
  | 'escalation'
  | 'incidentResponse'
  | 'securityOperations'
  | 'governanceOversight'
  | 'operationalDiscipline'
  | 'cyberResilience'

export interface AssessmentDimensionDefinition {
  key: AssessmentDimensionKey
  label: string
  purpose: string
  inputMetric: string
  evidenceIndicators: string[]
  weight: number
  nistCsf: Array<{ id: string; name: string }>
}

export const ASSESSMENT_FRAMEWORK = {
  id: 'SAT-SA-SOC',
  name: 'SAT-SA Standardized SOC Assessment Framework',
  version: '1.0.0',
  publishedDate: '2026-10-09',
  description: 'A consistent organization-level assessment of SOC operational capability across eight supervisory dimensions.',
  scoreScale: {
    minimum: 0,
    maximum: 100,
    direction: 'Higher scores indicate stronger demonstrated capability.'
  },
  maturityFormula: 'Maturity score = round(sum(dimension score × dimension weight) / sum(weights for dimensions with a numeric score)).',
  dimensionScoreDefinition: 'Each dimension input is the period-specific, normalized EntityMetric score on a 0–100 scale; values outside the scale are clamped and missing values are excluded from the weighted mean. The listed operational indicators define the evidence expected for the submitted score.',
  riskScoreDefinition: 'Supervisory risk is a separate attention indicator from the existing SAT-SA risk model. It is not this framework’s maturity score and must not be interpreted as an NIST CSF maturity tier.',
  alignmentNotice: 'NIST CSF 2.0 references are outcome crosswalks to inform assessment coverage. They do not establish certification, regulatory compliance, or NIST maturity tiers.',
  references: [
    {
      id: 'NIST-CSF-2.0',
      title: 'The NIST Cybersecurity Framework (CSF) 2.0',
      publisher: 'National Institute of Standards and Technology',
      year: 2024,
      url: 'https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf',
      use: 'Outcome crosswalk for governance, monitoring, analysis, incident management, and recovery dimensions.'
    }
  ],
  dimensions: [
    {
      key: 'threatDetection',
      label: 'Threat Detection',
      purpose: 'Assess whether SOC monitoring and detection processes identify and analyze relevant security events.',
      inputMetric: 'EntityMetric.threatDetection (normalized 0–100)',
      evidenceIndicators: ['Alert creation and severity records', 'Telemetry coverage by critical asset group', 'Detection and triage timestamps'],
      weight: 0.20,
      nistCsf: [{ id: 'DE.CM', name: 'Continuous Monitoring' }, { id: 'DE.AE', name: 'Adverse Event Analysis' }]
    },
    {
      key: 'investigation',
      label: 'Investigation',
      purpose: 'Assess the consistency and evidential depth of alert investigation and case analysis.',
      inputMetric: 'EntityMetric.investigation (normalized 0–100)',
      evidenceIndicators: ['Case investigation depth and duration', 'Evidence attachments and event timeline', 'Root-cause and closure records'],
      weight: 0.20,
      nistCsf: [{ id: 'RS.AN', name: 'Incident Analysis' }, { id: 'DE.AE', name: 'Adverse Event Analysis' }]
    },
    {
      key: 'escalation',
      label: 'Escalation',
      purpose: 'Assess timely and appropriate routing of incidents to supervisors and relevant response parties.',
      inputMetric: 'EntityMetric.escalation (normalized 0–100)',
      evidenceIndicators: ['Escalation-required and escalated alert records', 'Escalation delay', 'Case escalation and notification records'],
      weight: 0.15,
      nistCsf: [{ id: 'RS.MA', name: 'Incident Management' }, { id: 'RS.CO', name: 'Incident Response Reporting and Communication' }]
    },
    {
      key: 'incidentResponse',
      label: 'Incident Response',
      purpose: 'Assess the SOC’s handling, mitigation, and documented closure of incidents.',
      inputMetric: 'EntityMetric.incidentResponse (normalized 0–100)',
      evidenceIndicators: ['Acknowledgement and closure timestamps', 'Mitigation and remediation records', 'Reopened cases and closure rationale'],
      weight: 0.15,
      nistCsf: [{ id: 'RS.MA', name: 'Incident Management' }, { id: 'RS.MI', name: 'Incident Mitigation' }]
    },
    {
      key: 'securityOperations',
      label: 'Security Operations',
      purpose: 'Assess the consistency and throughput of routine alert and case-management operations.',
      inputMetric: 'EntityMetric.securityOperations (normalized 0–100)',
      evidenceIndicators: ['Alert and case volumes', 'Acknowledgement, investigation, and closure times', 'Analyst assignment and workload records'],
      weight: 0.10,
      nistCsf: [{ id: 'DE.CM', name: 'Continuous Monitoring' }, { id: 'RS.MA', name: 'Incident Management' }]
    },
    {
      key: 'governanceOversight',
      label: 'Governance & Oversight',
      purpose: 'Assess accountability, supervisory review, and oversight of SOC operational performance.',
      inputMetric: 'EntityMetric.governanceOversight (normalized 0–100)',
      evidenceIndicators: ['Examiner and supervisory review decisions', 'Audit trail of assessment actions', 'Documented ownership and escalation paths'],
      weight: 0.10,
      nistCsf: [{ id: 'GV.OV', name: 'Oversight' }, { id: 'GV.RR', name: 'Roles, Responsibilities, and Authorities' }, { id: 'GV.PO', name: 'Policy' }]
    },
    {
      key: 'operationalDiscipline',
      label: 'Operational Discipline',
      purpose: 'Assess repeatability, completeness, and adherence to defined SOC workflows.',
      inputMetric: 'EntityMetric.operationalDiscipline (normalized 0–100)',
      evidenceIndicators: ['Completeness of case and evidence records', 'Workflow and audit-log consistency', 'Data-quality and submission checks'],
      weight: 0.05,
      nistCsf: [{ id: 'ID.IM', name: 'Improvement' }, { id: 'GV.OV', name: 'Oversight' }]
    },
    {
      key: 'cyberResilience',
      label: 'Cyber Resilience',
      purpose: 'Assess operational readiness to maintain and restore security monitoring and response capability.',
      inputMetric: 'EntityMetric.cyberResilience (normalized 0–100)',
      evidenceIndicators: ['Critical-asset telemetry coverage', 'Incident recovery and remediation records', 'Continuity or recovery exercise evidence when available'],
      weight: 0.05,
      nistCsf: [{ id: 'PR.IR', name: 'Technology Infrastructure Resilience' }, { id: 'RC.RP', name: 'Incident Recovery Plan Execution' }, { id: 'RC.CO', name: 'Incident Recovery Communication' }]
    }
  ] satisfies AssessmentDimensionDefinition[]
}

export function getFrameworkDimensionWeights(): Record<AssessmentDimensionKey, number> {
  return Object.fromEntries(ASSESSMENT_FRAMEWORK.dimensions.map(d => [d.key, d.weight])) as Record<AssessmentDimensionKey, number>
}

function numericScore(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return Math.min(100, Math.max(0, value))
}

export function buildEntityAssessment(metrics: any) {
  const dimensions = ASSESSMENT_FRAMEWORK.dimensions.map(definition => {
    const score = numericScore(metrics?.[definition.key])
    return {
      ...definition,
      weightPercent: Math.round(definition.weight * 100),
      score,
      contribution: score === null ? null : Math.round(score * definition.weight * 100) / 100
    }
  })
  const assessed = dimensions.filter(d => d.score !== null)
  const assessedWeight = assessed.reduce((sum, d) => sum + d.weight, 0)
  const weightedScore = assessed.reduce((sum, d) => sum + (d.score as number) * d.weight, 0)
  const maturityScore = assessedWeight > 0 ? Math.round(weightedScore / assessedWeight) : null

  return {
    frameworkId: ASSESSMENT_FRAMEWORK.id,
    frameworkName: ASSESSMENT_FRAMEWORK.name,
    frameworkVersion: ASSESSMENT_FRAMEWORK.version,
    publishedDate: ASSESSMENT_FRAMEWORK.publishedDate,
    maturityScore,
    ratedDimensions: assessed.length,
    totalDimensions: ASSESSMENT_FRAMEWORK.dimensions.length,
    scoreScale: ASSESSMENT_FRAMEWORK.scoreScale,
    maturityFormula: ASSESSMENT_FRAMEWORK.maturityFormula,
    dimensionScoreDefinition: ASSESSMENT_FRAMEWORK.dimensionScoreDefinition,
    riskScoreDefinition: ASSESSMENT_FRAMEWORK.riskScoreDefinition,
    alignmentNotice: ASSESSMENT_FRAMEWORK.alignmentNotice,
    references: ASSESSMENT_FRAMEWORK.references,
    dimensions
  }
}
