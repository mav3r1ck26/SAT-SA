import { Schema, model, InferSchemaType } from 'mongoose'

const sourceDocumentSchema = new Schema({
  documentId: { type: Schema.Types.ObjectId, ref: 'UploadedDocument', required: true },
  documentIngestionId: { type: Schema.Types.ObjectId, ref: 'DocumentIngestion', required: true },
  batchId: { type: Schema.Types.ObjectId, ref: 'IngestionBatch', required: true },
  filename: { type: String, required: true },
  category: { type: String, required: true }
}, { _id: false })

const generatedReportRunSchema = new Schema({
  reportDefinitionId: { type: String, required: true },
  name: { type: String, required: true },
  generatedAt: { type: Date, required: true, default: Date.now },
  assessmentPeriod: { type: String, required: true },
  entityScope: { type: String, required: true },
  entityIds: { type: [String], default: [] },
  sourceBatchIds: [{ type: Schema.Types.ObjectId, ref: 'IngestionBatch' }],
  sourceDocuments: { type: [sourceDocumentSchema], default: [] },
  lineageAvailable: { type: Boolean, default: true },
  legacySnapshot: { type: Boolean, default: false },
  content: { type: Schema.Types.Mixed, required: true }
}, { timestamps: true })

generatedReportRunSchema.index({ reportDefinitionId: 1, generatedAt: -1 })
generatedReportRunSchema.index({ 'sourceDocuments.documentId': 1, generatedAt: -1 })
generatedReportRunSchema.index({ sourceBatchIds: 1 })

export type GeneratedReportRunType = InferSchemaType<typeof generatedReportRunSchema>
export const GeneratedReportRun = model('GeneratedReportRun', generatedReportRunSchema)
