import React, { useState, useEffect } from 'react'
import StatCard from '../components/StatCard'
import FindingExplanation from '../components/FindingExplanation'
import { SeverityBadge, Confidence, MitreBadge, TelemetryPulse } from '../components/ui'
import { fetchFindings } from '../api/client'
import { 
  AlertOctagon, Download, Filter, ShieldAlert, Cpu, Eye, 
  ChevronDown, ChevronUp, Search, RefreshCw, FileText
} from 'lucide-react'
import { downloadCSV, downloadJSON } from '../utils/export'

export default function ExecutionGaps() {
  const [selected, setSelected] = useState<string | null>(null)
  const [findings, setFindings] = useState<any[]>([])
  const [filterSeverity, setFilterSeverity] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [search, setSearch] = useState('')

  const loadFindings = () => {
    fetchFindings().then(setFindings).catch(() => setFindings([]))
  }

  useEffect(() => {
    loadFindings()
  }, [])

  const filtered = findings.filter(f => {
    if (filterSeverity && f.severity !== filterSeverity) return false
    if (filterStatus && f.status !== filterStatus) return false
    if (search) {
      const q = search.toLowerCase()
      const title = (f.title || f.finding || '').toLowerCase()
      const id = (f.id || '').toLowerCase()
      const entity = (f.entityId || '').toLowerCase()
      const area = (f.controlArea || '').toLowerCase()
      if (!title.includes(q) && !id.includes(q) && !entity.includes(q) && !area.includes(q)) {
        return false
      }
    }
    return true
  })

  const highConfidence = findings.filter(f => (f.confidence ?? 0) >= 90).length
  const criticalFindings = findings.filter(f => f.severity === 'Critical').length
  const entitiesAffected = new Set(findings.map(f => f.entityId)).size

  const handleExportCSV = () => {
    const headers = [
      'Finding ID', 'Title', 'Entity Target', 'MITRE ATT&CK', 
      'Control Domain', 'Evidence Count', 'Confidence (%)', 'Severity', 'Status', 'Reviewed By'
    ]
    const rows = filtered.map(f => [
      f.id,
      f.title || f.finding || 'Behavioral divergence',
      f.entityId,
      f.mitreTechnique || 'T1059',
      f.controlArea || 'Security Operations',
      f.evidenceCount ?? 0,
      f.confidence ?? 0,
      f.severity,
      f.status || 'New',
      f.reviewedBy || 'Unassigned'
    ])
    downloadCSV(`SAT-SA_Execution_Gaps_${new Date().toISOString().slice(0, 10)}`, headers, rows)
  }

  const handleExportJSON = () => {
    downloadJSON(`SAT-SA_Execution_Gaps_${new Date().toISOString().slice(0, 10)}`, filtered)
  }

  return (
    <div className="p-6 max-w-[1700px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="page-title text-2xl font-bold tracking-tight">Execution Gap Findings</h1>
            <TelemetryPulse active status="alert" label="BEHAVIORAL DIVERGENCES" />
          </div>
          <p className="page-subtitle text-slate-500 mt-0.5">
            Cryptographically audited evidence points where actual SOC operational telemetry diverges from stated defensive capability
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={handleExportCSV}
            className="btn btn-sm flex items-center gap-1.5 text-slate-600 hover:text-slate-900"
            title="Download CSV report of active findings"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" /> Export CSV
          </button>
          <button 
            onClick={handleExportJSON}
            className="btn btn-sm flex items-center gap-1.5 text-slate-600 hover:text-slate-900"
            title="Download JSON dossier of active findings"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-600" /> Export JSON
          </button>
          <button 
            onClick={loadFindings}
            className="btn btn-sm flex items-center gap-1.5 text-slate-500 hover:text-slate-800"
            title="Reload findings from database"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard label="Identified Execution Gaps" value={String(findings.length)} trend={3} icon="gap" accent="neutral" />
        <StatCard label="High Confidence (≥90%)" value={String(highConfidence)} trend={1} icon="shield" accent="info" />
        <StatCard label="Critical Severity Gaps" value={String(criticalFindings)} trend={0} icon="alert" accent="danger" />
        <StatCard label="Entities Impacted" value={String(entitiesAffected)} trend={0} icon="building" accent="warning" />
      </div>

      <div className="card overflow-hidden">
        <div className="card-header border-b border-slate-200 pb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <div className="card-title">Active Supervisory Findings Registry</div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input 
                className="input pl-8 py-1 text-xs w-48 bg-slate-50 border-slate-300 text-slate-800 placeholder-slate-400 focus:border-indigo-600"
                placeholder="Search findings..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {/* Severity Filter */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <select 
                className="select bg-slate-50 border-slate-300 text-slate-700 text-xs py-1"
                value={filterSeverity}
                onChange={e => setFilterSeverity(e.target.value)}
              >
                <option value="">All Severities</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
              </select>
            </div>

            {/* Status Filter */}
            <select 
              className="select bg-slate-50 border-slate-300 text-slate-700 text-xs py-1"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="New">New</option>
              <option value="In Review">In Review</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Finding ID</th>
                <th>Behavioral Finding Description</th>
                <th>Entity Target</th>
                <th>MITRE ATT&CK</th>
                <th>Security Control Domain</th>
                <th className="text-center">Evidence Count</th>
                <th>Confidence</th>
                <th>Severity</th>
                <th>Audit Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => (
                <React.Fragment key={f.id}>
                <tr 
                  className={`cursor-pointer transition-colors ${selected === f.id ? 'bg-slate-100 border-l-2 border-l-indigo-500' : 'hover:bg-slate-100'}`}
                  onClick={() => setSelected(selected === f.id ? null : f.id)}
                >
                  <td className="mono-id text-indigo-600 font-bold">{f.id}</td>
                  <td className="text-xs font-semibold text-slate-800 max-w-[320px]">
                    <div className="truncate">{f.title || f.finding || 'Behavioral divergence detected'}</div>
                  </td>
                  <td className="mono-id text-slate-600">{f.entityId}</td>
                  <td>
                    <MitreBadge techniqueId={f.mitreTechnique || 'T1059'} name={f.mitreTechnique || 'T1059'} />
                  </td>
                  <td className="text-xs text-slate-600 font-mono">{f.controlArea || 'Security Operations'}</td>
                  <td className="font-mono text-xs text-slate-700 text-center font-bold">{f.evidenceCount ?? 0}</td>
                  <td><Confidence value={f.confidence ?? 85} compact /></td>
                  <td><SeverityBadge severity={f.severity} /></td>
                  <td>
                    <span className={`badge border text-[10.5px] font-mono ${
                      f.status === 'Confirmed' 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                        : f.status === 'Rejected'
                        ? 'bg-rose-50 text-rose-600 border-rose-200'
                        : f.status === 'In Review' 
                        ? 'bg-indigo-50 text-indigo-600 border-indigo-200' 
                        : 'bg-white text-slate-500 border-slate-300'
                    }`}>
                      {f.status || 'New'}
                    </span>
                  </td>
                  <td className="text-right">
                    <button 
                      className="text-xs font-mono text-indigo-600 hover:text-slate-900 flex items-center gap-1 ml-auto"
                      aria-expanded={selected === f.id}
                      onClick={event => {
                        event.stopPropagation()
                        setSelected(selected === f.id ? null : f.id)
                      }}
                    >
                      {selected === f.id ? (
                        <>Collapse <ChevronUp className="w-3.5 h-3.5" /></>
                      ) : (
                        <>Inspect <ChevronDown className="w-3.5 h-3.5" /></>
                      )}
                    </button>
                  </td>
                </tr>
                {selected === f.id && (
                  <tr className="bg-slate-50">
                    <td colSpan={10} className="p-4">
                      <FindingExplanation
                        id={f.id}
                        entityId={f.entityId}
                        finding={`${f.id} — ${f.title || f.finding}`}
                        severity={f.severity}
                        confidence={f.confidence}
                        whyMatters={f.whyItMatters || f.description}
                        evidence={{ cases: f.evidenceCount ?? 0, criticalAlerts: f.severity === 'Critical' ? (f.evidenceCount ?? 0) : 0, escalationRecords: 0 }}
                        peerComparison={f.peerComparison || 'Peer comparison unavailable'}
                        detectionLogic={f.detectionLogic || f.methodology || 'Behavioral heuristic divergence calculation'}
                        limitations={f.limitations || 'Heuristic indicator requiring statutory examiner confirmation.'}
                        mitre={f.mitreTechnique || 'T1059'}
                        status={f.status}
                        examinerNote={f.examinerNote}
                        reviewedBy={f.reviewedBy}
                        onUpdate={loadFindings}
                      />
                    </td>
                  </tr>
                )}
                </React.Fragment>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-xs font-mono text-slate-400">
                    No execution gaps match your active filters ({filterSeverity || filterStatus || search ? 'filters active' : 'no findings recorded'}).
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
