import { Router } from 'express'
import { Finding } from '../models/Finding'
import { EntityMetric } from '../models/EntityMetric'

const router = Router()

// Validation & model performance
router.get('/summary', async (req, res) => {
  try {
    const totalFindings = await Finding.countDocuments()
    const confirmed = await Finding.countDocuments({ status: 'Confirmed' })
    const dismissed = await Finding.countDocuments({ status: 'Dismissed' })
    const inReview = await Finding.countDocuments({ status: 'In Review' })
    const newF = await Finding.countDocuments({ status: 'New' })

    // Compute precision/recall against confirmed & dismissed as ground truth
    const expertTrue = confirmed + newF  // expert confirmed or still pending
    const toolTrue = confirmed + inReview
    const truePositives = confirmed
    const falsePositives = dismissed
    const missed = newF  // unreviewed = potentially missed
    const precision = toolTrue > 0 ? +((truePositives / toolTrue) * 100).toFixed(1) : 0
    const recall = expertTrue > 0 ? +((truePositives / expertTrue) * 100).toFixed(1) : 0
    const agreement = totalFindings > 0 ? +(((confirmed + dismissed) / totalFindings) * 100).toFixed(1) : 0

    res.json({
      summary: {
        totalFindings,
        confirmed,
        dismissed,
        inReview,
        newFindings: newF,
        truePositives,
        falsePositives,
        missedFindings: missed,
        precision,
        recall,
        reviewAgreement: agreement
      }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router