import mongoose from 'mongoose'
import { IngestionBatch } from '../models/IngestionBatch'
import { initializeAuditChain } from '../services/audit'
import { initializeConfiguration } from '../services/configuration'
import { initializeReportDefinitions } from '../services/reportDefinitions'
import { initializeGeneratedReportHistory } from '../services/reportLineage'

export async function connectDB() {
  try {
    const mongoUri = process.env.MONGO_URI
    if (!mongoUri) throw new Error('MONGO_URI must be configured; refusing to use an unauthenticated default.')
    await mongoose.connect(mongoUri)
    await removeObsoleteIngestionBatchIndex()
    await initializeAuditChain()
    await initializeConfiguration()
    await initializeReportDefinitions()
    await initializeGeneratedReportHistory()
    console.log('[DB] Connected to MongoDB.')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[DB] MongoDB connection failed:', message)
    process.exit(1)
  }
}

async function removeObsoleteIngestionBatchIndex() {
  const collection = IngestionBatch.collection.collection
  const indexes = await collection.listIndexes().toArray().catch((error: any) => {
    if (error?.code === 26 || error?.codeName === 'NamespaceNotFound') return []
    throw error
  })
  if (indexes.some((index: { name?: string }) => index.name === 'assessmentPeriods_1_entityIds_1')) {
    await collection.dropIndex('assessmentPeriods_1_entityIds_1')
    console.log('[DB] Removed obsolete parallel-array ingestion index.')
  }
}

export const isConnected = () => mongoose.connection.readyState === 1
