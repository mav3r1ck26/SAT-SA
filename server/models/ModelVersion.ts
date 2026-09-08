import { Schema, model, InferSchemaType } from 'mongoose'

export const modelVersionSchema = new Schema({
  modelName: { type: String, required: true },
  version: { type: String, required: true },

  trainingDatasetVersion: { type: String },
  featureSchemaVersion: { type: String },

  algorithm: { type: String, enum: ['RandomForest', 'KMeans', 'IsolationForest', 'Statistical', 'RuleBased'] },
  hyperparameters: { type: Schema.Types.Mixed },

  trainedAt: { type: Date, required: true },
  trainedBy: { type: String },

  // Performance metrics
  metrics: {
    accuracy: { type: Number },
    precision: { type: Number },
    recall: { type: Number },
    f1Score: { type: Number },
    rocAuc: { type: Number },
    crossValidationScore: { type: Number },
    customMetrics: { type: Schema.Types.Mixed }
  },

  // Data info
  trainingDataSize: { type: Number },
  trainingDataPeriod: { type: String },
  classDistribution: { type: Schema.Types.Mixed },

  // Feature info
  featureCount: { type: Number },
  featureNames: [String],
  featureImportance: { type: Schema.Types.Mixed },

  // Deployment
  status: { type: String, enum: ['TRAINING', 'VALIDATING', 'DEPLOYED', 'DEPRECATED', 'ARCHIVED'], default: 'TRAINING' },
  deployedAt: { type: Date },
  deprecatedAt: { type: Date },

  // Validation
  validationResults: {
    testAccuracy: { type: Number },
    testPrecision: { type: Number },
    testRecall: { type: Number },
    expertAgreement: { type: Number },
    reviewEfficiency: { type: Number },
    validatedAt: { type: Date },
    validatedBy: { type: String }
  },

  notes: { type: String },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true })

modelVersionSchema.index({ modelName: 1, version: 1 }, { unique: true })
modelVersionSchema.index({ status: 1 })
modelVersionSchema.index({ trainedAt: -1 })

export type ModelVersionType = InferSchemaType<typeof modelVersionSchema>
export const ModelVersion = model('ModelVersion', modelVersionSchema)