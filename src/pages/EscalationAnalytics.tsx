import React, { useEffect, useState } from 'react'
import { fetchEscalationAnalytics } from '../api/client'
import { downloadCSV } from '../utils/export'
import StatCard from '../components/StatCard'
import { Donut } from '../components/charts'
import { TelemetryPulse } from '../components/ui'
import { AlertTriangle, Download, ShieldAlert, GitPullRequest, FastForward, Clock } from 'lucide-react'

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
  const escalated24h = data?.escalationOver24h ?? 0
  const delayMax = Math.max(...delays.map((d: any) => d.count || 0), 1)

  const handleExport = () => {
    const headers = ['Metric', 'Value']
    const rows = [
      ['Critical Alerts Escalated', escalatedCritical],
      ['Critical Alerts Suppressed / Stalled', notEscalatedCritical],
      ['Critical Escalation Ratio', `${escalationRate}%`],
      ['Escalation Delay > 24h', escalated24h]
    ]
    downloadCSV(`SAT-SA_Escalation_Audit_${new Date().toISOString().slice(0, 10)}`, headers, rows)
  }

  return (
    <div className="p-6 max-w-[1700px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="page-title text-2xl font-bold tracking-tight">Escalation Protocol & Incident Routing Integrity</h1>
            <TelemetryPulse active status="online" label="ESCALATION TELEMETRY" />
          </div>
          <p className="page-subtitle text-slate-500 mt-0.5">
            Verification of incident tier escalation, hand-off latency, unescalated high-risk threats, and hierarchy compliance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="btn btn-sm flex items-center gap-1.5 text-slate-600 hover:text-slate-800">
            <Download className="w-3.5 h-3.5 text-indigo-600" /> Export Escalation Audit
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard label="Critical Alerts Escalated" value={escalatedCritical.toLocaleString()} trend={8} icon="shield" accent="info" />
        <StatCard label="Critical Alerts Suppressed / Stalled" value={notEscalatedCritical.toLocaleString()} trend={-14} icon="alert" accent="danger" />
        <StatCard label="Critical Escalation Ratio" value={`${escalationRate}%`} trend={2} icon="gap" accent="neutral" />
        <StatCard label="Escalation Delay > 24h" value={String(escalated24h)} trend={-5} icon="cases" accent="warning" />
      </div>

      {/* Escalation Rate Donut + Delay Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 card p-5 flex flex-col items-center justify-center">
          <div className="label mb-3 w-full flex items-center justify-between">
            <span className="text-slate-700 font-bold">Critical Alert Escalation Ratio</span>
            <span className="text-[10px] font-mono text-indigo-600">SLA: 95%</span>
          </div>
          <div className="flex justify-center my-auto">
            <Donut
              data={[
                { label: 'Escalated to IR', value: escalatedCritical, color: '#00f2fe' },
                { label: 'Suppressed / No Action', value: notEscalatedCritical, color: '#ff2a5f' }
              ]}
              size={150}
              thickness={16}
            />
          </div>
        </div>

        <div className="lg:col-span-7 card p-5">
          <div className="label mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2 text-slate-700 font-bold">
              <Clock className="w-4 h-4 text-indigo-600" /> Time to Escalation
            </span>
            <span className="text-[10px] font-mono text-slate-500">{delays.reduce((sum: number, row: any) => sum + row.count, 0).toLocaleString()} ESCALATED ALERTS</span>
          </div>
          <p className="mb-3 text-[11px] text-slate-500">Alert counts grouped by elapsed time between alert creation and escalation.</p>
          <div className="flex h-36 items-end gap-3 border-b border-slate-200 px-1">
            {delays.map((delay: any) => (
              <div key={delay.label} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${delay.label}: ${delay.count.toLocaleString()} alerts`}>
                <span className="text-[10px] font-mono text-slate-600">{delay.count.toLocaleString()}</span>
                <div className="w-3/4 rounded-t transition-opacity group-hover:opacity-80" style={{ height: `${Math.max((delay.count / delayMax) * 75, 2)}%`, backgroundColor: delay.color }} />
                <span className="w-full truncate text-center text-[10px] font-mono text-slate-500">{delay.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
            {delays.map((delay: any) => (
              <div key={delay.label} className="flex min-w-0 items-center gap-2 text-[10px] font-mono text-slate-600">
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: delay.color }} />
                <span className="truncate">{delay.label} · {delay.severity}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Escalation Paths + Severity Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-6 card p-5">
          <div className="label mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2 text-slate-700 font-bold">
              <GitPullRequest className="w-4 h-4 text-emerald-700" /> Standard SOC Escalation Pipelines
            </span>
            <span className="text-[10px] font-mono text-slate-500">HANDOFF ROUTE</span>
          </div>
          <div className="space-y-3 mt-2">
            {paths.map((p: any, i: number) => (
              <div key={i} className="bg-slate-50/70 p-3 rounded-lg border border-slate-200">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-semibold text-slate-700">{p.path}</span>
                  <span className="font-mono text-xs font-bold text-indigo-600">{(p.count ?? 0).toLocaleString()} transfers</span>
                </div>
                <div className="risk-bar-track h-2 bg-slate-100">
                  <div className="risk-bar-fill bg-emerald-600 shadow-sm" style={{ width: `${Math.min(100, ((p.count ?? 0) / 1500) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-6 card overflow-hidden">
          <div className="card-header border-b border-slate-200 pb-3 flex items-center justify-between">
            <div className="card-title">Severity × Escalation Execution Matrix</div>
            <span className="badge badge-info text-xs font-mono">SOC POLICY TEST</span>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Severity Tier</th>
                  <th className="text-right">Escalated</th>
                  <th className="text-right">Not Escalated</th>
                  <th className="text-right">Escalation Ratio</th>
                </tr>
              </thead>
              <tbody>
                {severityMatrix.map((r: any, i: number) => {
                  const rate = ((r.escalated / ((r.escalated + r.notEscalated) || 1)) * 100).toFixed(1)
                  const isAnomaly = (r.severity === 'Critical' && Number(rate) < 80) || (r.severity === 'High' && Number(rate) < 70)
                  return (
                    <tr key={i} className={isAnomaly ? 'bg-rose-50/20' : ''}>
                      <td>
                        <span className={`badge border text-[10.5px] font-mono ${
                          r.severity === 'Critical' 
                            ? 'bg-rose-50/80 text-rose-700 border-rose-200/60' 
                            : r.severity === 'High' 
                            ? 'bg-orange-50/80 text-orange-700 border-orange-200/60' 
                            : r.severity === 'Medium' 
                            ? 'bg-amber-50/80 text-amber-700 border-amber-200/60' 
                            : 'bg-blue-50/80 text-indigo-600 border-cyan-200/60'
                        }`}>
                          {r.severity}
                        </span>
                      </td>
                      <td className="font-mono text-xs text-slate-600 text-right">{r.escalated.toLocaleString()}</td>
                      <td className="font-mono text-xs text-slate-600 text-right">{r.notEscalated.toLocaleString()}</td>
                      <td className={`font-mono text-xs font-bold text-right ${isAnomaly ? 'text-rose-700' : 'text-emerald-700'}`}>
                        {rate}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Escalation Anomalies */}
      <div className="card p-5">
        <div className="label mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2 text-slate-700 font-bold">
            <ShieldAlert className="w-4 h-4 text-rose-700" /> Detected Escalation Behavioral Anomalies
          </span>
          <span className="badge badge-danger text-xs font-mono">{anomalies.length} active patterns</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {anomalies.map((a: any, i: number) => (
            <div 
              key={i} 
              className={`flex items-center gap-3.5 rounded-lg border p-3.5 ${
                a.severity === 'Critical' 
                  ? 'bg-rose-50/30 border-rose-200/60' 
                  : 'bg-orange-50/30 border-orange-200/60'
              }`}
            >
              <AlertTriangle className={`w-5 h-5 shrink-0 ${a.severity === 'Critical' ? 'text-rose-700' : 'text-orange-700'}`} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-800">{a.label}</div>
                <div className="text-[10.5px] font-mono text-slate-500">Behavioral rule divergence</div>
              </div>
              <div className="font-mono text-base font-bold text-rose-700">
                {(a.count ?? 0).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
