import React, { useEffect, useState } from 'react'
import { Activity, ChevronLeft, ChevronRight, Search, TriangleAlert } from 'lucide-react'
import { fetchAnomalies, fetchEntities } from '../api/client'
import StatCard from '../components/StatCard'
import { SeverityBadge } from '../components/ui'

const pageSize = 50

export default function Anomalies() {
  const [entities, setEntities] = useState<any[]>([])
  const [anomalies, setAnomalies] = useState<any[]>([])
  const [summary, setSummary] = useState<any>({ total: 0, volumeSpikes: 0, durationAnomalies: 0, lowEvidence: 0 })
  const [total, setTotal] = useState(0)
  const [pageCount, setPageCount] = useState(1)
  const [page, setPage] = useState(1)
  const [entityId, setEntityId] = useState('')
  const [severity, setSeverity] = useState('')
  const [type, setType] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { fetchEntities().then(setEntities).catch(() => setEntities([])) }, [])

  useEffect(() => {
    let active = true
    const timer = window.setTimeout(() => {
      setLoading(true)
      setError('')
      const params: Record<string, string> = { page: String(page), pageSize: String(pageSize) }
      if (entityId) params.entityId = entityId
      if (severity) params.severity = severity
      if (type) params.type = type
      if (search.trim()) params.search = search.trim()
      fetchAnomalies(params).then(result => {
        if (!active) return
        setAnomalies(result.anomalies || [])
        setSummary(result.summary || { total: 0, volumeSpikes: 0, durationAnomalies: 0, lowEvidence: 0 })
        setTotal(result.total || 0)
        setPageCount(result.pageCount || 1)
      }).catch(err => {
        if (!active) return
        setAnomalies([])
        setError(err instanceof Error ? err.message : 'Could not load anomalies')
      }).finally(() => { if (active) setLoading(false) })
    }, 200)
    return () => { active = false; window.clearTimeout(timer) }
  }, [page, entityId, severity, type, search])

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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Detected Anomalies" value={String(summary.total || 0)} trend={0} icon="alert" accent="neutral" />
        <StatCard label="Alert Volume Spikes" value={String(summary.volumeSpikes || 0)} trend={0} icon="alerts" accent="warning" />
        <StatCard label="Investigation Durations" value={String(summary.durationAnomalies || 0)} trend={0} icon="cases" accent="info" />
        <StatCard label="Low Evidence Cases" value={String(summary.lowEvidence || 0)} trend={0} icon="shield" accent="danger" />
      </div>

      <section className="card overflow-hidden">
        <div className="card-header flex-col items-stretch gap-3 lg:flex-row lg:items-center">
          <div>
            <div className="card-title"><TriangleAlert className="h-4 w-4 text-amber-600" /> Anomaly Register</div>
            <div className="card-subtitle">Showing {total ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, total)} of {total.toLocaleString()} matches</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input className="input w-full pl-8 sm:w-52" placeholder="Search records" value={search} onChange={event => { setSearch(event.target.value); setPage(1) }} />
            </label>
            <select className="select" value={entityId} onChange={updateFilter(setEntityId)}>
              <option value="">All entities</option>
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

        {error && <div role="alert" className="m-4 rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Could not load anomalies: {error}</div>}
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Type</th><th>Entity</th><th>Case</th><th>Severity</th><th>Confidence</th><th>Evidence</th><th>Score</th></tr></thead>
            <tbody>
              {!loading && anomalies.map((item, index) => (
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
              {loading && <tr><td colSpan={7} className="py-10 text-center text-slate-400">Loading current anomaly results…</td></tr>}
              {!loading && !error && anomalies.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-slate-400">No anomalies match the selected filters.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
          <span className="text-xs text-slate-500">Page {page} of {pageCount} · 50 records per page</span>
          <div className="flex gap-2">
            <button className="btn btn-sm" disabled={page <= 1 || loading} onClick={() => setPage(value => Math.max(1, value - 1))}><ChevronLeft className="h-3.5 w-3.5" /> Previous</button>
            <button className="btn btn-sm" disabled={page >= pageCount || loading} onClick={() => setPage(value => Math.min(pageCount, value + 1))}>Next <ChevronRight className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      </section>
    </div>
  )
}
