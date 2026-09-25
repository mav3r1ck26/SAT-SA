export interface Entity {
  id: string;
  name: string;
  sector: string;
  region: string;
  criticality: 'Critical' | 'High' | 'Medium' | 'Low';
  dataCompleteness: number;
  telemetryCoverage: number;
  lastSubmission: string;
  assessmentStatus: string;
  riskScore: number;
  prevRiskScore: number;
  detection: number;
  investigation: number;
  escalation: number;
  operations: number;
  governance: number;
  resilience: number;
  executionGaps: number;
  negativeSpace: number;
  peerDeviation: string;
  priority: string;
  status: string;
}

export interface EntityMetric {
  entityId: string;
  period: string;
  threatDetection: number;
  investigation: number;
  escalation: number;
  incidentResponse: number;
  securityOperations: number;
  governanceOversight: number;
  operationalDiscipline: number;
  cyberResilience: number;
  riskScore: number;
  prevRiskScore: number;
  executionGapCount: number;
  negativeSpaceCount: number;
  anomalyCount: number;
  dataQualityIssues: number;
  peerPercentile: number;
  peerDeviation: string;
  priorityScore: number;
  scoreComponents: {
    executionGaps: number;
    negativeSpace: number;
    peerDeviation: number;
    mlRiskProbability: number;
    anomalyIndicators: number;
    dataQuality: number;
  };
}

export interface Alert {
  id: string;
  entityId: string;
  category: string;
  subcategory?: string;
  asset: string;
  assetCriticality: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational';
  status: string;
  createdAt: string;
  acknowledgedAt?: string;
  investigationStartedAt?: string;
  closedAt?: string;
  escalationPath?: string;
  escalationRequired: boolean;
  escalated: boolean;
  escalationDelayMin: number;
  disposition: string;
  closureReason?: string;
  closureNote?: string;
  acknowledgementTimeMin: number;
  investigationTimeMin: number;
  closureTimeMin: number;
  relatedCaseId?: string;
  source: string;
  period: string;
}

export interface Case {
  id: string;
  entityId: string;
  alertId?: string;
  openedAt: string;
  investigationStartedAt?: string;
  investigationEndedAt?: string;
  closedAt?: string;
  durationMin: number;
  acknowledgementTimeMin: number;
  investigationTimeMin: number;
  escalationTimeMin: number;
  investigationDepth: number;
  evidenceAttachments: number;
  evidenceCount: number;
  isTemplateReuse: number;
  reopenedCount: number;
  closureReason: string;
  investigator: string;
  behaviour: string;
  status: string;
  rootCauseIdentified: boolean;
  rootCauseCategory?: string;
  remediationRecorded: boolean;
  remediationDetails?: string;
  escalationRecorded: boolean;
  escalationDetails?: string;
  period: string;
}

export interface Finding {
  id: string;
  findingType: 'EXECUTION_GAP' | 'NEGATIVE_SPACE' | 'ANOMALY' | 'PEER_DEVIATION' | 'DATA_QUALITY' | 'RISK_INDICATOR' | 'ML_RISK';
  entityId: string;
  period: string;
  title: string;
  description: string;
  controlArea: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational';
  confidence: number;
  riskContribution: number;
  evidenceCount: number;
  evidenceReferences: string[];
  supportingMetrics: Record<string, any>;
  peerComparison: string;
  whyItMatters: string;
  detectionLogic: string;
  methodology: string;
  limitations: string;
  recommendation: string;
  status: 'New' | 'In Review' | 'Confirmed' | 'Rejected' | 'Deferred' | 'Examiner Confirmed' | 'Examiner Rejected';
  examinerDecision?: 'Pending' | 'Confirmed' | 'Rejected' | 'Deferred';
  examinerNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  modelName?: string;
  modelVersion?: string;
  featureContributions?: Record<string, number>;
  jobId?: string;
}

export interface EvidenceEvent {
  entityId: string;
  findingId?: string;
  caseId?: string;
  alertId?: string;
  eventTime: string;
  eventType: 'Alert Created' | 'Acknowledged' | 'Investigation Started' | 'Evidence Collected' | 'Escalation' | 'Closure' | 'Note Added' | 'Reopened' | 'Custom';
  actor: string;
  role: string;
  event: string;
  metadata: string[];
  sourceRecordId?: string;
  sourceSystem?: string;
}

export interface EvidenceTimeline {
  case: any;
  timeline: EvidenceEvent[];
}

export interface AnalyticsOverview {
  kpis: KPI[];
  distribution: RiskDistribution[];
}

export interface KPI {
  label: string;
  value: string | number;
  display: string;
  trend: number;
  icon: string;
  threshold?: 'bad' | 'watched' | 'neutral';
}

export interface RiskDistribution {
  level: string;
  color: string;
  count: number;
}

export interface ExecutionGap {
  findingType: string;
  title: string;
  entityId: string;
  controlArea: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  confidence: number;
  evidenceCount: number;
  description: string;
  methodology: string;
  limitations: string;
  peerComparison: string;
  recommendation: string;
}

export interface BlindSpot {
  entityId: string;
  assetGroup: string;
  category: string;
  observedPct: number;
  description: string;
  severity?: string;
}

export interface Anomaly {
  entityId: string;
  caseId?: string;
  type: 'VOLUME_SPIKE' | 'DURATION_ANOMALY' | 'LOW_EVIDENCE';
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  confidence: number;
  description: string;
  anomalyScore: number;
}

export interface PeerBenchmark {
  metric: string;
  entityValue: number;
  entityDisplay: string;
  peerMedian: number;
  peerMedianDisplay: string;
  percentile: number;
  assessment: string;
}

export interface ReviewQueueItem {
  priority: number;
  severity: string;
  entity: string;
  ref: string;
  reason: string;
  riskScore: number;
  confidence: number;
  evidenceCount: number;
  reasonWrap: string[];
  suggestedAction: string;
}

export interface AnomalyResult {
  entityId: string;
  caseId?: string;
  type: string;
  severity: string;
  confidence: number;
  description: string;
  anomalyScore: number;
}

export interface DataQualityResult {
  overallScore: number;
  totalAlerts: number;
  totalCases: number;
  totalTelemetry: number;
  issues: Array<{
    type: string;
    severity: string;
    count: number;
    description: string;
  }>;
  warnings: Array<{
    message: string;
    severity: string;
    count: number;
  }>;
}

export interface DataQualitySummary {
  batches: any[];
  totals: { alerts: number; cases: number };
}

export interface DataQualityIssue {
  type: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  count: number;
  description: string;
  affectedRecords: string[];
}

export interface AuditRecord {
  timestamp: string;
  user: string;
  userRole?: string;
  action: string;
  actionCategory?: string;
  findingId?: string;
  entityId?: string;
  caseId?: string;
  alertId?: string;
  status: string;
  previousValue?: any;
  newValue?: any;
  detail?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  detail: string;
  time: string;
  read: boolean;
  severity: string;
}

export interface Report {
  id: string;
  name: string;
  description: string;
  status: 'Available' | 'Generating' | 'Ready' | 'Not Generated';
  generatedDate: string;
  format: string[];
}

export interface ReportGenerated {
  id: string;
  name: string;
  generatedAt: string;
  data: any;
}

export interface IngestionResult {
  batch: any;
  inserted: number;
  total: number;
}

export interface ValidationSummary {
  summary: {
    totalFindings: number;
    confirmed: number;
    rejected: number;
    inReview: number;
    newFindings: number;
    truePositives: number;
    falsePositives: number;
    missedFindings: number;
    precision: number;
    recall: number;
    reviewAgreement: number;
  };
}

export interface PeerBenchmarkResult {
  metric: string;
  entityValue: number;
  entityDisplay: string;
  peerMedian: number;
  peerMedianDisplay: string;
  percentile: number;
  assessment: string;
}

export interface MLHealth {
  status: string;
  service: string;
  models_loaded: boolean;
  timestamp: string;
}

export interface MLModelInfo {
  model_name: string;
  model_version: string;
  algorithm: string;
  trained_at: string;
  training_samples: number;
  features: number;
  metrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1: number;
  };
}

export interface MLAnalyzeResponse {
  predictions: Array<{
    ticket_number: string;
    classification: string;
    confidence: number;
    supervised_pred: number;
    unsupervised_pred: number;
    anomaly_score: number;
  }>;
  file_a: Array<{
    Investigator: string;
    Ticket_Number: string;
    Potential_Attack_Classification: string;
    TP_or_FP: string;
    Escalation_Needed: string;
    Reasoning: string;
  }>;
  file_b: Array<{
    Ticket_Number: string;
    Rule_Playbook_Triggered: string;
    Rule_Triggering_Activity_IoC: string;
    Timestamp_of_IoC: string;
    Service_Functionality_Affected_Potential: string;
  }>;
  summary: {
    total: number;
    attacks: number;
    normal: number;
    escalations_needed: number;
  };
}

export interface AnalyzeRequest {
  alerts: Array<{
    timestamp: string;
    source_ip?: string;
    dest_ip?: string;
    source_port?: number;
    dest_port?: number;
    protocol?: string;
    bytes_sent?: number;
    bytes_received?: number;
    packet_count?: number;
    alert_description?: string;
    user_agent?: string;
    http_status?: number;
    ticket_number?: string;
    label?: number;
  }>;
  investigators?: string[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface EntityFilters {
  sector?: string;
  criticality?: string;
  search?: string;
}

export interface AlertFilters {
  entityId?: string;
  severity?: string;
  category?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface CaseFilters {
  entityId?: string;
  behaviour?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface FindingFilters {
  entityId?: string;
  severity?: string;
  status?: string;
  searching?: string;
}

export interface AuditFilters {
  user?: string;
  action?: string;
  entityId?: string;
  search?: string;
  limit?: number;
}

export interface AnalyzeRequest {
  alerts: Array<{
    timestamp: string;
    source_ip?: string;
    dest_ip?: string;
    source_port?: number;
    dest_port?: number;
    protocol?: string;
    bytes_sent?: number;
    bytes_received?: number;
    packet_count?: number;
    alert_description?: string;
    user_agent?: string;
    http_status?: number;
    ticket_number?: string;
    label?: number;
  }>;
  investigators?: string[];
}

export interface BatchInput {
  alerts: Array<{
    timestamp: string;
    source_ip?: string;
    dest_ip?: string;
    source_port?: number;
    dest_port?: number;
    protocol?: string;
    bytes_sent?: number;
    bytes_received?: number;
    packet_count?: number;
    alert_description?: string;
    user_agent?: string;
    http_status?: number;
    ticket_number?: string;
    label?: number;
  }>;
  investigators?: string[];
}

export interface FindingReviewRequest {
  status: string;
  reviewer: string;
  note?: string;
}