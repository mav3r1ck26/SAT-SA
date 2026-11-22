import { Schema, model, InferSchemaType } from 'mongoose'
import { DOCUMENT_BUNDLE_CATEGORIES } from '../../shared/ingestionCategories'

export const ingestionBatchSchema = new Schema({
  source: { type: String, required: true },
  filename: { type: String },
  fileHash: { type: String },
  sourceDocumentHash: { type: String },
  uploadedDocumentId: { type: Schema.Types.ObjectId, ref: 'UploadedDocument' },
  documentIngestionId: { type: Schema.Types.ObjectId, ref: 'DocumentIngestion' },
  bundleCategory: { type: String, enum: DOCUMENT_BUNDLE_CATEGORIES },
  entityIds: { type: [String], default: [] },
  assessmentPeriods: { type: [String], default: [] },
  recordsReceived: { type: Number, default: 0 },
  validRecords: { type: Number, default: 0 },
  persistedRecords: { type: Number, default: 0 },
  telemetryRecordsStored: { type: Number, default: 0 },
  sourceRecordsStored: { type: Number, default: 0 },
  invalidRecords: { type: Number, default: 0 },
  missingFields: { type: Number, default: 0 },
  duplicateRecords: { type: Number, default: 0 },
  entitiesDetected: { type: Number, default: 0 },
  dateRangeStart: { type: Date },
  dateRangeEnd: { type: Date },
  qualityPct: { type: Number, default: 0 },
  status: { type: String, default: 'pending' },
  analyticsStatus: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  analyticsError: { type: String },
  assignedEntities: { type: [Schema.Types.Mixed], default: [] },
  persistenceErrorCount: { type: Number, default: 0 },
  persistenceErrors: { type: [Schema.Types.Mixed], default: [] },
  mlInference: { type: Schema.Types.Mixed, default: null },
  warnings: [String],
  createdAt: { type: Date, default: Date.now }
})

ingestionBatchSchema.index({ fileHash: 1 }, { unique: true, sparse: true })
ingestionBatchSchema.index({ uploadedDocumentId: 1, createdAt: -1 })
// Both fields are arrays, and MongoDB cannot build a compound multikey index
// over parallel arrays. Keep independent indexes so scoped filters can use
// index intersection without making batch inserts fail.
ingestionBatchSchema.index({ assessmentPeriods: 1 })
ingestionBatchSchema.index({ entityIds: 1 })

export type IngestionBatchType = InferSchemaType<typeof ingestionBatchSchema>
export const IngestionBatch = model('IngestionBatch', ingestionBatchSchema)
