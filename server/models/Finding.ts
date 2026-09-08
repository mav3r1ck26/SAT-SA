import { Schema, model, InferSchemaType } from 'mongoose'

export const findingSchema = new Schema({
  id: { type: String, required: true, unique: true },
  findingType: { type: String, required: true },

  entityId: { type: String, ref: 'Entity', required: true },
  period: { type: String, default: 'Q2 FY 2026-27' },

  title: { type: String, required: true },
  description: { type: String, required: true },

  controlArea: { type: String, required: true },

  severity: { type: String, enum: ['Critical', 'High', 'Medium', 'Low', 'Informational'], required: true },
  confidence: { type: Number, required: true, min: 0, max: 100 },
  riskContribution: { type: Number, default: 0, min: 0, max: 100 },

  evidenceCount: { type: Number, default: 0, min: 0 },
  evidenceReferences: [{ type: String }],

  supportingMetrics: { type: Schema.Types.Mixed },

  peerComparison: { type: String },

  whyItMatters: { type: String },

  detectionLogic: { type: String },
  methodology: { type: String },
  limitations: { type: String },

  recommendation: { type: String },

  status: { type: String, enum: ['New', 'In Review', 'Confirmed', 'Rejected', 'Deferred', 'Examiner Confirmed', 'Examiner Rejected'], default: 'New' },

  examinerDecision: { type: String, enum: ['Pending', 'Confirmed', 'Rejected', 'Deferred'] },
  examinerNote: { type: String },
  reviewedBy: { type: String },
  reviewedAt: { type: Date },

  // ML/AI specific fields
  modelName: { type: String },
  modelVersion: { type: String },
  featureContributions: { type: Schema.Types.Mixed },

  // Analytics job reference
  jobId: { type: String },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true })

findingSchema.index({ entityId: 1, createdAt: -1 })
findingSchema.index({ findingType: 1 })
findingSchema.index({ status: 1 })
findingSchema.index({ severity: 1 })
findingSchema.index({ entityId: 1, findingType: 1 })

export type FindingType = InferSchemaType<typeof findingSchema>
export const Finding = model('Finding', findingSchema)