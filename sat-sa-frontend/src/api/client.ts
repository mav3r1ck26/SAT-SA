const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json && typeof json === 'object' && 'data' in json ? json.data as T : json as T;
}

// ---- Entities ----
export const fetchEntities = (params?: Record<string, string>) =>
  request<any[]>(`/entities${params ? '?' + new URLSearchParams(params) : ''}`);

export const fetchEntity = (id: string) =>
  request<any>(`/entities/${id}`);

export const createEntity = (data: any) =>
  request<any>('/entities', { method: 'POST', body: JSON.stringify(data) });

// ---- Analytics ----
export const fetchOverview = () =>
  request<{ kpis: any[]; distribution: any[] }>('/analytics/overview');

export const fetchRiskDistribution = () =>
  request<any[]>('/analytics/risk-distribution');

export const fetchAlertAnalytics = () =>
  request<any>('/analytics/alerts');

export const fetchInvestigationAnalytics = () =>
  request<any>('/analytics/investigations');

export const fetchEscalationAnalytics = () =>
  request<any>('/analytics/escalations');

export const fetchGaps = (entityId?: string) =>
  request<any[]>(`/analytics/gaps${entityId ? `?entityId=${entityId}` : ''}`);

export const fetchBlindSpots = (entityId?: string) =>
  request<any[]>(`/analytics/blind-spots${entityId ? `?entityId=${entityId}` : ''}`);

export const fetchBenchmark = (entityId: string) =>
  request<any[]>(`/analytics/benchmark/${entityId}`);

export const fetchReviewQueue = () =>
  request<any[]>('/analytics/review-queue');

export const recomputeRisks = () =>
  request<any>('/analytics/recompute', { method: 'POST' });

export const fetchAnomalies = (entityId?: string) =>
  request<any>(`/analytics/anomalies${entityId ? `?entityId=${entityId}` : ''}`);

export const fetchDataQuality = (entityId?: string) =>
  request<any>(`/analytics/data-quality${entityId ? `?entityId=${entityId}` : ''}`);

// ---- Findings ----
export const fetchFindings = (params?: Record<string, string>) =>
  request<any[]>(`/findings${params ? '?' + new URLSearchParams(params) : ''}`);

export const detectFindings = (entityId?: string) =>
  request<any>('/findings/detect', { method: 'POST', body: JSON.stringify({ entityId }) });

export const reviewFinding = (id: string, data: { status: string; reviewer: string; note?: string }) =>
  request<any>(`/findings/${id}/review`, { method: 'POST', body: JSON.stringify(data) });

// ---- Alerts ----
export const fetchAlerts = (params?: Record<string, string>) =>
  request<{ total: number; alerts: any[] }>(`/alerts${params ? '?' + new URLSearchParams(params) : ''}`);

export const fetchAlertTimeline = (id: string) =>
  request<any>(`/alerts/${id}/timeline`);

export const createAlert = (data: any) =>
  request<any>('/alerts', { method: 'POST', body: JSON.stringify(data) });

// ---- Cases ----
export const fetchCases = (params?: Record<string, string>) =>
  request<{ total: number; cases: any[] }>(`/cases${params ? '?' + new URLSearchParams(params) : ''}`);

export const fetchCaseEvidence = (caseId: string) =>
  request<any>(`/cases/${caseId}/evidence`);

// ---- Evidence ----
export const fetchEvidenceTimeline = (caseId: string) =>
  request<any>(`/evidence/case/${caseId}`);

export const searchEvidence = (q: string) =>
  request<any[]>(`/evidence/search?q=${encodeURIComponent(q)}`);

// ---- Audit ----
export const fetchAuditLog = (params?: Record<string, string>) =>
  request<any[]>(`/audit${params ? '?' + new URLSearchParams(params) : ''}`);

export const exportAuditLog = () =>
  request<any[]>('/audit/export');

// ---- Notifications ----
export const fetchNotifications = () =>
  request<{ notifications: any[]; unread: number }>('/notifications');

export const markNotificationsRead = () =>
  request<any>('/notifications/read-all', { method: 'POST' });

export const markNotificationRead = (id: string) =>
  request<any>(`/notifications/${id}/read`, { method: 'POST' });

// ---- Reports ----
export const fetchReports = () =>
  request<any[]>('/reports');

export const generateReport = (id: string) =>
  request<any>(`/reports/${id}/generate`, { method: 'POST' });

export const getReport = (id: string) =>
  request<any>(`/reports/${id}`);

// ---- Ingestion ----
export const fetchIngestionQuality = () =>
  request<any>('/ingestion/quality');

export async function uploadDataFile(file: File, source?: string) {
  const formData = new FormData();
  formData.append('file', file);
  if (source) formData.append('source', source);
  const res = await fetch(`${BASE}/ingestion/upload`, { method: 'POST', body: formData });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  const json = await res.json();
  return json && typeof json === 'object' && 'data' in json ? json.data : json;
}

export const ingestFromAPI = (records: any[]) =>
  request<any>('/ingestion/api', { method: 'POST', body: JSON.stringify({ records }) });

// ---- Validation ----
export const fetchValidation = () =>
  request<any>('/validation/summary');

// ---- ML Proxy ----
export const fetchMLHealth = () =>
  request<any>('/ml/health');

export const trainMLModel = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return fetch(`${BASE}/ml/train`, { method: 'POST', body: formData }).then(r => r.json());
}

export const predictML = (alerts: any[], investigators?: string[]) =>
  request<any>('/ml/predict', { method: 'POST', body: JSON.stringify({ alerts, investigators }) });

export const analyzeML = (alerts: any[], investigators?: string[]) =>
  request<any>('/ml/analyze', { method: 'POST', body: JSON.stringify({ alerts, investigators }) });

export const analyzeCSV = (file: File, investigators?: string[]) => {
  const formData = new FormData();
  formData.append('file', file);
  if (investigators) formData.append('investigators', investigators.join(','));
  return fetch(`${BASE}/ml/analyze-csv`, { method: 'POST', body: formData }).then(r => r.json());
}

export const fetchMLModels = () =>
  request<any>('/ml/models');

export const fetchPlaybooks = () =>
  request<any>('/ml/playbooks');

export const fetchPlaybook = (id: string) =>
  request<any>(`/ml/playbooks/${id}`);

// ---- Configuration ----
export const getConfig = (key: string) =>
  request<any>(`/configuration/${encodeURIComponent(key)}`);

export const getConfigCategory = (category: string) =>
  request<any[]>(`/configuration/category/${encodeURIComponent(category)}`);

export const setConfig = (key: string, value: unknown, modifiedBy: string) =>
  request<void>(`/configuration/${encodeURIComponent(key)}`, {
    method: 'PUT',
    body: JSON.stringify({ value, modifiedBy }),
  });
