import { Schema, model, InferSchemaType } from 'mongoose'

export const ingestionBatchSchema = new Schema({
  source: { type: String, required: true },
  filename: { type: String },
  fileHash: { type: String },
  recordsReceived: { type: Number, default: 0 },
  validRecords: { type: Number, default: 0 },
  persistedRecords: { type: Number, default: 0 },
  sourceRecordsStored: { type: Number, default: 0 },
  invalidRecords: { type: Number, default: 0 },
  missingFields: { type: Number, default: 0 },
  duplicateRecords: { type: Number, default: 0 },
  entitiesDetected: { type: Number, default: 0 },
  dateRangeStart: { type: Date },
  dateRangeEnd: { type: Date },
  qualityPct: { type: Number, default: 0 },
  status: { type: String, default: 'pending' },
  assignedEntities: { type: [Schema.Types.Mixed], default: [] },
  persistenceErrorCount: { type: Number, default: 0 },
  persistenceErrors: { type: [Schema.Types.Mixed], default: [] },
  mlInference: { type: Schema.Types.Mixed, default: null },
  warnings: [String],
  createdAt: { type: Date, default: Date.now }
})

ingestionBatchSchema.index({ fileHash: 1 }, { unique: true, sparse: true })

export type IngestionBatchType = InferSchemaType<typeof ingestionBatchSchema>
export const IngestionBatch = model('IngestionBatch', ingestionBatchSchema)
