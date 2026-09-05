import React, { useEffect, useState } from 'react'
import { fetchInvestigationAnalytics } from '../api/client'
import StatCard from '../components/StatCard'
import { BarChart } from '../components/charts'

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
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="mb-1">
        <h1 className="page-title">Investigation Analytics</h1>
        <p className="page-subtitle">Analysis of investigation depth, duration, and behavioural patterns</p>
      </div>

      <div className="grid grid-cols-5 gap-3 mt-4 mb-6">
        <StatCard label="Total Cases" value={typeof totalCases === 'number' ? totalCases.toLocaleString() : String(totalCases)} trend={8} icon="cases" accent="neutral" />
        <StatCard label="Mean Duration" value={kpis.meanDuration ?? '42 min'} trend={-12} icon="gap" accent="info" />
        <StatCard label="Investigation-to-Closure" value={kpis.investigationToClosure ?? '96.4%'} trend={-1} icon="shield" accent="info" />
        <StatCard label="Case Reopening" value={kpis.caseReopening ?? '5.8%'} trend={15} icon="alert" accent="warning" />
        <StatCard label="Requires Review" value={String(kpis.requiresReview ?? 560)} trend={4} icon="samples" accent="danger" />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="card p-4">
          <div className="label mb-3">Investigation Duration Distribution</div>
          <BarChart data={durationDistribution.map((d: any) => ({ label: d.range || d.label, value: d.count }))} height={120} />
        </div>
        <div className="card p-4">
          <div className="label mb-3">Investigation Depth</div>
          <BarChart data={depth.map((d: any) => ({ label: d.depth || d.label, value: d.count }))} color="#10b981" height={120} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="card p-4">
          <div className="label mb-3">Repetitive Investigation Patterns</div>
          <div className="flex flex-col gap-2.5 mt-2">
            {patterns.map((p: any, i: number) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                <span className={`badge border text-[10.5px] ${p.severity === 'Critical' ? 'bg-red-50 text-red-700 border-red-200' : p.severity === 'High' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{p.severity}</span>
                <span className="text-[12px] text-slate-700 flex-1">{p.pattern}</span>
                <span className="font-mono text-[12px] font-semibold text-slate-600">{(p.count ?? 0).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-4">
          <div className="label mb-3">Evidence Attachment Frequency</div>
          <div className="flex flex-col gap-3 mt-2">
            {evidenceFrequency.map((e: any, i: number) => (
              <div key={i}>
                <div className="flex justify-between mb-1">
                  <span className="text-[12px] text-slate-600 font-medium">{e.category}</span>
                  <span className="font-mono text-[12px] text-slate-700 font-semibold">{e.avgPerCase} /case</span>
                </div>
                <div className="risk-bar-track">
                  <div className="risk-bar-fill bg-blue-500" style={{ width: `${((e.avgPerCase ?? 1) / 3) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="card p-4">
          <div className="label mb-3">Investigator Workload</div>
          <div className="table-wrap mt-2">
            <table className="data-table">
              <thead><tr><th>Investigator</th><th>Cases</th><th>Avg Duration (min)</th></tr></thead>
              <tbody>
                {workload.map((w: any, i: number) => (
                  <tr key={i}>
                    <td className="mono-id">{w.investigator}</td>
                    <td className="font-mono text-[12px]">{w.cases}</td>
                    <td className="font-mono text-[12px]">{w.avgDuration} min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card p-4">
          <div className="label mb-3">Case Reopening Frequency</div>
          <div className="table-wrap mt-2">
            <table className="data-table">
              <thead><tr><th>Entity</th><th>Reopened</th><th>Total</th><th>Rate</th></tr></thead>
              <tbody>
                {reopening.map((r: any, i: number) => (
                  <tr key={i}>
                    <td className="mono-id">{r.entity}</td>
                    <td className="font-mono text-[12px]">{r.reopened}</td>
                    <td className="font-mono text-[12px]">{r.total}</td>
                    <td className="font-mono text-[12px] font-semibold">{((r.reopened / (r.total || 1)) * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card p-4">
        <div className="label mb-3">Investigation Behaviour Patterns</div>
        <p className="text-[11.5px] text-slate-500 mb-3">Classification of all cases by investigation behaviour</p>
        <div className="flex gap-3">
          {behaviour.map((b: any, i: number) => {
            const colors: Record<string, string> = {
              'Normal': 'bg-emerald-50 text-emerald-700 border-emerald-200',
              'Superficial': 'bg-amber-50 text-amber-700 border-amber-200',
              'Repetitive': 'bg-orange-50 text-orange-700 border-orange-200',
              'Unusually Fast': 'bg-red-50 text-red-700 border-red-200',
              'Requires Review': 'bg-blue-50 text-blue-700 border-blue-200'
            }
            return (
              <div key={i} className={`rounded-lg border px-3 py-2.5 ${colors[b.classification] || 'bg-slate-100'}`}>
                <div className="text-[11px] font-semibold uppercase tracking-wide opacity-70 mb-1">{b.classification}</div>
                <div className="text-[18px] font-bold leading-none">{(b.count ?? 0).toLocaleString()}</div>
                <div className="text-[10.5px] opacity-70 mt-0.5">{((b.count ?? 0) / (totalCases || 1) * 100).toFixed(1)}% of cases</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}