import React, { useState, useEffect } from 'react'
import { fetchAuditLog, exportAuditLog } from '../api/client'
import { Download, Search, Shield, Filter, Key, CheckCircle2, AlertCircle } from 'lucide-react'
import { TelemetryPulse } from '../components/ui'

export default function AuditTrail() {
  const [search, setSearch] = useState('')
  const [records, setRecords] = useState<any[]>([])
  const [userFilter, setUserFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')

  useEffect(() => {
    const params: Record<string, string> = {}
    if (userFilter) params.user = userFilter
    if (actionFilter) params.action = actionFilter
    if (search) params.search = search
    fetchAuditLog(Object.keys(params).length ? params : undefined).then(setRecords).catch(() => setRecords([]))
  }, [userFilter, actionFilter])

  const filtered = records.filter(r =>
    !search || (r.user || '').includes(search) || (r.action || '').includes(search) || (r.entityId || '').includes(search) || (r.finding || '').includes(search)
  )

  const handleExport = async () => {
    try {
      const data = await exportAuditLog()
      const csv = ['Timestamp,User,Action,Finding,Entity,Status']
      data.forEach((r: any) => csv.push(`${r.timestamp},${r.user},${r.action},${r.finding || ''},${r.entityId || ''},${r.status || ''}`))
      const blob = new Blob([csv.join('\n')], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-trail-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch { /* ignore */ }
  }

  return (
    <div className="p-6 max-w-[1700px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="page-title text-2xl font-bold tracking-tight">Supervisory Immutable Audit Ledger</h1>
            <TelemetryPulse active status="online" label="SHA-256 APPEND-ONLY LOG" />
          </div>
          <p className="page-subtitle text-slate-500 mt-0.5">
            Tamper-evident chronological journal of all examiner adjudications, data ingestion runs, and regulatory exports
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-sm flex items-center gap-1.5 text-slate-600" onClick={handleExport}>
            <Download className="w-3.5 h-3.5 text-indigo-600" /> Export Audit Trail (CSV)
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100/60 p-3 rounded-lg border border-slate-200">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              className="input pl-9 w-full bg-slate-50 text-slate-800 placeholder-slate-500 border-slate-300/80 focus:border-indigo-500 text-xs" 
              placeholder="Search by examiner ID, action, CSE ID, or finding hash..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
          
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500 mr-0.5" />
            <select 
              className="select bg-slate-50 border-slate-300/80 text-slate-700 text-xs py-1.5" 
              value={userFilter} 
              onChange={e => setUserFilter(e.target.value)}
            >
              <option value="">All Examiners / Agents</option>
              <option value="Examiner-07">Examiner-07 (Lead)</option>
              <option value="Examiner-03">Examiner-03</option>
              <option value="Supervisor-02">Supervisor-02 (Admin)</option>
              <option value="Auto-Ingest">Auto-Ingest (Local Airgap)</option>
            </select>
          </div>

          <div>
            <select 
              className="select bg-slate-50 border-slate-300/80 text-slate-700 text-xs py-1.5" 
              value={actionFilter} 
              onChange={e => setActionFilter(e.target.value)}
            >
              <option value="">All Audit Operations</option>
              <option value="Finding Reviewed">Finding Reviewed</option>
              <option value="Recommendation Assigned">Recommendation Assigned</option>
              <option value="Data Ingested">Data Ingested</option>
            </select>
          </div>
        </div>

        <div className="text-xs font-mono text-slate-500 flex items-center gap-2">
          <span>Showing <strong className="text-indigo-600">{filtered.length}</strong> logged transactions</span>
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
              {filtered.map((r, i) => (
                <tr key={i} className="hover:bg-slate-200/40 transition-colors">
                  <td className="mono-id text-slate-600">
                    {typeof r.timestamp === 'string' ? r.timestamp.slice(0, 19).replace('T', ' ') : r.timestamp}
                  </td>
                  <td className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-slate-500" />
                    {r.user}
                  </td>
                  <td className="text-xs font-mono text-slate-700">{r.action}</td>
                  <td className="mono-id text-indigo-600">{r.finding || '—'}</td>
                  <td className="mono-id text-slate-600">{r.entityId || '—'}</td>
                  <td>
                    <span className={`badge border text-[10.5px] font-mono ${
                      r.status === 'Confirmed' || r.status === 'Complete'
                        ? 'bg-emerald-50/80 text-emerald-700 border-emerald-200/60' 
                        : r.status === 'In Progress' 
                        ? 'bg-blue-50/80 text-indigo-600 border-cyan-200/60' 
                        : r.status === 'Warning' 
                        ? 'bg-amber-50/80 text-amber-700 border-amber-200/60' 
                        : r.status === 'Dismissed' 
                        ? 'bg-slate-100 text-slate-500 border-slate-300 line-through' 
                        : 'bg-slate-100 text-slate-600 border-slate-300'
                    }`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}