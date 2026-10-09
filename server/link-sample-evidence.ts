import { connectDB } from './config/db'
import { linkFindingsToSampleEvidence } from './services/sampleEvidence'

async function main() {
  await connectDB()
  const result = await linkFindingsToSampleEvidence()
  console.log(`Linked ${result.linkedEvents} sample evidence events to ${result.linkedFindings} findings.`)
  process.exit(0)
}

main().catch(error => {
  console.error('Failed to link sample evidence:', error)
  process.exit(1)
})
