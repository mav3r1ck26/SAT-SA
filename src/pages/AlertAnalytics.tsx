import React, { useEffect, useState } from 'react'
import { MultiBar, BarChart, Donut } from '../components/charts'
import StatCard from '../components/StatCard'
import { fetchAlertAnalytics } from '../api/client'

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

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="mb-1">
        <h1 className="page-title">Alert Analytics</h1>
        <p className="page-subtitle">Comprehensive analysis of alert patterns, lifecycle, and disposition</p>
      </div>

      <div className="grid grid-cols-5 gap-3 mt-4 mb-6">
        <StatCard label="Total Alerts" value={typeof totalAlerts === 'number' ? totalAlerts.toLocaleString() : totalAlerts} trend={14} icon="alerts" accent="neutral" />
        <StatCard label="Mean Ack Time" value={ackTime} trend={-8} icon="gap" accent="info" />
        <StatCard label="Mean Closure" value={closureTime} trend={6} icon="cases" accent="neutral" />
        <StatCard label="Alert-to-Case" value={conversion} trend={-3} icon="samples" accent="neutral" />
        <StatCard label="Critical Closures" value={String(criticalClosures)} trend={22} icon="alert" accent="danger" />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="card col-span-2 p-4">
          <div className="label mb-3">Alert Volume Over Time</div>
          <MultiBar
            data={volumeByMonth.map((d: any) => ({ label: d.month || d.label, critical: d.critical, high: d.high, medium: d.medium, low: d.low }))}
            series={[
              { key: 'critical', label: 'Critical', color: '#dc2626' },
              { key: 'high', label: 'High', color: '#f97316' },
              { key: 'medium', label: 'Medium', color: '#f59e0b' },
              { key: 'low', label: 'Low', color: '#94a3b8' }
            ]}
            height={150}
          />
        </div>
        <div className="card p-4">
          <div className="label mb-3">Severity Distribution</div>
          <div className="flex justify-center mt-4">
            <Donut
              data={severityDistribution.map((d: any) => ({
                label: d.severity,
                value: d.count,
                color: d.severity === 'Critical' ? '#dc2626' : d.severity === 'High' ? '#f97316' : d.severity === 'Medium' ? '#f59e0b' : '#94a3b8'
              }))}
              size={130}
              thickness={14}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="card p-4">
          <div className="label mb-3">Alert Disposition</div>
          <div className="flex justify-center mt-3">
            <Donut
              data={disposition.map((d: any) => ({
                label: d.disposition,
                value: d.count,
                color: d.disposition === 'Resolved' ? '#10b981' : d.disposition === 'False positive' ? '#f59e0b' : d.disposition === 'Escalated to incident' ? '#ef4444' : '#94a3b8'
              }))}
              size={130}
              thickness={14}
            />
          </div>
        </div>
        <div className="card col-span-2 p-4">
          <div className="label mb-3">Alert Lifecycle (Mean Times)</div>
          <div className="flex flex-col gap-3 mt-2">
            {lifecycle.map((d: any, i: number) => (
              <div key={i}>
                <div className="flex justify-between mb-1">
                  <span className="text-[12px] text-slate-600 font-medium">{d.stage}</span>
                  <span className="font-mono text-[12px] text-slate-700 font-semibold">{d.meanMin} min</span>
                </div>
                <div className="risk-bar-track">
                  <div className="risk-bar-fill bg-blue-500" style={{ width: `${(d.meanMin / 60) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="card p-4">
          <div className="label mb-3">Alert-to-Case Conversion</div>
          <div className="table-wrap mt-2">
            <table className="data-table">
              <thead><tr><th>Category</th><th>Alerts</th><th>Cases</th><th>Rate</th></tr></thead>
              <tbody>
                {conversionData.map((c: any, i: number) => (
                  <tr key={i}>
                    <td className="text-[12px] font-medium text-slate-700">{c.category}</td>
                    <td className="font-mono text-[12px]">{(c.alerts ?? 0).toLocaleString()}</td>
                    <td className="font-mono text-[12px]">{(c.cases ?? 0).toLocaleString()}</td>
                    <td className="font-mono text-[12px] font-semibold">{c.rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card p-4">
          <div className="label mb-3">Repeat Alerts by Asset</div>
          <div className="flex flex-col gap-2 mt-2">
            {repeatAlerts.map((a: any, i: number) => (
              <div key={i}>
                <div className="flex justify-between mb-1">
                  <span className="mono-id">{a.asset}</span>
                  <span className="font-mono text-[12px] text-slate-700 font-semibold">{a.count}</span>
                </div>
                <div className="risk-bar-track">
                  <div className="risk-bar-fill bg-amber-400" style={{ width: `${(a.count / 70) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-4">
        <div className="label mb-3">Critical Alert Closure Patterns</div>
        <BarChart
          data={criticalClosure.map((d: any) => ({ label: d.pattern || d.label, value: d.count }))}
          color="#dc2626"
          height={110}
        />
      </div>
    </div>
  )
}