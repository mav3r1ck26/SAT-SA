import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHmac } from 'crypto'
import { Router } from 'express'
import { Types } from 'mongoose'
import { AuthSession } from '../models/AuthSession'
import { USER_ROLES, User } from '../models/User'
import { Entity } from '../models/Entity'
import { appendAuditEvent } from '../services/audit'
import { clearSessionCookie, hashSessionToken, requireAuth, requireRoles, setSessionCookie } from '../middleware/auth'

const router = Router()
const SESSION_TTL_MS = 8 * 60 * 60 * 1000

function derivePasswordKey(password: string, salt: Buffer, length: number, options: { N: number; r: number; p: number }): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, length, options, (error, derivedKey) => {
      if (error) reject(error)
      else resolve(derivedKey)
    })
  })
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await derivePasswordKey(password, salt, 64, { N: 16384, r: 8, p: 1 })
  return `scrypt$16384$8$1$${salt.toString('hex')}$${key.toString('hex')}`
}

async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [algorithm, n, r, p, saltHex, hashHex] = encoded.split('$')
  if (algorithm !== 'scrypt' || !saltHex || !hashHex) return false
  const expected = Buffer.from(hashHex, 'hex')
  const candidate = await derivePasswordKey(password, Buffer.from(saltHex, 'hex'), expected.length, {
    N: Number(n), r: Number(r), p: Number(p)
  }) as Buffer
  return candidate.length === expected.length && timingSafeEqual(candidate, expected)
}

function validBootstrapToken(candidate: unknown): boolean {
  const configured = process.env.SATSA_BOOTSTRAP_TOKEN
  if (typeof candidate !== 'string' || !configured) return false
  const expected = createHmac('sha256', 'sat-sa-bootstrap').update(configured).digest()
  const supplied = createHmac('sha256', 'sat-sa-bootstrap').update(candidate).digest()
  return timingSafeEqual(expected, supplied)
}

function validPassword(password: unknown): password is string {
  return typeof password === 'string' && password.length >= 12 && password.length <= 256
}

async function createSession(user: { _id: Types.ObjectId; username: string; displayName: string; role: string; assignedEntityIds: string[] }, res: import('express').Response) {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
  await AuthSession.create({ tokenHash: hashSessionToken(token), userId: user._id, expiresAt })
  setSessionCookie(res, token, expiresAt)
  return {
    id: String(user._id),
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    assignedEntityIds: user.assignedEntityIds || [],
    expiresAt
  }
}

router.get('/status', async (_req, res, next) => {
  try {
    const setupRequired = !(await User.exists({ role: 'Super Admin' }))
    res.json({ success: true, data: { setupRequired, setupEnabled: Boolean(process.env.SATSA_BOOTSTRAP_TOKEN) } })
  } catch (error) { next(error) }
})

router.post('/setup', async (req, res, next) => {
  try {
    if (!validBootstrapToken(req.body?.bootstrapToken)) {
      return res.status(403).json({ success: false, error: { code: 'BOOTSTRAP_DENIED', message: 'Bootstrap authorization failed.' } })
    }
    if (!(await User.exists({ role: 'Super Admin' }))) {
      if (!validPassword(req.body?.password) || typeof req.body?.username !== 'string' || typeof req.body?.displayName !== 'string') {
        return res.status(400).json({ success: false, error: { code: 'INVALID_SETUP', message: 'Provide a username, display name, and password with at least 12 characters.' } })
      }
      const username = req.body.username.trim().toLowerCase()
      if (!username || username.length > 120 || req.body.displayName.trim().length === 0) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_SETUP', message: 'Username and display name are required.' } })
      }
      const user = await User.create({
        username,
        displayName: req.body.displayName.trim(),
        passwordHash: await hashPassword(req.body.password),
        role: 'Super Admin'
      })
      await appendAuditEvent({ actor: { id: user.id, username: user.username, role: user.role }, action: 'Initial Super Admin created', actionCategory: 'User' })
      return res.status(201).json({ success: true, data: await createSession(user, res) })
    }
    return res.status(409).json({ success: false, error: { code: 'SETUP_COMPLETE', message: 'Initial administrator setup is already complete.' } })
  } catch (error) { next(error) }
})

router.post('/register', async (req, res, next) => {
  try {
    if (!(await User.exists({ role: 'Super Admin', active: true }))) {
      return res.status(409).json({ success: false, error: { code: 'SETUP_INCOMPLETE', message: 'Access requests are unavailable until administrator setup is complete.' } })
    }

    const { username, displayName, password } = req.body || {}
    if (typeof username !== 'string' || typeof displayName !== 'string' || !validPassword(password)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_REGISTRATION', message: 'Provide a username, display name, and password with at least 12 characters.' } })
    }
    const normalizedUsername = username.trim().toLowerCase()
    const normalizedDisplayName = displayName.trim()
    if (!normalizedUsername || normalizedUsername.length > 120 || !normalizedDisplayName || normalizedDisplayName.length > 120) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_REGISTRATION', message: 'Username and display name must be between 1 and 120 characters.' } })
    }

    try {
      await User.create({
        username: normalizedUsername,
        displayName: normalizedDisplayName,
        passwordHash: await hashPassword(password),
        role: 'Auditor',
        active: false,
        pendingApproval: true
      })
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
        return res.status(202).json({ success: true, data: { message: 'If the username is available, the access request is pending Super Admin approval.' } })
      }
      throw error
    }

    await appendAuditEvent({
      actor: { id: 'public-registration', username: normalizedUsername, role: 'Pending registration' },
      action: 'Account access requested',
      actionCategory: 'User',
      detail: 'An inactive Auditor account is awaiting Super Admin approval.',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    })
    return res.status(202).json({ success: true, data: { message: 'Your access request is pending Super Admin approval.' } })
  } catch (error) { next(error) }
})

router.post('/login', async (req, res, next) => {
  try {
    const username = typeof req.body?.username === 'string' ? req.body.username.trim().toLowerCase() : ''
    const password = typeof req.body?.password === 'string' ? req.body.password : ''
    const user = await User.findOne({ username, active: true }).select('+passwordHash')
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Username or password is incorrect.' } })
    }
    const session = await createSession(user, res)
    await appendAuditEvent({ actor: { id: user.id, username: user.username, role: user.role }, action: 'Login', actionCategory: 'User', sessionId: String(session.id), ipAddress: req.ip, userAgent: req.get('user-agent') })
    res.json({ success: true, data: session })
  } catch (error) { next(error) }
})

router.get('/me', requireAuth, (req, res) => res.json({ success: true, data: req.user }))

router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    const token = req.cookies?.satsa_session
    if (token) await AuthSession.deleteOne({ tokenHash: hashSessionToken(token) })
    if (req.user) await appendAuditEvent({ actor: req.user, action: 'Logout', actionCategory: 'User', sessionId: req.sessionId })
    clearSessionCookie(res)
    res.json({ success: true })
  } catch (error) { next(error) }
})

router.post('/users', requireAuth, requireRoles('Super Admin'), async (req, res, next) => {
  try {
    const { username, displayName, password, role, assignedEntityIds } = req.body || {}
    if (typeof username !== 'string' || typeof displayName !== 'string' || !validPassword(password) || !USER_ROLES.includes(role)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_USER', message: 'Provide a username, display name, valid role, and password with at least 12 characters.' } })
    }
    if (role === 'Super Admin' && req.user?.role !== 'Super Admin') {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only a Super Admin can create another administrator.' } })
    }
    const entityIds = Array.isArray(assignedEntityIds) ? [...new Set(assignedEntityIds.filter((id: unknown): id is string => typeof id === 'string'))] : []
    if (role === 'SOC Manager' && entityIds.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'ENTITY_ASSIGNMENT_REQUIRED', message: 'SOC Managers must be assigned at least one entity.' } })
    }
    if (entityIds.length && await Entity.countDocuments({ id: { $in: entityIds } }) !== entityIds.length) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_ENTITY_ASSIGNMENT', message: 'One or more assigned entities do not exist.' } })
    }
    const user = await User.create({
      username: username.trim().toLowerCase(),
      displayName: displayName.trim(),
      passwordHash: await hashPassword(password),
      role,
      assignedEntityIds: entityIds
    })
    await appendAuditEvent({ actor: req.user!, action: 'User created', actionCategory: 'User', detail: `Created ${role} account ${user.username}` })
    res.status(201).json({ success: true, data: { id: user.id, username: user.username, displayName: user.displayName, role: user.role, assignedEntityIds: user.assignedEntityIds } })
  } catch (error) { next(error) }
})

router.get('/users', requireAuth, requireRoles('Super Admin'), async (_req, res, next) => {
  try {
    const users = await User.find().sort({ username: 1 }).lean()
    res.json({ success: true, data: users.map(user => ({
      id: user._id.toString(),
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      assignedEntityIds: user.assignedEntityIds,
      active: user.active,
      pendingApproval: Boolean(user.pendingApproval),
      createdAt: user.createdAt
    })) })
  } catch (error) { next(error) }
})

router.patch('/users/:id', requireAuth, requireRoles('Super Admin'), async (req, res, next) => {
  try {
    const target = await User.findById(req.params.id)
    if (!target) return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found.' } })
    const { displayName, role, active, assignedEntityIds } = req.body || {}
    if (displayName !== undefined && (typeof displayName !== 'string' || !displayName.trim() || displayName.length > 120)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_USER', message: 'Display name must be between 1 and 120 characters.' } })
    }
    if (role !== undefined && !USER_ROLES.includes(role)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_USER_ROLE', message: 'Role is not recognized.' } })
    }
    if (active !== undefined && typeof active !== 'boolean') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_USER_STATUS', message: 'Active must be a boolean.' } })
    }
    const entityIds = assignedEntityIds === undefined
      ? target.assignedEntityIds
      : Array.isArray(assignedEntityIds)
        ? [...new Set(assignedEntityIds.filter((id: unknown): id is string => typeof id === 'string'))]
        : null
    if (!entityIds) return res.status(400).json({ success: false, error: { code: 'INVALID_ENTITY_ASSIGNMENT', message: 'Assigned entities must be an array of entity identifiers.' } })
    const nextRole = role ?? target.role
    const nextActive = active ?? target.active
    if (nextRole === 'SOC Manager' && entityIds.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'ENTITY_ASSIGNMENT_REQUIRED', message: 'SOC Managers must be assigned at least one entity.' } })
    }
    if (entityIds.length && await Entity.countDocuments({ id: { $in: entityIds } }) !== entityIds.length) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_ENTITY_ASSIGNMENT', message: 'One or more assigned entities do not exist.' } })
    }
    if (target.role === 'Super Admin' && target.active && (!nextActive || nextRole !== 'Super Admin') &&
      await User.countDocuments({ role: 'Super Admin', active: true }) <= 1) {
      return res.status(409).json({ success: false, error: { code: 'LAST_SUPER_ADMIN', message: 'The last active Super Admin cannot be disabled or demoted.' } })
    }
    const previousValue = { displayName: target.displayName, role: target.role, active: target.active, pendingApproval: target.pendingApproval, assignedEntityIds: target.assignedEntityIds }
    target.displayName = displayName === undefined ? target.displayName : displayName.trim()
    target.role = nextRole
    target.active = nextActive
    if (nextActive) target.pendingApproval = false
    target.assignedEntityIds = entityIds
    await target.save()
    if (!target.active) await AuthSession.deleteMany({ userId: target._id })
    await appendAuditEvent({
      actor: req.user!,
      action: 'User updated',
      actionCategory: 'User',
      detail: `Updated account ${target.username}`,
      previousValue,
      newValue: { displayName: target.displayName, role: target.role, active: target.active, pendingApproval: target.pendingApproval, assignedEntityIds: target.assignedEntityIds },
      sessionId: req.sessionId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    })
    res.json({ success: true, data: { id: target.id, username: target.username, displayName: target.displayName, role: target.role, active: target.active, pendingApproval: target.pendingApproval, assignedEntityIds: target.assignedEntityIds } })
  } catch (error) { next(error) }
})

router.delete('/users/:id', requireAuth, requireRoles('Super Admin'), async (req, res, next) => {
  try {
    const target = await User.findById(req.params.id)
    if (!target) return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found.' } })
    if (!target.pendingApproval || target.active || target.role === 'Super Admin') {
      return res.status(409).json({ success: false, error: { code: 'NOT_PENDING_REQUEST', message: 'Only pending access requests can be rejected.' } })
    }
    const deletion = await User.deleteOne({ _id: target._id, pendingApproval: true, active: false })
    if (deletion.deletedCount !== 1) {
      return res.status(409).json({ success: false, error: { code: 'REQUEST_ALREADY_REVIEWED', message: 'This access request has already been reviewed.' } })
    }
    await appendAuditEvent({
      actor: req.user!,
      action: 'Access request rejected',
      actionCategory: 'User',
      detail: `Rejected access request for ${target.username}`,
      sessionId: req.sessionId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    })
    res.json({ success: true })
  } catch (error) { next(error) }
})

export default router
