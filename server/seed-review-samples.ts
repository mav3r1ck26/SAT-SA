import mongoose from 'mongoose'
import { connectDB } from './config/db'
import { seedSampleReviewFindings } from './services/sampleReviewData'

async function run() {
  await connectDB()
  const inserted = await seedSampleReviewFindings()
  console.log(`Ensured ${inserted} varied review-queue sample findings.`)
  await mongoose.disconnect()
}

run().catch(async error => {
  console.error(error)
  await mongoose.disconnect()
  process.exitCode = 1
})
