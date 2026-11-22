import { Schema, model } from 'mongoose'

const authSessionSchema = new Schema({
  tokenHash: { type: String, required: true, unique: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date, required: true }
}, { timestamps: true })

authSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
authSessionSchema.index({ userId: 1, expiresAt: 1 })

export const AuthSession = model('AuthSession', authSessionSchema)
