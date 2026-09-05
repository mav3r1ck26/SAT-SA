import { Schema, model, InferSchemaType } from 'mongoose'

export const findingSchema = new Schema({
  id: { type: String, required: true, unique: true },
  findingType: { type: String, required: true },
  title: { type: String, required: true },
  entityId: { type: String, ref: 'Entity', required: true },
  controlArea: { type: String },
  severity: { type: String, enum: ['Critical', 'High', 'Medium', 'Low'], required: true },
  confidence: { type: Number, required: true },
  evidenceCount: { type: Number, default: 0 },
  status: { type: String, default: 'New' },
  description: { type: String },
  methodology: { type: String },
  limitations: { type: String },
  peerComparison: { type: String },
  whyMatters: { type: String },
  createdAt: { type: Date, default: Date.now },
  reviewedBy: { type: String },
  reviewedAt: { type: Date },
  examinerNote: { type: String }
})

findingSchema.index({ entityId: 1 })
findingSchema.index({ status: 1 })

export type FindingType = InferSchemaType<typeof findingSchema>
export const Finding = model('Finding', findingSchema)
