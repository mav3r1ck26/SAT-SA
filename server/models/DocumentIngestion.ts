import { Schema, model, InferSchemaType } from 'mongoose'
import { DOCUMENT_BUNDLE_CATEGORIES } from '../../shared/ingestionCategories'

export const DOCUMENT_INGESTION_STATUSES = [
  'Uploaded',
  'Classification Pending',
  'Awaiting User Confirmation',
  'Validating',
  'Processing',
  'Completed',
  'Completed with Warnings',
  'Failed'
] as const

const documentIngestionSchema = new Schema({
  documentId: { type: Schema.Types.ObjectId, ref: 'UploadedDocument', required: true },
  batchId: { type: Schema.Types.ObjectId, ref: 'IngestionBatch' },
  batchIds: [{ type: Schema.Types.ObjectId, ref: 'IngestionBatch' }],
  originalFilename: { type: String, required: true, maxlength: 255 },
  fileHash: { type: String, required: true },
  category: { type: String, enum: DOCUMENT_BUNDLE_CATEGORIES },
  recommendedCategory: { type: String, enum: DOCUMENT_BUNDLE_CATEGORIES },
  compatibleCategories: [{ type: String, enum: DOCUMENT_BUNDLE_CATEGORIES }],
  classificationConfidence: { type: Number, min: 0, max: 100, default: 0 },
  classificationReason: { type: String, default: '' },
  classificationWarning: { type: String },
  missingFields: { type: [String], default: [] },
  incompatibleFields: { type: [String], default: [] },
  recordCounts: { type: Schema.Types.Mixed, default: {} },
  uploadedBy: { type: String, required: true },
  confirmedBy: { type: String },
  selectedAt: { type: Date },
  assessmentPeriod: { type: String },
  entityIds: { type: [String], default: [] },
  status: { type: String, enum: DOCUMENT_INGESTION_STATUSES, default: 'Uploaded' },
  errorMessage: { type: String },
  warnings: { type: [String], default: [] },
  recordsProcessed: { type: Number, default: 0 },
  rejectedRecords: { type: Number, default: 0 },
  reprocess: { type: Boolean, default: false },
  retryCount: { type: Number, default: 0 }
}, { timestamps: true })

documentIngestionSchema.index({ documentId: 1, createdAt: -1 })
documentIngestionSchema.index({ documentId: 1, category: 1, createdAt: -1 })
documentIngestionSchema.index({ batchId: 1 }, { sparse: true })
documentIngestionSchema.index({ assessmentPeriod: 1, entityIds: 1 })

export type DocumentIngestionType = InferSchemaType<typeof documentIngestionSchema>
export const DocumentIngestion = model('DocumentIngestion', documentIngestionSchema)
