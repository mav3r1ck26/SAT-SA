import React, { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { fetchEntities } from '../api/client'
import { StatusBadge, RiskScoreBar, TelemetryPulse } from '../components/ui'
import { Search, Download, Shield, Filter, Database, ArrowUpDown, ChevronRight } from 'lucide-react'

export default function EntitiesList() {
  const { setCurrentPage, setSelectedEntity } = useApp()
  const [entities, setEntities] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [sectorFilter, setSectorFilter] = useState('')
  const [criticalityFilter, setCriticalityFilter] = useState('')
  const [sortKey, setSortKey] = useState<string>('riskScore')
  const [sortAsc, setSortAsc] = useState(false)

  useEffect(() => {
    const params: Record<string, string> = {}
    if (sectorFilter) params.sector = sectorFilter
    if (criticalityFilter) params.criticality = criticalityFilter
    fetchEntities(Object.keys(params).length ? params : undefined).then(setEntities).catch(() => setEntities([]))
  }, [sectorFilter, criticalityFilter])

  const openEntity = (id: string) => { 
    setSelectedEntity(id)
    setCurrentPage('entity') 
  }

  const filtered = entities
    .filter(e => !search || e.id.toLowerCase().includes(search.toLowerCase()) || (e.name || '').toLowerCase().includes(search.toLowerCase()) || (e.sector || '').toLowerCase().includes(search.toLowerCase()))
    .sort((a: any, b: any) => {
      const dir = sortAsc ? 1 : -1
      if (typeof a[sortKey] === 'string') return (a[sortKey] || '').localeCompare(b[sortKey] || '') * dir
      return ((a[sortKey] || 0) - (b[sortKey] || 0)) * dir
    })

  const cols = [
    { key: 'id', label: 'Entity Identifier' }, 
    { key: 'name', label: 'Entity Legal Name' }, 
    { key: 'sector', label: 'Critical Sector' },
    { key: 'criticality', label: 'Supervisory Tier' }, 
    { key: 'riskScore', label: 'Risk Score (0-100)' },
    { key: 'dataCompleteness', label: 'Data Fidelity' },
    { key: 'executionGaps', label: 'Gaps' }, 
    { key: 'negativeSpace', label: 'Blind Spots' },
    { key: 'priority', label: 'Exam Priority' }, 
    { key: 'status', label: 'Audit Status' }
  ]
  
  const toggleSort = (k: string) => { 
    if (sortKey === k) setSortAsc(a => !a)
    else { setSortKey(k); setSortAsc(false) } 
  }

  return (
    <div className="p-6 max-w-[1700px] mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyber-800 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="page-title text-2xl font-bold tracking-tight">Critical Sector Entities Fleet</h1>
            <TelemetryPulse active status="online" label={`${entities.length} CSEs REGISTRY`} />
          </div>
          <p className="page-subtitle text-cyber-400 mt-0.5">
            Designated supervisory universe under National Cyber Infrastructure Protection Examination Framework
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-sm flex items-center gap-1.5 text-cyber-300">
            <Download className="w-3.5 h-3.5 text-neonCyan" /> Export Fleet Inventory (CSV)
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 bg-cyber-900/60 p-3 rounded-lg border border-cyber-800">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyber-400" />
            <input 
              className="input pl-9 w-full bg-cyber-950/80 text-cyber-100 placeholder-cyber-500 border-cyber-700/80 focus:border-neonCyan text-xs" 
              placeholder="Search by CSE ID, organization name, or critical sector..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
          
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-cyber-400 mr-0.5" />
            <select 
              className="select bg-cyber-950/80 border-cyber-700/80 text-cyber-200 text-xs py-1.5" 
              value={sectorFilter} 
              onChange={e => setSectorFilter(e.target.value)}
            >
              <option value="">All Sectors ({entities.length})</option>
              {['Banking & Finance','Power & Energy','Telecommunications','Civil Aviation','Nuclear','Defence & Strategic','Railways','Health & Pharma'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <select 
              className="select bg-cyber-950/80 border-cyber-700/80 text-cyber-200 text-xs py-1.5" 
              value={criticalityFilter} 
              onChange={e => setCriticalityFilter(e.target.value)}
            >
              <option value="">All Criticality Tiers</option>
              {['Tier 1 - Critical','Tier 2 - High','Tier 3 - Medium','Tier 4 - Low','Critical','High','Medium','Low'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-xs font-mono text-cyber-400 flex items-center gap-2">
          <span>Showing <strong className="text-neonCyan">{filtered.length}</strong> of {entities.length} entities</span>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                {cols.map(c => (
                  <th 
                    key={c.key} 
                    className="cursor-pointer select-none hover:text-neonCyan transition-colors" 
                    onClick={() => toggleSort(c.key)}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{c.label}</span>
                      <ArrowUpDown className={`w-3 h-3 ${sortKey === c.key ? 'text-neonCyan' : 'text-cyber-600'}`} />
                    </div>
                  </th>
                ))}
                <th className="text-right">Examination</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e: any) => {
                const score = e.riskScore ?? e.metrics?.riskScore ?? 50
                const completeness = e.dataCompleteness ?? 85
                return (
                  <tr 
                    key={e.id} 
                    className="cursor-pointer hover:bg-cyber-800/50 transition-colors" 
                    onClick={() => openEntity(e.id)}
                  >
                    <td className="mono-id text-neonCyan font-bold">
                      <div className="flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-cyber-400" />
                        {e.id}
                      </div>
                    </td>
                    <td className="text-xs font-semibold text-cyber-100">{e.name}</td>
                    <td>
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-cyber-900 border border-cyber-700/60 text-cyber-300">
                        {e.sector}
                      </span>
                    </td>
                    <td><StatusBadge status={e.criticality || 'Critical'} /></td>
                    <td className="min-w-[160px]">
                      <RiskScoreBar score={score} showLabel />
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-cyber-800 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${completeness > 80 ? 'bg-neonEmerald' : completeness > 60 ? 'bg-neonAmber' : 'bg-neonRose'}`}
                            style={{ width: `${completeness}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] text-cyber-300">{completeness}%</span>
                      </div>
                    </td>
                    <td className="font-mono text-xs text-cyber-200 text-center font-bold">
                      {e.executionGaps ?? 0}
                    </td>
                    <td className="font-mono text-xs text-cyber-300 text-center">
                      {e.negativeSpace ?? 0}
                    </td>
                    <td><StatusBadge status={e.priority} /></td>
                    <td><StatusBadge status={e.status} /></td>
                    <td className="text-right">
                      <button className="text-[11.5px] font-mono text-neonCyan hover:text-cyber-100 flex items-center gap-1 ml-auto">
                        Dossier <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}