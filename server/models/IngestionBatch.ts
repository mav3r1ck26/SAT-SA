import { Schema, model, InferSchemaType } from 'mongoose'

export const ingestionBatchSchema = new Schema({
  source: { type: String, required: true },
  filename: { type: String },
  recordsReceived: { type: Number, default: 0 },
  validRecords: { type: Number, default: 0 },
  invalidRecords: { type: Number, default: 0 },
  missingFields: { type: Number, default: 0 },
  duplicateRecords: { type: Number, default: 0 },
  entitiesDetected: { type: Number, default: 0 },
  dateRangeStart: { type: Date },
  dateRangeEnd: { type: Date },
  qualityPct: { type: Number, default: 0 },
  status: { type: String, default: 'pending' },
  warnings: [String],
  createdAt: { type: Date, default: Date.now }
})

export type IngestionBatchType = InferSchemaType<typeof ingestionBatchSchema>
export const IngestionBatch = model('IngestionBatch', ingestionBatchSchema)
