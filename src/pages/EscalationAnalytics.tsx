import React, { useEffect, useState } from 'react'
import { fetchEscalationAnalytics } from '../api/client'
import StatCard from '../components/StatCard'
import { Donut, BarChart } from '../components/charts'
import { AlertTriangle } from 'lucide-react'

export default function EscalationAnalytics() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    fetchEscalationAnalytics().then(setData).catch(() => {})
  }, [])

  const escalatedCritical = data?.escalatedCritical ?? 2210
  const notEscalatedCritical = data?.notEscalatedCritical ?? 680
  const totalCritical = escalatedCritical + notEscalatedCritical
  const escalationRate = ((escalatedCritical / totalCritical) * 100).toFixed(1)
  const delays = data?.delayDistribution ?? []
  const paths = data?.paths ?? []
  const severityMatrix = data?.severityMatrix ?? []
  const anomalies = data?.anomalies ?? []
  const escalated24h = data?.escalatedWithin24h ?? 306

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="mb-1">
        <h1 className="page-title">Escalation Analytics</h1>
        <p className="page-subtitle">Analysis of escalation patterns, delays, and severity relationships</p>
      </div>

      <div className="grid grid-cols-4 gap-3 mt-4 mb-6">
        <StatCard label="Critical Alerts Escalated" value={escalatedCritical.toLocaleString()} trend={8} icon="shield" accent="info" />
        <StatCard label="Critical Alerts Not Escalated" value={notEscalatedCritical.toLocaleString()} trend={-14} icon="alert" accent="danger" />
        <StatCard label="Escalation Rate (Critical)" value={`${escalationRate}%`} trend={2} icon="gap" accent="neutral" />
        <StatCard label="Escalation Delay > 24h" value={String(escalated24h)} trend={-5} icon="cases" accent="warning" />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="card p-4">
          <div className="label mb-3">Escalation Rate (Critical Alerts)</div>
          <div className="flex justify-center mt-4">
            <Donut
              data={[
                { label: 'Escalated', value: escalatedCritical, color: '#10b981' },
                { label: 'Not Escalated', value: notEscalatedCritical, color: '#ef4444' }
              ]}
              size={130}
              thickness={16}
            />
          </div>
        </div>
        <div className="card p-4">
          <div className="label mb-3">Escalation Delay Distribution</div>
          <BarChart data={delays.map((d: any) => ({ label: d.hours || d.label, value: d.count }))} color="#3b82f6" height={120} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="card p-4">
          <div className="label mb-3">Escalation Paths</div>
          <div className="flex flex-col gap-2.5 mt-2">
            {paths.map((p: any, i: number) => (
              <div key={i}>
                <div className="flex justify-between mb-1">
                  <span className="text-[12px] text-slate-600 font-medium">{p.path}</span>
                  <span className="font-mono text-[12px] text-slate-700 font-semibold">{(p.count ?? 0).toLocaleString()}</span>
                </div>
                <div className="risk-bar-track">
                  <div className="risk-bar-fill bg-blue-500" style={{ width: `${((p.count ?? 0) / 1500) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Severity x Escalation Matrix</div>
          </div>
          <div className="p-4">
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Severity</th><th>Escalated</th><th>Not Escalated</th><th>Escalation Rate</th></tr></thead>
                <tbody>
                  {severityMatrix.map((r: any, i: number) => {
                    const rate = ((r.escalated / ((r.escalated + r.notEscalated) || 1)) * 100).toFixed(1)
                    const isAnomaly = (r.severity === 'Critical' && Number(rate) < 80) || (r.severity === 'High' && Number(rate) < 70)
                    return (
                      <tr key={i} className={isAnomaly ? 'bg-red-50/50' : ''}>
                        <td>
                          <span className={`badge border text-[10.5px] ${r.severity === 'Critical' ? 'bg-red-50 text-red-700 border-red-200' : r.severity === 'High' ? 'bg-orange-50 text-orange-700 border-orange-200' : r.severity === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>{r.severity}</span>
                        </td>
                        <td className="font-mono text-[12px]">{r.escalated.toLocaleString()}</td>
                        <td className="font-mono text-[12px]">{r.notEscalated.toLocaleString()}</td>
                        <td className="font-mono text-[12px] font-semibold">{rate}%</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-4">
        <div className="label mb-3">Escalation Anomalies</div>
        <div className="grid grid-cols-2 gap-3">
          {anomalies.map((a: any, i: number) => (
            <div key={i} className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${a.severity === 'Critical' ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'}`}>
              <AlertTriangle className={`w-4 h-4 shrink-0 ${a.severity === 'Critical' ? 'text-red-500' : 'text-orange-500'}`} />
              <div className="flex-1">
                <div className="text-[12px] font-semibold text-slate-800">{a.label}</div>
              </div>
              <div className="font-mono text-[14px] font-bold text-slate-700">{(a.count ?? 0).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}