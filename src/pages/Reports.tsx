import { useState } from 'react'
import { fetchReports, generateReport, fetchAuditLog, fetchMLModelInfo, evaluateFleetML, trainAutoML } from '../api/client'
import { 
  FileText, Clock, CheckCircle2, Loader2, FileDown, 
  Shield, FileCheck, Layers, RefreshCw, Printer, AlertCircle,
  History, Server, Cpu, Lock, ShieldCheck, Database, Search, Filter, Play, CheckCircle
} from 'lucide-react'
import { downloadCSV, downloadJSON, printDossier } from '../utils/export'
import { useApp } from '../context/AppContext'
import { useApiResource } from '../hooks/useApiResource'
import RequestState from '../components/RequestState'

export default function Reports() {
  const { selectedEntity, assessmentPeriod } = useApp()
  const [activeTab, setActiveTab] = useState<'dossiers' | 'audit' | 'architecture'>('dossiers')
  const [generating, setGenerating] = useState<string | null>(null)
  const [exporting, setExporting] = useState<string | null>(null)
  const [reportError, setReportError] = useState('')

  // Audit Log State
  const [auditSearch, setAuditSearch] = useState('')
  const [auditUserFilter, setAuditUserFilter] = useState('')
  const [auditActionFilter, setAuditActionFilter] = useState('')

  // ML Architecture State
  const [mlRunning, setMlRunning] = useState(false)
  const [mlResult, setMlResult] = useState<any>(null)

  const reportsResource = useApiResource('report-definitions', signal => fetchReports(signal))
  const mlInfoResource = useApiResource(
    activeTab === 'architecture' ? 'ml-model-info' : 'ml-model-info-inactive',
    signal => activeTab === 'architecture' ? fetchMLModelInfo(signal) : Promise.resolve(null)
  )
  const mlInfo = mlInfoResource.data
  const auditParams: Record<string, string> = {}
  if (auditUserFilter) auditParams.user = auditUserFilter
  if (auditActionFilter) auditParams.action = auditActionFilter
  if (auditSearch) auditParams.search = auditSearch
  const auditKey = new URLSearchParams(auditParams).toString()
  const auditResource = useApiResource(`reports-audit:${activeTab}:${auditKey}`, signal =>
    activeTab === 'audit'
      ? fetchAuditLog(Object.keys(auditParams).length ? auditParams : undefined, signal)
      : Promise.resolve([])
  )
  const reports = reportsResource.data || []
  const auditRecords = auditResource.data || []

  const handleRunFleetML = async () => {
    setMlRunning(true)
    setMlResult(null)
    try {
      const res = await evaluateFleetML()
      setMlResult(res)
    } catch (err: any) {
      setMlResult({ error: err.message || String(err) })
    }
    setMlRunning(false)
  }

  const handleTrainAutoML = async () => {
    setMlRunning(true)
    setMlResult(null)
    try {
      const res = await trainAutoML({ n_entities: 200, periods_per_entity: 6 })
      setMlResult(res)
      mlInfoResource.retry()
    } catch (err: any) {
      setMlResult({ error: err.message || String(err) })
    }
    setMlRunning(false)
  }

  const handleGenerate = async (id: string) => {
    setGenerating(id)
    setReportError('')
    try {
      await generateReport(id, selectedEntity || undefined, assessmentPeriod)
      reportsResource.retry()
    } catch (error) {
      setReportError(error instanceof Error ? error.message : 'Report generation failed.')
    }
    setGenerating(null)
  }

  const handleExport = async (reportItem: any, format: string) => {
    const exportKey = `${reportItem.id}-${format}`
    setExporting(exportKey)
    const printWindow = format === 'PDF' ? window.open('', '_blank', 'width=900,height=800') : null
    try {
      const genRes = await generateReport(reportItem.id, selectedEntity || undefined, assessmentPeriod)
      let content = genRes?.data || genRes
      reportsResource.retry()

      // Generate endpoint returns a report envelope, while the list endpoint
      // stores the report body under `content`. Normalize both shapes.
      content = content?.content || content?.data || content

      const filename = `SAT-SA_${reportItem.id}_${new Date().toISOString().slice(0, 10)}`

      if (format === 'JSON') {
        downloadJSON(filename, content)
      } else if (format === 'CSV') {
        let headers: string[] = ['Parameter', 'Value']
        let rows: (string | number)[][] = []

        if (content.findings && Array.isArray(content.findings)) {
          headers = ['Finding ID', 'Title', 'Severity', 'Confidence (%)', 'Status']
          rows = content.findings.map((f: any) => [f.id, f.title || f.name, f.severity || '', f.confidence ?? '', f.status || ''])
        } else if (content.entities && Array.isArray(content.entities)) {
          headers = ['Entity ID', 'Sector', 'Criticality', 'Risk Score', 'Priority', 'Telemetry Coverage (%)']
          rows = content.entities.map((e: any) => [e.id, e.sector, e.criticality, e.riskScore ?? '', e.priority ?? '', e.telemetryCoverage ?? ''])
        } else if (content.benchmark && Array.isArray(content.benchmark)) {
          headers = ['Metric', 'Entity Value', 'Peer Median', 'Percentile', 'Assessment']
          rows = content.benchmark.map((b: any) => [b.metric, b.entityDisplay || b.entityValue, b.peerMedianDisplay || b.peerMedian, b.percentile, b.assessment])
        } else if (content.coverageMatrix && Array.isArray(content.coverageMatrix)) {
          headers = ['Category', 'Expected (%)', 'Observed (%)', 'Alert Gen (%)', 'Case Evidence (%)']
          rows = content.coverageMatrix.map((m: any) => [m.category, m.expected, m.observed, m.alertGeneration, m.investigationEvidence])
        } else {
          rows = Object.entries(content).map(([k, v]) => [k, typeof v === 'object' ? JSON.stringify(v) : String(v)])
        }

        downloadCSV(filename, headers, rows)
      } else if (format === 'PDF') {
        const prettyHeading = (key: string) => key
          .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
          .replace(/[_-]+/g, ' ')
          .replace(/^./, value => value.toUpperCase())
        const sections: { heading: string; content: any }[] = [
          { heading: 'Report Information', content: { ReportID: reportItem.id, Title: reportItem.name, Description: reportItem.description, GeneratedAt: reportItem.generatedAt || 'Not reported' } },
          ...Object.entries(content || {}).map(([key, value]) => ({ heading: prettyHeading(key), content: value }))
        ]

        printDossier(reportItem.name, sections, printWindow)
      }
    } catch (err) {
      setReportError(err instanceof Error ? err.message : 'Report export failed.')
      printWindow?.close()
    }
    setExporting(null)
  }

  const handleExportAuditCSV = () => {
    const headers = ['Timestamp', 'Examiner', 'Action', 'Finding ID', 'Entity ID', 'Status']
    const rows = auditRecords.map((record: any) => [
      record.timestamp, record.user, record.action, record.finding || '', record.entityId || '', record.status || ''
    ])
    downloadCSV(`SAT-SA_Filtered_Audit_Ledger_${new Date().toISOString().slice(0, 10)}`, headers, rows)
  }

  const displayReports = reports.map((report: any) => ({
    ...report,
    status: report.status || 'Not generated',
    generatedAt: report.generatedAt ? new Date(report.generatedAt).toLocaleString() + ' IST' : null
  }))

  const filteredAudit = auditRecords.filter((r: any) =>
    !auditSearch || (r.user || '').toLowerCase().includes(auditSearch.toLowerCase()) || 
    (r.action || '').toLowerCase().includes(auditSearch.toLowerCase()) || 
    (r.entityId || '').toLowerCase().includes(auditSearch.toLowerCase()) || 
    (r.finding || '').toLowerCase().includes(auditSearch.toLowerCase())
  )

  if (activeTab === 'dossiers' && (reportsResource.loading || reportsResource.error || !reportsResource.data)) {
    return <RequestState
      loading={reportsResource.loading}
      error={reportsResource.error}
      retry={reportsResource.retry}
      retryInSeconds={reportsResource.retryInSeconds}
      loadingMessage="Loading report definitions…"
    />
  }

  return (
    <div className="p-6 max-w-[1700px] mx-auto space-y-6">
      {/* Module Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="page-title text-xl font-bold tracking-tight text-slate-900">Supervisory Reports & Governance</h1>
          </div>
          <p className="page-subtitle text-slate-500 text-xs mt-0.5">
            Period-scoped supervisory reports and an application-level tamper-evident audit chain.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'dossiers' && (
            <button 
              onClick={reportsResource.retry}
              className="btn btn-sm flex items-center gap-1.5 text-slate-600 hover:text-slate-900"
              title="Refresh dossier compilation statuses"
            >
              <RefreshCw className="w-3.5 h-3.5 text-indigo-600" /> Refresh Dossiers
            </button>
          )}
          {activeTab === 'audit' && (
            <button 
              onClick={handleExportAuditCSV}
              className="btn btn-sm flex items-center gap-1.5 text-slate-600 hover:text-slate-900"
            >
              <FileDown className="w-3.5 h-3.5 text-indigo-600" /> Export Filtered Audit Records (CSV)
            </button>
          )}
        </div>
      </div>

      {/* Tabs Selector */}
      {reportError && <div role="alert" className="rounded border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-800">{reportError}</div>}
      <div className="flex gap-2 border-b border-slate-200 pb-1">
        {[
          { id: 'dossiers', label: 'Supervisory Dossiers & Reports', icon: FileText, count: reportsResource.data?.length },
          { id: 'audit', label: 'Tamper-Evident Audit Chain', icon: History, count: auditResource.data?.length },
          { id: 'architecture', label: 'Offline ML Architecture & Governance', icon: Cpu }
        ].map(tab => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-xs font-mono font-semibold transition-colors border-b-2 ${
                active 
                  ? 'border-indigo-600 text-slate-900 bg-slate-50 shadow-sm' 
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${active ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' : 'bg-slate-100 text-slate-500'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab 1: Supervisory Dossiers */}
      {activeTab === 'dossiers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {displayReports.length === 0 && <p className="col-span-2 rounded border border-slate-200 bg-white p-5 text-sm text-slate-600">No report definitions are configured in the API.</p>}
          {displayReports.map(r => (
            <div key={r.id} className="card p-5 border-slate-200 hover:border-slate-300 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-white border border-slate-300 flex items-center justify-center shrink-0 text-indigo-600">
                    <FileText className="w-5 h-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="mono-id text-indigo-600 font-bold">{r.id}</span>
                      <span className={`badge border text-[10px] font-mono ${
                        r.status === 'Available' 
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                          : r.status === 'Generating' 
                          ? 'bg-indigo-50 text-indigo-600 border-indigo-200' 
                          : 'bg-white text-slate-500 border-slate-300'
                      }`}>
                        {r.status === 'Available' && <CheckCircle2 className="w-3 h-3 mr-1 inline" />}
                        {r.status === 'Generating' && <Loader2 className="w-3 h-3 mr-1 inline animate-spin" />}
                        {r.status}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900">{r.name}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{r.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono text-slate-500 bg-slate-50 px-3 py-2 rounded-md border border-slate-200">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Generated: <strong className="text-slate-700">{r.generatedAt || 'Pending generation'}</strong></span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3.5 border-t border-slate-200">
                <button 
                  className="btn btn-primary btn-sm flex items-center gap-1.5 text-xs font-mono" 
                  disabled={generating === r.id || (r.id === 'RPT-01' && !selectedEntity)} 
                  onClick={() => handleGenerate(r.id)}
                >
                  {generating === r.id ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Compiling Engine...</>
                  ) : (
                    <><FileCheck className="w-3.5 h-3.5" /> Compile Dossier</>
                  )}
                </button>

                <div className="flex items-center gap-1.5 ml-auto">
                  {r.formats.map((f: string) => {
                    const isExportingThis = exporting === `${r.id}-${f}`
                    return (
                      <button 
                        key={f} 
                        onClick={() => handleExport(r, f)}
                        disabled={isExportingThis || generating === r.id}
                        className="btn btn-sm flex items-center gap-1 text-xs font-mono text-slate-600 hover:text-slate-900 hover:border-indigo-300" 
                        title={`Export ${f} dossier format`}
                      >
                        {isExportingThis ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <FileDown className="w-3.5 h-3.5 text-indigo-600" />
                        )}
                        Export {f}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Tamper-Evident Supervisory Audit Chain */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          {(auditResource.loading || auditResource.error || !auditResource.data) && (
            <RequestState
              loading={auditResource.loading}
              error={auditResource.error}
              retry={auditResource.retry}
              retryInSeconds={auditResource.retryInSeconds}
              loadingMessage="Loading audit records…"
            />
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative min-w-[260px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  className="input pl-9 w-full bg-white text-slate-800 placeholder-slate-400 border-slate-300 text-xs font-mono" 
                  placeholder="Filter by examiner, action, or finding ref..." 
                  value={auditSearch} 
                  onChange={e => setAuditSearch(e.target.value)} 
                />
              </div>

              <select 
                className="select bg-white border-slate-300 text-slate-700 text-xs py-1.5 font-mono"
                value={auditUserFilter}
                onChange={e => setAuditUserFilter(e.target.value)}
              >
                <option value="">All Examiners / Systems</option>
                <option value="Lead Supervisory Examiner">Lead Supervisory Examiner</option>
                <option value="Examiner-07 (Lead)">Examiner-07 (Lead)</option>
                <option value="Examiner-03 (Senior)">Examiner-03 (Senior)</option>
                <option value="Auto-Ingest">Auto-Ingest Pipeline</option>
              </select>

              <select 
                className="select bg-white border-slate-300 text-slate-700 text-xs py-1.5 font-mono"
                value={auditActionFilter}
                onChange={e => setAuditActionFilter(e.target.value)}
              >
                <option value="">All Supervisory Actions</option>
                <option value="Finding Reviewed">Finding Reviewed</option>
                <option value="Data Ingested">Data Ingested</option>
                <option value="Report Generated">Report Generated</option>
              </select>
            </div>

            <div className="text-xs font-mono text-slate-500">
              Showing <strong className="text-indigo-600">{filteredAudit.length}</strong> audit records
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Timestamp (IST)</th>
                    <th>Examiner / Principal</th>
                    <th>Supervisory Action</th>
                    <th>Finding Ref</th>
                    <th>Entity Target</th>
                    <th>Adjudication State</th>
                  </tr>
                </thead>
                <tbody>
                  {!auditResource.loading && !auditResource.error && filteredAudit.length === 0 && (
                    <tr><td colSpan={6} className="py-8 text-center text-sm text-slate-500">No audit records match the selected filters.</td></tr>
                  )}
                  {filteredAudit.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-100 transition-colors">
                      <td className="mono-id text-slate-600">
                        {typeof r.timestamp === 'string' ? r.timestamp.slice(0, 19).replace('T', ' ') : r.timestamp}
                      </td>
                      <td className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-slate-400" />
                        {r.user}
                      </td>
                      <td className="text-xs font-mono text-slate-700">{r.action}</td>
                      <td className="mono-id text-indigo-600">{r.finding || r.findingId || '—'}</td>
                      <td className="mono-id text-slate-600">{r.entityId || '—'}</td>
                      <td>
                        <span className={`badge border text-[10.5px] font-mono ${
                          r.status === 'Confirmed' || r.status === 'Complete'
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                            : r.status === 'Rejected' || r.status === 'Dismissed'
                            ? 'bg-rose-50 text-rose-600 border-rose-200'
                            : 'bg-white text-slate-600 border-slate-300'
                        }`}>
                          {r.status || 'Audited'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredAudit.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-xs font-mono text-slate-400">
                        No audit ledger records match active filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Offline ML Architecture & Governance */}
      {activeTab === 'architecture' && (
        <div className="space-y-5">
          <div className="card p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Server className="w-4 h-4 text-indigo-600" />
                NCIIPC Offline Supervisory Deployment Architecture & Parameters
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRunFleetML}
                  disabled={mlRunning}
                  className="btn btn-primary btn-sm flex items-center gap-1.5 text-xs font-mono"
                >
                  {mlRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  Execute Fleet ML Inference
                </button>
                <button
                  onClick={handleTrainAutoML}
                  disabled={mlRunning}
                  className="btn btn-sm flex items-center gap-1.5 text-xs font-mono border-slate-300 text-slate-700 hover:text-slate-900"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${mlRunning ? 'animate-spin' : ''}`} />
                  Auto-Train Ensemble
                </button>
              </div>
            </div>

            {mlInfoResource.error && (
              <div role="alert" className="rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                Model information is unavailable: {mlInfoResource.error.message}
                <button
                  className="btn btn-sm ml-3"
                  disabled={mlInfoResource.retryInSeconds > 0}
                  onClick={mlInfoResource.retry}
                >
                  {mlInfoResource.retryInSeconds > 0 ? `Retry in ${mlInfoResource.retryInSeconds}s` : 'Retry'}
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 font-mono text-xs">
              {[
                {
                  label: 'Machine Learning Model',
                  value: mlInfo
                    ? `${mlInfo.model_type || 'Model type unavailable'} · ${mlInfo.features?.length ?? 'feature count unavailable'} features`
                    : 'Not available',
                  status: mlInfo?.status === 'trained' ? 'Loaded' : mlInfo ? 'Not trained' : mlInfoResource.loading ? 'Loading' : 'Unavailable'
                },
                {
                  label: 'Target Efficiency Vectors',
                  value: mlInfo?.targets?.length == null ? 'Not available' : `${mlInfo.targets.length} evaluation targets`,
                  status: mlInfo ? 'Reported by API' : 'Unavailable'
                }
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-500">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-900 font-semibold">{item.value}</span>
                    <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-white border border-slate-300 text-indigo-600 font-bold">
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Live ML Inference Output Banner */}
            {mlResult && (
              <div className="p-4 rounded-lg bg-indigo-50 border border-indigo-200 text-xs font-mono space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-900 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-indigo-600" />
                    Offline ML Inference Result: {mlResult.message || `Evaluated ${mlResult.data?.fleetEvaluated ?? mlResult.training_samples ?? 'an unreported number of'} CSE feature vectors`}
                  </span>
                  <span className="text-[10px] text-indigo-600">Deterministic Air-Gap Execution</span>
                </div>
                {mlResult.data?.results && (
                  <div className="text-slate-700 text-[11px] max-h-40 overflow-y-auto bg-white p-2.5 rounded border border-indigo-100">
                    {mlResult.data.results.slice(0, 4).map((r: any, idx: number) => (
                      <div key={idx} className="py-1 border-b border-slate-100 last:border-0 flex items-center justify-between">
                        <span><strong>{r.entity_id}</strong> ({r.period})</span>
                        <span className="text-slate-500">
                          {Object.entries(r.efficiency_scores || {}).map(([k, v]: [string, any]) => `${k}: ${v.score ?? v}`).join(' | ')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {mlResult.error && (
                  <div className="text-rose-600 font-semibold">{mlResult.error}</div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card p-4 space-y-2 border-slate-200 bg-slate-50">
              <div className="label text-indigo-600 font-mono flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" /> (i) Model Architecture
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-mono">
                Ensemble of unsupervised Isolation Forests for triage velocity outliers, statistical Gaussian Z-score bounds (peer deltas), and rule-based finite state machines for regulatory escalation breaches.
              </p>
            </div>

            <div className="card p-4 space-y-2 border-slate-200 bg-slate-50">
              <div className="label text-emerald-600 font-mono flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> (ii) Air-Gap Model Updates
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-mono">
                Model weights update strictly via physical air-gap media bundles (`.tar.gz.sig`). Each release is cryptographically signed and verified with NCIIPC root certificates prior to local extraction.
              </p>
            </div>

            <div className="card p-4 space-y-2 border-slate-200 bg-slate-50">
              <div className="label text-amber-600 font-mono flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> (iii) Explainability Controls
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-mono">
                Every behavioral divergence includes an explicit human-readable `$ [AUDIT_RULE]`, statistical peer comparison delta, and raw evidence event IDs to ensure transparent traceability.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
