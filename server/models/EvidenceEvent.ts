import { Schema, model, InferSchemaType } from 'mongoose'

export const evidenceEventSchema = new Schema({
  entityId: { type: String, ref: 'Entity', required: true },
  findingId: { type: String, ref: 'Finding' },
  caseId: { type: String, ref: 'Case' },
  alertId: { type: String, ref: 'Alert' },

  eventTime: { type: Date, required: true },
  eventType: { type: String, enum: ['Alert Created', 'Acknowledged', 'Investigation Started', 'Evidence Collected', 'Escalation', 'Closure', 'Note Added', 'Reopened', 'Custom'], required: true },

  actor: { type: String },
  role: { type: String },

  event: { type: String, required: true },
  metadata: [String],

  sourceRecordId: { type: String },
  sourceSystem: { type: String },

  createdAt: { type: Date, default: Date.now }
}, { timestamps: false })

evidenceEventSchema.index({ entityId: 1, eventTime: -1 })
evidenceEventSchema.index({ findingId: 1 })
evidenceEventSchema.index({ caseId: 1 })
evidenceEventSchema.index({ alertId: 1 })

export type EvidenceEventType = InferSchemaType<typeof evidenceEventSchema>
export const EvidenceEvent = model('EvidenceEvent', evidenceEventSchema)