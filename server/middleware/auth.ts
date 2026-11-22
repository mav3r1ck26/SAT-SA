import { createHash } from 'crypto'
import type { NextFunction, Request, Response } from 'express'
import { AuthSession } from '../models/AuthSession'
import type { UserType } from '../models/User'

export type AuthenticatedUser = Pick<UserType, 'username' | 'displayName' | 'role' | 'assignedEntityIds'> & { id: string }

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser
      sessionId?: string
      cookies?: Record<string, string>
    }
  }
}

export const SESSION_COOKIE = 'satsa_session'

export function parseCookies(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.cookie
  req.cookies = {}
  if (header) {
    for (const part of header.split(';')) {
      const separator = part.indexOf('=')
      if (separator <= 0) continue
      const key = part.slice(0, separator).trim()
      try {
        req.cookies[key] = decodeURIComponent(part.slice(separator + 1).trim())
      } catch {
        return next(new Error('Malformed cookie header'))
      }
    }
  }
  next()
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function setSessionCookie(res: Response, token: string, expiresAt: Date) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: expiresAt,
    path: '/api'
  })
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api'
  })
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[SESSION_COOKIE]
    if (!token || typeof token !== 'string') {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Authentication required.' } })
    }
    const session = await AuthSession.findOne({ tokenHash: hashSessionToken(token), expiresAt: { $gt: new Date() } })
      .populate({ path: 'userId', match: { active: true } })
    const user = session?.userId as unknown as (AuthenticatedUser & { _id?: { toString(): string } }) | null
    if (!session || !user) {
      clearSessionCookie(res)
      return res.status(401).json({ success: false, error: { code: 'SESSION_EXPIRED', message: 'Session is invalid or expired.' } })
    }
    req.user = {
      id: user.id || user._id?.toString() || '',
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      assignedEntityIds: user.assignedEntityIds || []
    }
    req.sessionId = session._id.toString()
    next()
  } catch (error) {
    next(error)
  }
}

export function requireRoles(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission to perform this operation.' } })
    }
    next()
  }
}

export function authorizeApiRequest(req: Request, res: Response, next: NextFunction) {
  const role = req.user?.role
  if (!role) return res.status(401).json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Authentication required.' } })
  const path = req.path
  const restricted: Record<string, string[]> = {
    '/configuration': ['Super Admin'],
    '/users': ['Super Admin'],
    '/audit': ['Super Admin', 'Supervisor', 'Examiner', 'Auditor'],
    '/ml/train-auto': ['Super Admin'],
    '/ml/train': ['Super Admin']
  }
  const restriction = Object.entries(restricted).find(([prefix]) => path === prefix || path.startsWith(`${prefix}/`))
  if (restriction && !restriction[1].includes(role)) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission to access this resource.' } })
  }
  if (role === 'Super Admin' || req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next()

  const allowed: Record<string, string[]> = {
    '/analytics/recompute': ['Super Admin', 'Supervisor'],
    '/entities': ['Supervisor', 'Examiner'],
    '/findings/detect': ['Supervisor', 'Examiner'],
    '/ingestion': ['Supervisor', 'Examiner', 'SOC Manager'],
    '/reports': ['Supervisor', 'Examiner'],
    '/audit': ['Supervisor', 'Examiner']
  }
  const entry = Object.entries(allowed).find(([prefix]) => path === prefix || path.startsWith(`${prefix}/`))
  if (entry && entry[1].includes(role)) return next()
  if (path.startsWith('/findings/') && path.endsWith('/review') && ['Supervisor', 'Examiner'].includes(role)) return next()
  if (path.startsWith('/reports/') && path.endsWith('/generate') && ['Supervisor', 'Examiner'].includes(role)) return next()
  return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission to perform this operation.' } })
}

export function enforceAssignedEntityScope(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'SOC Manager') return next()
  const assigned = req.user.assignedEntityIds
  if (!assigned.length) return res.status(403).json({ success: false, error: { code: 'NO_ENTITY_ASSIGNMENTS', message: 'No entities are assigned to this account.' } })

  const segments = req.path.split('/').filter(Boolean)
  if (req.path === '/assessment-framework' || req.path === '/ml/health' || req.path === '/ml/model/info') return next()
  if (segments[0] === 'ingestion' && segments[1] === 'documents') return next()
  if (segments[0] === 'reports' && segments[1] === 'history') return next()
  if (segments[0] === 'entities' && segments.length > 1) {
    if (!assigned.includes(segments[1])) {
      return res.status(403).json({ success: false, error: { code: 'ENTITY_SCOPE_DENIED', message: 'This entity is not assigned to your account.' } })
    }
    return next()
  }
  if (segments[0] === 'entities' && segments.length === 1) return next()
  if (segments[0] === 'evidence' && segments[1] === 'entity' && segments.length > 2) {
    if (!assigned.includes(segments[2])) {
      return res.status(403).json({ success: false, error: { code: 'ENTITY_SCOPE_DENIED', message: 'This entity is not assigned to your account.' } })
    }
    return next()
  }
  if (segments[0] === 'analytics' && segments[1] === 'benchmark' && segments.length > 2) {
    if (!assigned.includes(segments[2])) {
      return res.status(403).json({ success: false, error: { code: 'ENTITY_SCOPE_DENIED', message: 'This entity is not assigned to your account.' } })
    }
    return next()
  }
  const entityScopedPaths = new Set([
    '/findings',
    '/analytics/overview',
    '/analytics/risk-distribution',
    '/analytics/alerts',
    '/analytics/investigations',
    '/analytics/escalations',
    '/analytics/gaps',
    '/analytics/blind-spots',
    '/analytics/coverage-matrix',
    '/analytics/anomalies',
    '/analytics/data-quality',
    '/analytics/review-queue'
  ])
  if (!entityScopedPaths.has(req.path)) {
    return res.status(403).json({ success: false, error: { code: 'ENTITY_SCOPE_REQUIRED', message: 'This resource is not available in a single-entity scope.' } })
  }
  const queryEntity = typeof req.query.entityId === 'string' ? req.query.entityId : undefined
  const bodyEntity = typeof req.body?.entityId === 'string' ? req.body.entityId : undefined
  const entityId = queryEntity || bodyEntity
  if (!entityId) return res.status(403).json({ success: false, error: { code: 'ENTITY_SCOPE_REQUIRED', message: 'Select an assigned entity to access this resource.' } })
  if (!assigned.includes(entityId)) {
    return res.status(403).json({ success: false, error: { code: 'ENTITY_SCOPE_DENIED', message: 'This entity is not assigned to your account.' } })
  }
  next()
}
