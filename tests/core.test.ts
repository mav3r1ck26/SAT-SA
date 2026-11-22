import assert from 'node:assert/strict'
import { test } from 'node:test'
import { enforceAssignedEntityScope, requireRoles, hashSessionToken } from '../server/middleware/auth'
import { hashEvent, verifyAuditEvents } from '../server/services/audit'
import { isAssessmentPeriod, normalizeAssessmentPeriod } from '../server/services/assessmentPeriods'
import { safeErrorMessage } from '../server/services/errorHandling'
import { validateConfigurationValue } from '../server/services/configuration'
import { INGESTION_LIMITS, parseCSV, validateRecordLimits } from '../server/services/ingestionValidation'
import { serializeCSV } from '../src/utils/export'
import { createRateLimitMiddleware } from '../server/middleware/rateLimit'
import { ApiError, fetchApiHealth } from '../src/api/client'

test('CSV ingestion parses quoted fields and rejects malformed rows', () => {
  assert.deepEqual(parseCSV('id,name\r\n1,"SOC, Team"'), [{ id: '1', name: 'SOC, Team' }])
  assert.throws(() => parseCSV('id,name\n1,"unterminated'), /unclosed quoted field/)
  assert.throws(() => parseCSV('id,id\n1,2'), /duplicate field/)
})

test('ingestion limits reject oversized record and field sets', () => {
  const limits = { ...INGESTION_LIMITS, maxRecords: 1, maxFields: 1, maxFieldLength: 3 }
  assert.throws(() => validateRecordLimits([{ id: '1' }, { id: '2' }], limits), /record limit/)
  assert.throws(() => validateRecordLimits([{ id: '1', name: 'x' }], limits), /fields/)
  assert.throws(() => parseCSV('id\n1234', limits), /character limit/)
})

test('audit verification detects edited events and head mismatches', () => {
  const event: Record<string, unknown> = {
    sequence: 1,
    timestamp: new Date('2026-01-01T00:00:00.000Z'),
    user: 'reviewer',
    userRole: 'Auditor',
    action: 'Reviewed record',
    actionCategory: 'Data',
    previousHash: 'GENESIS'
  }
  event.eventHash = hashEvent(event)
  const head = { sequence: 1, headHash: String(event.eventHash) }
  assert.equal(verifyAuditEvents([event], head).valid, true)
  assert.equal(verifyAuditEvents([{ ...event, action: 'Edited record' }], head).failure, 'event_hash_mismatch')
  assert.equal(verifyAuditEvents([event], { sequence: 2, headHash: head.headHash }).failure, 'protected_head_mismatch')
})

test('configuration validation enforces typed allowed values and bounds', () => {
  const periodConfig = { key: 'assessmentPeriod', dataType: 'string', allowedValues: ['Q2 FY 2026-27'] }
  assert.equal(validateConfigurationValue(periodConfig, 'Q2 FY 2026-27'), null)
  assert.match(validateConfigurationValue(periodConfig, 'FY 2024-25') || '', /configured periods/)
  assert.match(validateConfigurationValue({ key: 'batchSize', dataType: 'number', minValue: 1, maxValue: 10 }, 11) || '', /at most/)
  assert.match(validateConfigurationValue({ key: 'enabled', dataType: 'boolean' }, 'true') || '', /valid boolean/)
})

test('assessment periods are restricted to the supported quarter set', () => {
  const normalized = normalizeAssessmentPeriod('Q2 FY 2026–27')
  assert.equal(isAssessmentPeriod(normalized), true)
  assert.equal(isAssessmentPeriod('FY 2024-25'), false)
})

test('role middleware denies a role that is not explicitly allowed', () => {
  let statusCode = 0
  let continued = false
  const req = { user: { role: 'SOC Manager' } }
  const res = {
    status(code: number) { statusCode = code; return this },
    json() { return this }
  }
  requireRoles('Supervisor')(req as never, res as never, () => { continued = true })
  assert.equal(statusCode, 403)
  assert.equal(continued, false)
  assert.equal(hashSessionToken('opaque-session').length, 64)
})

test('SOC Manager entity scope rejects unassigned entity routes', () => {
  let statusCode = 0
  let continued = false
  const req = {
    user: { role: 'SOC Manager', assignedEntityIds: ['CSE-001'] },
    path: '/entities/CSE-002',
    query: {},
    body: {}
  }
  const res = {
    status(code: number) { statusCode = code; return this },
    json() { return this }
  }
  enforceAssignedEntityScope(req as never, res as never, () => { continued = true })
  assert.equal(statusCode, 403)
  assert.equal(continued, false)
})

test('rate limits isolate categories and return a retry interval when exhausted', () => {
  let now = 1000
  const middleware = createRateLimitMiddleware({
    identify: req => req.user?.id || req.ip || 'unknown',
    policy: req => ({ category: req.path, limit: 1, windowMs: 1000 }),
    now: () => now
  })
  const request = (path: string) => {
    const headers: Record<string, string> = {}
    let statusCode = 200
    let body: any
    let continued = false
    const req = { path, method: 'GET', ip: '192.0.2.1' }
    const res = {
      setHeader(name: string, value: string) { headers[name] = value; return this },
      status(code: number) { statusCode = code; return this },
      json(value: unknown) { body = value; return this }
    }
    middleware(req as never, res as never, () => { continued = true })
    return { headers, statusCode, body, continued }
  }

  assert.equal(request('/analytics').continued, true)
  const rejected = request('/analytics')
  assert.equal(rejected.statusCode, 429)
  assert.equal(rejected.headers['Retry-After'], '1')
  assert.match(rejected.body.error.message, /Retry after 1 seconds/)
  assert.equal(request('/entities').continued, true)

  now += 1000
  assert.equal(request('/analytics').continued, true)
})

test('identical concurrent API reads share one request', async () => {
  const originalFetch = globalThis.fetch
  let calls = 0
  globalThis.fetch = (async () => {
    calls++
    return new Response(JSON.stringify({ success: true, data: { status: 'ok', database: 'connected', timestamp: 'now' } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  }) as typeof fetch
  try {
    const [first, second] = await Promise.all([fetchApiHealth(), fetchApiHealth()])
    assert.deepEqual(first, second)
    assert.equal(calls, 1)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('API errors preserve Retry-After for controlled frontend retries', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => new Response(JSON.stringify({
    success: false,
    error: { message: 'Retry later.' }
  }), {
    status: 429,
    headers: { 'Content-Type': 'application/json', 'Retry-After': '2' }
  })) as typeof fetch
  try {
    await assert.rejects(fetchApiHealth(), (error: unknown) =>
      error instanceof ApiError && error.status === 429 && error.retryAfterMs === 2000
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('CSV export quotes cells and neutralizes formula-leading values', () => {
  assert.equal(
    serializeCSV(['value', 'description'], [['=1+1', 'line "quoted"']]),
    '"value","description"\r\n"\'=1+1","line ""quoted"""'
  )
})

test('internal error responses do not expose exception messages', () => {
  assert.equal(safeErrorMessage(new Error('database connection string'), 500), 'The request could not be completed.')
  assert.equal(safeErrorMessage(new Error('unsupported period'), 400), 'unsupported period')
})
