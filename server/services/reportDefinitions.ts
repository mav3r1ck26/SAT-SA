import { Report } from '../models/Report'

export const DEFAULT_REPORT_DEFINITIONS = [
  { id: 'RPT-01', name: 'Entity Assessment Report', description: 'Comprehensive supervisory assessment for a single entity.', format: 'PDF, CSV, JSON', formats: ['PDF', 'CSV', 'JSON'] },
  { id: 'RPT-02', name: 'Cross-Entity Supervisory Report', description: 'Consolidated supervisory findings across all assessed CSEs.', format: 'PDF, CSV', formats: ['PDF', 'CSV'] },
  { id: 'RPT-03', name: 'Execution Gap Report', description: 'All execution gap indicators with evidence and confidence.', format: 'PDF, CSV, JSON', formats: ['PDF', 'CSV', 'JSON'] },
  { id: 'RPT-04', name: 'Negative Space Report', description: 'Telemetry coverage matrix and monitoring blind spots.', format: 'PDF, CSV', formats: ['PDF', 'CSV'] },
  { id: 'RPT-05', name: 'Peer Benchmark Report', description: 'Peer percentile comparison for key operational metrics.', format: 'PDF, CSV, JSON', formats: ['PDF', 'CSV', 'JSON'] },
  { id: 'RPT-06', name: 'Manual Review Summary', description: 'Summary of manual review queue actions and dispositions.', format: 'PDF', formats: ['PDF'] }
] as const

export async function initializeReportDefinitions() {
  for (const definition of DEFAULT_REPORT_DEFINITIONS) {
    await Report.updateOne(
      { id: definition.id },
      {
        $set: { description: definition.description, formats: [...definition.formats] },
        $setOnInsert: { name: definition.name, format: definition.format, status: 'Ready' }
      },
      { upsert: true }
    )
  }
}
