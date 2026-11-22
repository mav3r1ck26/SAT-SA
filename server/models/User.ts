import { Schema, model, InferSchemaType } from 'mongoose'

export const USER_ROLES = ['Super Admin', 'Supervisor', 'Examiner', 'Auditor', 'SOC Manager'] as const

export const userSchema = new Schema({
  username: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 120 },
  displayName: { type: String, required: true, trim: true, maxlength: 120 },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: USER_ROLES, required: true },
  assignedEntityIds: { type: [String], default: [] },
  active: { type: Boolean, default: true },
  pendingApproval: { type: Boolean, default: false }
}, { timestamps: true })

export type UserType = InferSchemaType<typeof userSchema>
export const User = model('User', userSchema)
