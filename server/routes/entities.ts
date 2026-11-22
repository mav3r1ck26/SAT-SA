import { Router, Response } from 'express'
import { Entity } from '../models/Entity'
import { EntityMetric } from '../models/EntityMetric'
import { Alert } from '../models/Alert'
import { Case } from '../models/Case'
import { ASSESSMENT_FRAMEWORK, buildEntityAssessment } from '../services/assessmentFramework'
import { ASSESSMENT_PERIODS, assessmentPeriodOrder, isAssessmentPeriod, normalizeAssessmentPeriod } from '../services/assessmentPeriods'
import { appendAuditEvent } from '../services/audit'
import { resolveAssessmentPeriod } from '../services/configuration'
import { safeErrorMessage } from '../services/errorHandling'

const router = Router()

function handleError(err: unknown, res: Response) {
  const status = typeof err === 'object' && err !== null && 'statusCode' in err ? Number(err.statusCode) : 500
  const message = safeErrorMessage(err, status)
  res.status(status).json({ success: false, error: { code: status === 400 ? 'INVALID_INPUT' : 'INTERNAL_ERROR', message } })
}

// List entities with risk metrics
router.get('/', async (req, res) => {
  try {
    const { sector, criticality, search } = req.query
    const period = await resolveAssessmentPeriod(req.query.period)
    const filter: any = {}
    if (req.user?.role === 'SOC Manager') filter.id = { $in: req.user.assignedEntityIds }
    if (typeof req.query.entityId === 'string') {
      filter.id = req.user?.role === 'SOC Manager'
        ? { $in: req.user.assignedEntityIds.filter(id => id === req.query.entityId) }
        : req.query.entityId
    }
    if (sector) filter.sector = sector
    if (criticality) filter.criticality = criticality
    if (search) {
      filter.$or = [
        { id: { $regex: String(search), $options: 'i' } },
        { name: { $regex: String(search), $options: 'i' } }
      ]
    }
    const entities = await Entity.find(filter).sort({ _id: 1 }).lean()
    const metrics = await EntityMetric.find({ period }).lean()
    const metricMap = new Map(metrics.map(m => [m.entityId, m]))

    const result = entities.map(e => {
      const m = metricMap.get(e.id)
      const assessment = buildEntityAssessment(m)
      return {
        id: e.id, name: e.name, sector: e.sector, region: e.region, criticality: e.criticality,
        riskScore: m?.riskScore ?? null, prevRiskScore: m?.prevRiskScore ?? null,
        executionGaps: m?.executionGapCount ?? null, negativeSpace: m?.negativeSpaceCount ?? null,
        peerDeviation: m?.peerDeviation ?? null, priority: m?.priority ?? null,
        status: e.assessmentStatus,
        threatDetection: m?.threatDetection ?? null,
        investigation: m?.investigation ?? null,
        escalation: m?.escalation ?? null,
        incidentResponse: m?.incidentResponse ?? null,
        securityOperations: m?.securityOperations ?? null,
        governanceOversight: m?.governanceOversight ?? null,
        operationalDiscipline: m?.operationalDiscipline ?? null,
        cyberResilience: m?.cyberResilience ?? null,
        dataCompleteness: e.dataCompleteness ?? null, telemetryCoverage: e.telemetryCoverage ?? null, lastSubmission: e.lastSubmission ?? null,
        assessmentPeriod: period,
        assessmentProvenance: m?.assessmentProvenance || 'legacy',
        maturityScore: assessment.maturityScore,
        assessmentFrameworkId: assessment.frameworkId,
        assessmentFrameworkVersion: assessment.frameworkVersion
      }
    })
    res.json({ success: true, data: result })
  } catch (err) { handleError(err, res) }
})

// Return the stored, period-by-period maturity assessment for an entity.
router.get('/:id/assessment-history', async (req, res) => {
  try {
    const entity = await Entity.findOne({ id: req.params.id }).lean()
    if (!entity) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Entity not found' } })

    const metricHistory = await EntityMetric.find({ entityId: entity.id, period: { $in: ASSESSMENT_PERIODS } }).lean()
    const history = metricHistory
      .map(metric => {
        const assessment = buildEntityAssessment(metric)
        return {
          period: metric.period,
          maturityScore: assessment.maturityScore,
          ratedDimensions: assessment.ratedDimensions,
          totalDimensions: assessment.totalDimensions,
          dimensions: assessment.dimensions.map(dimension => ({ key: dimension.key, label: dimension.label, score: dimension.score })),
          frameworkId: assessment.frameworkId,
          frameworkVersion: assessment.frameworkVersion,
          provenance: metric.assessmentProvenance || 'legacy',
          updatedAt: metric.updatedAt || metric.createdAt || null
        }
      })
      .sort((a, b) => assessmentPeriodOrder(a.period) - assessmentPeriodOrder(b.period))

    res.json({ success: true, data: { entityId: entity.id, periods: ASSESSMENT_PERIODS, history } })
  } catch (err) { handleError(err, res) }
})

// Record a quantitative assessment for an entity and reporting period.
router.put('/:id/assessment', async (req, res) => {
  try {
    const entity = await Entity.findOne({ id: req.params.id }).lean()
    if (!entity) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Entity not found' } })

    if (typeof req.body.period !== 'string') return res.status(400).json({ success: false, error: { code: 'INVALID_PERIOD', message: 'A supported assessment period is required.' } })
    const period = await resolveAssessmentPeriod(req.body.period)

    const submittedScores = req.body.dimensions
    const scoreKeys = ASSESSMENT_FRAMEWORK.dimensions.map(dimension => dimension.key)
    if (!submittedScores || typeof submittedScores !== 'object' || Array.isArray(submittedScores)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_ASSESSMENT', message: 'Provide a numeric score for each assessment dimension.' } })
    }
    const invalidKey = scoreKeys.find(key => !Number.isFinite(submittedScores[key]) || submittedScores[key] < 0 || submittedScores[key] > 100)
    if (invalidKey) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_SCORE', message: `Dimension ${invalidKey} must be a number from 0 to 100.` } })
    }

    const dimensionScores = Object.fromEntries(scoreKeys.map(key => [key, submittedScores[key]]))
    const assessment = buildEntityAssessment(dimensionScores)
    await EntityMetric.findOneAndUpdate(
      { entityId: entity.id, period },
      { $set: {
        ...dimensionScores,
        maturityScore: assessment.maturityScore,
        assessmentFrameworkId: ASSESSMENT_FRAMEWORK.id,
        assessmentFrameworkVersion: ASSESSMENT_FRAMEWORK.version,
        assessmentProvenance: 'submitted'
      } },
      { upsert: true, runValidators: true, setDefaultsOnInsert: true }
    )

    if (req.user) await appendAuditEvent({
      actor: req.user,
      action: 'Assessment recorded',
      actionCategory: 'Entity',
      entityId: entity.id,
      detail: `Assessment recorded for ${period}.`,
      sessionId: req.sessionId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    })
    res.json({ success: true, data: { period, provenance: 'submitted', assessment } })
  } catch (err) { handleError(err, res) }
})

// Get single entity
router.get('/:id', async (req, res) => {
  try {
    const period = await resolveAssessmentPeriod(req.query.period)
    const e = await Entity.findOne({ id: req.params.id }).lean()
    if (!e) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Entity not found' } })
    const m = await EntityMetric.findOne({ entityId: e.id, period }).lean()
    const assessment = buildEntityAssessment(m)

    const [alerts, cases] = await Promise.all([
      Alert.find({ entityId: e.id, period }).lean(),
      Case.find({ entityId: e.id, period }).lean()
    ])

    const totalAlerts = alerts.length
    const totalCases = cases.length
    const alertToCaseRatio = totalAlerts > 0 ? Number(((totalCases / totalAlerts) * 100).toFixed(1)) : null

    const durations = cases.map(c => c.durationMin).filter(d => d != null && !isNaN(d)) as number[]
    const meanTriageDuration = durations.length 
      ? Number((durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1))
      : null

    const depths = cases.map(c => c.evidenceAttachments).filter(d => d != null && !isNaN(d)) as number[]
    const avgArtifactsAttached = depths.length 
      ? Number((depths.reduce((a, b) => a + b, 0) / depths.length).toFixed(1))
      : null

    const templateCases = cases.filter(c => c.isTemplateReuse === 1).length
    const templateReusePct = totalCases > 0 ? Number(((templateCases / totalCases) * 100).toFixed(1)) : null

    const critAlerts = alerts.filter(a => a.severity === 'Critical')
    const critUnescalated = critAlerts.filter(a => !a.escalationPath).length
    const statutoryCompliance = critAlerts.length > 0 
      ? Number((((critAlerts.length - critUnescalated) / critAlerts.length) * 100).toFixed(1))
      : null

    const operationalMetrics = {
      alertToCaseRatio,
      meanTriageDuration,
      avgArtifactsAttached,
      templateReuseIndex: templateReusePct,
      statutoryCompliance,
      criticalUnescalated: critAlerts.length ? critUnescalated : null
    }

    res.json({
      success: true,
      data: {
        ...e,
        metrics: m,
        assessment,
        assessmentPeriod: period,
        assessmentProvenance: m?.assessmentProvenance || 'legacy',
        maturityScore: assessment.maturityScore,
        assessmentFrameworkId: assessment.frameworkId,
        assessmentFrameworkVersion: assessment.frameworkVersion,
        operationalMetrics,
        riskScore: m?.riskScore ?? null,
        prevRiskScore: m?.prevRiskScore ?? null,
        executionGaps: m?.executionGapCount ?? null,
        negativeSpace: m?.negativeSpaceCount ?? null,
        peerDeviation: m?.peerDeviation ?? null,
        priority: m?.priority ?? null,
        status: e.assessmentStatus,
        detection: m?.threatDetection ?? null,
        threatDetection: m?.threatDetection ?? null,
        investigation: m?.investigation ?? null,
        escalation: m?.escalation ?? null,
        incidentResponse: m?.incidentResponse ?? null,
        operations: m?.securityOperations ?? null,
        securityOperations: m?.securityOperations ?? null,
        operationalDiscipline: m?.operationalDiscipline ?? null,
        governance: m?.governanceOversight ?? null,
        governanceOversight: m?.governanceOversight ?? null,
        resilience: m?.cyberResilience ?? null,
        cyberResilience: m?.cyberResilience ?? null
      }
    })
  } catch (err) { handleError(err, res) }
})

// Create a new entity (with metrics)
router.post('/', async (req, res) => {
  try {
    const { id, name, sector, region, criticality, metrics } = req.body
    if (typeof id !== 'string' || !id.trim() ||
      typeof name !== 'string' || !name.trim() ||
      typeof sector !== 'string' || !sector.trim() ||
      typeof region !== 'string' || !region.trim() ||
      !['Critical', 'High', 'Medium', 'Low'].includes(criticality)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_ENTITY', message: 'Provide an entity ID, name, sector, region, and supported criticality.' } })
    }
    const period = normalizeAssessmentPeriod(req.body.period)
    if (!isAssessmentPeriod(period) || typeof req.body.period !== 'string') return res.status(400).json({ success: false, error: { code: 'INVALID_PERIOD', message: 'A supported assessment period is required.' } })
    for (const key of ['dataCompleteness', 'telemetryCoverage']) {
      const value = req.body[key]
      if (value !== undefined && (!Number.isFinite(value) || value < 0 || value > 100)) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_ENTITY_DATA', message: `${key} must be a number from 0 to 100.` } })
      }
    }
    if (metrics !== undefined) {
      if (!metrics || typeof metrics !== 'object' || Array.isArray(metrics)) return res.status(400).json({ success: false, error: { code: 'INVALID_ASSESSMENT', message: 'Metrics must be an object.' } })
      const scoreKeys = ASSESSMENT_FRAMEWORK.dimensions.map(dimension => dimension.key)
      const invalidKey = scoreKeys.find(key => !Number.isFinite(metrics[key]) || metrics[key] < 0 || metrics[key] > 100)
      if (invalidKey) return res.status(400).json({ success: false, error: { code: 'INVALID_ASSESSMENT', message: `Dimension ${invalidKey} must be a number from 0 to 100.` } })
    }
    const normalizedId = id.trim()
    if (await Entity.exists({ id: normalizedId })) {
      return res.status(409).json({ success: false, error: { code: 'ENTITY_EXISTS', message: `Entity ${normalizedId} is already registered.` } })
    }
    const entity = await Entity.create({
      id: normalizedId,
      name: name.trim(),
      sector: sector.trim(),
      region: region.trim(),
      criticality,
      dataCompleteness: req.body.dataCompleteness,
      telemetryCoverage: req.body.telemetryCoverage,
      assessmentPeriod: period,
      dataProvenance: 'submitted'
    })
    if (metrics !== undefined) {
      await EntityMetric.create({ ...Object.fromEntries(ASSESSMENT_FRAMEWORK.dimensions.map(dimension => [dimension.key, metrics[dimension.key]])), entityId: id, period, assessmentProvenance: 'submitted' })
    }
    if (req.user) await appendAuditEvent({
      actor: req.user,
      action: 'Entity created',
      actionCategory: 'Entity',
      entityId: entity.id,
      sessionId: req.sessionId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    })
    res.status(201).json({ success: true, data: { id } })
  } catch (err) { handleError(err, res) }
})

export default router
