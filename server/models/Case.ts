import { Schema, model, InferSchemaType } from 'mongoose'

export const caseSchema = new Schema({
  id: { type: String, required: true, unique: true },
  entityId: { type: String, ref: 'Entity', required: true },
  alertId: { type: String, ref: 'Alert' },

  openedAt: { type: Date, required: true },
  investigationStartedAt: { type: Date },
  investigationEndedAt: { type: Date },
  closedAt: { type: Date },

  durationMin: { type: Number },
  acknowledgementTimeMin: { type: Number },
  investigationTimeMin: { type: Number },
  escalationTimeMin: { type: Number },

  investigationDepth: { type: Number, default: 0, min: 0, max: 10 },
  evidenceAttachments: { type: Number, default: 0, min: 0 },
  evidenceCount: { type: Number, default: 0, min: 0 },

  isTemplateReuse: { type: Number, default: 0, min: 0, max: 1 },
  reopenedCount: { type: Number, default: 0, min: 0 },

  closureReason: { type: String, enum: ['Resolved', 'False Positive', 'False positive', 'Escalated', 'Duplicate', 'Deferred', 'Insufficient Evidence'], required: true },
  investigator: { type: String },
  behaviour: { type: String, enum: ['Normal', 'Unusually Fast', 'Superficial', 'Repetitive', 'Requires Review'], default: 'Normal' },
  status: { type: String, enum: ['open', 'investigating', 'closed', 'reopened', 'escalated'], default: 'open' },

  rootCauseIdentified: { type: Boolean, default: false },
  rootCauseCategory: { type: String },
  remediationRecorded: { type: Boolean, default: false },
  remediationDetails: { type: String },
  escalationRecorded: { type: Boolean, default: false },
  escalationDetails: { type: String },

  period: { type: String, default: 'Q2 FY 2026-27' },

  // Analytics fields
  isAnomalous: { type: Boolean, default: false },
  anomalyScore: { type: Number },
  mlRiskScore: { type: Number }
}, { timestamps: true })

caseSchema.index({ entityId: 1, openedAt: -1 })
caseSchema.index({ behaviour: 1 })
caseSchema.index({ closedAt: -1 })
caseSchema.index({ period: 1 })
caseSchema.index({ investigator: 1 })

export type CaseType = InferSchemaType<typeof caseSchema>
export const Case = model('Case', caseSchema)