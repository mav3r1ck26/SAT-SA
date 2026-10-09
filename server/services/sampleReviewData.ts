import { Finding } from '../models/Finding'
import { Alert } from '../models/Alert'
import { Case } from '../models/Case'
import { EvidenceEvent } from '../models/EvidenceEvent'

// Stable, realistic examples give the review queue distinct detection classes
// while keeping repeated runs idempotent and preserving examiner decisions.
const reviewSamples = [
  {
    id: 'RQ-SAMPLE-ANOM-01', findingType: 'ANOMALY', entityId: 'CSE-041', title: 'Lateral Movement Followed by Delayed Escalation',
    controlArea: 'Incident Escalation', severity: 'Critical', confidence: 93, evidenceCount: 4,
    description: 'A lateral-movement alert affecting a critical asset was escalated more than six hours after detection.',
    whyItMatters: 'The response delay increased the period during which activity could spread across connected systems.',
    methodology: 'Correlates alert creation, escalation and linked case timestamps against the six-hour supervisory threshold.',
    recommendation: 'Review the incident timeline and validate the escalation path with the entity.',
    peerComparison: 'Escalation delay exceeds the sector response threshold', mitreTechnique: 'T1021',
    supportingMetrics: { alertCategory: 'Lateral Movement', escalationDelayHours: 7.2 }
  },
  {
    id: 'RQ-SAMPLE-PEER-01', findingType: 'PEER_DEVIATION', entityId: 'CSE-027', title: 'Phishing Investigation Depth Below Sector Baseline',
    controlArea: 'Investigation Quality', severity: 'High', confidence: 88, evidenceCount: 8,
    description: 'Phishing cases were closed with fewer evidence attachments and investigative steps than comparable sector cases.',
    whyItMatters: 'Shallow investigations can miss credential theft and follow-on access after a reported phishing event.',
    methodology: 'Compares investigation depth and evidence attachment counts for phishing cases with the entity sector baseline.',
    recommendation: 'Sample the underlying phishing cases and confirm evidence collection requirements were met.',
    peerComparison: 'Investigation depth below the 20th sector percentile', mitreTechnique: 'T1566',
    supportingMetrics: { alertCategory: 'Phishing', peerPercentile: 18 }
  },
  {
    id: 'RQ-SAMPLE-DQ-01', findingType: 'DATA_QUALITY', entityId: 'CSE-063', title: 'Critical Asset Alerts Missing Case Linkage',
    controlArea: 'Evidence Integrity', severity: 'High', confidence: 86, evidenceCount: 6,
    description: 'Several critical-system alerts have no linked investigation case or closure evidence in the reporting period.',
    whyItMatters: 'Missing case linkage prevents examiners from confirming disposition, evidence handling and remediation.',
    methodology: 'Checks high-severity alert records for a linked case and corresponding closure event.',
    recommendation: 'Reconcile alert identifiers against the case management system and restore missing references.',
    peerComparison: 'Case-linkage completeness below supervisory expectation', mitreTechnique: 'T1078',
    supportingMetrics: { alertCategory: 'Access Anomaly', unlinkedAlertCount: 6 }
  },
  {
    id: 'RQ-SAMPLE-RISK-01', findingType: 'RISK_INDICATOR', entityId: 'CSE-014', title: 'Repeated Malware Detections on Critical Infrastructure',
    controlArea: 'Threat Response', severity: 'High', confidence: 90, evidenceCount: 5,
    description: 'Repeated malware alerts on critical infrastructure assets were closed without a consistent remediation record.',
    whyItMatters: 'Recurring detections may indicate incomplete containment or a persistent compromise.',
    methodology: 'Groups repeated malware alerts by entity asset and checks linked case remediation records.',
    recommendation: 'Validate containment, eradication and recovery evidence for the affected assets.',
    peerComparison: 'Repeat alert recurrence exceeds the sector baseline', mitreTechnique: 'T1105',
    supportingMetrics: { alertCategory: 'Malware', affectedAssets: 3 }
  }
]

export async function seedSampleReviewFindings() {
  for (const sample of reviewSamples) {
    await Finding.updateOne(
      { id: sample.id },
      { $setOnInsert: { ...sample, status: 'New', examinerDecision: 'Pending', createdAt: new Date() } },
      { upsert: true }
    )
  }

  for (const sample of reviewSamples) {
    const alertCategory = sample.supportingMetrics.alertCategory
    const alert = await Alert.findOne({ entityId: sample.entityId, category: alertCategory, severity: { $in: ['Critical', 'High'] } })
      .sort({ createdAt: -1 }).lean()
    const linkedCase = alert ? await Case.findOne({ alertId: alert.id }).lean() : null
    let events = alert ? await EvidenceEvent.find({ alertId: alert.id, findingId: sample.id }).sort({ eventTime: 1 }).lean() : []

    if (alert && !events.length) {
      const unlinkedEvents = await EvidenceEvent.find({ alertId: alert.id, findingId: null }).select({ _id: 1 }).lean()
      if (unlinkedEvents.length) {
        await EvidenceEvent.updateMany({ _id: { $in: unlinkedEvents.map(event => event._id) } }, { $set: { findingId: sample.id } })
        events = await EvidenceEvent.find({ alertId: alert.id, findingId: sample.id }).sort({ eventTime: 1 }).lean()
      }
    }

    if (!events.length) {
      const time = linkedCase?.investigationStartedAt || alert?.createdAt || new Date()
      await EvidenceEvent.create({
        entityId: sample.entityId,
        findingId: sample.id,
        caseId: linkedCase?.id,
        alertId: alert?.id,
        eventTime: time,
        eventType: 'Evidence Collected',
        actor: linkedCase?.investigator || 'SAT-SA Sample Examiner',
        role: 'Supervisory Review',
        event: `${alertCategory} sample reviewed for ${sample.title}`,
        metadata: [
          `Finding: ${sample.id}`,
          `Alert: ${alert?.id || 'sample scenario'}`,
          `Case: ${linkedCase?.id || 'case linkage under review'}`,
          sample.description
        ],
        sourceSystem: 'SAT-SA curated review sample'
      })
      events = await EvidenceEvent.find({ findingId: sample.id }).sort({ eventTime: 1 }).lean()
    }

    if (events.length) {
      await Finding.updateOne(
        { id: sample.id },
        { $addToSet: { evidenceReferences: { $each: events.map(event => String(event._id)) } } }
      )
    }
  }

  return reviewSamples.length
}
