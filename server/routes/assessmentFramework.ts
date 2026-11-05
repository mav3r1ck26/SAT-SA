import { Router } from 'express'
import { ASSESSMENT_FRAMEWORK } from '../services/assessmentFramework'

const router = Router()

router.get('/', (_req, res) => {
  res.json({ success: true, data: ASSESSMENT_FRAMEWORK })
})

export default router
