import http from 'http'
import https from 'https'

const ML_API_URL = process.env.ML_API_URL || 'http://127.0.0.1:8000'
const INFERENCE_BATCH_SIZE = 100
const INFERENCE_TIMEOUT_MS = 180_000

const SOC_FEATURES = [
  'total_alerts_per_period', 'alerts_per_analyst_per_shift', 'cases_per_analyst_per_shift', 'alert_to_case_ratio',
  'mean_acknowledgment_time_min', 'mean_investigation_time_min', 'mean_closure_time_min',
  'pct_cases_closed_under_1hr', 'pct_cases_closed_under_4hr', 'pct_cases_closed_under_24hr',
  'false_positive_rate_current', 'true_positive_rate_current', 'escalation_rate', 'reopened_case_rate',
  'evidence_per_case_avg', 'cases_with_zero_evidence_pct', 'cases_with_insufficient_iocs_pct', 'classification_changes_per_case',
  'analyst_count', 'workload_balance_index', 'template_reuse_rate', 'superficial_investigation_rate', 'unusually_fast_closure_rate',
  'critical_escalation_rate', 'escalation_delay_avg_min', 'playbook_execution_rate', 'playbook_coverage_ratio', 'playbook_adherence_rate',
  'signature_age_avg_days', 'signature_age_max_days', 'rules_updated_last_30d', 'rules_updated_last_90d', 'detection_coverage_ratio',
  'threat_intel_feeds_active', 'ioc_enrichment_rate', 'context_enrichment_rate',
  'telemetry_coverage_pct', 'log_source_count', 'critical_asset_coverage_pct',
  'senior_analyst_ratio', 'certifications_per_analyst', 'training_hours_per_analyst_qtr',
  'prev_period_fpr', 'prev_period_efficiency', 'trend_fpr_3m', 'trend_efficiency_3m'
]

const FEATURE_SET = new Set(SOC_FEATURES)

type InferenceEntity = {
  entity_id: string
  period: string
  features: Record<string, number>
  featureCoveragePct: number
}

type InferenceStatus = 'completed' | 'failed' | 'skipped'

export function isSocFeatureVector(record: any): boolean {
  if (!(record?.entity_id || record?.entityId) || !record?.period) return false
  let featureCount = 0
  for (const key of Object.keys(record)) {
    if (FEATURE_SET.has(key) && numericValue(record[key]) !== undefined) featureCount++
  }
  return featureCount >= 3
}

export function isSocCoverageRecord(record: any): boolean {
  return Boolean((record?.entityId || record?.entity_id) && (record?.blindSpotSeverity || record?.expectedTelemetry) &&
    numericValue(record?.coveragePct ?? record?.telemetryCoveragePct ?? record?.observedCoverage) !== undefined)
}

export async function runIngestionInference(records: any[]) {
  const base = {
    inputRecords: records.length,
    evaluatedEntities: 0,
    completedAt: new Date()
  }

  if (!records.length) {
    return { ...base, status: 'skipped' as InferenceStatus, source: 'none', results: [], error: 'No valid records were available for inference.' }
  }

  const { entities, source } = buildInferenceEntities(records)
  if (!entities.length) {
    return { ...base, status: 'skipped' as InferenceStatus, source, results: [], error: 'No entity feature vectors could be derived from this dataset.' }
  }

  try {
    const results: any[] = []
    for (let offset = 0; offset < entities.length; offset += INFERENCE_BATCH_SIZE) {
      const chunk = entities.slice(offset, offset + INFERENCE_BATCH_SIZE)
      const predictions = await postEvaluation(chunk.map(({ entity_id, period, features }) => ({ entity_id, period, features })))
      if (predictions.length !== chunk.length) {
        throw new Error(`ML service returned ${predictions.length} predictions for ${chunk.length} entity-period vectors.`)
      }
      results.push(...predictions.map((prediction, index) => ({
        ...prediction,
        feature_source: source,
        feature_coverage_pct: chunk[index].featureCoveragePct
      })))
    }

    return {
      ...base,
      status: 'completed' as InferenceStatus,
      source,
      evaluatedEntities: results.length,
      completedAt: new Date(),
      results: results.slice(0, 25),
      resultsTruncated: results.length > 25
    }
  } catch (error) {
    return {
      ...base,
      status: 'failed' as InferenceStatus,
      source,
      completedAt: new Date(),
      results: [],
      error: error instanceof Error ? error.message : 'ML inference failed.'
    }
  }
}

function buildInferenceEntities(records: any[]): { entities: InferenceEntity[]; source: string } {
  const vectors = records.filter(isSocFeatureVector)
  const telemetry = records.filter(record => !isSocFeatureVector(record))
  const entities: InferenceEntity[] = vectors.map(record => makeVector(record))

  const groups = new Map<string, any[]>()
  for (const record of telemetry) {
    const entityId = String(record.entityId || record.entity_id || record.entity || 'CSE-000')
    const period = String(record.period || 'Current Ingestion')
    const key = `${entityId}\u0000${period}`
    const group = groups.get(key) || []
    group.push(record)
    groups.set(key, group)
  }
  for (const group of groups.values()) entities.push(makeDerivedVector(group))

  const source = vectors.length && telemetry.length
    ? 'mixed_soc_metrics_and_telemetry'
    : vectors.length
      ? 'provided_soc_metrics'
      : 'derived_from_ingested_telemetry'
  return { entities, source }
}

function makeVector(record: any): InferenceEntity {
  const features: Record<string, number> = {}
  let observed = 0
  for (const feature of SOC_FEATURES) {
    const value = numericValue(record[feature])
    if (value !== undefined) observed++
    features[feature] = value ?? 0
  }
  return {
    entity_id: String(record.entity_id || record.entityId),
    period: String(record.period),
    features,
    featureCoveragePct: Math.round((observed / SOC_FEATURES.length) * 100)
  }
}

function makeDerivedVector(records: any[]): InferenceEntity {
  const entityId = String(records[0].entityId || records[0].entity_id || records[0].entity || 'CSE-000')
  const period = String(records[0].period || 'Current Ingestion')
  const cases = records.filter(isCaseRecord)
  const alerts = records.filter(record => !isCaseRecord(record))
  const analystIds = new Set(cases.map(record => record.investigator || record.analyst || record.analystId).filter(Boolean).map(String))
  const analystCount = analystIds.size || 5
  const shiftsInQuarter = 90 * 3
  const durations = cases.map(record => firstNumber(record, ['durationMin', 'duration_min']) ?? minutesBetween(record.openedAt || record.createdAt, record.closedAt))
    .filter((value): value is number => value !== undefined)
  const acknowledgements = records.map(record => firstNumber(record, ['acknowledgmentTimeMin', 'acknowledgementTimeMin', 'mean_acknowledgment_time_min']) ?? minutesBetween(record.createdAt || record.created_at, record.acknowledgedAt || record.acknowledgmentAt))
    .filter((value): value is number => value !== undefined)
  const investigationTimes = cases.map(record => firstNumber(record, ['investigationTimeMin', 'investigation_time_min']) ?? minutesBetween(record.investigationStartedAt, record.investigationEndedAt))
    .filter((value): value is number => value !== undefined)
  const closureTimes = records.map(record => firstNumber(record, ['closureTimeMin', 'closure_time_min']) ?? minutesBetween(record.createdAt || record.created_at, record.closedAt))
    .filter((value): value is number => value !== undefined)
  const evidenceCounts = cases.map(record => firstNumber(record, ['evidenceAttachments', 'evidenceCount', 'evidence_count']))
    .filter((value): value is number => value !== undefined)
  const caseEvidence = cases.map(record => firstNumber(record, ['evidenceAttachments', 'evidenceCount', 'evidence_count']))
  const workload = new Map<string, number>()
  for (const record of cases) {
    const analyst = record.investigator || record.analyst || record.analystId
    if (analyst) workload.set(String(analyst), (workload.get(String(analyst)) || 0) + 1)
  }
  const workloadValues = [...workload.values()]
  const workloadMean = average(workloadValues) ?? 0
  const workloadBalance = workloadValues.length > 1 && workloadMean > 0
    ? Math.sqrt(average(workloadValues.map(value => (value - workloadMean) ** 2)) || 0) / workloadMean
    : 0
  const falsePositives = alerts.filter(record => /false.?positive/i.test(String(record.disposition || record.closureReason || record.outcome || ''))).length
  const truePositives = alerts.filter(record => /true.?positive/i.test(String(record.disposition || record.outcome || ''))).length
  const escalated = alerts.filter(record => truthy(record.escalated ?? record.escalationRecorded) || /escalat/i.test(String(record.status || '')))
  const reopened = cases.filter(record => (firstNumber(record, ['reopenedCount', 'reopened_count']) || 0) > 0 || /reopen/i.test(String(record.status || '')))
  const highSeverityCases = cases.filter(record => /critical|high/i.test(String(record.severity || '')))
  const insufficientEvidenceCases = highSeverityCases.filter(record => {
    const evidence = firstNumber(record, ['evidenceAttachments', 'evidenceCount', 'evidence_count'])
    return evidence !== undefined && evidence < 2
  })
  const behaviour = cases.map(record => String(record.behaviour || record.behavior || '').toLowerCase())
  const featureValues: Record<string, number> = {
    total_alerts_per_period: alerts.length,
    alerts_per_analyst_per_shift: alerts.length / Math.max(1, analystCount * shiftsInQuarter),
    cases_per_analyst_per_shift: cases.length / Math.max(1, analystCount * shiftsInQuarter),
    alert_to_case_ratio: alerts.length ? cases.length / alerts.length : 0,
    mean_acknowledgment_time_min: average(acknowledgements) ?? 0,
    mean_investigation_time_min: average(investigationTimes) ?? 0,
    mean_closure_time_min: average(closureTimes) ?? 0,
    pct_cases_closed_under_1hr: durations.length ? durations.filter(value => value <= 60).length / durations.length : 0,
    pct_cases_closed_under_4hr: durations.length ? durations.filter(value => value <= 240).length / durations.length : 0,
    pct_cases_closed_under_24hr: durations.length ? durations.filter(value => value <= 1440).length / durations.length : 0,
    false_positive_rate_current: alerts.length ? falsePositives / alerts.length : 0,
    true_positive_rate_current: alerts.length ? truePositives / alerts.length : 0,
    escalation_rate: alerts.length ? escalated.length / alerts.length : 0,
    reopened_case_rate: cases.length ? reopened.length / cases.length : 0,
    evidence_per_case_avg: average(evidenceCounts) ?? 0,
    cases_with_zero_evidence_pct: cases.length ? caseEvidence.filter(value => value === 0).length / cases.length : 1,
    cases_with_insufficient_iocs_pct: highSeverityCases.length ? insufficientEvidenceCases.length / highSeverityCases.length : 0,
    classification_changes_per_case: average(cases.map(record => firstNumber(record, ['classificationChanges', 'classification_changes', 'isTemplateReuse']) ?? 0)) ?? 0,
    analyst_count: analystCount,
    workload_balance_index: workloadBalance,
    template_reuse_rate: cases.length ? cases.filter(record => truthy(record.isTemplateReuse ?? record.is_template_reuse)).length / cases.length : 0,
    superficial_investigation_rate: cases.length ? behaviour.filter(value => value === 'superficial').length / cases.length : 0,
    unusually_fast_closure_rate: cases.length ? behaviour.filter(value => value === 'unusually fast').length / cases.length : 0,
    critical_escalation_rate: (() => {
      const critical = alerts.filter(record => /critical/i.test(String(record.severity || '')))
      return critical.length ? critical.filter(record => truthy(record.escalated ?? record.escalationRecorded)).length / critical.length : 0
    })(),
    escalation_delay_avg_min: average(alerts.map(record => firstNumber(record, ['escalationDelayMin', 'escalation_delay_min'])).filter((value): value is number => value !== undefined)) ?? 0,
    playbook_execution_rate: 0,
    playbook_coverage_ratio: 0,
    playbook_adherence_rate: 0.5,
    signature_age_avg_days: 365,
    signature_age_max_days: 730,
    rules_updated_last_30d: 0,
    rules_updated_last_90d: 0,
    detection_coverage_ratio: average(records.map(record => firstNumber(record, ['detectionCoverageRatio', 'coverageRatio'])).filter((value): value is number => value !== undefined))
      ?? (average(records.map(record => firstNumber(record, ['coveragePct', 'telemetryCoveragePct', 'observedCoverage'])).filter((value): value is number => value !== undefined)) ?? 30) / 100,
    threat_intel_feeds_active: 5,
    ioc_enrichment_rate: 0.6,
    context_enrichment_rate: 0.5,
    telemetry_coverage_pct: average(records.map(record => firstNumber(record, ['telemetryCoveragePct', 'telemetryCoverage', 'coveragePct', 'observedCoverage'])).filter((value): value is number => value !== undefined)) ?? 70,
    log_source_count: records.length || 10,
    critical_asset_coverage_pct: average(records
      .filter(record => /critical/i.test(String(record.assetCriticality || record.criticality || record.blindSpotSeverity || '')))
      .map(record => firstNumber(record, ['criticalAssetCoveragePct', 'coveragePct', 'observedCoverage']))
      .filter((value): value is number => value !== undefined)) ?? 50,
    senior_analyst_ratio: 0.3,
    certifications_per_analyst: 1.5,
    training_hours_per_analyst_qtr: 8,
    prev_period_fpr: 0.15,
    prev_period_efficiency: 0.7,
    trend_fpr_3m: 0,
    trend_efficiency_3m: 0
  }

  let observedFeatures = 0
  for (const feature of SOC_FEATURES) {
    const directValues = records.map(record => directFeature(record, feature)).filter((value): value is number => value !== undefined)
    if (directValues.length) {
      featureValues[feature] = average(directValues) ?? featureValues[feature] ?? 0
      observedFeatures++
    } else if (featureIsDerived(feature, alerts, cases, records)) {
      observedFeatures++
    }
  }

  return {
    entity_id: entityId,
    period,
    features: featureValues,
    featureCoveragePct: Math.round((observedFeatures / SOC_FEATURES.length) * 100)
  }
}

function featureIsDerived(feature: string, alerts: any[], cases: any[], records: any[]): boolean {
  if (['total_alerts_per_period', 'alerts_per_analyst_per_shift', 'cases_per_analyst_per_shift', 'alert_to_case_ratio', 'analyst_count', 'workload_balance_index'].includes(feature)) return true
  if (feature.startsWith('mean_acknowledgment') || feature.startsWith('mean_closure')) return records.some(record => record.acknowledgedAt || record.acknowledgmentTimeMin || record.closedAt || record.closureTimeMin)
  if (feature.startsWith('mean_investigation') || feature.startsWith('pct_cases_closed')) return cases.some(record => record.durationMin !== undefined || record.investigationTimeMin !== undefined || record.closedAt)
  if (feature.includes('evidence') || feature.includes('ioc')) return cases.some(record => record.evidenceCount !== undefined || record.evidenceAttachments !== undefined)
  if (feature.includes('escalation')) return alerts.some(record => record.escalated !== undefined || record.escalationRecorded !== undefined || record.escalationDelayMin !== undefined)
  if (feature.includes('false_positive') || feature.includes('true_positive')) return alerts.some(record => record.disposition || record.closureReason || record.outcome)
  if (feature.includes('template') || feature.includes('superficial') || feature.includes('fast_closure') || feature.includes('classification')) return cases.some(record => record.behaviour || record.behavior || record.isTemplateReuse !== undefined)
  if (feature.includes('telemetry') || feature.includes('coverage')) return records.some(record => record.telemetryCoverage !== undefined || record.coveragePct !== undefined || directFeature(record, feature) !== undefined)
  return records.some(record => directFeature(record, feature) !== undefined)
}

function isCaseRecord(record: any): boolean {
  const id = String(record.caseId || record.id || '')
  return Boolean(record.caseId || record.openedAt || record.investigationDepth !== undefined || id.startsWith('CASE-'))
}

function directFeature(record: any, feature: string): number | undefined {
  const camel = feature.replace(/_([a-z])/g, (_match, char: string) => char.toUpperCase())
  return firstNumber(record, [feature, camel])
}

function firstNumber(record: any, keys: string[]): number | undefined {
  for (const key of keys) {
    if (record && Object.prototype.hasOwnProperty.call(record, key)) {
      const value = numericValue(record[key])
      if (value !== undefined) return value
    }
  }
  return undefined
}

function numericValue(value: any): number | undefined {
  if (typeof value === 'boolean') return value ? 1 : 0
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  if (typeof value !== 'string' || !value.trim()) return undefined
  const parsed = Number(value.trim().replace(/,/g, '').replace(/%$/, ''))
  return Number.isFinite(parsed) ? parsed : undefined
}

function truthy(value: any): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  return /^(true|yes|1|y)$/i.test(String(value || '').trim())
}

function minutesBetween(startValue: any, endValue: any): number | undefined {
  if (!startValue || !endValue) return undefined
  const start = new Date(startValue).getTime()
  const end = new Date(endValue).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end)) return undefined
  return Math.max(0, (end - start) / 60_000)
}

function average(values: number[]): number | undefined {
  const valid = values.filter(value => Number.isFinite(value))
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : undefined
}

function postEvaluation(entities: Array<{ entity_id: string; period: string; features: Record<string, number> }>): Promise<any[]> {
  return new Promise((resolve, reject) => {
    let url: URL
    try {
      url = new URL('/evaluate', ML_API_URL)
    } catch {
      reject(new Error('ML_API_URL is not a valid URL.'))
      return
    }
    const transport = url.protocol === 'https:' ? https : url.protocol === 'http:' ? http : null
    if (!transport) {
      reject(new Error(`Unsupported ML service protocol: ${url.protocol}`))
      return
    }

    const payload = JSON.stringify({ entities })
    const request = transport.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, response => {
      const chunks: Buffer[] = []
      response.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
      response.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8')
        if ((response.statusCode || 500) < 200 || (response.statusCode || 500) >= 300) {
          reject(new Error(`ML service returned HTTP ${response.statusCode}: ${body.slice(0, 500)}`))
          return
        }
        try {
          const parsed = JSON.parse(body)
          if (!Array.isArray(parsed)) throw new Error('ML service response was not a prediction list.')
          resolve(parsed)
        } catch (error) {
          reject(error instanceof Error ? error : new Error('Could not parse ML service response.'))
        }
      })
    })
    request.setTimeout(INFERENCE_TIMEOUT_MS, () => request.destroy(new Error('ML inference request timed out.')))
    request.on('error', reject)
    request.write(payload)
    request.end()
  })
}
