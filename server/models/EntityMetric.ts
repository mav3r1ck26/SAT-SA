import { Schema, model, InferSchemaType } from 'mongoose'

export const entityMetricSchema = new Schema({
  entityId: { type: String, ref: 'Entity', required: true },
  period: { type: String, required: true, default: 'Q2 FY 2026-27' },

  // 8 Core Supervisory Dimensions (0-100 scale, higher = healthier capability)
  threatDetection: { type: Number, default: 50, min: 0, max: 100 },
  investigation: { type: Number, default: 50, min: 0, max: 100 },
  escalation: { type: Number, default: 50, min: 0, max: 100 },
  incidentResponse: { type: Number, default: 50, min: 0, max: 100 },
  securityOperations: { type: Number, default: 50, min: 0, max: 100 },
  governanceOversight: { type: Number, default: 50, min: 0, max: 100 },
  operationalDiscipline: { type: Number, default: 50, min: 0, max: 100 },
  cyberResilience: { type: Number, default: 50, min: 0, max: 100 },

  // Backward-compatible dimension aliases for frontend
  detection: { type: Number, default: 50 },
  operations: { type: Number, default: 50 },
  governance: { type: Number, default: 50 },
  resilience: { type: Number, default: 50 },

  // Composite Supervisory Scores
  riskScore: { type: Number, default: 50, min: 0, max: 100 },
  prevRiskScore: { type: Number, default: 50 },
  riskLevel: { type: String, enum: ['Critical', 'High', 'Moderate', 'Low', 'Normal'], default: 'Normal' },
  confidence: { type: Number, default: 50, min: 0, max: 100 },
  priority: { type: String, enum: ['Critical', 'High', 'Moderate', 'Normal', 'Low'], default: 'Normal' },

  // Indicator counts
  executionGapCount: { type: Number, default: 0, min: 0 },
  executionGaps: { type: Number, default: 0 }, // Frontend alias
  negativeSpaceCount: { type: Number, default: 0, min: 0 },
  negativeSpace: { type: Number, default: 0 }, // Frontend alias
  anomalyCount: { type: Number, default: 0, min: 0 },
  dataQualityIssues: { type: Number, default: 0, min: 0 },

  // Peer comparison
  peerPercentile: { type: Number, default: 50, min: 0, max: 100 },
  peerDeviation: { type: String, default: 'In Range' },
  priorityScore: { type: Number, default: 0, min: 0 },

  // Explainable Component Contributions
  scoreComponents: {
    executionGaps: { type: Number, default: 0 },
    negativeSpace: { type: Number, default: 0 },
    peerDeviation: { type: Number, default: 0 },
    mlRiskProbability: { type: Number, default: 0 },
    anomalyIndicators: { type: Number, default: 0 },
    dataQuality: { type: Number, default: 0 }
  }
}, { timestamps: true })

// Pre-save hook to synchronize aliases
entityMetricSchema.index({ entityId: 1, period: 1 }, { unique: true })
entityMetricSchema.index({ riskScore: -1 })
entityMetricSchema.index({ period: 1 })

export type EntityMetricType = InferSchemaType<typeof entityMetricSchema>
export const EntityMetric = model('EntityMetric', entityMetricSchema)