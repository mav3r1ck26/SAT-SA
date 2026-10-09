import { Router, Response } from 'express'
import { getConfig, getConfigCategory, setConfig } from '../services/configuration'

const router = Router()

function handleError(err: unknown, res: Response) {
  const message = err instanceof Error ? err.message : 'Unknown error'
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message } })
}

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
    await setConfig(req.params.key, req.body.value, req.body.modifiedBy || 'Examiner')
    res.json({ success: true, data: { key: req.params.key, value: req.body.value } })
  } catch (err) { handleError(err, res) }
})

export default router
