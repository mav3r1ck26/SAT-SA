import { Configuration } from '../models/Configuration'
import { getFrameworkDimensionWeights } from './assessmentFramework'

const DEFAULT_CONFIGS = [
  // Execution Gap Thresholds
  {
    key: 'rapidClosurePercentile',
    category: 'thresholds',
    value: 10,
    defaultValue: 10,
    description: 'Percentile threshold for rapid closure detection (cases below this percentile flagged)',
    dataType: 'number',
    minValue: 1,
    maxValue: 50
  },
  {
    key: 'criticalNoEscalationThreshold',
    category: 'thresholds',
    value: 0.15,
    defaultValue: 0.15,
    description: 'Minimum ratio of critical alerts without escalation to trigger finding',
    dataType: 'number',
    minValue: 0.01,
    maxValue: 1
  },
  {
    key: 'templateReuseThreshold',
    category: 'thresholds',
    value: 0.10,
    defaultValue: 0.10,
    description: 'Minimum ratio of template reuse cases to trigger finding',
    dataType: 'number',
    minValue: 0.01,
    maxValue: 1
  },
  {
    key: 'zeroDepthThreshold',
    category: 'thresholds',
    value: 0.30,
    defaultValue: 0.30,
    description: 'Minimum ratio of zero-depth investigations to trigger finding',
    dataType: 'number',
    minValue: 0.01,
    maxValue: 1
  },
  {
    key: 'telemetryCoverageWarning',
    category: 'thresholds',
    value: 0.60,
    defaultValue: 0.60,
    description: 'Telemetry coverage below this triggers negative space indicator',
    dataType: 'number',
    minValue: 0.1,
    maxValue: 1
  },
  {
    key: 'rapidClosureMinCases',
    category: 'thresholds',
    value: 5,
    defaultValue: 5,
    description: 'Minimum cases required before rapid closure analysis runs',
    dataType: 'number',
    minValue: 1,
    maxValue: 100
  },

  // Negative Space Thresholds
  {
    key: 'negativeSpaceCriticalThreshold',
    category: 'thresholds',
    value: 40,
    defaultValue: 40,
    description: 'Observed coverage below this is critical negative space',
    dataType: 'number',
    minValue: 10,
    maxValue: 90
  },
  {
    key: 'negativeSpaceWarningThreshold',
    category: 'thresholds',
    value: 60,
    defaultValue: 60,
    description: 'Observed coverage below this is warning negative space',
    dataType: 'number',
    minValue: 20,
    maxValue: 95
  },
  {
    key: 'negativeSpaceHistoricalDeviation',
    category: 'thresholds',
    value: 0.25,
    defaultValue: 0.25,
    description: 'Deviation from historical baseline to flag negative space (25%)',
    dataType: 'number',
    minValue: 0.05,
    maxValue: 1
  },
  {
    key: 'negativeSpacePeerDeviation',
    category: 'thresholds',
    value: 0.30,
    defaultValue: 0.30,
    description: 'Deviation from peer median to flag negative space (30%)',
    dataType: 'number',
    minValue: 0.05,
    maxValue: 1
  },

  // Peer Benchmarking
  {
    key: 'peerDeviationSignificant',
    category: 'peer',
    value: 0.20,
    defaultValue: 0.20,
    description: 'Percentile deviation considered significant (20%)',
    dataType: 'number',
    minValue: 0.05,
    maxValue: 0.5
  },
  {
    key: 'peerMinSampleSize',
    category: 'peer',
    value: 3,
    defaultValue: 3,
    description: 'Minimum peer entities required for benchmarking',
    dataType: 'number',
    minValue: 2,
    maxValue: 20
  },
  {
    key: 'peerPercentileBands',
    category: 'peer',
    value: [0, 20, 40, 60, 80, 100],
    defaultValue: [0, 20, 40, 60, 80, 100],
    description: 'Percentile bands for peer classification',
    dataType: 'array'
  },

  // Risk Scoring Weights
  {
    key: 'riskWeights',
    category: 'weights',
    value: {
      executionGaps: 0.25,
      negativeSpace: 0.20,
      peerDeviation: 0.15,
      mlRiskProbability: 0.15,
      anomalyIndicators: 0.15,
      dataQuality: -0.10
    },
    defaultValue: {
      executionGaps: 0.25,
      negativeSpace: 0.20,
      peerDeviation: 0.15,
      mlRiskProbability: 0.15,
      anomalyIndicators: 0.15,
      dataQuality: -0.10
    },
    description: 'Weights for supervisory attention score components',
    dataType: 'object'
  },

  // Dimension weights for EntityMetric
  {
    key: 'dimensionWeights',
    category: 'weights',
    value: getFrameworkDimensionWeights(),
    defaultValue: getFrameworkDimensionWeights(),
    description: 'Locked weights defined by SAT-SA-SOC assessment framework version 1.0.0',
    dataType: 'object',
    isEditable: false
  },

  // ML Configuration
  {
    key: 'mlEnabled',
    category: 'ml',
    value: true,
    defaultValue: true,
    description: 'Enable ML models in analytics pipeline',
    dataType: 'boolean'
  },
  {
    key: 'mlRiskThreshold',
    category: 'ml',
    value: 0.70,
    defaultValue: 0.70,
    description: 'ML risk probability threshold for high-risk classification',
    dataType: 'number',
    minValue: 0.5,
    maxValue: 0.95
  },
  {
    key: 'mlConfidenceThreshold',
    category: 'ml',
    value: 0.60,
    defaultValue: 0.60,
    description: 'Minimum ML confidence for findings',
    dataType: 'number',
    minValue: 0.3,
    maxValue: 0.9
  },
  {
    key: 'mlModelPath',
    category: 'ml',
    value: '/ml_models',
    defaultValue: '/ml_models',
    description: 'Path to local model artifacts',
    dataType: 'string'
  },
  {
    key: 'rfNEstimators',
    category: 'ml',
    value: 100,
    defaultValue: 100,
    description: 'Number of trees in Random Forest',
    dataType: 'number',
    minValue: 50,
    maxValue: 500
  },
  {
    key: 'rfMaxDepth',
    category: 'ml',
    value: 8,
    defaultValue: 8,
    description: 'Maximum depth of Random Forest trees',
    dataType: 'number',
    minValue: 3,
    maxValue: 20
  },
  {
    key: 'kmeansNClusters',
    category: 'ml',
    value: 5,
    defaultValue: 5,
    description: 'Number of clusters for K-Means',
    dataType: 'number',
    minValue: 2,
    maxValue: 10
  },

  // Confidence Framework
  {
    key: 'confidenceFactors',
    category: 'scoring',
    value: {
      dataCompleteness: 0.20,
      evidenceCount: 0.20,
      signalConsistency: 0.20,
      modelConfidence: 0.15,
      peerSampleSize: 0.10,
      historicalConsistency: 0.10,
      ruleReliability: 0.05
    },
    defaultValue: {
      dataCompleteness: 0.20,
      evidenceCount: 0.20,
      signalConsistency: 0.20,
      modelConfidence: 0.15,
      peerSampleSize: 0.10,
      historicalConsistency: 0.10,
      ruleReliability: 0.05
    },
    description: 'Weights for confidence calculation',
    dataType: 'object'
  },

  // Review Prioritisation
  {
    key: 'reviewPriorityWeights',
    category: 'scoring',
    value: {
      severity: 0.25,
      confidence: 0.20,
      riskContribution: 0.20,
      evidenceStrength: 0.15,
      novelty: 0.10,
      peerDeviation: 0.05,
      supervisoryImpact: 0.05
    },
    defaultValue: {
      severity: 0.25,
      confidence: 0.20,
      riskContribution: 0.20,
      evidenceStrength: 0.15,
      novelty: 0.10,
      peerDeviation: 0.05,
      supervisoryImpact: 0.05
    },
    description: 'Weights for review priority calculation',
    dataType: 'object'
  },

  // Anomaly Detection
  {
    key: 'anomalyIQRMultiplier',
    category: 'thresholds',
    value: 1.5,
    defaultValue: 1.5,
    description: 'IQR multiplier for statistical anomaly detection',
    dataType: 'number',
    minValue: 1.0,
    maxValue: 3.0
  },
  {
    key: 'anomalyZScoreThreshold',
    category: 'thresholds',
    value: 3.0,
    defaultValue: 3.0,
    description: 'Z-score threshold for anomaly detection',
    dataType: 'number',
    minValue: 2.0,
    maxValue: 5.0
  },
  {
    key: 'anomalyPercentileLow',
    category: 'thresholds',
    value: 5,
    defaultValue: 5,
    description: 'Lower percentile for anomaly detection',
    dataType: 'number',
    minValue: 1,
    maxValue: 10
  },
  {
    key: 'anomalyPercentileHigh',
    category: 'thresholds',
    value: 95,
    defaultValue: 95,
    description: 'Upper percentile for anomaly detection',
    dataType: 'number',
    minValue: 90,
    maxValue: 99
  },

  // Data Quality
  {
    key: 'dataQualityCriticalThreshold',
    category: 'data_quality',
    value: 0.70,
    defaultValue: 0.70,
    description: 'Data quality score below this is critical',
    dataType: 'number',
    minValue: 0.3,
    maxValue: 0.9
  },
  {
    key: 'dataQualityWarningThreshold',
    category: 'data_quality',
    value: 0.85,
    defaultValue: 0.85,
    description: 'Data quality score below this is warning',
    dataType: 'number',
    minValue: 0.5,
    maxValue: 0.95
  },

  // General
  {
    key: 'assessmentPeriod',
    category: 'general',
    value: 'Q2 FY 2026-27',
    defaultValue: 'Q2 FY 2026-27',
    description: 'Current assessment period',
    dataType: 'string'
  },
  {
    key: 'maxUploadSizeMB',
    category: 'general',
    value: 50,
    defaultValue: 50,
    description: 'Maximum file upload size in MB',
    dataType: 'number',
    minValue: 1,
    maxValue: 500
  }
]

export async function initializeConfiguration(): Promise<void> {
  for (const config of DEFAULT_CONFIGS) {
    if (config.key === 'dimensionWeights') {
      await Configuration.findOneAndUpdate(
        { key: config.key },
        { $set: config },
        { upsert: true, new: true }
      )
    } else {
      await Configuration.findOneAndUpdate(
        { key: config.key },
        { $setOnInsert: config },
        { upsert: true, new: true }
      )
    }
  }
  console.log('Default configurations initialized')
}

export async function getConfig<T>(key: string): Promise<T | null> {
  if (key === 'dimensionWeights') return getFrameworkDimensionWeights() as unknown as T
  const config = await Configuration.findOne({ key })
  return config ? config.value as T : null
}

function exposeCanonicalFrameworkWeights(config: any) {
  if (config.key !== 'dimensionWeights') return config
  return {
    ...config,
    value: getFrameworkDimensionWeights(),
    defaultValue: getFrameworkDimensionWeights(),
    description: 'Locked weights defined by SAT-SA-SOC assessment framework version 1.0.0',
    isEditable: false
  }
}

export async function getConfigCategory(category: string) {
  const configs = await Configuration.find({ category: category as any }).lean()
  return configs.map(exposeCanonicalFrameworkWeights)
}

export async function setConfig(key: string, value: any, modifiedBy: string): Promise<void> {
  const existing = await Configuration.findOne({ key })
  if (key === 'dimensionWeights' || (existing && !existing.isEditable)) {
    const error = new Error('This configuration is locked by the active assessment framework') as Error & { statusCode: number }
    error.statusCode = 409
    throw error
  }
  await Configuration.findOneAndUpdate(
    { key },
    { value, lastModifiedBy: modifiedBy, lastModifiedAt: new Date() },
    { upsert: true, new: true }
  )
}

export async function getAllConfigs() {
  const configs = await Configuration.find().lean()
  return configs.map(exposeCanonicalFrameworkWeights)
}
