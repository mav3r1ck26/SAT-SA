import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Server } from 'node:http'
import express from 'express'
import mongoose from 'mongoose'
import { test } from 'node:test'
import { ApiError, fetchApiHealth } from '../src/api/client'
import { Entity } from '../server/models/Entity'
import { Alert } from '../server/models/Alert'
import { Case } from '../server/models/Case'
import { Finding } from '../server/models/Finding'
import { EvidenceEvent } from '../server/models/EvidenceEvent'
import { AnalyticsJob } from '../server/models/AnalyticsJob'
import { IngestionBatch } from '../server/models/IngestionBatch'
import { IngestionRecord } from '../server/models/IngestionRecord'
import { TelemetryCoverage } from '../server/models/TelemetryCoverage'
import { Report } from '../server/models/Report'
import { AuditLog } from '../server/models/AuditLog'
import { AuditChainHead } from '../server/models/AuditChainHead'
import { initializeConfiguration } from '../server/services/configuration'
import { initializeReportDefinitions } from '../server/services/reportDefinitions'
import { appendAuditEvent, initializeAuditChain, verifyAuditChain } from '../server/services/audit'
import analyticsRouter from '../server/routes/analytics'
import auditRouter from '../server/routes/audit'
import entitiesRouter from '../server/routes/entities'
import findingsRouter from '../server/routes/findings'
import evidenceRouter from '../server/routes/evidence'
import ingestionRouter from '../server/routes/ingestion'
import reportsRouter from '../server/routes/reports'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sampleDirectory = path.join(root, 'data', 'testing_datasets')
const testMongoUri = process.env.SATSA_TEST_MONGO_URI

test('frontend API errors preserve Retry-After without automatic retry', async () => {
  const originalFetch = globalThis.fetch
  let calls = 0
  globalThis.fetch = (async () => {
    calls++
    return new Response(JSON.stringify({
      success: false,
      error: { code: 'RATE_LIMITED', message: 'Retry later.' }
    }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '3' }
    })
  }) as typeof fetch

  try {
    await assert.rejects(fetchApiHealth(), (error: unknown) =>
      error instanceof ApiError && error.status === 429 && error.retryAfterMs === 3000
    )
    assert.equal(calls, 1)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('bulk ingestion persists operational and coverage data and serves scoped analytics', { skip: !testMongoUri }, async () => {
  const dbName = `satsa-integration-${randomUUID().replace(/-/g, '')}`
  let server: Server | undefined
  await mongoose.connect(testMongoUri!, { dbName })

  try {
    await initializeConfiguration()
    await Promise.all([
      Entity.init(), Alert.init(), Case.init(), Finding.init(), EvidenceEvent.init(), AnalyticsJob.init(),
      IngestionBatch.init(), IngestionRecord.init(), TelemetryCoverage.init(), Report.init(), AuditLog.init(), AuditChainHead.init()
    ])
    await initializeAuditChain()
    await initializeReportDefinitions()

    const entities = [
      { id: 'CSE-001', name: 'National Power Grid Op.', sector: 'Power', region: 'North', criticality: 'Critical' },
      { id: 'CSE-014', name: 'Central Power Authority', sector: 'Power', region: 'West', criticality: 'Critical' },
      { id: 'CSE-027', name: 'National Banking Services', sector: 'Banking', region: 'West', criticality: 'Critical' },
      { id: 'CSE-063', name: 'Metropolitan Water Board', sector: 'Water', region: 'South', criticality: 'High' },
      { id: 'CSE-070', name: 'Freight Rail Network', sector: 'Transport', region: 'West', criticality: 'Medium' }
    ] as const

    const app = express()
    app.use(express.json({ limit: '2mb' }))
    app.use('/api/analytics', analyticsRouter)
    app.use('/api/entities', entitiesRouter)
    app.use('/api/findings', findingsRouter)
    app.use('/api/evidence', evidenceRouter)
    app.use('/api/ingestion', ingestionRouter)
    app.use('/api/reports', (req, _res, next) => {
      req.user = {
        id: 'integration-supervisor',
        username: 'integration-supervisor',
        displayName: 'Integration Supervisor',
        role: 'Super Admin',
        assignedEntityIds: []
      }
      req.sessionId = 'integration-session'
      next()
    }, reportsRouter)
    app.use('/api/audit', auditRouter)
    server = await new Promise<Server>((resolve, reject) => {
      const listeningServer = app.listen(0, '127.0.0.1', () => resolve(listeningServer))
      listeningServer.once('error', reject)
    })
    const address = server.address()
    assert.ok(address && typeof address !== 'string')
    const baseUrl = `http://127.0.0.1:${address.port}`

    for (const entity of entities) {
      const response = await fetch(`${baseUrl}/api/entities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...entity, period: 'Q2 FY 2026-27' })
      })
      assert.equal(response.status, 201, `${entity.id} should register`)
      const payload = await response.json() as any
      assert.equal(payload.success, true)
      assert.equal(payload.data.id, entity.id)
    }

    const files = [
      '01_siem_alerts_airgap_CSE014_scada.json',
      '02_syslog_cef_alerts_CSE027_corebanking.csv',
      '03_forensic_cases_audit_CSE001_powergrid.csv',
      '05_negative_space_blindspot_matrix.json'
    ]
    const form = new FormData()
    form.append('period', 'Q2 FY 2026-27')
    for (const filename of files) {
      const content = await readFile(path.join(sampleDirectory, filename), 'utf8')
      form.append('files', new Blob([content]), filename)
    }

    const uploadResponse = await fetch(`${baseUrl}/api/ingestion/upload`, { method: 'POST', body: form })
    assert.equal(uploadResponse.status, 200)
    const uploadPayload = await uploadResponse.json() as any
    assert.equal(uploadPayload.success, true)
    assert.equal(uploadPayload.data.fileCount, files.length)
    assert.equal(uploadPayload.data.failedFiles, 0)

    const results = uploadPayload.data.files as any[]
    const expectedRecords = [120, 150, 100, 4]
    assert.deepEqual(results.map(result => result.total), expectedRecords)
    assert.ok(results.every(result => result.batch.status === 'persisted'))
    assert.ok(results.every(result => result.batch.analyticsStatus === 'completed'))
    assert.equal(results[3].telemetryRecordsStored, 4)

    const totalAlerts = expectedRecords[0] + expectedRecords[1]
    assert.equal(await Entity.countDocuments(), 5)
    assert.equal(await Alert.countDocuments(), totalAlerts)
    assert.equal(await Alert.countDocuments({ entityId: 'CSE-014', period: 'Q2 FY 2026-27' }), 120)
    assert.equal(await Alert.countDocuments({ entityId: 'CSE-027', period: 'Q2 FY 2026-27' }), 150)
    assert.equal(await Case.countDocuments(), expectedRecords[2])
    assert.equal(await Case.countDocuments({ entityId: 'CSE-001', period: 'Q2 FY 2026-27' }), 100)
    assert.equal(await TelemetryCoverage.countDocuments({ period: 'Q2 FY 2026-27' }), 4)
    assert.equal(await EvidenceEvent.countDocuments(), 0)
    assert.equal(await AnalyticsJob.countDocuments(), 0)
    for (const [index, result] of results.entries()) {
      const batchId = new mongoose.Types.ObjectId(result.batch._id)
      assert.equal(await IngestionRecord.countDocuments({ batchId }), expectedRecords[index])
      assert.equal(await IngestionBatch.findById(batchId).then(batch => batch?.recordsReceived), expectedRecords[index])
    }
    const escalationFinding = await Finding.findOne({
      findingType: 'EXECUTION_GAP',
      title: 'Critical Alert Without Escalation',
      entityId: 'CSE-014',
      period: 'Q2 FY 2026-27'
    }).lean()
    assert.ok(escalationFinding)
    assert.ok(escalationFinding.evidenceReferences.length > 0)
    const findingEvidenceResponse = await fetch(`${baseUrl}/api/evidence/finding/${escalationFinding.id}`)
    assert.equal(findingEvidenceResponse.status, 200)
    const findingEvidence = await findingEvidenceResponse.json() as any
    assert.ok(findingEvidence.data.supportingRecords.alerts.length > 0)
    assert.equal(findingEvidence.data.supportingRecords.total, escalationFinding.evidenceCount)
    assert.ok(findingEvidence.data.supportingRecords.alerts.every((alert: any) =>
      alert.entityId === 'CSE-014' && alert.period === 'Q2 FY 2026-27'
    ))

    const reportListResponse = await fetch(`${baseUrl}/api/reports`)
    assert.equal(reportListResponse.status, 200)
    const reportList = await reportListResponse.json() as any
    assert.equal(reportList.data.length, 6)
    assert.ok(reportList.data.every((report: any) => Array.isArray(report.formats) && report.formats.length > 0))
    const generatedReportResponse = await fetch(`${baseUrl}/api/reports/RPT-03/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ period: 'Q2 FY 2026-27' })
    })
    assert.equal(generatedReportResponse.status, 200)
    const generatedReport = await generatedReportResponse.json() as any
    assert.equal(generatedReport.data.name, 'Execution Gap Report')
    assert.equal(generatedReport.data.data.assessmentPeriod, 'Q2 FY 2026-27')
    assert.equal(await Report.findOne({ id: 'RPT-03' }).then(report => report?.status), 'Available')

    await appendAuditEvent({
      actor: { id: 'integration-supervisor', username: 'integration-supervisor', role: 'Super Admin' },
      action: 'Integration report generated',
      actionCategory: 'Report',
      detail: 'Report generation was recorded by the isolated integration test.'
    })
    const auditResponse = await fetch(`${baseUrl}/api/audit`)
    assert.equal(auditResponse.status, 200)
    const auditPayload = await auditResponse.json() as any
    assert.ok(auditPayload.data.some((event: any) => event.action === 'Report Generated'))
    assert.ok(auditPayload.data.some((event: any) => event.action === 'Integration report generated'))
    assert.equal((await verifyAuditChain()).valid, true)

    const periods = ['Q3 FY 2025-26', 'Q1 FY 2026-27', 'Q2 FY 2026-27']
    for (const period of periods) {
      const query = new URLSearchParams({ period })
      const dashboardPaths = [
        `/api/analytics/overview?${query}`,
        `/api/analytics/risk-distribution?${query}`,
        `/api/analytics/alerts?${query}`,
        `/api/analytics/investigations?${query}`,
        `/api/analytics/escalations?${query}`,
        `/api/analytics/gaps?${query}`,
        `/api/analytics/blind-spots?${query}`,
        `/api/analytics/coverage-matrix?${query}`,
        `/api/analytics/anomalies?${query}`,
        `/api/analytics/review-queue?${query}`,
        `/api/entities?${query}`,
        `/api/findings?${query}`,
        '/api/reports',
        '/api/ingestion/quality'
      ]
      for (const dashboardPath of dashboardPaths) {
        const response = await fetch(`${baseUrl}${dashboardPath}`)
        assert.equal(response.status, 200, `${dashboardPath} should succeed for ${period}`)
        const payload = await response.json() as any
        assert.equal(payload.success, true, `${dashboardPath} should return a successful envelope`)
        if (period === 'Q2 FY 2026-27' && dashboardPath.startsWith('/api/analytics/gaps')) {
          assert.ok(payload.data.length > 0, 'execution-gap rules should find the supplied critical alerts')
        }
        if (period === 'Q2 FY 2026-27' && dashboardPath.startsWith('/api/analytics/review-queue')) {
          assert.ok(payload.data.length > 0, 'the review queue should include persisted findings or coverage evidence')
        }
        if (dashboardPath.startsWith('/api/entities?')) {
          assert.ok(payload.data.every((entity: any) => entity.assessmentPeriod === period))
        }
      }

      const coverageResponse = await fetch(`${baseUrl}/api/analytics/coverage-matrix?${query}`)
      const coveragePayload = await coverageResponse.json() as any
      if (period === 'Q2 FY 2026-27') assert.ok(coveragePayload.data.categories.length > 0)
      else assert.equal(coveragePayload.data.categories.length, 0)

      const entitiesResponse = await fetch(`${baseUrl}/api/entities?${query}&entityId=CSE-014`)
      const entitiesPayload = await entitiesResponse.json() as any
      assert.deepEqual(entitiesPayload.data.map((entity: any) => entity.id), ['CSE-014'])

      const alertFilter = new URLSearchParams({ period, entityId: 'CSE-014' })
      const alertResponse = await fetch(`${baseUrl}/api/analytics/alerts?${alertFilter}`)
      const alertPayload = await alertResponse.json() as any
      assert.equal(alertPayload.success, true)
      const matchingAlerts = await Alert.countDocuments({ entityId: 'CSE-014', period })
      assert.equal(matchingAlerts, period === 'Q2 FY 2026-27' ? 120 : 0)
    }

    const coverageResponse = await fetch(`${baseUrl}/api/analytics/blind-spots?period=${encodeURIComponent('Q2 FY 2026-27')}&entityId=CSE-063`)
    const coveragePayload = await coverageResponse.json() as any
    assert.ok(coveragePayload.data.length > 0)
    assert.ok(coveragePayload.data.every((record: any) => record.entityId === 'CSE-063'))
  } finally {
    if (server) await new Promise<void>((resolve, reject) => server!.close(error => error ? reject(error) : resolve()))
    await mongoose.connection.dropDatabase()
    await mongoose.disconnect()
  }
})
