import React, { useEffect, useState } from 'react'
import { MultiBar, BarChart, Donut } from '../components/charts'
import StatCard from '../components/StatCard'
import { TelemetryPulse } from '../components/ui'
import { fetchAlertAnalytics } from '../api/client'
import { downloadCSV } from '../utils/export'
import { Bell, Download, Filter, Flame, Clock, Layers, ArrowUpRight } from 'lucide-react'

export default function AlertAnalytics() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    fetchAlertAnalytics().then(setData).catch(() => {})
  }, [])

  const totalAlerts = data?.kpis?.totalAlerts ?? 184620
  const ackTime = data?.kpis?.meanAckTime ?? '4.2 min'
  const closureTime = data?.kpis?.meanClosure ?? '58.3 min'
  const conversion = data?.kpis?.alertToCase ?? '11.2%'
  const criticalClosures = data?.kpis?.criticalClosures ?? 214
  const volumeByMonth = data?.volumeByMonth ?? []
  const severityDistribution = data?.severityDistribution ?? []
  const disposition = data?.disposition ?? []
  const lifecycle = data?.lifecycle ?? []
  const conversionData = data?.conversion ?? []
  const repeatAlerts = data?.repeatAlerts ?? []
  const criticalClosure = data?.criticalClosure ?? []

  const handleExport = () => {
    const headers = ['Metric', 'Value']
    const rows = [
      ['Total Ingested Alerts', totalAlerts],
      ['Mean Ack Latency', ackTime],
      ['Mean Closure Duration', closureTime],
      ['Alert-to-Case Escalation', conversion],
      ['Premature Critical Closures', criticalClosures]
    ]
    downloadCSV(`SAT-SA_Alert_Analytics_${new Date().toISOString().slice(0, 10)}`, headers, rows)
  }

  return (
    <div className="p-6 max-w-[1700px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyber-800 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="page-title text-2xl font-bold tracking-tight">Alert Operations & Lifecycle Telemetry</h1>
            <TelemetryPulse active status="online" label="SIEM / EDR INGESTION STREAM" />
          </div>
          <p className="page-subtitle text-cyber-400 mt-0.5">
            Operational triage analysis, acknowledgement velocity, suppression integrity, and critical closure audits
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="btn btn-sm flex items-center gap-1.5 text-cyber-300 hover:text-cyber-100">
            <Download className="w-3.5 h-3.5 text-neonCyan" /> Export Alert Metrics
          </button>
        </div>
      </div>

      {/* 5 KPI StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <StatCard label="Total Ingested Alerts" value={typeof totalAlerts === 'number' ? totalAlerts.toLocaleString() : totalAlerts} trend={14} icon="alerts" accent="neutral" />
        <StatCard label="Mean Ack Latency" value={ackTime} trend={-8} icon="gap" accent="info" />
        <StatCard label="Mean Closure Duration" value={closureTime} trend={6} icon="cases" accent="neutral" />
        <StatCard label="Alert-to-Case Escalation" value={conversion} trend={-3} icon="samples" accent="neutral" />
        <StatCard label="Premature Critical Closures" value={String(criticalClosures)} trend={22} icon="alert" accent="danger" />
      </div>

      {/* Alert Volume + Severity Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 card p-5">
          <div className="label mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2 text-cyber-200 font-bold">
              <Layers className="w-4 h-4 text-neonCyan" /> Monthly Multi-Vector Ingestion Volume by Severity
            </span>
            <span className="text-[10px] font-mono text-cyber-400">HISTORICAL TELEMETRY</span>
          </div>
          <MultiBar
            data={volumeByMonth.map((d: any) => ({ label: d.month || d.label, critical: d.critical, high: d.high, medium: d.medium, low: d.low }))}
            series={[
              { key: 'critical', label: 'Critical', color: '#ff2a5f' },
              { key: 'high', label: 'High', color: '#f97316' },
              { key: 'medium', label: 'Medium', color: '#f59e0b' },
              { key: 'low', label: 'Low', color: '#64748b' }
            ]}
            height={160}
          />
        </div>

        <div className="lg:col-span-4 card p-5 flex flex-col items-center justify-center">
          <div className="label mb-3 w-full flex items-center justify-between">
            <span className="text-cyber-200 font-bold">Severity Breakdown</span>
            <span className="text-[10px] font-mono text-cyber-400">PROPORTION</span>
          </div>
          <div className="flex justify-center my-auto">
            <Donut
              data={severityDistribution.map((d: any) => ({
                label: d.severity,
                value: d.count,
                color: d.severity === 'Critical' ? '#ff2a5f' : d.severity === 'High' ? '#f97316' : d.severity === 'Medium' ? '#f59e0b' : '#64748b'
              }))}
              size={140}
              thickness={15}
            />
          </div>
        </div>
      </div>

      {/* Disposition Donut + Lifecycle Bars */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-4 card p-5 flex flex-col items-center justify-center">
          <div className="label mb-3 w-full flex items-center justify-between">
            <span className="text-cyber-200 font-bold">Final Alert Disposition</span>
            <span className="text-[10px] font-mono text-neonCyan">TRIAGE VERDICT</span>
          </div>
          <div className="flex justify-center my-auto">
            <Donut
              data={disposition.map((d: any) => ({
                label: d.disposition,
                value: d.count,
                color: d.disposition === 'Resolved' ? '#00f2fe' : d.disposition === 'False positive' ? '#f59e0b' : d.disposition === 'Escalated to incident' ? '#ff2a5f' : '#64748b'
              }))}
              size={140}
              thickness={15}
            />
          </div>
        </div>

        <div className="lg:col-span-8 card p-5">
          <div className="label mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2 text-cyber-200 font-bold">
              <Clock className="w-4 h-4 text-neonCyan" /> SOC Alert Lifecycle Latency Benchmarks
            </span>
            <span className="text-[10px] font-mono text-cyber-400">MEAN TIME (MINUTES)</span>
          </div>
          <div className="space-y-3.5 mt-2">
            {lifecycle.map((d: any, i: number) => (
              <div key={i} className="bg-cyber-950/70 p-3 rounded-lg border border-cyber-800">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-semibold text-cyber-200">{d.stage}</span>
                  <span className="font-mono text-xs font-bold text-neonCyan">{d.meanMin} min</span>
                </div>
                <div className="risk-bar-track h-2 bg-cyber-900">
                  <div className="risk-bar-fill bg-cyan-500 shadow-glow-cyan" style={{ width: `${Math.min(100, (d.meanMin / 60) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Conversion Table + Repeat Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-6 card p-5">
          <div className="label mb-3 flex items-center justify-between">
            <span className="text-cyber-200 font-bold">Alert-to-Case Escalation Ratio</span>
            <span className="text-[10px] font-mono text-cyber-400">BY ASSET DOMAIN</span>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Asset Category</th>
                  <th className="text-right">Raw Alerts</th>
                  <th className="text-right">Investigated Cases</th>
                  <th className="text-right">Conversion Rate</th>
                </tr>
              </thead>
              <tbody>
                {conversionData.map((c: any, i: number) => (
                  <tr key={i}>
                    <td className="text-xs font-medium text-cyber-100">{c.category}</td>
                    <td className="font-mono text-xs text-cyber-300 text-right">{(c.alerts ?? 0).toLocaleString()}</td>
                    <td className="font-mono text-xs text-cyber-300 text-right">{(c.cases ?? 0).toLocaleString()}</td>
                    <td className="font-mono text-xs font-bold text-neonCyan text-right">{c.rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-6 card p-5">
          <div className="label mb-3 flex items-center justify-between">
            <span className="text-cyber-200 font-bold">Top Repeat Alert Triggering Assets</span>
            <span className="text-[10px] font-mono text-neonAmber">NOISY SENSORS</span>
          </div>
          <div className="space-y-3 mt-2">
            {repeatAlerts.map((a: any, i: number) => (
              <div key={i} className="bg-cyber-950/70 p-3 rounded-lg border border-cyber-800">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="mono-id text-neonCyan">{a.asset}</span>
                  <span className="font-mono text-xs font-bold text-neonAmber">{a.count} occurrences</span>
                </div>
                <div className="risk-bar-track h-2 bg-cyber-900">
                  <div className="risk-bar-fill bg-neonAmber" style={{ width: `${Math.min(100, (a.count / 70) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Critical Alert Closure Patterns */}
      <div className="card p-5">
        <div className="label mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2 text-cyber-200 font-bold">
            <Flame className="w-4 h-4 text-neonRose" /> Critical Alert Anomalous Closure Patterns
          </span>
          <span className="badge badge-danger text-xs font-mono">POTENTIAL AUDIT DEFECT</span>
        </div>
        <BarChart
          data={criticalClosure.map((d: any) => ({ label: d.pattern || d.label, value: d.count }))}
          color="#ff2a5f"
          height={130}
        />
      </div>
    </div>
  )
}