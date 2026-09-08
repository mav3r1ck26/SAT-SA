import { Schema, model, InferSchemaType } from 'mongoose'

export const alertSchema = new Schema({
  id: { type: String, required: true, unique: true },
  entityId: { type: String, ref: 'Entity', required: true },
  category: { type: String, required: true },
  subcategory: { type: String },
  asset: { type: String, required: true },
  assetCriticality: { type: String, enum: ['Critical', 'High', 'Medium', 'Low'], default: 'Medium' },
  severity: { type: String, enum: ['Critical', 'High', 'Medium', 'Low', 'Informational'], required: true },
  status: { type: String, enum: ['open', 'acknowledged', 'investigating', 'closed', 'escalated', 'false_positive'], default: 'open' },

  createdAt: { type: Date, required: true },
  acknowledgedAt: { type: Date },
  investigationStartedAt: { type: Date },
  closedAt: { type: Date },

  escalationPath: { type: String },
  escalationRequired: { type: Boolean, default: false },
  escalated: { type: Boolean, default: false },
  escalationDelayMin: { type: Number },

  disposition: { type: String, enum: ['Resolved', 'False Positive', 'Escalated to Incident', 'Deferred', 'Duplicate', 'Suppressed'] },
  closureReason: { type: String },
  closureNote: { type: String },

  acknowledgementTimeMin: { type: Number },
  investigationTimeMin: { type: Number },
  closureTimeMin: { type: Number },

  relatedCaseId: { type: String, ref: 'Case' },
  source: { type: String, enum: ['SIEM', 'EDR', 'NDR', 'Firewall', 'Email Gateway', 'Cloud', 'Manual', 'Other'], default: 'SIEM' },
  period: { type: String, default: 'Q2 FY 2026-27' },

  // Analytics fields
  isAnomalous: { type: Boolean, default: false },
  anomalyScore: { type: Number },
  mlRiskScore: { type: Number }
}, { timestamps: true })

alertSchema.index({ entityId: 1, createdAt: -1 })
alertSchema.index({ severity: 1 })
alertSchema.index({ status: 1 })
alertSchema.index({ category: 1 })
alertSchema.index({ period: 1 })
alertSchema.index({ escalationRequired: 1 })

export type AlertType = InferSchemaType<typeof alertSchema>
export const Alert = model('Alert', alertSchema)