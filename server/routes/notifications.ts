import { Router } from 'express'
import { Notification } from '../models/Notification'

const router = Router()

// List notifications
router.get('/', async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ time: -1 }).limit(50).lean()
    const unread = await Notification.countDocuments({ read: false })
    res.json({ notifications, unread })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Mark all as read
router.post('/read-all', async (req, res) => {
  try {
    await Notification.updateMany({ read: false }, { $set: { read: true } })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Mark single as read
router.post('/:id/read', async (req, res) => {
  try {
    await Notification.updateOne({ _id: req.params.id }, { $set: { read: true } })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router