import { Schema, model, InferSchemaType } from 'mongoose'

export const entitySchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  sector: { type: String, required: true },
  region: { type: String, required: true },
  criticality: { type: String, enum: ['Critical', 'High', 'Medium', 'Low'], required: true },
  dataCompleteness: { type: Number, default: 100, min: 0, max: 100 },
  telemetryCoverage: { type: Number, default: 100, min: 0, max: 100 },
  assessmentPeriod: { type: String, default: 'Q2 FY 2026-27' },
  assessmentStatus: { type: String, enum: ['Compliant', 'Monitor', 'Review Required', 'Non-Compliant'], default: 'Compliant' },
  status: { type: String, enum: ['Active', 'Inactive', 'Under Review'], default: 'Active' },
  lastSubmission: { type: Date }
}, { timestamps: true })

entitySchema.index({ sector: 1 })
entitySchema.index({ criticality: 1 })
entitySchema.index({ assessmentPeriod: 1 })

export type EntityType = InferSchemaType<typeof entitySchema>
export const Entity = model('Entity', entitySchema)