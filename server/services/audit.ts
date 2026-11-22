import { createHash } from 'crypto'
import { AuditLog } from '../models/AuditLog'
import { AuditChainHead } from '../models/AuditChainHead'

export interface AuditEventInput {
  actor: { id: string; username: string; role: string }
  action: string
  actionCategory: 'Finding' | 'Evidence' | 'Entity' | 'Report' | 'Data' | 'Analytics' | 'Model' | 'Configuration' | 'User' | 'System'
  entityId?: string
  findingId?: string
  detail?: string
  status?: string
  previousValue?: unknown
  newValue?: unknown
  sessionId?: string
  ipAddress?: string
  userAgent?: string
}

let writeQueue: Promise<void> = Promise.resolve()

export function hashEvent(event: Record<string, unknown>): string {
  const canonical = {
    sequence: event.sequence,
    timestamp: new Date(event.timestamp as string | number | Date).toISOString(),
    user: event.user,
    userRole: event.userRole,
    action: event.action,
    actionCategory: event.actionCategory,
    findingId: event.findingId,
    entityId: event.entityId,
    caseId: event.caseId,
    alertId: event.alertId,
    status: event.status,
    previousValue: event.previousValue,
    newValue: event.newValue,
    detail: event.detail,
    ipAddress: event.ipAddress,
    userAgent: event.userAgent,
    sessionId: event.sessionId,
    previousHash: event.previousHash
  }
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex')
}

export async function appendAuditEvent(input: AuditEventInput) {
  let resolveWrite!: () => void
  let rejectWrite!: (error: unknown) => void
  const result = writeQueue.then(async () => {
    const previous = await AuditLog.findOne().sort({ sequence: -1 }).lean()
    const head = await AuditChainHead.findOne({ key: 'primary' }).lean()
    if (!head || head.sequence !== (previous?.sequence || 0) || head.headHash !== (previous?.eventHash || 'GENESIS')) {
      throw new Error('Audit chain head is inconsistent with stored history; refusing to append.')
    }
    const sequence = head.sequence + 1
    const timestamp = new Date()
    const previousHash = head.headHash
    const event = {
      sequence,
      timestamp,
      user: input.actor.username,
      userRole: input.actor.role,
      action: input.action,
      actionCategory: input.actionCategory,
      entityId: input.entityId,
      findingId: input.findingId,
      detail: input.detail,
      status: input.status || 'Success',
      previousValue: input.previousValue,
      newValue: input.newValue,
      sessionId: input.sessionId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      previousHash
    }
    const eventHash = hashEvent(event)
    const record = await AuditLog.create({ ...event, eventHash })
    const updatedHead = await AuditChainHead.updateOne(
      { key: 'primary', sequence: head.sequence, headHash: head.headHash },
      { $set: { sequence, headHash: eventHash } }
    )
    if (updatedHead.modifiedCount !== 1) throw new Error('Audit chain head update failed after event creation; verify audit history.')
    return record
  })
  writeQueue = result.then(() => undefined, () => undefined)
  return result
}

export function verifyAuditEvents(
  events: Array<Record<string, any>>,
  head: { sequence: number; headHash: string } | null
) {
  let previousHash = 'GENESIS'
  let expectedSequence = 1
  for (const event of events) {
    const { eventHash, sequence, previousHash: eventPreviousHash } = event
    if (typeof sequence !== 'number' || typeof eventPreviousHash !== 'string' || typeof eventHash !== 'string') {
      return { valid: false, checked: expectedSequence - 1, failure: 'legacy_or_invalid_event', sequence: expectedSequence }
    }
    if (event.sequence !== expectedSequence) {
      return { valid: false, checked: expectedSequence - 1, failure: 'sequence_gap', sequence: expectedSequence }
    }
    if (eventPreviousHash !== previousHash) {
      return { valid: false, checked: expectedSequence - 1, failure: 'previous_hash_mismatch', sequence: event.sequence }
    }
    if (hashEvent(event as unknown as Record<string, unknown>) !== eventHash) {
      return { valid: false, checked: expectedSequence - 1, failure: 'event_hash_mismatch', sequence: event.sequence }
    }
    previousHash = eventHash
    expectedSequence++
  }
  if (!head || head.sequence !== events.length || head.headHash !== previousHash) {
    return { valid: false, checked: events.length, failure: 'protected_head_mismatch', sequence: events.length }
  }
  return { valid: true, checked: events.length, headHash: previousHash }
}

export async function verifyAuditChain() {
  const [events, head] = await Promise.all([
    AuditLog.find().sort({ sequence: 1 }).lean(),
    AuditChainHead.findOne({ key: 'primary' }).lean()
  ])
  return verifyAuditEvents(events as Array<Record<string, any>>, head)
}

export async function initializeAuditChain() {
  const events = await AuditLog.find().sort({ timestamp: 1, _id: 1 }).lean()
  if (!events.length) {
    const head = await AuditChainHead.findOne({ key: 'primary' }).lean()
    if (!head) await AuditChainHead.create({ key: 'primary', sequence: 0, headHash: 'GENESIS' })
    else if (head.sequence !== 0 || head.headHash !== 'GENESIS') throw new Error('Audit chain head exists without corresponding events.')
    return
  }
  const legacy = events.filter(event => event.sequence == null && !event.previousHash && !event.eventHash)
  if (legacy.length !== 0 && legacy.length !== events.length) {
    throw new Error('Audit history contains a partially initialized chain; refusing to alter existing records.')
  }
  if (!legacy.length) {
    const currentHead = await AuditChainHead.findOne({ key: 'primary' }).lean()
    const last = events[events.length - 1]
    if (!currentHead) {
      await AuditChainHead.create({ key: 'primary', sequence: last.sequence, headHash: last.eventHash })
    }
    const verification = await verifyAuditChain()
    if (!verification.valid) throw new Error(`Audit history verification failed at sequence ${verification.sequence}.`)
    return
  }
  let previousHash = 'GENESIS'
  for (let index = 0; index < events.length; index++) {
    const event = events[index]
    const sequence = index + 1
    const payload = { ...event, sequence, previousHash }
    const eventHash = hashEvent(payload as unknown as Record<string, unknown>)
    await AuditLog.updateOne({ _id: event._id }, { $set: { sequence, previousHash, eventHash } })
    previousHash = eventHash
  }
  await AuditChainHead.findOneAndUpdate(
    { key: 'primary' },
    { $setOnInsert: { key: 'primary', sequence: events.length, headHash: previousHash } },
    { upsert: true, new: true }
  )
  console.warn(`[AUDIT] Initialized a hash chain for ${events.length} legacy events; this does not establish an external tamper-proof checkpoint.`)
}
