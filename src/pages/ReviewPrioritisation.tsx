import React, { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { ApiError, fetchReviewQueue, reviewFinding, fetchFindingEvidence, fetchAlertEvidence } from '../api/client'
import { SeverityBadge, Confidence, TelemetryPulse, MitreBadge } from '../components/ui'
import { 
  CheckCircle2, Eye, Download, XCircle, RefreshCw,
  ChevronDown, ChevronUp, Fingerprint, ExternalLink
} from 'lucide-react'
import { downloadCSV } from '../utils/export'
import { useEntityScope } from '../hooks/useEntityScope'
import { useApiResource } from '../hooks/useApiResource'
import RequestState from '../components/RequestState'

export default function ReviewPrioritisation() {
  const { setCurrentPage, setSelectedEntity, assessmentPeriod } = useApp()
  const entityId = useEntityScope()
  const resource = useApiResource(`review-queue:${assessmentPeriod}:${entityId || 'ALL'}`, signal =>
    fetchReviewQueue(assessmentPeriod, entityId, signal)
  )
  const [expandedEvidenceId, setExpandedEvidenceId] = useState<string | null>(null)
  const queue = resource.data || []
  const evidenceResource = useApiResource(`review-evidence:${expandedEvidenceId || 'none'}`, signal => {
    if (!expandedEvidenceId) return Promise.resolve(null)
    const item = queue.find(candidate => (candidate.ref || candidate.findingId || candidate.id) === expandedEvidenceId)
    if (item?.alertId) return fetchAlertEvidence(item.alertId, signal)
    if (item?.findingId || item?.ref) return fetchFindingEvidence(item.findingId || item.ref, signal)
    return Promise.reject(new Error('This review item has no linked evidence record.'))
  })
  const [filterSeverity, setFilterSeverity] = useState('')
  const [adjudicatingId, setAdjudicatingId] = useState<string | null>(null)
  const [adjudicatedMap, setAdjudicatedMap] = useState<Record<string, string>>({})
  const [actionError, setActionError] = useState('')
  const [actionRetryAt, setActionRetryAt] = useState<number | null>(null)
  const [clock, setClock] = useState(Date.now())

  useEffect(() => {
    if (actionRetryAt === null) return
    const timer = window.setInterval(() => setClock(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [actionRetryAt])
  const actionRetryInSeconds = actionRetryAt === null ? 0 : Math.max(0, Math.ceil((actionRetryAt - clock) / 1000))

  useEffect(() => {
    if (!resource.data) return
    const initialAdjudicated: Record<string, string> = {}
    for (const item of resource.data) {
      const key = item.ref || item.findingId || item.id
      if (item.status && item.status !== 'New') initialAdjudicated[key] = item.status
    }
    setAdjudicatedMap(prev => ({ ...initialAdjudicated, ...prev }))
  }, [resource.data])

  const filtered = queue.filter(item => {
    const sev = item.severity ?? item.priority?.severity
    if (filterSeverity && sev !== filterSeverity) return false
    return true
  })

  const handleExportCSV = () => {
    const headers = [
      'Priority', 'Entity', 'Finding Ref', 'Severity', 'MITRE ATT&CK', 
      'Finding Title', 'Evidence Count', 'Confidence (%)', 'Risk Score', 
      'Suggested Action', 'Assigned Examiner', 'Adjudication Status'
    ]
    const rows = filtered.map((item, idx) => [
      `#${idx + 1}`,
      item.entityId || item.entity || '',
      item.ref || item.findingId || '',
      item.severity ?? item.priority?.severity ?? '',
      item.mitre || '',
      item.reason || item.finding || item.title || '',
      item.evidenceCount ?? '',
      item.confidence ?? '',
      item.riskScore ?? item.score ?? '',
      item.suggestedAction || '',
      adjudicatedMap[item.ref || item.findingId || String(idx)] || 'Pending'
    ])
    downloadCSV(`SAT-SA_Review_Queue_${new Date().toISOString().slice(0, 10)}`, headers, rows)
  }

  if (resource.loading || resource.error || !resource.data) {
    return <RequestState loading={resource.loading} error={resource.error} retry={resource.retry} retryInSeconds={resource.retryInSeconds} loadingMessage="Loading the review queue…" />
  }

  const handleOpenEntity = (item: any) => {
    const entity = item.entityId || item.entity
    if (entity) {
      setSelectedEntity(entity)
      setCurrentPage('entity')
    }
  }

  const handleToggleEvidence = (itemKey: string) => {
    if (expandedEvidenceId === itemKey) {
      setExpandedEvidenceId(null)
      return
    }
    setExpandedEvidenceId(itemKey)
  }

  const handleAdjudicate = async (itemKey: string, findingId: string | undefined, status: 'Confirmed' | 'Rejected') => {
    if (actionRetryInSeconds > 0) return
    if (!findingId) {
      setActionError('This queue item is not linked to a persisted finding and cannot be adjudicated.')
      return
    }
    setAdjudicatingId(itemKey)
    setActionError('')
    try {
      await reviewFinding(findingId, {
        status,
        note: `Adjudicated directly from Supervisory Prioritisation Queue as ${status}.`
      })
      setActionRetryAt(null)
      setAdjudicatedMap(prev => ({ ...prev, [itemKey]: status }))
      resource.retry()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Finding review could not be saved.')
      if (error instanceof ApiError && error.retryAfterMs !== undefined) {
        setActionRetryAt(Date.now() + error.retryAfterMs)
      }
    } finally {
      setAdjudicatingId(null)
    }
  }

  return (
    <div className="p-6 max-w-[1700px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="page-title text-xl font-bold tracking-tight text-slate-900">Supervisory Manual Review Queue</h1>
            <TelemetryPulse active={filtered.length > 0} status={filtered.length > 0 ? 'alert' : 'online'} label={filtered.length > 0 ? 'PENDING REVIEW ITEMS' : 'NO PENDING ITEMS'} />
          </div>
          <p className="page-subtitle text-slate-500 text-xs mt-0.5">
            Persisted findings and telemetry evidence prioritized for the selected entity and assessment period.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select 
            className="select bg-white border-slate-300 text-slate-700 text-xs py-1 font-mono"
            value={filterSeverity}
            onChange={e => setFilterSeverity(e.target.value)}
          >
            <option value="">All Severities ({queue.length})</option>
            <option value="Critical">Critical Only</option>
            <option value="High">High Only</option>
          </select>

          <button 
            onClick={handleExportCSV}
            className="btn btn-sm flex items-center gap-1.5 text-slate-600 hover:text-slate-900"
            title="Download CSV export of prioritized queue"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" /> Export Queue (CSV)
          </button>

          <button 
            onClick={resource.retry}
            className="btn btn-sm flex items-center gap-1.5 text-slate-500 hover:text-slate-800"
            title="Reload review queue"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {actionError && <p role="alert" className="rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{actionError}</p>}

      <div className="flex items-center justify-between gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div className="flex items-center gap-3">
          <span className="badge text-xs font-mono bg-indigo-50 text-indigo-600 border-indigo-200">
            API-REPORTED PRIORITIZATION
          </span>
          <span className="text-xs text-slate-600 font-mono">
            Priority reflects finding and telemetry evidence recorded for the selected scope.
          </span>
        </div>
        <div className="text-xs font-mono text-slate-500">
          Pending Adjudication: <strong className="text-indigo-600">{filtered.length}</strong>
        </div>
      </div>

      <div className="space-y-4">
        {filtered.length > 0 ? filtered.map((item, idx) => {
          const itemKey = item.ref || item.findingId || String(idx)
          const isCritical = (item.severity ?? item.priority?.severity) === 'Critical'
          const adjudicatedStatus = adjudicatedMap[itemKey]
          const isEvidenceExpanded = expandedEvidenceId === itemKey
          const timeline = expandedEvidenceId === itemKey
            ? (evidenceResource.data?.timeline || []).map((evt: any) => ({
              event: evt.event || evt.eventType || 'Event type not reported',
              actor: evt.actor || 'Not reported',
              role: evt.role || 'Not reported',
              time: evt.eventTime
                ? new Date(evt.eventTime).toLocaleTimeString('en-US', { hour12: false }) + ' IST'
                : evt.time || 'Not reported',
              severity: evt.eventType === 'Alert Created' ? 'Critical' : evt.eventType === 'Escalation' ? 'High' : evt.severity || 'Unknown',
              meta: (evt.metadata && evt.metadata.join(', ')) || 'No metadata reported'
            }))
            : []
          const isLoadingEvidence = expandedEvidenceId === itemKey && evidenceResource.loading
          const severity = item.severity ?? item.priority?.severity
          const confidence = item.confidence
          const evidenceCount = item.evidenceCount
          const riskScore = item.riskScore ?? item.score

          return (
            <div key={itemKey} className="card overflow-hidden border-slate-200 hover:border-slate-300 transition-all">
              {/* Header Bar */}
              <div className={`flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-l-4 ${
                adjudicatedStatus === 'Confirmed'
                  ? 'bg-emerald-50 border-l-emerald-500 border-b border-slate-200'
                  : adjudicatedStatus === 'Rejected'
                  ? 'bg-rose-50 border-l-rose-500 border-b border-slate-200'
                  : isCritical 
                  ? 'bg-rose-50 border-l-rose-500 border-b border-slate-200' 
                  : 'bg-amber-50 border-l-amber-500 border-b border-slate-200'
              }`}>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                    PRIORITY #{String(item.priority ?? idx + 1).padStart(2, '0')}
                  </span>
                  <SeverityBadge severity={severity || 'Unknown'} />
                  <span className="mono-id text-indigo-600 font-bold">{item.entityId || item.entity}</span>
                  <span className="text-slate-300">/</span>
                  <span className="mono-id text-slate-600">{item.ref || item.findingId}</span>
                  {item.mitre && <MitreBadge techniqueId={item.mitre} name={item.mitre} />}
                  
                  {adjudicatedStatus && (
                    <span className={`badge border text-[10px] font-mono ${
                      adjudicatedStatus === 'Confirmed' 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                        : 'bg-rose-50 text-rose-600 border-rose-200'
                    }`}>
                      {adjudicatedStatus}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs font-mono">
                  {confidence == null ? <span>Confidence not reported</span> : <Confidence value={confidence} compact />}
                  <span className="text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {evidenceCount == null ? 'Evidence count not reported' : `${evidenceCount} evidence records`}
                  </span>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">{item.reason || item.finding || item.title || 'Finding summary not reported'}</p>
                  {(item.findingType || item.source) && <span className="badge border border-indigo-200 bg-indigo-50 text-indigo-700 text-[10px] font-mono">{item.findingType || item.source}</span>}
                  {item.alertCategory && <span className="badge border border-slate-300 bg-white text-slate-600 text-[10px] font-mono">{item.alertCategory} alert</span>}
                </div>

                <div className="bg-slate-50 rounded-md p-3.5 border border-slate-200 space-y-1.5">
                  <div className="label text-indigo-600 font-mono text-[10px] uppercase">Forensic Flagging Triggers</div>
                  <ul className="space-y-1">
                    {(item.reasons || item.reasonWrap || [item.reason]).filter(Boolean).map((r: string, j: number) => (
                      <li key={j} className="text-xs text-slate-600 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                        <span>{r}</span>
                      </li>
                    ))}
                    {!(item.reasons || item.reasonWrap || [item.reason]).some(Boolean) && (
                      <li className="text-xs text-slate-500">No trigger details were reported.</li>
                    )}
                  </ul>
                </div>

                {/* Inline Evidence Chain-of-Custody Timeline Drawer */}
                {isEvidenceExpanded && (
                  <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-2 text-xs font-mono text-indigo-600 font-bold">
                        <Fingerprint className="w-4 h-4 text-indigo-600" />
                        Chronological Chain-of-Custody Timeline for {item.ref || item.findingId}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEntity(item)}
                          className="text-[11px] font-mono text-indigo-600 hover:underline flex items-center gap-1"
                        >
                          Open Full CSE Profile <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {isLoadingEvidence ? (
                      <div className="text-xs font-mono text-slate-500 py-3 text-center">
                        Loading live forensic event stream for {item.entityId || item.entity}...
                      </div>
                    ) : expandedEvidenceId === itemKey && evidenceResource.error ? (
                      <div role="alert" className="text-sm text-rose-700">
                        Evidence unavailable: {evidenceResource.error.message}
                        <button
                          className="btn btn-sm ml-3"
                          disabled={evidenceResource.retryInSeconds > 0}
                          onClick={evidenceResource.retry}
                        >
                          {evidenceResource.retryInSeconds > 0 ? `Retry in ${evidenceResource.retryInSeconds}s` : 'Retry'}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2 border-l-2 border-slate-200 ml-2 pl-4 py-1">
                        {timeline.length === 0 && <div className="text-xs text-slate-500 py-2">No event records are linked to this review item yet.</div>}
                        {timeline.map((evt: any, i: number) => (
                          <div key={i} className="text-xs relative pb-2 last:pb-0">
                            <span className={`absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border border-white ${
                              evt.severity === 'Critical' ? 'bg-rose-600' : evt.severity === 'High' ? 'bg-amber-600' : 'bg-slate-300'
                            }`} />
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-slate-700">{evt.event}</span>
                              <span className="text-[10px] font-mono text-indigo-600 bg-white px-1.5 py-0.2 rounded border border-slate-200 shrink-0">
                                {evt.time}
                              </span>
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 flex items-center gap-2 mt-0.5">
                              <span>Actor: <strong className="text-slate-600">{evt.actor}</strong></span>
                              <span>·</span>
                              <span>Role: {evt.role}</span>
                              <span>·</span>
                              <span className="text-slate-500">{evt.meta}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Card Action Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono pt-1">
                  <div className="flex items-center gap-4 text-slate-500">
                    <span>Composite Risk: <strong className="text-rose-600 font-bold">{riskScore == null ? 'Not reported' : `${riskScore}/100`}</strong></span>
                    <span>·</span>
                    <span>Fidelity: <strong className="text-indigo-600 font-bold">{confidence == null ? 'Not reported' : `${confidence}%`}</strong></span>
                    <span>·</span>
                    <span className="text-slate-600 italic">Action: {item.suggestedAction || 'Not reported'}</span>
                  </div>

                  <div className="flex items-center gap-2 ml-auto">
                    <button 
                      onClick={() => handleToggleEvidence(itemKey)}
                      className="btn btn-primary btn-sm flex items-center gap-1.5 text-xs font-mono"
                    >
                      <Eye className="w-3.5 h-3.5" /> 
                      {isEvidenceExpanded ? 'Collapse Telemetry' : 'Inspect Telemetry'}
                      {isEvidenceExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {adjudicatedStatus ? (
                      <span className="text-xs font-mono text-slate-500 px-3 py-1 rounded bg-white border border-slate-200">
                        {adjudicatedStatus === 'Confirmed' ? '✓ Confirmed' : '✕ Dismissed'}
                      </span>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => handleAdjudicate(itemKey, item.findingId || item.ref, 'Confirmed')}
                          disabled={adjudicatingId === itemKey || actionRetryInSeconds > 0}
                          className="btn btn-sm text-emerald-600 border-emerald-200 hover:bg-emerald-100 text-xs font-mono"
                          title="Confirm finding into statutory audit ledger"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1 inline" /> {actionRetryInSeconds > 0 ? `Retry in ${actionRetryInSeconds}s` : 'Confirm'}
                        </button>
                        <button 
                          onClick={() => handleAdjudicate(itemKey, item.findingId || item.ref, 'Rejected')}
                          disabled={adjudicatingId === itemKey || actionRetryInSeconds > 0}
                          className="btn btn-sm text-rose-600 border-rose-200 hover:bg-rose-100 text-xs font-mono"
                          title="Dismiss finding as operational baseline variance"
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1 inline" /> {actionRetryInSeconds > 0 ? `Retry in ${actionRetryInSeconds}s` : 'Dismiss'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        }) : (
          <div className="card p-12 text-center text-xs font-mono text-slate-500 bg-slate-50 border-slate-200">
            No supervisory examination items currently pending in queue.
          </div>
        )}
      </div>
    </div>
  )
}
