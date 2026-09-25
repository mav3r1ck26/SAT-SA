import React, { useEffect, useState } from 'react'
import StatCard from '../components/StatCard'
import { StackedBar, Donut } from '../components/charts'
import { SeverityBadge, StatusBadge, MitreBadge, TelemetryPulse } from '../components/ui'
import { useApp } from '../context/AppContext'
import { fetchOverview, fetchEntities } from '../api/client'
import { Shield, AlertTriangle, Activity, Filter, Download, ChevronRight, Layers, Database } from 'lucide-react'

const filterChips = ['All CSEs', 'Critical Infra', 'Banking & Finance', 'Energy & Power', 'Telecom', 'High Risk', 'Air-Gap Verified']

const topConcerns = [
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
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('All CSEs')

  useEffect(() => {
    Promise.all([
      fetchOverview().catch(() => null),
      fetchEntities().catch(() => [])
    ]).then(([overview, entities]) => {
      if (overview) {
        setKpis(overview.kpis || [])
        setDistribution(overview.distribution || [])
      }
      setEntities(entities || [])
      setLoading(false)
    })
  }, [])

  const openEntity = (id: string) => { 
    setSelectedEntity(id)
    setCurrentPage('entity') 
  }
  
  const totalCSEs = kpis.find(k => k.label === 'CSEs Assessed')?.value || entitiesList.length || 11

  return (
    <div className="p-6 max-w-[1700px] mx-auto space-y-6">
      {/* Top Banner & Context Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-cyber-800 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="page-title text-2xl font-bold tracking-tight">Supervisory Command Overview</h1>
            <TelemetryPulse active status="online" label="SOC TELEMETRY LIVE" />
            <span className="badge badge-neutral text-[10px] uppercase font-mono tracking-wider">
              NCIIPC EXAM ENGINE v2.4
            </span>
          </div>
          <p className="page-subtitle text-cyber-400 mt-0.5">
            Continuous cross-entity behavioral auditing & supervisory risk quantification across critical sector entities
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {loading ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-cyber-900 border border-cyber-700 text-neonCyan text-[11px] font-mono animate-pulse">
              <Activity className="w-3.5 h-3.5 animate-spin" /> Ingesting Telemetry...
            </div>
          ) : (
            <div className="flex items-center gap-2 text-cyber-400 text-[11.5px] font-mono bg-cyber-900/90 px-3 py-1.5 rounded-md border border-cyber-800">
              <Database className="w-3.5 h-3.5 text-neonCyan" />
              <span>Synced: <span className="text-cyber-100 font-semibold">{entitiesList.length} CSEs</span></span>
            </div>
          )}
          <button 
            onClick={() => setCurrentPage('reports')}
            className="btn btn-primary text-xs flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Supervisory Dossier
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-cyber-400 mr-1 shrink-0" />
          {filterChips.map((c) => (
            <button
              key={c}
              onClick={() => setActiveFilter(c)}
              className={`chip-filter ${activeFilter === c ? 'chip-filter-active' : ''}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Top 4 Primary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
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

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {kpis.slice(4).map((kpi, i) => (
          <StatCard 
            key={i + 4} 
            label={kpi.label} 
            value={kpi.display} 
            trend={kpi.trend} 
            icon={kpi.icon} 
            accent="neutral" 
          />
        ))}
      </div>

      {/* Supervisory Risk Landscape Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Risk Distribution & Concerns */}
        <div className="lg:col-span-8 card">
          <div className="card-header border-b border-cyber-800/80 pb-3 flex items-center justify-between">
            <div>
              <div className="card-title flex items-center gap-2">
                <Shield className="w-4 h-4 text-neonCyan" />
                Supervisory Risk & Behavioral Anomaly Landscape
              </div>
              <div className="card-subtitle text-cyber-400">
                Cross-sectional distribution of behavioral divergences computed from raw SOC telemetry events
              </div>
            </div>
            <span className="badge badge-info text-[10.5px]">ISO 27001 / NCIIPC SEC-402</span>
          </div>

          <div className="p-5 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="label">Fleet Risk Tier Stratification</span>
                <span className="text-[11px] font-mono text-cyber-400">Total: {totalCSEs} Monitored Entities</span>
              </div>
              <StackedBar data={distribution.map(d => ({ level: d.level, count: d.count, color: d.color }))} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="label">Top Supervisory Behavioral Concerns</span>
                <span className="text-[11px] font-mono text-neonAmber flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> 5 High-Impact Gaps Active
                </span>
              </div>

              <div className="divide-y divide-cyber-800/70 border border-cyber-800/80 rounded-lg overflow-hidden bg-cyber-950/60">
                {topConcerns.map((c, i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-2.5 hover:bg-cyber-800/40 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <SeverityBadge severity={c.severity} />
                      <span className="text-[12.5px] font-medium text-cyber-100 truncate">{c.title}</span>
                      <MitreBadge techniqueId={c.mitre} name={c.mitre} />
                    </div>
                    
                    <div className="flex items-center gap-3 sm:gap-4 shrink-0 text-xs font-mono">
                      <span className="text-cyber-300 bg-cyber-900 px-2 py-0.5 rounded border border-cyber-700/60">
                        {c.affectedEntities} CSEs
                      </span>
                      <span className="text-neonCyan font-semibold">
                        {c.confidence}% Conf.
                      </span>
                      <span className="text-cyber-400">
                        {c.evidenceCount} ev.
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Donut Concentration Card */}
        <div className="lg:col-span-4 card flex flex-col">
          <div className="card-header border-b border-cyber-800/80 pb-3">
            <div>
              <div className="card-title flex items-center gap-2">
                <Layers className="w-4 h-4 text-neonEmerald" />
                Concentration of Concern
              </div>
              <div className="card-subtitle text-cyber-400">
                Risk proportion by supervisory threshold
              </div>
            </div>
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
              size={170}
              thickness={18}
            />
            
            <div className="w-full mt-4 pt-4 border-t border-cyber-800/80 grid grid-cols-2 gap-2 text-center text-xs font-mono">
              <div className="p-2 rounded bg-cyber-950/60 border border-cyber-800/60">
                <div className="text-neonRose font-bold text-base">
                  {entitiesList.filter(e => (e.riskScore ?? 0) >= 80).length}
                </div>
                <div className="text-cyber-400 text-[10px] uppercase">Critical Alert CSEs</div>
              </div>
              <div className="p-2 rounded bg-cyber-950/60 border border-cyber-800/60">
                <div className="text-neonCyan font-bold text-base">
                  {entitiesList.filter(e => (e.riskScore ?? 0) < 50).length}
                </div>
                <div className="text-cyber-400 text-[10px] uppercase">Compliant Baseline</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* High-Attention Entities Table */}
      <div className="card">
        <div className="card-header border-b border-cyber-800 pb-3 flex items-center justify-between">
          <div>
            <div className="card-title flex items-center gap-2">
              <Activity className="w-4 h-4 text-neonRose" />
              Critical Sector Entities Requiring Supervisory Intervention
            </div>
            <div className="card-subtitle text-cyber-400">
              Ranked by composite behavioral risk score (ML ensemble & telemetry variance)
            </div>
          </div>
          <button 
            onClick={() => setCurrentPage('entities')}
            className="btn btn-sm flex items-center gap-1 text-cyber-300 hover:text-cyber-100"
          >
            Full Entity Fleet <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Entity Identifier</th>
                <th>Critical Sector</th>
                <th>Supervisory Risk</th>
                <th className="text-center">Execution Gaps</th>
                <th className="text-center">Blind Spots</th>
                <th>Peer Deviation</th>
                <th>Supervisory Priority</th>
                <th>Audit Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {[...entitiesList]
                .sort((a, b) => (b.riskScore ?? b.metrics?.riskScore ?? 0) - (a.riskScore ?? a.metrics?.riskScore ?? 0))
                .slice(0, 8)
                .map((e: any) => {
                  const score = e.riskScore ?? e.metrics?.riskScore ?? 0
                  return (
                    <tr 
                      key={e.id} 
                      className="cursor-pointer hover:bg-cyber-800/50 transition-colors"
                      onClick={() => openEntity(e.id)}
                    >
                      <td className="mono-id font-bold text-neonCyan flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${score >= 80 ? 'bg-neonRose animate-ping' : score >= 60 ? 'bg-neonAmber' : 'bg-neonEmerald'}`} />
                        {e.id}
                        <span className="text-[11px] font-normal text-cyber-400">({e.name})</span>
                      </td>
                      <td className="text-cyber-200">
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-cyber-900 border border-cyber-800 text-cyber-300">
                          {e.sector}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="risk-bar-track w-20">
                            <div 
                              className={`risk-bar-fill ${
                                score >= 85 ? 'bg-neonRose' :
                                score >= 70 ? 'bg-orange-500' :
                                score >= 55 ? 'bg-neonAmber' :
                                score >= 40 ? 'bg-blue-500' : 'bg-neonEmerald'
                              }`} 
                              style={{ width: `${Math.min(100, Math.max(5, score))}%` }} 
                            />
                          </div>
                          <span className="font-mono text-xs font-bold text-cyber-100">{score}/100</span>
                        </div>
                      </td>
                      <td className="font-mono text-xs text-cyber-300 text-center font-semibold">{e.executionGaps ?? 0}</td>
                      <td className="font-mono text-xs text-cyber-300 text-center">{e.negativeSpace ?? 0}</td>
                      <td>
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10.5px] font-mono font-semibold ${
                          (e.peerDeviation ?? '') === 'High' || (e.peerDeviation ?? '') === 'Very High' 
                            ? 'bg-red-950/70 text-neonRose border border-red-800/60' 
                            : (e.peerDeviation ?? '') === 'Medium' 
                            ? 'bg-amber-950/70 text-neonAmber border border-amber-800/60' 
                            : 'bg-emerald-950/70 text-neonEmerald border border-emerald-800/60'
                        }`}>
                          {e.peerDeviation || 'Normal'}
                        </span>
                      </td>
                      <td><StatusBadge status={e.priority} /></td>
                      <td><StatusBadge status={e.status} /></td>
                      <td className="text-right">
                        <button className="text-[11px] font-mono text-neonCyan hover:underline">
                          Investigate →
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