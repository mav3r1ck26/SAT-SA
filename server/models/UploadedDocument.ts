import { Schema, model, InferSchemaType } from 'mongoose'

const uploadedDocumentSchema = new Schema({
  fileHash: { type: String, required: true, unique: true },
  storageKey: { type: String, required: true, unique: true },
  originalFilename: { type: String, required: true, maxlength: 255 },
  extension: { type: String, required: true, enum: ['.csv', '.json'] },
  contentType: { type: String, required: true },
  sizeBytes: { type: Number, required: true, min: 1 },
  uploadedBy: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now, required: true }
}, { timestamps: true })

uploadedDocumentSchema.index({ uploadedAt: -1 })

export type UploadedDocumentType = InferSchemaType<typeof uploadedDocumentSchema>
export const UploadedDocument = model('UploadedDocument', uploadedDocumentSchema)
