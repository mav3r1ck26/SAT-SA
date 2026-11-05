import { Schema, model, InferSchemaType } from 'mongoose'

export const ingestionRecordSchema = new Schema({
  batchId: { type: Schema.Types.ObjectId, ref: 'IngestionBatch', required: true },
  recordIndex: { type: Number, required: true },
  source: { type: String, required: true },
  filename: { type: String, required: true },
  entityId: { type: String },
  recordType: { type: String, enum: ['alert', 'case', 'soc_feature_vector', 'coverage', 'unknown'], default: 'unknown' },
  processingStatus: { type: String, enum: ['accepted', 'inference_input', 'invalid', 'duplicate'], default: 'accepted' },
  recordData: { type: Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now }
})

ingestionRecordSchema.index({ batchId: 1, recordIndex: 1 }, { unique: true })
ingestionRecordSchema.index({ entityId: 1, createdAt: -1 })

export type IngestionRecordType = InferSchemaType<typeof ingestionRecordSchema>
export const IngestionRecord = model('IngestionRecord', ingestionRecordSchema)
