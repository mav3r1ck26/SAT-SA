import { Schema, model, InferSchemaType } from 'mongoose'

export const alertSchema = new Schema({
  id: { type: String, required: true, unique: true },
  entityId: { type: String, ref: 'Entity', required: true },
  category: { type: String, required: true },
  asset: { type: String, required: true },
  severity: { type: String, enum: ['Critical', 'High', 'Medium', 'Low'], required: true },
  status: { type: String, default: 'open' },
  createdAt: { type: Date, required: true },
  acknowledgedAt: { type: Date },
  investigationStartedAt: { type: Date },
  closedAt: { type: Date },
  escalationPath: { type: String },
  escalationDelayMin: { type: Number },
  alertToCase: { type: Number, default: 0 },
  closureNote: { type: String },
  meanAckMin: { type: Number },
  meanInvestigationMin: { type: Number },
  meanClosureMin: { type: Number }
})

alertSchema.index({ entityId: 1 })
alertSchema.index({ createdAt: 1 })
alertSchema.index({ severity: 1 })

export type AlertType = InferSchemaType<typeof alertSchema>
export const Alert = model('Alert', alertSchema)
