import { Schema, model, InferSchemaType } from 'mongoose'

export const analyticsJobSchema = new Schema({
  jobId: { type: String, required: true, unique: true },
  entityId: { type: String, ref: 'Entity' },
  period: { type: String, required: true },

  status: { type: String, enum: ['SUBMITTED', 'VALIDATING', 'ANALYSING', 'ML_PROCESSING', 'FINDINGS_GENERATED', 'READY_FOR_REVIEW', 'COMPLETED', 'FAILED'], default: 'SUBMITTED' },

  type: { type: String, enum: ['FULL', 'INCREMENTAL', 'RECOMPUTE', 'ML_TRAIN', 'ML_PREDICT', 'VALIDATION'], default: 'FULL' },

  startedAt: { type: Date },
  completedAt: { type: Date },
  durationMs: { type: Number },

  recordsProcessed: {
    alerts: { type: Number, default: 0 },
    cases: { type: Number, default: 0 },
    telemetry: { type: Number, default: 0 },
    findings: { type: Number, default: 0 }
  },

  findingsGenerated: { type: Number, default: 0 },
  executionGaps: { type: Number, default: 0 },
  negativeSpace: { type: Number, default: 0 },
  anomalies: { type: Number, default: 0 },
  peerDeviations: { type: Number, default: 0 },

  modelVersion: { type: String },
  featureSchemaVersion: { type: String },

  error: { type: String },
  warnings: [String],

  progress: { type: Number, default: 0, min: 0, max: 100 },
  currentStage: { type: String },

  requestedBy: { type: String },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true })

analyticsJobSchema.index({ jobId: 1 })
analyticsJobSchema.index({ entityId: 1, status: 1 })
analyticsJobSchema.index({ status: 1 })
analyticsJobSchema.index({ createdAt: -1 })

export type AnalyticsJobType = InferSchemaType<typeof analyticsJobSchema>
export const AnalyticsJob = model('AnalyticsJob', analyticsJobSchema)