import React, { useEffect, useState } from 'react'
import { Activity, ChevronLeft, ChevronRight, Search, TriangleAlert } from 'lucide-react'
import { fetchAnomalies, fetchEntities } from '../api/client'
import StatCard from '../components/StatCard'
import { SeverityBadge } from '../components/ui'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useApiResource } from '../hooks/useApiResource'

const pageSize = 50

export default function Anomalies() {
  const { assessmentPeriod, entityFilter, setEntityFilter } = useApp()
  const { user } = useAuth()
  const entitiesResource = useApiResource<any[]>(
    `anomaly-entities:${assessmentPeriod}`,
    signal => fetchEntities({ period: assessmentPeriod }, signal)
  )
  const [page, setPage] = useState(1)
  const [severity, setSeverity] = useState('')
  const [type, setType] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const entityId = entityFilter === 'ALL'
    ? (user?.role === 'SOC Manager' ? user.assignedEntityIds[0] || '' : '')
    : entityFilter

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [search])

  const params: Record<string, string> = {
    page: String(page),
    pageSize: String(pageSize),
    period: assessmentPeriod,
    ...(entityId ? { entityId } : {}),
    ...(severity ? { severity } : {}),
    ...(type ? { type } : {}),
    ...(debouncedSearch ? { search: debouncedSearch } : {})
  }
  const anomalyKey = new URLSearchParams(params).toString()
  const anomalyResource = useApiResource(
    `anomalies:${anomalyKey}`,
    signal => fetchAnomalies(params, signal)
  )
  const anomalies = anomalyResource.data?.anomalies || []
  const summary = anomalyResource.data?.summary
  const total = anomalyResource.data?.total ?? 0
  const pageCount = anomalyResource.data?.pageCount ?? 1
  const entities = entitiesResource.data || []

  const updateFilter = (setter: (value: string) => void) => (event: React.ChangeEvent<HTMLSelectElement>) => {
    setter(event.target.value)
    setPage(1)
  }

  return (
    <div className="p-6 max-w-[1700px] mx-auto space-y-5">
      <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title text-2xl">Operational Anomalies</h1>
          <p className="page-subtitle">Outlier alerts and case evidence, filtered from current system records.</p>
        </div>
        <span className="badge border border-indigo-200 bg-indigo-50 text-indigo-700"><Activity className="h-3.5 w-3.5" /> Live analytics</span>
      </div>

      {entitiesResource.error && (
        <div role="alert" className="rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          Could not load the entity filter: {entitiesResource.error.message}
          <button className="btn btn-sm ml-3" disabled={entitiesResource.retryInSeconds > 0} onClick={entitiesResource.retry}>
            {entitiesResource.retryInSeconds > 0 ? `Retry in ${entitiesResource.retryInSeconds}s` : 'Retry'}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Detected Anomalies" value={summary ? String(summary.total) : '—'} icon="alert" accent="neutral" />
        <StatCard label="Alert Volume Spikes" value={summary ? String(summary.volumeSpikes) : '—'} icon="alerts" accent="warning" />
        <StatCard label="Investigation Durations" value={summary ? String(summary.durationAnomalies) : '—'} icon="cases" accent="info" />
        <StatCard label="Low Evidence Cases" value={summary ? String(summary.lowEvidence) : '—'} icon="shield" accent="danger" />
      </div>

      <section className="card overflow-hidden">
        <div className="card-header flex-col items-stretch gap-3 lg:flex-row lg:items-center">
          <div>
            <div className="card-title"><TriangleAlert className="h-4 w-4 text-amber-600" /> Anomaly Register</div>
            <div className="card-subtitle">
              {anomalyResource.data
                ? `Showing ${total ? (page - 1) * pageSize + 1 : 0}–${Math.min(page * pageSize, total)} of ${total.toLocaleString()} matches`
                : 'Results unavailable until the request completes.'}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input className="input w-full pl-8 sm:w-52" placeholder="Search records" value={search} onChange={event => { setSearch(event.target.value); setPage(1) }} />
            </label>
            <select className="select" value={entityFilter} onChange={updateFilter(setEntityFilter)}>
              <option value="ALL">{user?.role === 'SOC Manager' ? 'Assigned entity' : 'All entities'}</option>
              {entities.map(entity => <option key={entity.id} value={entity.id}>{entity.id}</option>)}
            </select>
            <select className="select" value={type} onChange={updateFilter(setType)}>
              <option value="">All types</option>
              <option value="VOLUME_SPIKE">Alert volume spike</option>
              <option value="DURATION_ANOMALY">Duration anomaly</option>
              <option value="LOW_EVIDENCE">Low evidence</option>
            </select>
            <select className="select" value={severity} onChange={updateFilter(setSeverity)}>
              <option value="">All severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
            </select>
          </div>
        </div>

        {anomalyResource.error && (
          <div role="alert" className="m-4 rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            Could not load anomalies: {anomalyResource.error.message}
            <button className="btn btn-sm ml-3" disabled={anomalyResource.retryInSeconds > 0} onClick={anomalyResource.retry}>
              {anomalyResource.retryInSeconds > 0 ? `Retry in ${anomalyResource.retryInSeconds}s` : 'Retry'}
            </button>
          </div>
        )}
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Type</th><th>Entity</th><th>Case</th><th>Severity</th><th>Confidence</th><th>Evidence</th><th>Score</th></tr></thead>
            <tbody>
              {!anomalyResource.loading && !anomalyResource.error && anomalies.map((item, index) => (
                <tr key={`${item.type}-${item.caseId || item.entityId}-${index}`}>
                  <td className="font-medium text-slate-800">{item.type.replace(/_/g, ' ')}</td>
                  <td className="mono-id">{item.entityId}</td>
                  <td className="mono-id">{item.caseId || '—'}</td>
                  <td><SeverityBadge severity={item.severity} /></td>
                  <td className="font-mono">{item.confidence}%</td>
                  <td className="max-w-[420px] text-slate-600">{item.description}</td>
                  <td className="font-mono font-semibold">{item.anomalyScore}</td>
                </tr>
              ))}
              {anomalyResource.loading && <tr><td colSpan={7} className="py-10 text-center text-slate-400">Loading current anomaly results…</td></tr>}
              {!anomalyResource.loading && !anomalyResource.error && anomalyResource.data && anomalies.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-slate-400">No anomalies match the selected filters.</td></tr>}
              {anomalyResource.error && <tr><td colSpan={7} className="py-10 text-center text-rose-700">Results could not be loaded.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
          <span className="text-xs text-slate-500">{anomalyResource.data ? `Page ${page} of ${pageCount} · 50 records per page` : 'Pagination unavailable'}</span>
          <div className="flex gap-2">
            <button className="btn btn-sm" disabled={page <= 1 || anomalyResource.loading || !anomalyResource.data} onClick={() => setPage(value => Math.max(1, value - 1))}><ChevronLeft className="h-3.5 w-3.5" /> Previous</button>
            <button className="btn btn-sm" disabled={page >= pageCount || anomalyResource.loading || !anomalyResource.data} onClick={() => setPage(value => Math.min(pageCount, value + 1))}>Next <ChevronRight className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      </section>
    </div>
  )
}
