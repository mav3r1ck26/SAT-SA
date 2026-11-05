import React, { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { fetchEntities } from '../api/client'
import { StatusBadge, RiskScoreBar, TelemetryPulse } from '../components/ui'
import { Search, Download, Shield, Filter, ArrowUpDown, ChevronRight } from 'lucide-react'

export default function EntitiesList() {
  const { setCurrentPage, setSelectedEntity, assessmentPeriod } = useApp()
  const [entities, setEntities] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [sectorFilter, setSectorFilter] = useState('')
  const [criticalityFilter, setCriticalityFilter] = useState('')
  const [sortKey, setSortKey] = useState<string>('riskScore')
  const [sortAsc, setSortAsc] = useState(false)

  useEffect(() => {
    fetchEntities({ period: assessmentPeriod }).then(setEntities).catch(() => setEntities([]))
  }, [assessmentPeriod])

  const openEntity = (id: string) => { 
    setSelectedEntity(id)
    setCurrentPage('entity') 
  }

  // Dynamically extract real sectors & criticalities from the database
  const availableSectors = Array.from(new Set(entities.map(e => e.sector))).filter(Boolean).sort()
  const availableCriticalities = Array.from(new Set(entities.map(e => e.criticality))).filter(Boolean).sort()

  const filtered = entities
    .filter(e => {
      const matchesSearch = !search || 
        e.id.toLowerCase().includes(search.toLowerCase()) || 
        (e.name || '').toLowerCase().includes(search.toLowerCase()) || 
        (e.sector || '').toLowerCase().includes(search.toLowerCase())
      const matchesSector = !sectorFilter || e.sector === sectorFilter
      const matchesCriticality = !criticalityFilter || e.criticality === criticalityFilter
      return matchesSearch && matchesSector && matchesCriticality
    })
    .sort((a: any, b: any) => {
      const dir = sortAsc ? 1 : -1
      if (typeof a[sortKey] === 'string') return (a[sortKey] || '').localeCompare(b[sortKey] || '') * dir
      return ((a[sortKey] || 0) - (b[sortKey] || 0)) * dir
    })

  const cols = [
    { key: 'id', label: 'Entity Identifier' }, 
    { key: 'name', label: 'Legal Entity Name' }, 
    { key: 'sector', label: 'Critical Sector' },
    { key: 'criticality', label: 'Supervisory Tier' }, 
    { key: 'riskScore', label: 'Risk Score (0-100)' },
    { key: 'maturityScore', label: 'SOC Maturity (0-100)' },
    { key: 'dataCompleteness', label: 'Data Fidelity' },
    { key: 'executionGaps', label: 'Gaps' }, 
    { key: 'negativeSpace', label: 'Blind Spots' },
    { key: 'priority', label: 'Priority' }, 
    { key: 'status', label: 'Status' }
  ]
  
  const toggleSort = (k: string) => { 
    if (sortKey === k) setSortAsc(a => !a)
    else { setSortKey(k); setSortAsc(false) } 
  }

  // Functional CSV export
  const exportFleetCSV = () => {
    const headers = ['Entity ID', 'Legal Name', 'Sector', 'Criticality', 'Risk Score', 'SOC Maturity Score', 'Framework Version', 'Data Fidelity %', 'Execution Gaps', 'Blind Spots', 'Priority', 'Audit Status']
    const rows = filtered.map(e => [
      e.id,
      `"${e.name}"`,
      e.sector,
      e.criticality,
      e.riskScore ?? e.metrics?.riskScore ?? 0,
      e.maturityScore ?? '',
      `${e.assessmentFrameworkId || 'SAT-SA-SOC'} v${e.assessmentFrameworkVersion || '1.0.0'}`,
      e.dataCompleteness ?? 0,
      e.executionGaps ?? 0,
      e.negativeSpace ?? 0,
      e.priority ?? 'Normal',
      e.status ?? 'Compliant'
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `SAT-SA_Fleet_Registry_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="p-6 max-w-[1700px] mx-auto space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="page-title text-xl font-bold tracking-tight text-slate-900">Critical Sector Entities Fleet</h1>
            <TelemetryPulse active status="online" label={`${entities.length} CSEs REGISTERED`} />
          </div>
          <p className="page-subtitle text-slate-400 text-xs mt-0.5">
            Designated supervisory universe under National Cyber Infrastructure Protection Examination Framework
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={exportFleetCSV}
            className="btn btn-sm flex items-center gap-1.5 text-slate-700 hover:text-slate-900"
            title="Download full CSV list of entities"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" /> Export Fleet (CSV)
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              className="input pl-9 w-full bg-white text-slate-800 placeholder-slate-500 border-slate-200 focus:border-indigo-200 text-xs" 
              placeholder="Search by CSE ID, organization name, or sector..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
          
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400 mr-0.5" />
            <select 
              className="select bg-white border-slate-200 text-slate-700 text-xs py-1.5" 
              value={sectorFilter} 
              onChange={e => setSectorFilter(e.target.value)}
            >
              <option value="">All Sectors ({entities.length})</option>
              {availableSectors.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <select 
              className="select bg-white border-slate-200 text-slate-700 text-xs py-1.5" 
              value={criticalityFilter} 
              onChange={e => setCriticalityFilter(e.target.value)}
            >
              <option value="">All Supervisory Tiers</option>
              {availableCriticalities.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {(search || sectorFilter || criticalityFilter) && (
            <button
              onClick={() => { setSearch(''); setSectorFilter(''); setCriticalityFilter('') }}
              className="text-xs font-mono text-indigo-600 hover:underline px-2 py-1"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
          <span>Showing <strong className="text-indigo-600">{filtered.length}</strong> of {entities.length} entities</span>
        </div>
      </div>

      {/* Fleet Table */}
      <div className="card overflow-hidden">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                {cols.map(c => (
                  <th 
                    key={c.key} 
                    className="cursor-pointer select-none hover:text-indigo-600 transition-colors" 
                    onClick={() => toggleSort(c.key)}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{c.label}</span>
                      <ArrowUpDown className={`w-3 h-3 ${sortKey === c.key ? 'text-indigo-600' : 'text-slate-600'}`} />
                    </div>
                  </th>
                ))}
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e: any) => {
                const score = e.riskScore ?? e.metrics?.riskScore ?? 50
                const completeness = e.dataCompleteness ?? 85
                return (
                  <tr 
                    key={e.id} 
                    className="cursor-pointer hover:bg-slate-100 transition-colors" 
                    onClick={() => openEntity(e.id)}
                  >
                    <td className="font-mono text-indigo-600 font-bold">
                      <div className="flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-slate-400" />
                        <span>{e.id}</span>
                      </div>
                    </td>
                    <td className="text-xs font-medium text-slate-700">{e.name}</td>
                    <td>
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-50 border border-slate-200 text-slate-600">
                        {e.sector}
                      </span>
                    </td>
                    <td><StatusBadge status={e.criticality || 'Critical'} /></td>
                    <td className="min-w-[150px]">
                      <RiskScoreBar score={score} showLabel />
                    </td>
                    <td className="font-mono text-xs text-indigo-700 font-semibold" title={`${e.assessmentFrameworkId || 'SAT-SA-SOC'} v${e.assessmentFrameworkVersion || '1.0.0'}`}>
                      {e.maturityScore == null ? '—' : `${e.maturityScore} / 100`}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${completeness > 80 ? 'bg-emerald-400' : completeness > 60 ? 'bg-amber-400' : 'bg-rose-400'}`}
                            style={{ width: `${completeness}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] text-slate-600">{completeness}%</span>
                      </div>
                    </td>
                    <td className="font-mono text-xs text-slate-700 text-center font-bold">
                      {e.executionGaps ?? 0}
                    </td>
                    <td className="font-mono text-xs text-slate-400 text-center">
                      {e.negativeSpace ?? 0}
                    </td>
                    <td><StatusBadge status={e.priority} /></td>
                    <td><StatusBadge status={e.status} /></td>
                    <td className="text-right">
                      <button className="text-[11.5px] font-mono text-indigo-600 hover:underline flex items-center gap-1 ml-auto">
                        Dossier <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={12} className="text-center py-10 text-xs text-slate-400 font-mono">
                    No matching critical sector entities found. Try adjusting your search query or filters.
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
