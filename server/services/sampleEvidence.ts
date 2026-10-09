import { Case } from '../models/Case'
import { EvidenceEvent } from '../models/EvidenceEvent'
import { Finding } from '../models/Finding'

/** Link seeded supervisory findings to real case timeline events without replacing operational data. */
export async function linkFindingsToSampleEvidence() {
  const findings = await Finding.find({ findingType: 'EXECUTION_GAP' }).lean()
  let linkedFindings = 0
  let linkedEvents = 0

  for (const finding of findings) {
    const title = finding.title.toLowerCase()
    const caseFilter: Record<string, unknown> = { entityId: finding.entityId }
    if (title.includes('repeated') || title.includes('template')) caseFilter.isTemplateReuse = 1
    else if (title.includes('escalation')) caseFilter.escalationRecorded = false
    else if (title.includes('rapid closure')) caseFilter.durationMin = { $lte: 60 }

    let cases = await Case.find(caseFilter).sort({ openedAt: -1 }).limit(4).select({ id: 1 }).lean()
    if (!cases.length) cases = await Case.find({ entityId: finding.entityId }).sort({ openedAt: -1 }).limit(4).select({ id: 1 }).lean()
    const caseIds = cases.map(item => item.id)
    if (!caseIds.length) continue

    await EvidenceEvent.updateMany(
      { entityId: finding.entityId, caseId: { $in: caseIds }, findingId: null },
      { $set: { findingId: finding.id } },
    )
    let events = await EvidenceEvent.find({ findingId: finding.id }).sort({ eventTime: 1 }).select({ _id: 1 }).lean()

    // Give each seeded finding its own explicit link to a real sample case and evidence count.
    if (!events.length) {
      const caseDoc = await Case.findOne({ id: caseIds[0] }).lean()
      if (caseDoc) {
        const eventTime = caseDoc.investigationStartedAt || caseDoc.openedAt
        await EvidenceEvent.create({
          entityId: caseDoc.entityId,
          findingId: finding.id,
          caseId: caseDoc.id,
          alertId: caseDoc.alertId,
          eventTime,
          eventType: 'Evidence Collected',
          actor: caseDoc.investigator || 'Sample Examiner',
          role: 'Supervisory Evidence Review',
          event: `Sample case record selected for finding ${finding.id}: ${finding.title}`,
          metadata: [`Case: ${caseDoc.id}`, `Closure reason: ${caseDoc.closureReason}`, `Investigation behaviour: ${caseDoc.behaviour}`, `Evidence items recorded: ${caseDoc.evidenceCount}`],
          sourceSystem: 'SAT-SA seeded sample',
        })
        events = await EvidenceEvent.find({ findingId: finding.id }).select({ _id: 1 }).lean()
      }
    }

    if (events.length) {
      const references = events.map(event => String(event._id))
      await Finding.updateOne(
        { _id: finding._id },
        { $addToSet: { evidenceReferences: { $each: references } } },
      )
      linkedFindings++
      linkedEvents += events.length
    }
  }

  return { linkedFindings, linkedEvents }
}
