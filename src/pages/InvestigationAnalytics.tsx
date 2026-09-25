import React, { useEffect, useState } from 'react'
import { fetchInvestigationAnalytics } from '../api/client'
import StatCard from '../components/StatCard'
import { BarChart } from '../components/charts'
import { TelemetryPulse } from '../components/ui'
import { Search, Download, Clock, ShieldCheck, UserCheck, AlertCircle, Layers, Fingerprint } from 'lucide-react'

export default function InvestigationAnalytics() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    fetchInvestigationAnalytics().then(setData).catch(() => {})
  }, [])

  const kpis = data?.kpis ?? {}
  const durationDistribution = data?.durationDistribution ?? []
  const depth = data?.depth ?? []
  const patterns = data?.patterns ?? []
  const evidenceFrequency = data?.evidenceFrequency ?? []
  const workload = data?.workload ?? []
  const reopening = data?.reopening ?? []
  const behaviour = data?.behaviour ?? []
  const totalCases = kpis.totalCases ?? 32481

  return (
    <div className="p-6 max-w-[1700px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyber-800 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="page-title text-2xl font-bold tracking-tight">SOC Investigation Rigor & Forensic Analytics</h1>
            <TelemetryPulse active status="online" label="ANALYST BEHAVIOR STREAM" />
          </div>
          <p className="page-subtitle text-cyber-400 mt-0.5">
            Measurement of forensic investigation depth, evidence attachment rigor, triage latency, and rapid closure anomalies
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-sm flex items-center gap-1.5 text-cyber-300">
            <Download className="w-3.5 h-3.5 text-neonCyan" /> Export Investigation Logs
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <StatCard label="Total Investigated Cases" value={typeof totalCases === 'number' ? totalCases.toLocaleString() : String(totalCases)} trend={8} icon="cases" accent="neutral" />
        <StatCard label="Mean Investigation Triage" value={kpis.meanDuration ?? '42 min'} trend={-12} icon="gap" accent="info" />
        <StatCard label="Investigation-to-Closure" value={kpis.investigationToClosure ?? '96.4%'} trend={-1} icon="shield" accent="info" />
        <StatCard label="Case Reopening Rate" value={kpis.caseReopening ?? '5.8%'} trend={15} icon="alert" accent="warning" />
        <StatCard label="Supervisory Review Queue" value={String(kpis.requiresReview ?? 560)} trend={4} icon="samples" accent="danger" />
      </div>

      {/* Duration Distribution + Investigation Depth */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-6 card p-5">
          <div className="label mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2 text-cyber-200 font-bold">
              <Clock className="w-4 h-4 text-neonCyan" /> Investigation Duration Profile (Triage Velocity)
            </span>
            <span className="text-[10px] font-mono text-cyber-400">HISTOGRAM</span>
          </div>
          <BarChart 
            data={durationDistribution.map((d: any) => ({ label: d.range || d.label, value: d.count }))} 
            color="#00f2fe"
            height={130} 
          />
        </div>

        <div className="lg:col-span-6 card p-5">
          <div className="label mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2 text-cyber-200 font-bold">
              <Fingerprint className="w-4 h-4 text-neonEmerald" /> Forensic Evidence Depth per Incident
            </span>
            <span className="text-[10px] font-mono text-cyber-400">ARTIFACT COUNT</span>
          </div>
          <BarChart 
            data={depth.map((d: any) => ({ label: d.depth || d.label, value: d.count }))} 
            color="#10b981" 
            height={130} 
          />
        </div>
      </div>

      {/* Repetitive Patterns + Evidence Frequency */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-6 card p-5">
          <div className="label mb-3 flex items-center justify-between">
            <span className="text-cyber-200 font-bold">Repetitive Closure & Rubber-Stamp Patterns</span>
            <span className="badge badge-warning text-xs font-mono">SUPERVISORY ANOMALY</span>
          </div>
          <div className="space-y-2.5 mt-2">
            {patterns.map((p: any, i: number) => (
              <div key={i} className="flex flex-wrap items-center justify-between p-3 rounded-lg bg-cyber-950/70 border border-cyber-800 gap-2">
                <span className={`badge border text-[10px] font-mono ${
                  p.severity === 'Critical' 
                    ? 'bg-red-950/80 text-neonRose border-red-800/60' 
                    : p.severity === 'High' 
                    ? 'bg-orange-950/80 text-orange-400 border-orange-800/60' 
                    : 'bg-amber-950/80 text-neonAmber border-amber-800/60'
                }`}>
                  {p.severity}
                </span>
                <span className="text-xs font-medium text-cyber-100 flex-1 truncate">{p.pattern}</span>
                <span className="font-mono text-xs font-bold text-neonCyan">{(p.count ?? 0).toLocaleString()} cases</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-6 card p-5">
          <div className="label mb-3 flex items-center justify-between">
            <span className="text-cyber-200 font-bold">Evidence Attachment Frequency by Category</span>
            <span className="text-[10px] font-mono text-cyber-400">AVG PER CASE</span>
          </div>
          <div className="space-y-3 mt-2">
            {evidenceFrequency.map((e: any, i: number) => (
              <div key={i} className="bg-cyber-950/70 p-3 rounded-lg border border-cyber-800">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-medium text-cyber-200">{e.category}</span>
                  <span className="font-mono text-xs font-bold text-neonCyan">{e.avgPerCase} / case</span>
                </div>
                <div className="risk-bar-track h-2 bg-cyber-900">
                  <div className="risk-bar-fill bg-neonCyan shadow-glow-cyan" style={{ width: `${Math.min(100, ((e.avgPerCase ?? 1) / 3) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Investigator Workload + Reopening */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-6 card p-5">
          <div className="label mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2 text-cyber-200 font-bold">
              <UserCheck className="w-4 h-4 text-neonCyan" /> SOC Tier-2 Investigator Workload & Median Duration
            </span>
            <span className="text-[10px] font-mono text-cyber-400">ANALYST AUDIT</span>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Analyst Call-Sign</th>
                  <th className="text-center">Assigned Cases</th>
                  <th className="text-right">Avg Triage Duration</th>
                </tr>
              </thead>
              <tbody>
                {workload.map((w: any, i: number) => (
                  <tr key={i}>
                    <td className="mono-id text-neonCyan font-bold">{w.investigator}</td>
                    <td className="font-mono text-xs text-cyber-200 text-center font-semibold">{w.cases}</td>
                    <td className="font-mono text-xs text-cyber-300 text-right">{w.avgDuration} min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-6 card p-5">
          <div className="label mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2 text-cyber-200 font-bold">
              <AlertCircle className="w-4 h-4 text-neonRose" /> Post-Closure Reopening Frequency by Entity
            </span>
            <span className="text-[10px] font-mono text-neonRose">SECONDARY AUDIT</span>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>CSE ID</th>
                  <th className="text-center">Reopened</th>
                  <th className="text-center">Total Cases</th>
                  <th className="text-right">Reopen Rate</th>
                </tr>
              </thead>
              <tbody>
                {reopening.map((r: any, i: number) => (
                  <tr key={i}>
                    <td className="mono-id text-neonCyan font-bold">{r.entity}</td>
                    <td className="font-mono text-xs text-neonRose text-center font-bold">{r.reopened}</td>
                    <td className="font-mono text-xs text-cyber-300 text-center">{r.total}</td>
                    <td className="font-mono text-xs font-bold text-neonAmber text-right">
                      {((r.reopened / (r.total || 1)) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Investigation Behaviour Classification Banners */}
      <div className="card p-5">
        <div className="label mb-2 text-cyber-200 font-bold">Investigation Behavioral Stratification</div>
        <p className="text-xs text-cyber-400 mb-4 font-mono">
          Machine-learning clustering of entire case portfolio against standard forensic investigation heuristics
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {behaviour.map((b: any, i: number) => {
            const styles: Record<string, { border: string, bg: string, text: string }> = {
              'Normal': { border: 'border-emerald-800/80', bg: 'bg-emerald-950/40', text: 'text-neonEmerald' },
              'Superficial': { border: 'border-amber-800/80', bg: 'bg-amber-950/40', text: 'text-neonAmber' },
              'Repetitive': { border: 'border-orange-800/80', bg: 'bg-orange-950/40', text: 'text-orange-400' },
              'Unusually Fast': { border: 'border-red-800/80', bg: 'bg-red-950/40', text: 'text-neonRose' },
              'Requires Review': { border: 'border-cyan-800/80', bg: 'bg-cyan-950/40', text: 'text-neonCyan' }
            }
            const currentStyle = styles[b.classification] || { border: 'border-cyber-700', bg: 'bg-cyber-900', text: 'text-cyber-100' }
            return (
              <div key={i} className={`rounded-lg border ${currentStyle.border} ${currentStyle.bg} p-3.5 space-y-1`}>
                <div className={`text-[10.5px] font-mono font-bold uppercase tracking-wider ${currentStyle.text}`}>
                  {b.classification}
                </div>
                <div className={`font-mono text-xl font-extrabold ${currentStyle.text}`}>
                  {(b.count ?? 0).toLocaleString()}
                </div>
                <div className="text-[10px] font-mono text-cyber-400">
                  {((b.count ?? 0) / (totalCases || 1) * 100).toFixed(1)}% of cases
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}