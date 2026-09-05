import { Schema, model, InferSchemaType } from 'mongoose'

export const entitySchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  sector: { type: String, required: true },
  region: { type: String, required: true },
  criticality: { type: String, enum: ['Critical', 'High', 'Medium', 'Low'], required: true },
  dataCompleteness: { type: Number, default: 100 },
  telemetryCoverage: { type: Number, default: 100 },
  lastSubmission: { type: String },
  assessmentStatus: { type: String, default: 'Compliant' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: false })

export type EntityType = InferSchemaType<typeof entitySchema>
export const Entity = model('Entity', entitySchema)
