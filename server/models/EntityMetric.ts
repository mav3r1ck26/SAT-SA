import { Schema, model, InferSchemaType } from 'mongoose'

export const entityMetricSchema = new Schema({
  entityId: { type: String, ref: 'Entity', required: true },
  period: { type: String, default: 'Q2 FY 2026-27' },
  riskScore: { type: Number, default: 50 },
  prevRiskScore: { type: Number },
  detection: { type: Number },
  investigation: { type: Number },
  escalation: { type: Number },
  operations: { type: Number },
  governance: { type: Number },
  resilience: { type: Number },
  executionGaps: { type: Number, default: 0 },
  negativeSpace: { type: Number, default: 0 },
  peerDeviation: { type: String, default: 'Low' },
  priority: { type: String, default: 'Normal' },
  updatedAt: { type: Date, default: Date.now }
})

entityMetricSchema.index({ entityId: 1, period: 1 }, { unique: true })

export type EntityMetricType = InferSchemaType<typeof entityMetricSchema>
export const EntityMetric = model('EntityMetric', entityMetricSchema)
