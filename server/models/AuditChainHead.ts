import { Schema, model } from 'mongoose'

const auditChainHeadSchema = new Schema({
  key: { type: String, required: true, unique: true, default: 'primary' },
  sequence: { type: Number, required: true, min: 0 },
  headHash: { type: String, required: true }
}, { timestamps: true })

export const AuditChainHead = model('AuditChainHead', auditChainHeadSchema)
