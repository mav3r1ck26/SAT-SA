import { Router } from 'express'
import { Report } from '../models/Report'
import { generateReport } from '../services/reports'

const router = Router()

// List report definitions
router.get('/', async (req, res) => {
  try {
    const reports = await Report.find().lean()
    res.json(reports)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Generate a report
router.post('/:id/generate', async (req, res) => {
  try {
    const report = await Report.findOne({ id: req.params.id })
    if (!report) return res.status(404).json({ error: 'Report not found' })

    report.status = 'Generating'
    await report.save()

    const generated = await generateReport(report.id)
    report.status = 'Available'
    report.generatedAt = new Date()
    report.content = generated.data
    await report.save()

    res.json(generated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get generated report content
router.get('/:id', async (req, res) => {
  try {
    const report = await Report.findOne({ id: req.params.id }).lean()
    if (!report) return res.status(404).json({ error: 'Report not found' })
    res.json(report)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router