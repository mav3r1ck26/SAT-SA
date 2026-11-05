import mongoose from 'mongoose'
import { connectDB } from './config/db'
import { EntityMetric } from './models/EntityMetric'

const historicalPeriods = [
  { period: 'Q3 FY 2025-26', scoreDelta: -12 },
  { period: 'Q4 FY 2025-26', scoreDelta: -8 },
  { period: 'Q1 FY 2026-27', scoreDelta: -4 }
]
const dimensionKeys = [
  'threatDetection', 'investigation', 'escalation', 'incidentResponse',
  'securityOperations', 'governanceOversight', 'operationalDiscipline', 'cyberResilience'
]

async function seedAssessmentHistory() {
  await connectDB()
  let inserted = 0
  let skipped = 0
  const currentMetrics = await EntityMetric.find({ period: 'Q2 FY 2026-27' }).lean()

  for (const current of currentMetrics) {
    for (const snapshot of historicalPeriods) {
      const exists = await EntityMetric.exists({ entityId: current.entityId, period: snapshot.period })
      if (exists) {
        skipped++
        continue
      }

      const prior: Record<string, any> = {}
      for (const key of dimensionKeys) {
        const value = (current as any)[key]
        if (typeof value === 'number') prior[key] = Math.max(0, Math.min(100, value + snapshot.scoreDelta))
      }
      const riskScore = Math.max(0, Math.min(100, Math.round((current.riskScore ?? 50) - snapshot.scoreDelta * 0.55)))
      await EntityMetric.create({
        entityId: current.entityId,
        period: snapshot.period,
        ...prior,
        riskScore,
        prevRiskScore: Math.max(0, riskScore - 3),
        executionGapCount: Math.max(0, (current.executionGapCount || 0) + Math.round(Math.abs(snapshot.scoreDelta) / 4)),
        negativeSpaceCount: Math.max(0, (current.negativeSpaceCount || 0) + Math.round(Math.abs(snapshot.scoreDelta) / 8)),
        assessmentFrameworkId: current.assessmentFrameworkId || 'SAT-SA-SOC',
        assessmentFrameworkVersion: current.assessmentFrameworkVersion || '1.0.0',
        assessmentProvenance: 'sample'
      })
      inserted++
    }
  }

  console.log(`[Assessment History] Added ${inserted} illustrative sample snapshots; skipped ${skipped} existing entity-period records.`)
  await mongoose.disconnect()
}

seedAssessmentHistory().catch(async error => {
  console.error('[Assessment History] Could not create sample history:', error)
  await mongoose.disconnect()
  process.exitCode = 1
})
