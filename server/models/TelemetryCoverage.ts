import { Schema, model, InferSchemaType } from 'mongoose'

export const telemetrySchema = new Schema({
  entityId: { type: String, ref: 'Entity', required: true },
  category: { type: String, required: true },
  expected: { type: Number, default: 100 },
  observed: { type: Number, default: 100 },
  alertGen: { type: Number },
  investigationEvidence: { type: Number },
  escalationEvidence: { type: Number },
  period: { type: String, default: 'Q2 FY 2026-27' }
})

telemetrySchema.index({ entityId: 1 })

export type TelemetryType = InferSchemaType<typeof telemetrySchema>
export const TelemetryCoverage = model('TelemetryCoverage', telemetrySchema)
