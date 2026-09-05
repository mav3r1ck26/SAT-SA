import { Schema, model, InferSchemaType } from 'mongoose'

export const auditLogSchema = new Schema({
  timestamp: { type: Date, default: Date.now },
  user: { type: String, required: true },
  action: { type: String, required: true },
  finding: { type: String },
  entityId: { type: String },
  status: { type: String },
  detail: { type: String }
})

auditLogSchema.index({ timestamp: -1 })

export type AuditLogType = InferSchemaType<typeof auditLogSchema>
export const AuditLog = model('AuditLog', auditLogSchema)
