import { Schema, model, InferSchemaType } from 'mongoose'

export const auditLogSchema = new Schema({
  sequence: { type: Number, required: true, unique: true },
  timestamp: { type: Date, default: Date.now, required: true },
  user: { type: String, required: true },
  userRole: { type: String },
  action: { type: String, required: true },
  actionCategory: { type: String, enum: ['Finding', 'Evidence', 'Entity', 'Report', 'Data', 'Analytics', 'Model', 'Configuration', 'User', 'System'] },

  findingId: { type: String, ref: 'Finding' },
  entityId: { type: String, ref: 'Entity' },
  caseId: { type: String, ref: 'Case' },
  alertId: { type: String, ref: 'Alert' },

  status: { type: String, default: 'Success' },
  previousValue: { type: Schema.Types.Mixed },
  newValue: { type: Schema.Types.Mixed },
  detail: { type: String },

  ipAddress: { type: String },
  userAgent: { type: String },

  sessionId: { type: String },
  previousHash: { type: String, required: true },
  eventHash: { type: String, required: true }
}, { timestamps: false })

auditLogSchema.index({ sequence: 1 }, { unique: true })
auditLogSchema.index({ timestamp: -1 })
auditLogSchema.index({ user: 1 })
auditLogSchema.index({ action: 1 })
auditLogSchema.index({ entityId: 1 })
auditLogSchema.index({ findingId: 1 })

export type AuditLogType = InferSchemaType<typeof auditLogSchema>
export const AuditLog = model('AuditLog', auditLogSchema)