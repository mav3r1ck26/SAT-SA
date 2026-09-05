import React, { useEffect, useState } from 'react'
import StatCard from '../components/StatCard'
import { StackedBar, Donut } from '../components/charts'
import { SeverityBadge, StatusBadge } from '../components/ui'
import { useApp } from '../context/AppContext'
import { fetchOverview, fetchEntities, fetchGaps } from '../api/client'

const filterChips = ['All CSEs', 'Criticality', 'Sector', 'Region', 'Risk level', 'Date range']

const topConcerns = [
  { title: 'Critical alerts closed without escalation', severity: 'Critical' as const, affectedEntities: 7, confidence: 92, evidenceCount: 214 },
  { title: 'Unusually rapid case closure', severity: 'High' as const, affectedEntities: 6, confidence: 89, evidenceCount: 187 },
  { title: 'Missing telemetry from critical systems', severity: 'High' as const, affectedEntities: 5, confidence: 86, evidenceCount: 92 },
  { title: 'Repetitive investigation patterns', severity: 'Medium' as const, affectedEntities: 4, confidence: 78, evidenceCount: 143 },
  { title: 'Significant peer deviation', severity: 'Medium' as const, affectedEntities: 6, confidence: 81, evidenceCount: 76 }
]

export default function Overview() {
  const { setCurrentPage, setSelectedEntity } = useApp()
  const [kpis, setKpis] = useState<any[]>([])
  const [distribution, setDistribution] = useState<any[]>([])
  const [entitiesList, setEntities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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

  const openEntity = (id: string) => { setSelectedEntity(id); setCurrentPage('entity') }
  const totalCSEs = kpis.find(k => k.label === 'CSEs Assessed')?.value || 42

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h1 className="page-title">Supervisory Overview</h1>
          <p className="page-subtitle">Cross-entity analysis of SOC operational evidence</p>
        </div>
        {loading && <span className="text-[11px] text-slate-400">Loading from MongoDB...</span>}
      </div>

      <div className="flex gap-1.5 mb-5 flex-wrap">
        {filterChips.map((c, i) => (
          <button key={i} className={`chip-filter ${i === 0 ? 'chip-filter-active' : ''}`}>{c}</button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        {kpis.slice(0, 4).map((kpi, i) => (
          <StatCard key={i} label={kpi.label} value={kpi.display} trend={kpi.trend} icon={kpi.icon}
            accent={kpi.threshold === 'bad' ? 'danger' : kpi.threshold === 'watched' ? 'warning' : 'neutral'} />
        ))}
      </div>
      <div className="grid grid-cols-4 gap-3 mb-6">
        {kpis.slice(4).map((kpi, i) => (
          <StatCard key={i + 4} label={kpi.label} value={kpi.display} trend={kpi.trend} icon={kpi.icon} accent="neutral" />
        ))}
      </div>

      <div className="card mb-6">
        <div className="card-header">
          <div>
            <div className="card-title">Supervisory Risk Landscape</div>
            <div className="card-subtitle">Risk distribution across all assessed CSEs — computed from MongoDB data</div>
          </div>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="label mb-2">Risk Distribution</div>
              <StackedBar data={distribution.map(d => ({ level: d.level, count: d.count, color: d.color }))} />
              <div className="mt-5">
                <div className="label mb-2">Top Supervisory Concerns</div>
                <div className="flex flex-col gap-2">
                  {topConcerns.map((c, i) => (
                    <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                      <SeverityBadge severity={c.severity} />
                      <span className="text-[12px] text-slate-700 flex-1">{c.title}</span>
                      <span className="text-[11px] text-slate-500 whitespace-nowrap">{c.affectedEntities} ent.</span>
                      <span className="font-mono text-[11px] text-slate-400 whitespace-nowrap">{c.confidence}%</span>
                      <span className="text-[11px] text-slate-500 whitespace-nowrap">{c.evidenceCount} items</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <div className="label mb-2">Concentration of Concern</div>
              <Donut data={distribution.map(d => ({ label: `${d.level} (${d.count})`, value: d.count, color: d.color }))} centerValue={String(totalCSEs)} centerLabel="CSEs" />
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Entities Requiring Supervisory Attention</div>
            <div className="card-subtitle">Sorted by supervisory risk score — live from database</div>
          </div>
          <button className="btn btn-sm">Export CSV</button>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Entity</th><th>Sector</th><th>Risk Score</th><th>Execution Gaps</th><th>Negative Space</th><th>Peer Deviation</th><th>Priority</th><th>Status</th></tr></thead>
            <tbody>
              {[...entitiesList].sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0)).map((e: any) => (
                <tr key={e.id} className="cursor-pointer" onClick={() => openEntity(e.id)}>
                  <td className="mono-id">{e.id}</td>
                  <td className="text-slate-600">{e.sector}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="risk-bar-track w-16">
                        <div className={`risk-bar-fill ${(e.riskScore ?? 0) >= 85 ? 'bg-red-500' : (e.riskScore ?? 0) >= 70 ? 'bg-orange-500' : (e.riskScore ?? 0) >= 55 ? 'bg-amber-500' : (e.riskScore ?? 0) >= 40 ? 'bg-blue-500' : 'bg-emerald-500'}`} style={{ width: `${e.riskScore ?? 0}%` }} />
                      </div>
                      <span className="font-mono text-[12px] font-semibold text-slate-700">{e.riskScore ?? 0}</span>
                    </div>
                  </td>
                  <td className="font-mono text-[12px] text-slate-600">{e.executionGaps}</td>
                  <td className="font-mono text-[12px] text-slate-600">{e.negativeSpace}</td>
                  <td><span className={`inline-flex px-1.5 py-0.5 rounded text-[10.5px] font-semibold ${(e.peerDeviation ?? '') === 'High' || (e.peerDeviation ?? '') === 'Very High' ? 'bg-red-50 text-red-600' : (e.peerDeviation ?? '') === 'Medium' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>{e.peerDeviation}</span></td>
                  <td><StatusBadge status={e.priority} /></td>
                  <td><StatusBadge status={e.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}