import { Schema, model, InferSchemaType } from 'mongoose'

export const telemetrySchema = new Schema({
  entityId: { type: String, ref: 'Entity', required: true },
  category: { type: String, required: true },
  assetGroup: { type: String, required: true },
  criticality: { type: String, enum: ['Critical', 'High', 'Medium', 'Low'], default: 'Medium' },

  expectedCoverage: { type: Number, default: 100, min: 0, max: 100 },
  observedCoverage: { type: Number, default: 100, min: 0, max: 100 },

  // Backward-compatible aliases
  expected: { type: Number, default: 100 },
  observed: { type: Number, default: 100 },

  alertGeneration: { type: Number, min: 0, max: 100 },
  investigationEvidence: { type: Number, min: 0, max: 100 },
  escalationEvidence: { type: Number, min: 0, max: 100 },

  // Negative space classification
  status: { type: String, enum: ['Monitored', 'Partially Monitored', 'Unmonitored', 'Unknown', 'Data Missing'], default: 'Unknown' },
  confidence: { type: Number, default: 50, min: 0, max: 100 },

  // Evidence for the assessment
  evidence: {
    source: { type: String },
    lastUpdated: { type: Date },
    notes: { type: String }
  },

  period: { type: String, default: 'Q2 FY 2026-27' },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true })

telemetrySchema.index({ entityId: 1, category: 1, assetGroup: 1, period: 1 }, { unique: true })
telemetrySchema.index({ status: 1 })
telemetrySchema.index({ observedCoverage: 1 })

export type TelemetryType = InferSchemaType<typeof telemetrySchema>
export const TelemetryCoverage = model('TelemetryCoverage', telemetrySchema)