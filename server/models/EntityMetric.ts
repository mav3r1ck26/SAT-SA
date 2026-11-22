import { Schema, model, InferSchemaType } from 'mongoose'

export const entityMetricSchema = new Schema({
  entityId: { type: String, ref: 'Entity', required: true },
  period: { type: String, required: true },
  assessmentProvenance: { type: String, enum: ['submitted', 'sample'], default: 'submitted' },

  // 8 Core Supervisory Dimensions (0-100 scale, higher = healthier capability)
  threatDetection: { type: Number, min: 0, max: 100 },
  investigation: { type: Number, min: 0, max: 100 },
  escalation: { type: Number, min: 0, max: 100 },
  incidentResponse: { type: Number, min: 0, max: 100 },
  securityOperations: { type: Number, min: 0, max: 100 },
  governanceOversight: { type: Number, min: 0, max: 100 },
  operationalDiscipline: { type: Number, min: 0, max: 100 },
  cyberResilience: { type: Number, min: 0, max: 100 },

  // Backward-compatible dimension aliases for frontend
  detection: { type: Number },
  operations: { type: Number },
  governance: { type: Number },
  resilience: { type: Number },

  // Composite Supervisory Scores
  assessmentFrameworkId: { type: String, default: 'SAT-SA-SOC' },
  assessmentFrameworkVersion: { type: String, default: '1.0.0' },
  maturityScore: { type: Number, default: null, min: 0, max: 100 },
  riskScore: { type: Number, min: 0, max: 100 },
  prevRiskScore: { type: Number },
  riskLevel: { type: String, enum: ['Critical', 'High', 'Moderate', 'Low', 'Normal'] },
  confidence: { type: Number, min: 0, max: 100 },
  priority: { type: String, enum: ['Critical', 'High', 'Moderate', 'Normal', 'Low'] },

  // Indicator counts
  executionGapCount: { type: Number, min: 0 },
  executionGaps: { type: Number }, // Frontend alias
  negativeSpaceCount: { type: Number, min: 0 },
  negativeSpace: { type: Number }, // Frontend alias
  anomalyCount: { type: Number, min: 0 },
  dataQualityIssues: { type: Number, min: 0 },

  // Peer comparison
  peerPercentile: { type: Number, min: 0, max: 100 },
  peerDeviation: { type: String },
  priorityScore: { type: Number, min: 0 },

  // Explainable Component Contributions
  scoreComponents: {
    executionGaps: { type: Number },
    negativeSpace: { type: Number },
    peerDeviation: { type: Number },
    mlRiskProbability: { type: Number },
    anomalyIndicators: { type: Number },
    dataQuality: { type: Number }
  }
}, { timestamps: true })

// Pre-save hook to synchronize aliases
entityMetricSchema.index({ entityId: 1, period: 1 }, { unique: true })
entityMetricSchema.index({ riskScore: -1 })
entityMetricSchema.index({ period: 1 })

export type EntityMetricType = InferSchemaType<typeof entityMetricSchema>
export const EntityMetric = model('EntityMetric', entityMetricSchema)
