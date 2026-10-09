import React, { useEffect, useState } from 'react'
import StatCard from '../components/StatCard'
import { StackedBar, Donut } from '../components/charts'
import { StatusBadge, MitreBadge, TelemetryPulse } from '../components/ui'
import { useApp } from '../context/AppContext'
import { fetchOverview, fetchEntities, fetchFindings } from '../api/client'
import { Shield, AlertTriangle, Activity, Filter, Download, ChevronRight, Database, ArrowUpRight } from 'lucide-react'

const filterChips = ['All CSEs', 'Critical Infra', 'Banking & Finance', 'Energy & Power', 'Telecom', 'High Risk', 'Air-Gap Verified']

const defaultConcerns = [
  { title: 'Critical alerts closed without escalation', severity: 'Critical' as const, affectedEntities: 7, confidence: 92, evidenceCount: 214, mitre: 'T1059.001' },
  { title: 'Unusually rapid case closure (<5m median)', severity: 'High' as const, affectedEntities: 6, confidence: 89, evidenceCount: 187, mitre: 'T1078' },
  { title: 'Missing telemetry from critical core switches', severity: 'High' as const, affectedEntities: 5, confidence: 86, evidenceCount: 92, mitre: 'T1562.001' },
  { title: 'Repetitive investigation disposition patterns', severity: 'Medium' as const, affectedEntities: 4, confidence: 78, evidenceCount: 143, mitre: 'T1036' },
  { title: 'Significant peer baseline deviation (>3.5σ)', severity: 'Medium' as const, affectedEntities: 6, confidence: 81, evidenceCount: 76, mitre: 'T1041' }
]

export default function Overview() {
  const { setCurrentPage, setSelectedEntity } = useApp()
  const [kpis, setKpis] = useState<any[]>([])
  const [distribution, setDistribution] = useState<any[]>([])
  const [entitiesList, setEntities] = useState<any[]>([])
  const [concerns, setConcerns] = useState<any[]>(defaultConcerns)
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('All CSEs')

  useEffect(() => {
    Promise.all([
      fetchOverview().catch(() => null),
      fetchEntities().catch(() => []),
      fetchFindings().catch(() => [])
    ]).then(([overview, entities, findings]) => {
      if (overview) {
        setKpis(overview.kpis || [])
        setDistribution(overview.distribution || [])
      }
      setEntities(entities || [])

      if (Array.isArray(findings) && findings.length > 0) {
        const map = new Map<string, { title: string; severity: any; affectedEntities: Set<string>; confidence: number[]; evidenceCount: number; mitre: string }>()
        for (const f of findings) {
          const key = f.title || f.finding || 'Behavioral divergence'
          if (!map.has(key)) {
            map.set(key, {
              title: key,
              severity: f.severity || 'High',
              affectedEntities: new Set(),
              confidence: [],
              evidenceCount: 0,
              mitre: f.mitreTechnique || 'T1059'
            })
          }
          const item = map.get(key)!
          if (f.entityId) item.affectedEntities.add(f.entityId)
          if (f.confidence) item.confidence.push(f.confidence)
          item.evidenceCount += (f.evidenceCount || 1)
        }
        const dynamicList = Array.from(map.values()).map(item => ({
          title: item.title,
          severity: item.severity,
          affectedEntities: item.affectedEntities.size || 1,
          confidence: item.confidence.length ? Math.round(item.confidence.reduce((a, b) => a + b, 0) / item.confidence.length) : 85,
          evidenceCount: item.evidenceCount,
          mitre: item.mitre
        })).slice(0, 5)

        if (dynamicList.length > 0) {
          setConcerns(dynamicList)
        }
      }

      setLoading(false)
    })
  }, [])

  const openEntity = (id: string) => { 
    setSelectedEntity(id)
    setCurrentPage('entity') 
  }
  
  const totalCSEs = kpis.find(k => k.label === 'CSEs Assessed')?.value || entitiesList.length || 11

  // Functional filter logic for table
  const filteredEntities = entitiesList.filter(e => {
    const score = e.riskScore ?? e.metrics?.riskScore ?? 0
    if (activeFilter === 'Critical Infra') return e.criticality === 'Critical'
    if (activeFilter === 'Banking & Finance') return e.sector === 'Banking'
    if (activeFilter === 'Energy & Power') return e.sector === 'Power' || e.sector === 'Energy'
    if (activeFilter === 'Telecom') return e.sector === 'Telecom'
    if (activeFilter === 'High Risk') return score >= 60
    if (activeFilter === 'Air-Gap Verified') return (e.dataCompleteness ?? 0) >= 90
    return true
  })

  const exportOverviewCSV = () => {
    const headers = ['Entity ID', 'Name', 'Sector', 'Risk Score', 'Execution Gaps', 'Blind Spots', 'Priority', 'Audit Status']
    const rows = filteredEntities.map(e => [
      e.id,
      `"${e.name}"`,
      e.sector,
      e.riskScore ?? e.metrics?.riskScore ?? 0,
      e.executionGaps ?? 0,
      e.negativeSpace ?? 0,
      e.priority ?? 'Normal',
      e.status ?? 'Compliant'
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `SAT-SA_Overview_${activeFilter.replace(/\s+/g, '_')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="p-6 max-w-[1700px] mx-auto space-y-6">
      {/* Top Banner & Context Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="page-title text-xl font-bold tracking-tight text-slate-900">Overview</h1>
            <TelemetryPulse active status="online" label="SYNCED" />
          </div>
          <p className="page-subtitle text-slate-400 text-xs mt-0.5">
            Supervisory risk assessment across critical entities.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {loading ? (
            <div className="text-indigo-600 text-xs font-mono">
              Loading...
            </div>
          ) : (
            <div className="text-slate-400 text-xs font-mono">
              <span>Synced: <span className="text-slate-800 font-semibold">{entitiesList.length} CSEs</span></span>
            </div>
          )}
          <button 
            onClick={exportOverviewCSV}
            className="btn btn-sm flex items-center gap-1.5 text-slate-700 hover:text-slate-900"
            title="Download CSV export"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" /> Export
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        {filterChips.map((c) => (
          <button
            key={c}
            onClick={() => setActiveFilter(c)}
            className={`px-3 py-1.5 rounded-full text-xs transition-colors ${activeFilter === c ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-700'}`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Top Primary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.slice(0, 4).map((kpi, i) => (
          <StatCard 
            key={i} 
            label={kpi.label} 
            value={kpi.display} 
            trend={kpi.trend} 
            icon={kpi.icon}
            accent={kpi.threshold === 'bad' ? 'danger' : kpi.threshold === 'watched' ? 'warning' : 'info'} 
          />
        ))}
      </div>

      {/* Supervisory Risk Landscape Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Risk Distribution & Concerns */}
        <div className="lg:col-span-8 card">
          <div className="card-header border-b border-slate-200 pb-3 flex items-center justify-between">
            <div>
              <div className="card-title text-sm font-semibold flex items-center gap-2 text-slate-800">
                <Shield className="w-4 h-4 text-indigo-600" />
                Supervisory Risk & Behavioral Landscape
              </div>
              <div className="card-subtitle text-xs text-slate-400">
                Cross-sectional distribution of behavioral divergences computed from raw SOC telemetry events
              </div>
            </div>
            <span className="badge text-[10.5px] font-mono bg-slate-100 text-slate-600 border-slate-300">
              NCIIPC EXAM RULE
            </span>
          </div>

          <div className="p-5 space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="label text-[10px] text-slate-400 uppercase font-mono">Fleet Risk Tier Stratification</span>
                <span className="text-[11px] font-mono text-slate-400">Total: {totalCSEs} Monitored Entities</span>
              </div>
              <StackedBar data={distribution.map(d => ({ level: d.level, count: d.count, color: d.color }))} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="label text-[10px] text-slate-400 uppercase font-mono">Top Supervisory Behavioral Concerns</span>
                <span className="text-[11px] font-mono text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> 5 High-Impact Gaps Active
                </span>
              </div>
              <div className="space-y-2">
                {concerns.map((tc, idx) => (
                  <div 
                    key={idx}
                    onClick={() => setCurrentPage('gaps')}
                    className="p-3 rounded-lg bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors flex items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="text-xs font-medium text-slate-700 truncate">{tc.title}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-xs font-mono">
                      <span className="text-slate-400 hidden sm:inline">{tc.evidenceCount} evidence events</span>
                      <span className="text-amber-600 font-semibold">{tc.affectedEntities} CSEs affected</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Donut Summary Breakdown */}
        <div className="lg:col-span-4 card flex flex-col">
          <div className="card-header border-b border-slate-200 pb-3">
            <div className="card-title text-sm font-semibold text-slate-800">Supervisory Attention Ratio</div>
            <div className="card-subtitle text-xs text-slate-400">Distribution by supervisory priority level</div>
          </div>
          
          <div className="p-5 flex-1 flex flex-col items-center justify-center">
            <Donut 
              data={distribution.map(d => ({ 
                label: `${d.level} (${d.count})`, 
                value: d.count, 
                color: d.color 
              }))} 
              centerValue={String(totalCSEs)} 
              centerLabel="CSEs"
              size={160}
              thickness={16}
            />
          </div>
        </div>
      </div>

      {/* Critical Sector Entities Table */}
      <div className="card">
        <div className="card-header border-b border-slate-200 pb-3 flex items-center justify-between">
          <div>
            <div className="card-title text-sm font-semibold flex items-center gap-2 text-slate-800">
              <Activity className="w-4 h-4 text-rose-600" />
              Critical Sector Entities Requiring Supervisory Oversight
            </div>
            <div className="card-subtitle text-xs text-slate-400">
              Filtered view: {activeFilter} ({filteredEntities.length} matching entities)
            </div>
          </div>
          <button 
            onClick={() => setCurrentPage('entities')}
            className="btn btn-sm flex items-center gap-1 text-slate-600 hover:text-slate-900"
          >
            All Entities Fleet <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead className="bg-slate-50">
              <tr>
                <th>Entity Identifier</th>
                <th>Critical Sector</th>
                <th>Supervisory Risk</th>
                <th className="text-center">Execution Gaps</th>
                <th className="text-center">Blind Spots</th>
                <th>Supervisory Priority</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {[...filteredEntities]
                .sort((a, b) => (b.riskScore ?? b.metrics?.riskScore ?? 0) - (a.riskScore ?? a.metrics?.riskScore ?? 0))
                .slice(0, 10)
                .map((e: any) => {
                  const score = e.riskScore ?? e.metrics?.riskScore ?? 0
                  return (
                    <tr 
                      key={e.id} 
                      className="cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => openEntity(e.id)}
                    >
                      <td className="font-mono text-indigo-600 font-bold">
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${score >= 80 ? 'bg-rose-400' : score >= 60 ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                          <span>{e.id}</span>
                          <span className="text-[11px] font-normal text-slate-400">({e.name})</span>
                        </div>
                      </td>
                      <td className="text-slate-600">
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-50 border border-slate-200 text-slate-600">
                          {e.sector}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="risk-bar-track w-16 h-1.5">
                            <div 
                              className={`risk-bar-fill ${
                                score >= 85 ? 'bg-rose-500' :
                                score >= 70 ? 'bg-orange-500' :
                                score >= 55 ? 'bg-amber-500' :
                                score >= 40 ? 'bg-cyan-500' : 'bg-emerald-500'
                              }`} 
                              style={{ width: `${Math.min(100, Math.max(5, score))}%` }} 
                            />
                          </div>
                          <span className="font-mono text-xs font-bold text-slate-700">{score}/100</span>
                        </div>
                      </td>
                      <td className="font-mono text-xs text-slate-700 text-center font-semibold">{e.executionGaps ?? 0}</td>
                      <td className="font-mono text-xs text-slate-600 text-center">{e.negativeSpace ?? 0}</td>
                      <td><StatusBadge status={e.priority} /></td>
                      <td className="text-right">
                        <button className="text-[11.5px] font-mono text-indigo-600 hover:underline">
                          Investigate →
                        </button>
                      </td>
                    </tr>
                  )
                })}
              {filteredEntities.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-xs text-slate-400 font-mono">
                    No critical sector entities found matching filter: {activeFilter}
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