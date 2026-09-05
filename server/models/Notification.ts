import { Schema, model, InferSchemaType } from 'mongoose'

export const notificationSchema = new Schema({
  type: { type: String, required: true },
  title: { type: String, required: true },
  detail: { type: String },
  time: { type: Date, default: Date.now },
  read: { type: Boolean, default: false },
  severity: { type: String, default: 'info' }
})

export type NotificationType = InferSchemaType<typeof notificationSchema>
export const Notification = model('Notification', notificationSchema)
