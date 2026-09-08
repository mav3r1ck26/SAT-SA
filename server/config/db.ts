import mongoose from 'mongoose'

const MONGO_URI = process.env.MONGO_URI || 'mongodb://satsa:satsa_dev_2026@localhost:27017/satsa'

export async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI, {
      authSource: 'admin'
    })
    console.log('[DB] Connected to MongoDB:', mongoose.connection.host)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[DB] MongoDB connection failed:', message)
    process.exit(1)
  }
}

export const isConnected = () => mongoose.connection.readyState === 1
