import { Schema, model, InferSchemaType } from 'mongoose'

export const dataQualitySchema = new Schema({
  entityId: { type: String, ref: 'Entity', required: true },
  period: { type: String, required: true },

  // Overall quality
  overallScore: { type: Number, default: 0, min: 0, max: 100 },

  // Completeness metrics
  completeness: {
    alertsWithRequiredFields: { type: Number, default: 0 },
    casesWithRequiredFields: { type: Number, default: 0 },
    telemetryWithRequiredFields: { type: Number, default: 0 },
    overall: { type: Number, default: 0 }
  },

  // Validity metrics
  validity: {
    validTimestamps: { type: Number, default: 0 },
    validDurations: { type: Number, default: 0 },
    validSeverities: { type: Number, default: 0 },
    validEntities: { type: Number, default: 0 },
    overall: { type: Number, default: 0 }
  },

  // Consistency metrics
  consistency: {
    alertCaseMapping: { type: Number, default: 0 },
    entityMapping: { type: Number, default: 0 },
    escalationData: { type: Number, default: 0 },
    telemetryData: { type: Number, default: 0 },
    overall: { type: Number, default: 0 }
  },

  // Duplicate detection
  duplicates: {
    alertDuplicates: { type: Number, default: 0 },
    caseDuplicates: { type: Number, default: 0 },
    overall: { type: Number, default: 0 }
  },

  // Issue details
  issues: [{
    type: { type: String, enum: ['Missing Field', 'Invalid Timestamp', 'Negative Duration', 'Invalid Severity', 'Unknown Entity', 'Duplicate Record', 'Missing Escalation', 'Missing Telemetry', 'Broken Relationship', 'Impossible Sequence'] },
    severity: { type: String, enum: ['Critical', 'High', 'Medium', 'Low'] },
    count: { type: Number, default: 0 },
    description: { type: String },
    affectedRecords: [String]
  }],

  warnings: [{
    message: { type: String },
    severity: { type: String, enum: ['Critical', 'High', 'Medium', 'Low'] },
    count: { type: Number, default: 1 }
  }],

  recordsAnalyzed: {
    alerts: { type: Number, default: 0 },
    cases: { type: Number, default: 0 },
    telemetry: { type: Number, default: 0 }
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true })

dataQualitySchema.index({ entityId: 1, period: 1 }, { unique: true })
dataQualitySchema.index({ overallScore: 1 })

export type DataQualityType = InferSchemaType<typeof dataQualitySchema>
export const DataQuality = model('DataQuality', dataQualitySchema)