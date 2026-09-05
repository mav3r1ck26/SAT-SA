import { Schema, model, InferSchemaType } from 'mongoose'

export const reportSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String },
  status: { type: String, default: 'Not Generated' },
  generatedAt: { type: Date },
  format: { type: String },
  content: { type: Object }
})

export type ReportType = InferSchemaType<typeof reportSchema>
export const Report = model('Report', reportSchema)
