const BASE = '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  })
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`)
  const json = await res.json()
  if (json && typeof json === 'object' && 'data' in json) {
    return json.data as T
  }
  return json as T
}

// ---- Entities ----
export const fetchAssessmentFramework = () =>
  request<any>('/assessment-framework')

export const fetchEntities = (params?: Record<string, string>) =>
  request<any[]>('/entities' + (params ? '?' + new URLSearchParams(params) : ''))

export const fetchEntity = (id: string, period?: string) => {
  const query = period ? `?${new URLSearchParams({ period })}` : ''
  return request<any>(`/entities/${encodeURIComponent(id)}${query}`)
}

export const fetchEntityAssessmentHistory = (id: string) =>
  request<any>(`/entities/${encodeURIComponent(id)}/assessment-history`)

export const saveEntityAssessment = (id: string, period: string, dimensions: Record<string, number>) =>
  request<any>(`/entities/${encodeURIComponent(id)}/assessment`, {
    method: 'PUT',
    body: JSON.stringify({ period, dimensions })
  })

export const createEntity = (data: any) =>
  request<any>('/entities', { method: 'POST', body: JSON.stringify(data) })

// ---- Analytics ----
export const fetchOverview = () =>
  request<{ kpis: any[]; distribution: any[] }>('/analytics/overview')

export const fetchRiskDistribution = () =>
  request<any[]>('/analytics/risk-distribution')

export const fetchAlertAnalytics = () =>
  request<any>('/analytics/alerts')

export const fetchInvestigationAnalytics = () =>
  request<any>('/analytics/investigations')

export const fetchEscalationAnalytics = () =>
  request<any>('/analytics/escalations')

export const fetchGaps = (entityId?: string) =>
  request<any[]>(`/analytics/gaps${entityId ? `?entityId=${entityId}` : ''}`)

export const fetchBlindSpots = (entityId?: string) =>
  request<any[]>(`/analytics/blind-spots${entityId ? `?entityId=${entityId}` : ''}`)

export const fetchBenchmark = (entityId: string) =>
  request<any[]>(`/analytics/benchmark/${entityId}`)

export const fetchReviewQueue = () =>
  request<any[]>('/analytics/review-queue')

export const recomputeRisks = () =>
  request<any>('/analytics/recompute', { method: 'POST' })

// ---- Findings ----
export const fetchFindings = (params?: Record<string, string>) =>
  request<any[]>('/findings' + (params ? '?' + new URLSearchParams(params) : ''))

export const detectFindings = (entityId?: string) =>
  request<any>('/findings/detect', { method: 'POST', body: JSON.stringify({ entityId }) })

export const reviewFinding = (id: string, data: { status: string; reviewer: string; note?: string }) =>
  request<any>(`/findings/${id}/review`, { method: 'POST', body: JSON.stringify(data) })

// ---- Alerts ----
export const fetchAlerts = (params?: Record<string, string>) =>
  request<{ total: number; alerts: any[] }>('/alerts' + (params ? '?' + new URLSearchParams(params) : ''))

// ---- Cases ----
export const fetchCases = (params?: Record<string, string>) =>
  request<{ total: number; cases: any[] }>('/cases' + (params ? '?' + new URLSearchParams(params) : ''))

export const fetchCaseEvidence = (caseId: string) =>
  request<any>(`/cases/${caseId}/evidence`)

// ---- Evidence ----
export const fetchEvidenceTimeline = (caseId: string) =>
  request<any>(`/evidence/case/${encodeURIComponent(caseId)}`)

export const fetchFindingEvidence = (findingId: string) =>
  request<any>(`/evidence/finding/${encodeURIComponent(findingId)}`)

export const fetchAlertEvidence = (alertId: string) =>
  request<any>(`/evidence/alert/${encodeURIComponent(alertId)}`)

export const searchEvidence = (q: string) =>
  request<any[]>(`/evidence/search?q=${encodeURIComponent(q)}`)

// ---- Audit ----
export const fetchAuditLog = (params?: Record<string, string>) =>
  request<any[]>('/audit' + (params ? '?' + new URLSearchParams(params) : ''))

export const exportAuditLog = () =>
  request<any[]>('/audit/export')

export const logAuditAction = (data: { user?: string; action: string; actionCategory?: string; entityId?: string; findingId?: string; detail?: string; status?: string }) =>
  request<any>('/audit', { method: 'POST', body: JSON.stringify(data) })

// ---- Notifications ----
export const fetchNotifications = () =>
  request<{ notifications: any[]; unread: number }>('/notifications')

export const markNotificationsRead = () =>
  request<any>('/notifications/read-all', { method: 'POST' })

// ---- Reports ----
export const fetchReports = () =>
  request<any[]>('/reports')

export const generateReport = (id: string) =>
  request<any>(`/reports/${id}/generate`, { method: 'POST' })

export const getReport = (id: string) =>
  request<any>(`/reports/${id}`)

// ---- Ingestion ----
export const fetchIngestionQuality = () =>
  request<any>('/ingestion/quality')

export const fetchCoverageMatrix = (entityId?: string) =>
  request<{ categories: string[]; columns: string[]; matrix: number[][] }>(`/analytics/coverage-matrix${entityId && entityId !== 'ALL' ? `?entityId=${entityId}` : ''}`)

export const fetchAnomalies = (params?: Record<string, string>) =>
  request<{ anomalies: any[]; total: number; page: number; pageSize: number; pageCount: number; summary: any }>(`/analytics/anomalies${params ? `?${new URLSearchParams(params)}` : ''}`)

export type UploadFileProgress = {
  fileName: string
  fileIndex: number
  status: 'queued' | 'uploading' | 'processed' | 'partial' | 'rejected'
  result?: any
  error?: string
}

export async function uploadDataFiles(files: File[], onProgress?: (progress: UploadFileProgress) => void) {
  if (!files.length) throw new Error('Select at least one CSV or JSON file.')
  const results: any[] = []
  for (const [fileIndex, file] of files.entries()) {
    onProgress?.({ fileName: file.name, fileIndex, status: 'uploading' })
    try {
      const formData = new FormData()
      formData.append('files', file, file.name)
      const res = await fetch(`${BASE}/ingestion/upload`, { method: 'POST', body: formData })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: { message: `Upload failed: ${res.status}` } }))
        throw new Error(err.error?.message || `Upload failed: ${res.status}`)
      }
      const json = await res.json()
      const response = json && typeof json === 'object' && 'data' in json ? json.data : json
      const result = response.files?.[0] || { success: response.success !== false, fileName: file.name, ...response }
      results.push(result)
      onProgress?.({
        fileName: file.name,
        fileIndex,
        status: !result.success ? 'rejected' : result.batch?.status === 'partial' ? 'partial' : 'processed',
        result,
        error: result.error
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const result = { success: false, fileName: file.name, error: message }
      results.push(result)
      onProgress?.({ fileName: file.name, fileIndex, status: 'rejected', result, error: message })
    }
  }

  return {
    files: results,
    fileCount: results.length,
    failedFiles: results.filter(result => !result.success).length,
    partialFiles: results.filter(result => result.batch?.status === 'partial' || result.persistenceStatus === 'partial').length,
    inserted: results.reduce((sum, result) => sum + (result.inserted || 0), 0),
    persistedRecords: results.reduce((sum, result) => sum + (result.persistedRecords || 0), 0),
    sourceRecordsStored: results.reduce((sum, result) => sum + (result.sourceRecordsStored || 0), 0),
    validRecords: results.reduce((sum, result) => sum + (result.validRecords || 0), 0),
    totalRecords: results.reduce((sum, result) => sum + (result.total || 0), 0)
  }
}

export const uploadDataFile = (file: File) => uploadDataFiles([file])

export const ingestFromAPI = (records: any[]) =>
  request<any>('/ingestion/api', { method: 'POST', body: JSON.stringify({ records }) })

export const fetchSampleBundles = () =>
  request<any[]>('/ingestion/samples')

export const loadSampleBundle = (filename: string) =>
  request<any>('/ingestion/load-sample', { method: 'POST', body: JSON.stringify({ filename }) })

// ---- Validation ----
export const fetchValidation = () =>
  request<any>('/validation/summary')

// ---- Machine Learning ----
export const fetchMLHealth = () =>
  request<any>('/ml/health')

export const fetchMLModelInfo = () =>
  request<any>('/ml/model/info')

export const evaluateFleetML = () =>
  request<any>('/ml/evaluate-fleet', { method: 'POST' })

export const trainAutoML = (params?: { n_entities?: number; periods_per_entity?: number; model_type?: string }) =>
  request<any>('/ml/train-auto', { method: 'POST', body: JSON.stringify(params || {}) })
