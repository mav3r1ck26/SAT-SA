import { Router, Response } from 'express'
import { Notification } from '../models/Notification'

const router = Router()

function handleError(err: unknown, res: Response) {
  const message = err instanceof Error ? err.message : 'Unknown error'
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message } })
}

// List notifications
router.get('/', async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ time: -1 }).limit(50).lean()
    const unread = await Notification.countDocuments({ read: false })
    res.json({ success: true, data: { notifications, unread } })
  } catch (err) { handleError(err, res) }
})

// Mark all as read
router.post('/read-all', async (req, res) => {
  try {
    await Notification.updateMany({ read: false }, { $set: { read: true } })
    res.json({ success: true, message: 'All notifications marked as read' })
  } catch (err) { handleError(err, res) }
})

// Mark single as read
router.post('/:id/read', async (req, res) => {
  try {
    await Notification.updateOne({ _id: req.params.id }, { $set: { read: true } })
    res.json({ success: true, message: 'Notification marked as read' })
  } catch (err) { handleError(err, res) }
})

export default router