import { Schema, model, InferSchemaType } from 'mongoose'

export const evidenceEventSchema = new Schema({
  caseId: { type: String, ref: 'Case' },
  alertId: { type: String, ref: 'Alert' },
  eventTime: { type: Date, required: true },
  actor: { type: String },
  role: { type: String },
  event: { type: String, required: true },
  metadata: [String]
})

export type EvidenceEventType = InferSchemaType<typeof evidenceEventSchema>
export const EvidenceEvent = model('EvidenceEvent', evidenceEventSchema)
