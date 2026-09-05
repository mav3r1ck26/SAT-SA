import { Schema, model, InferSchemaType } from 'mongoose'

export const caseSchema = new Schema({
  id: { type: String, required: true, unique: true },
  entityId: { type: String, ref: 'Entity', required: true },
  alertId: { type: String, ref: 'Alert' },
  openedAt: { type: Date, required: true },
  closedAt: { type: Date },
  investigationStartedAt: { type: Date },
  investigationEndedAt: { type: Date },
  durationMin: { type: Number },
  investigationDepth: { type: Number, default: 0 },
  evidenceAttachments: { type: Number, default: 0 },
  isTemplateReuse: { type: Number, default: 0 },
  reopenedCount: { type: Number, default: 0 },
  closureReason: { type: String },
  investigator: { type: String },
  behaviour: { type: String },
  status: { type: String, default: 'open' }
})

caseSchema.index({ entityId: 1 })
caseSchema.index({ behaviour: 1 })
caseSchema.index({ closedAt: 1 })

export type CaseType = InferSchemaType<typeof caseSchema>
export const Case = model('Case', caseSchema)
