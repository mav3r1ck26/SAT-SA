import { Schema, model, InferSchemaType } from 'mongoose'

export const configurationSchema = new Schema({
  key: { type: String, required: true, unique: true },
  category: { type: String, enum: ['thresholds', 'weights', 'ml', 'scoring', 'peer', 'data_quality', 'general'], required: true },

  value: { type: Schema.Types.Mixed, required: true },
  defaultValue: { type: Schema.Types.Mixed },

  description: { type: String },
  dataType: { type: String, enum: ['number', 'string', 'boolean', 'object', 'array'] },

  minValue: { type: Number },
  maxValue: { type: Number },
  allowedValues: [Schema.Types.Mixed],

  isEditable: { type: Boolean, default: true },
  requiresRestart: { type: Boolean, default: false },

  lastModifiedBy: { type: String },
  lastModifiedAt: { type: Date },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true })

configurationSchema.index({ category: 1 })
configurationSchema.index({ isEditable: 1 })

export type ConfigurationType = InferSchemaType<typeof configurationSchema>
export const Configuration = model('Configuration', configurationSchema)