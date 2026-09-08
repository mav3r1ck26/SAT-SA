import { Router, Response } from 'express'
import { Finding } from '../models/Finding'
import { EntityMetric } from '../models/EntityMetric'

const router = Router()

function handleError(err: unknown, res: Response) {
  const message = err instanceof Error ? err.message : 'Unknown error'
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message } })
}

// Validation & model performance
router.get('/summary', async (req, res) => {
  try {
    const totalFindings = await Finding.countDocuments()
    const confirmed = await Finding.countDocuments({ status: 'Confirmed' })
    const rejected = await Finding.countDocuments({ status: 'Rejected' })
    const inReview = await Finding.countDocuments({ status: 'In Review' })
    const newF = await Finding.countDocuments({ status: 'New' })

    // Compute precision/recall against confirmed & rejected as ground truth
    const expertTrue = confirmed + newF  // expert confirmed or still pending
    const toolTrue = confirmed + inReview
    const truePositives = confirmed
    const falsePositives = rejected
    const missed = newF  // unreviewed = potentially missed
    const precision = toolTrue > 0 ? +((truePositives / toolTrue) * 100).toFixed(1) : 0
    const recall = expertTrue > 0 ? +((truePositives / expertTrue) * 100).toFixed(1) : 0
    const agreement = totalFindings > 0 ? +(((confirmed + rejected) / totalFindings) * 100).toFixed(1) : 0

    res.json({
      success: true,
      data: {
        summary: {
          totalFindings,
          confirmed,
          rejected,
          inReview,
          newFindings: newF,
          truePositives,
          falsePositives,
          missedFindings: missed,
          precision,
          recall,
          reviewAgreement: agreement
        }
      }
    })
  } catch (err) { handleError(err, res) }
})

export default router