import { Router, Response } from 'express'
import { Report } from '../models/Report'
import { generateReport } from '../services/reports'

const router = Router()

function handleError(err: unknown, res: Response) {
  const message = err instanceof Error ? err.message : 'Unknown error'
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message } })
}

// List report definitions
router.get('/', async (req, res) => {
  try {
    const reports = await Report.find().lean()
    res.json({ success: true, data: reports })
  } catch (err) { handleError(err, res) }
})

// Generate a report
router.post('/:id/generate', async (req, res) => {
  try {
    const report = await Report.findOne({ id: req.params.id })
    if (!report) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Report not found' } })

    report.status = 'Generating'
    await report.save()

    const generated = await generateReport(report.id)
    report.status = 'Available'
    report.generatedAt = new Date()
    report.content = generated.data
    await report.save()

    res.json({ success: true, data: generated })
  } catch (err) { handleError(err, res) }
})

// Get generated report content
router.get('/:id', async (req, res) => {
  try {
    const report = await Report.findOne({ id: req.params.id }).lean()
    if (!report) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Report not found' } })
    res.json({ success: true, data: report })
  } catch (err) { handleError(err, res) }
})

export default router