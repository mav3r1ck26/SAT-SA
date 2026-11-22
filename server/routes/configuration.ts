import { Router, Response } from 'express'
import { getAllConfigs, getConfig, getConfigCategory, updateConfigValue } from '../services/configuration'

const router = Router()

function handleError(err: unknown, res: Response) {
  const statusCode = typeof err === 'object' && err !== null && 'statusCode' in err ? Number((err as any).statusCode) : 500
  const message = statusCode < 500 && err instanceof Error ? err.message : 'The configuration request could not be completed.'
  res.status(statusCode).json({ success: false, error: { code: statusCode === 409 ? 'CONFIGURATION_CONFLICT' : statusCode === 400 ? 'INVALID_CONFIGURATION' : statusCode === 404 ? 'UNKNOWN_CONFIGURATION' : 'INTERNAL_ERROR', message } })
}

router.get('/', async (_req, res) => {
  try {
    res.json({ success: true, data: await getAllConfigs() })
  } catch (err) { handleError(err, res) }
})

router.get('/category/:category', async (req, res) => {
  try {
    res.json({ success: true, data: await getConfigCategory(req.params.category) })
  } catch (err) { handleError(err, res) }
})

router.get('/:key', async (req, res) => {
  try {
    const value = await getConfig(req.params.key)
    if (value === null) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Configuration not found' } })
    res.json({ success: true, data: value })
  } catch (err) { handleError(err, res) }
})

router.put('/:key', async (req, res) => {
  try {
    if (!Object.prototype.hasOwnProperty.call(req.body ?? {}, 'value')) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Configuration value is required' } })
    }
    if (!req.user) return res.status(401).json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Authentication required.' } })
    const config = await updateConfigValue(req.params.key, req.body.value, req.user, {
      sessionId: req.sessionId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    })
    res.json({ success: true, data: { key: config.key, value: config.value, version: config.version } })
  } catch (err) { handleError(err, res) }
})

export default router
