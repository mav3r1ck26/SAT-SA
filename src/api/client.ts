const BASE = '/api'

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly retryAfterMs?: number) {
    super(message)
    this.name = 'ApiError'
  }
}

interface InFlightRequest<T> {
  controller: AbortController
  promise: Promise<T>
  subscribers: number
  abortTimer?: ReturnType<typeof globalThis.setTimeout>
}

const inFlightGets = new Map<string, InFlightRequest<unknown>>()

export const fetchApiHealth = (signal?: AbortSignal) =>
  request<{ status: string; database: string; timestamp: string }>('/health', { signal })

function retryAfterMilliseconds(res: Response): number | undefined {
  const value = res.headers.get('Retry-After')
  if (!value) return undefined
  const seconds = Number(value)
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000)
  const timestamp = Date.parse(value)
  return Number.isNaN(timestamp) ? undefined : Math.max(0, timestamp - Date.now())
}

function requestFailurePath(path: string): string {
  return path.split('?')[0].replace(/\/(?:CSE-\d+|FIND-[A-Za-z0-9-]+|[a-f0-9]{24})(?=\/|$)/gi, '/:id')
}

function reportRequestFailure(path: string, status: number | null, kind: string) {
  console.warn(JSON.stringify({
    event: 'api.request.failed',
    path: requestFailurePath(path),
    statusCode: status,
    failureKind: kind
  }))
}

function abortError(signal: AbortSignal): Error {
  return signal.reason instanceof Error ? signal.reason : new DOMException('The request was cancelled.', 'AbortError')
}

function waitBeforeRetry(delayMs: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(abortError(signal))
    const timer = globalThis.setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, delayMs)
    const onAbort = () => {
      globalThis.clearTimeout(timer)
      signal.removeEventListener('abort', onAbort)
      reject(abortError(signal))
    }
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

async function requestOnce<T>(path: string, options: RequestInit, signal: AbortSignal, retries = 0): Promise<T> {
  let attempt = 0
  while (true) {
    if (signal.aborted) throw abortError(signal)
    try {
      const res = await fetch(`${BASE}${path}`, {
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
        signal
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        const error = new ApiError(
          payload?.error?.message || `API request failed (${res.status}).`,
          res.status,
          retryAfterMilliseconds(res)
        )
        if (res.status >= 500 && attempt < retries) {
          await waitBeforeRetry(300 * (2 ** attempt) + Math.random() * 250, signal)
          attempt++
          continue
        }
        throw error
      }
      const json = await res.json()
      if (json && typeof json === 'object' && 'data' in json) return json.data as T
      return json as T
    } catch (error) {
      if (signal.aborted) throw abortError(signal)
      if (error instanceof ApiError || attempt >= retries) {
        reportRequestFailure(path, error instanceof ApiError ? error.status : null, error instanceof ApiError ? 'http' : 'network')
        throw error
      }
      await waitBeforeRetry(300 * (2 ** attempt) + Math.random() * 250, signal)
      attempt++
    }
  }
}

function subscribeToRequest<T>(entry: InFlightRequest<T>, signal?: AbortSignal): Promise<T> {
  if (signal?.aborted) return Promise.reject(abortError(signal))
  if (entry.abortTimer !== undefined) {
    globalThis.clearTimeout(entry.abortTimer)
    entry.abortTimer = undefined
  }
  entry.subscribers++
  return new Promise((resolve, reject) => {
    let finished = false
    const release = () => {
      if (finished) return
      finished = true
      signal?.removeEventListener('abort', onAbort)
      entry.subscribers--
      if (entry.subscribers === 0 && !entry.controller.signal.aborted) {
        entry.abortTimer = globalThis.setTimeout(() => {
          if (entry.subscribers === 0 && !entry.controller.signal.aborted) entry.controller.abort()
        }, 0)
      }
    }
    const onAbort = () => {
      release()
      reject(abortError(signal!))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
    entry.promise.then(value => {
      if (finished) return
      release()
      resolve(value)
    }, error => {
      if (finished) return
      release()
      reject(error)
    })
  })
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  if ((options.method || 'GET').toUpperCase() !== 'GET') {
    const controller = new AbortController()
    return requestOnce<T>(path, options, options.signal || controller.signal)
  }

  const key = `GET:${path}`
  let entry = inFlightGets.get(key) as InFlightRequest<T> | undefined
  if (!entry || entry.controller.signal.aborted) {
    const controller = new AbortController()
    entry = { controller, promise: requestOnce<T>(path, options, controller.signal, 2), subscribers: 0 }
    inFlightGets.set(key, entry as InFlightRequest<unknown>)
    const createdEntry = entry
    const removeEntry = () => {
      if (inFlightGets.get(key) === createdEntry) inFlightGets.delete(key)
    }
    entry.promise.then(removeEntry, removeEntry)
  }
  return subscribeToRequest(entry, options.signal || undefined)
}

export interface AuthAccount {
  id: string
  username: string
  displayName: string
  role: string
  active: boolean
  pendingApproval: boolean
  createdAt: string
}

export const fetchAuthAccounts = (signal?: AbortSignal) =>
  request<AuthAccount[]>('/auth/users', { signal })

export const approveAuthAccount = (id: string) =>
  request<AuthAccount>(`/auth/users/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ active: true })
  })

export const rejectAuthAccount = (id: string) =>
  request<void>(`/auth/users/${encodeURIComponent(id)}`, { method: 'DELETE' })

// ---- Entities ----
export const fetchAssessmentFramework = (signal?: AbortSignal) =>
  request<any>('/assessment-framework', { signal })

export const fetchConfigurations = (signal?: AbortSignal) =>
  request<any[]>('/configuration', { signal })

export const updateConfiguration = (key: string, value: unknown) =>
  request<any>(`/configuration/${encodeURIComponent(key)}`, {
    method: 'PUT',
    body: JSON.stringify({ value })
  })

export const fetchEntities = (params?: Record<string, string>, signal?: AbortSignal) =>
  request<any[]>('/entities' + (params ? '?' + new URLSearchParams(params) : ''), { signal })

export const fetchEntity = (id: string, period?: string, signal?: AbortSignal) => {
  const query = period ? `?${new URLSearchParams({ period })}` : ''
  return request<any>(`/entities/${encodeURIComponent(id)}${query}`, { signal })
}

export const fetchEntityAssessmentHistory = (id: string, signal?: AbortSignal) =>
  request<any>(`/entities/${encodeURIComponent(id)}/assessment-history`, { signal })

export const saveEntityAssessment = (id: string, period: string, dimensions: Record<string, number>) =>
  request<any>(`/entities/${encodeURIComponent(id)}/assessment`, {
    method: 'PUT',
    body: JSON.stringify({ period, dimensions })
  })

export type EntityRegistration = {
  id: string
  name: string
  sector: string
  region: string
  criticality: 'Critical' | 'High' | 'Medium' | 'Low'
  period: string
}

export const createEntity = (data: EntityRegistration) =>
  request<any>('/entities', { method: 'POST', body: JSON.stringify(data) })

// ---- Analytics ----
export const fetchOverview = (period?: string, entityId?: string, signal?: AbortSignal) =>
  request<{ kpis: any[]; distribution: any[] }>(`/analytics/overview?${new URLSearchParams({ ...(period ? { period } : {}), ...(entityId ? { entityId } : {}) })}`, { signal })

export const fetchRiskDistribution = (period?: string, entityId?: string, signal?: AbortSignal) =>
  request<any[]>(`/analytics/risk-distribution?${new URLSearchParams({ ...(period ? { period } : {}), ...(entityId ? { entityId } : {}) })}`, { signal })

export const fetchAlertAnalytics = (period?: string, entityId?: string, signal?: AbortSignal) =>
  request<any>(`/analytics/alerts?${new URLSearchParams({ ...(period ? { period } : {}), ...(entityId ? { entityId } : {}) })}`, { signal })

export const fetchInvestigationAnalytics = (period?: string, entityId?: string, signal?: AbortSignal) =>
  request<any>(`/analytics/investigations?${new URLSearchParams({ ...(period ? { period } : {}), ...(entityId ? { entityId } : {}) })}`, { signal })

export const fetchEscalationAnalytics = (period?: string, entityId?: string, signal?: AbortSignal) =>
  request<any>(`/analytics/escalations?${new URLSearchParams({ ...(period ? { period } : {}), ...(entityId ? { entityId } : {}) })}`, { signal })

export const fetchGaps = (entityId?: string, period?: string, signal?: AbortSignal) =>
  request<any[]>(`/analytics/gaps?${new URLSearchParams({ ...(entityId ? { entityId } : {}), ...(period ? { period } : {}) })}`, { signal })

export const fetchBlindSpots = (entityId?: string, period?: string, signal?: AbortSignal) =>
  request<any[]>(`/analytics/blind-spots?${new URLSearchParams({ ...(entityId ? { entityId } : {}), ...(period ? { period } : {}) })}`, { signal })

export const fetchBenchmark = (entityId: string, period?: string, signal?: AbortSignal) =>
  request<any[]>(`/analytics/benchmark/${encodeURIComponent(entityId)}${period ? `?${new URLSearchParams({ period })}` : ''}`, { signal })

export const fetchReviewQueue = (period?: string, entityId?: string, signal?: AbortSignal) =>
  request<any[]>(`/analytics/review-queue?${new URLSearchParams({ ...(period ? { period } : {}), ...(entityId ? { entityId } : {}) })}`, { signal })

export const recomputeRisks = (period?: string) =>
  request<any>('/analytics/recompute', { method: 'POST', body: JSON.stringify({ period }) })

// ---- Findings ----
export const fetchFindings = (params?: Record<string, string>, signal?: AbortSignal) =>
  request<any[]>('/findings' + (params ? '?' + new URLSearchParams(params) : ''), { signal })

export const detectFindings = (entityId?: string) =>
  request<any>('/findings/detect', { method: 'POST', body: JSON.stringify({ entityId }) })

export const reviewFinding = (id: string, data: { status: string; note?: string }) =>
  request<any>(`/findings/${id}/review`, { method: 'POST', body: JSON.stringify(data) })

// ---- Alerts ----
export const fetchAlerts = (params?: Record<string, string>, signal?: AbortSignal) =>
  request<{ total: number; alerts: any[] }>('/alerts' + (params ? '?' + new URLSearchParams(params) : ''), { signal })

// ---- Cases ----
export const fetchCases = (params?: Record<string, string>, signal?: AbortSignal) =>
  request<{ total: number; cases: any[] }>('/cases' + (params ? '?' + new URLSearchParams(params) : ''), { signal })

export const fetchCaseEvidence = (caseId: string, signal?: AbortSignal) =>
  request<any>(`/cases/${caseId}/evidence`, { signal })

// ---- Evidence ----
export const fetchEvidenceTimeline = (caseId: string, signal?: AbortSignal) =>
  request<any>(`/evidence/case/${encodeURIComponent(caseId)}`, { signal })

export const fetchEntityEvidenceTimeline = (entityId: string, period?: string, signal?: AbortSignal) =>
  request<any>(`/evidence/entity/${encodeURIComponent(entityId)}${period ? `?${new URLSearchParams({ period })}` : ''}`, { signal })

export const fetchFindingEvidence = (findingId: string, signal?: AbortSignal) =>
  request<any>(`/evidence/finding/${encodeURIComponent(findingId)}`, { signal })

export const fetchAlertEvidence = (alertId: string, signal?: AbortSignal) =>
  request<any>(`/evidence/alert/${encodeURIComponent(alertId)}`, { signal })

export const searchEvidence = (q: string) =>
  request<any[]>(`/evidence/search?q=${encodeURIComponent(q)}`)

// ---- Audit ----
export const fetchAuditLog = (params?: Record<string, string>, signal?: AbortSignal) =>
  request<any[]>('/audit' + (params ? '?' + new URLSearchParams(params) : ''), { signal })

export const exportAuditLog = () =>
  request<any[]>('/audit/export')

export const verifyAuditChain = (signal?: AbortSignal) =>
  request<any>('/audit/verify', { signal })

export const logAuditAction = (data: { user?: string; action: string; actionCategory?: string; entityId?: string; findingId?: string; detail?: string; status?: string }) =>
  request<any>('/audit', { method: 'POST', body: JSON.stringify(data) })

// ---- Notifications ----
export const fetchNotifications = () =>
  request<{ notifications: any[]; unread: number }>('/notifications')

export const markNotificationsRead = () =>
  request<any>('/notifications/read-all', { method: 'POST' })

// ---- Reports ----
export const fetchReports = (signal?: AbortSignal) =>
  request<any[]>('/reports', { signal })

export const generateReport = (id: string, entityId?: string, period?: string) =>
  request<any>(`/reports/${id}/generate`, { method: 'POST', body: JSON.stringify({ entityId, period }) })

export const getReport = (id: string) =>
  request<any>(`/reports/${id}`)

// ---- Ingestion ----
export const fetchIngestionQuality = (signal?: AbortSignal) =>
  request<any>('/ingestion/quality', { signal })

export const fetchCoverageMatrix = (entityId?: string, period?: string, signal?: AbortSignal) =>
  request<{ categories: string[]; columns: string[]; matrix: Array<Array<number | null>> }>(`/analytics/coverage-matrix?${new URLSearchParams({ ...(entityId && entityId !== 'ALL' ? { entityId } : {}), ...(period ? { period } : {}) })}`, { signal })

export const fetchAnomalies = (params?: Record<string, string>, signal?: AbortSignal) =>
  request<{ anomalies: any[]; total: number; page: number; pageSize: number; pageCount: number; summary: any }>(`/analytics/anomalies${params ? `?${new URLSearchParams(params)}` : ''}`, { signal })

export type UploadFileProgress = {
  fileName: string
  fileIndex: number
  status: 'queued' | 'uploading' | 'processed' | 'partial' | 'rejected'
  result?: any
  error?: string
}

export async function uploadDataFiles(files: File[], onProgress?: (progress: UploadFileProgress) => void, period?: string) {
  if (!files.length) throw new Error('Select at least one CSV or JSON file.')
  const formData = new FormData()
  files.forEach((file, fileIndex) => {
    formData.append('files', file, file.name)
    onProgress?.({ fileName: file.name, fileIndex, status: 'uploading' })
  })
  if (period) formData.append('period', period)

  const res = await fetch(`${BASE}/ingestion/upload`, { method: 'POST', body: formData, credentials: 'same-origin' })
  if (!res.ok) {
    const payload = await res.json().catch(() => null)
    const error = new ApiError(
      payload?.error?.message || `Upload failed (${res.status}).`,
      res.status,
      retryAfterMilliseconds(res)
    )
    for (const [fileIndex, file] of files.entries()) {
      onProgress?.({ fileName: file.name, fileIndex, status: 'rejected', error: error.message })
    }
    throw error
  }

  const json = await res.json()
  const response = json && typeof json === 'object' && 'data' in json ? json.data : json
  const results = files.map((file, fileIndex) => {
    const result = response.files?.[fileIndex] || { success: false, fileName: file.name, error: 'The API did not return a result for this file.' }
    onProgress?.({
      fileName: file.name,
      fileIndex,
      status: !result.success ? 'rejected' : result.batch?.status === 'partial' ? 'partial' : 'processed',
      result,
      error: result.error
    })
    return result
  })

  return {
    files: results,
    fileCount: results.length,
    failedFiles: results.filter(result => !result.success).length,
    partialFiles: results.filter(result => result.batch?.status === 'partial' || result.persistenceStatus === 'partial').length,
    inserted: results.reduce((sum, result) => sum + (result.inserted || 0), 0),
    persistedRecords: results.reduce((sum, result) => sum + (result.persistedRecords || 0), 0),
    telemetryRecordsStored: results.reduce((sum, result) => sum + (result.telemetryRecordsStored || 0), 0),
    sourceRecordsStored: results.reduce((sum, result) => sum + (result.sourceRecordsStored || 0), 0),
    validRecords: results.reduce((sum, result) => sum + (result.validRecords || 0), 0),
    totalRecords: results.reduce((sum, result) => sum + (result.total || 0), 0)
  }
}

export const uploadDataFile = (file: File) => uploadDataFiles([file])

export const ingestFromAPI = (records: any[]) =>
  request<any>('/ingestion/api', { method: 'POST', body: JSON.stringify({ records }) })

export const fetchSampleBundles = (signal?: AbortSignal) =>
  request<any[]>('/ingestion/samples', { signal })

export const loadSampleBundle = (filename: string, period?: string) =>
  request<any>('/ingestion/load-sample', { method: 'POST', body: JSON.stringify({ filename, period }) })

export const reprocessIngestionBatch = (batchId: string) =>
  request<any>(`/ingestion/batches/${encodeURIComponent(batchId)}/reprocess`, { method: 'POST', body: JSON.stringify({}) })

// ---- Validation ----
export const fetchValidation = (signal?: AbortSignal) =>
  request<any>('/validation/summary', { signal })

// ---- Machine Learning ----
export const fetchMLHealth = (signal?: AbortSignal) =>
  request<any>('/ml/health', { signal })

export const fetchMLModelInfo = (signal?: AbortSignal) =>
  request<any>('/ml/model/info', { signal })

export const evaluateFleetML = () =>
  request<any>('/ml/evaluate-fleet', { method: 'POST' })

export const trainAutoML = (params?: { n_entities?: number; periods_per_entity?: number; model_type?: string }) =>
  request<any>('/ml/train-auto', { method: 'POST', body: JSON.stringify(params || {}) })
