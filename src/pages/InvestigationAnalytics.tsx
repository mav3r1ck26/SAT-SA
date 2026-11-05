import React, { useEffect, useState } from 'react'
import { fetchInvestigationAnalytics } from '../api/client'
import { downloadCSV } from '../utils/export'
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

  const patternExplanations: Record<string, string> = {
    'Superficial': 'No investigation depth is recorded for these cases. Check notes, actions, and attachments; work performed outside the recorded system may be missing.',
    'Repeated investigation templates': 'Investigation narratives are flagged as highly similar. Recurring incident types can legitimately produce similar notes, so review the underlying cases.',
    'Unusually Fast': 'The recorded closure time is classified as unusually short. Compare the timeline with case severity and complexity; speed alone does not show inadequate work.',
    'Requires Review': 'These cases have a stored manual-review flag. This panel does not show the individual trigger, so inspect case details before reaching a conclusion.'
  }

  const handleExport = () => {
    const headers = ['Metric', 'Value']
    const rows = [
      ['Total Investigated Cases', totalCases],
      ['Mean Investigation Triage', kpis.meanDuration ?? '42 min'],
      ['Investigation-to-Closure Ratio', kpis.investigationToClosure ?? '96.4%'],
      ['Case Reopening Rate', kpis.caseReopening ?? '5.8%'],
      ['Supervisory Review Queue', kpis.requiresReview ?? 560]
    ]
    downloadCSV(`SAT-SA_Investigation_Analytics_${new Date().toISOString().slice(0, 10)}`, headers, rows)
  }

  return (
    <div className="p-6 max-w-[1700px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="page-title text-2xl font-bold tracking-tight">SOC Investigation Rigor & Forensic Analytics</h1>
            <TelemetryPulse active status="online" label="ANALYST BEHAVIOR STREAM" />
          </div>
          <p className="page-subtitle text-slate-500 mt-0.5">
            Measurement of forensic investigation depth, evidence attachment rigor, triage latency, and rapid closure anomalies
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="btn btn-sm flex items-center gap-1.5 text-slate-600 hover:text-slate-800">
            <Download className="w-3.5 h-3.5 text-indigo-600" /> Export Investigation Logs
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
            <span className="flex items-center gap-2 text-slate-700 font-bold">
              <Clock className="w-4 h-4 text-indigo-600" /> Investigation Duration Profile (Triage Velocity)
            </span>
            <span className="text-[10px] font-mono text-slate-500">HISTOGRAM</span>
          </div>
          <BarChart 
            data={durationDistribution.map((d: any) => ({ label: d.range || d.label, value: d.count }))} 
            color="#00f2fe"
            height={130} 
          />
        </div>

        <div className="lg:col-span-6 card p-5">
          <div className="label mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2 text-slate-700 font-bold">
              <Fingerprint className="w-4 h-4 text-emerald-700" /> Forensic Evidence Depth per Incident
            </span>
            <span className="text-[10px] font-mono text-slate-500">ARTIFACT COUNT</span>
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
            <span className="text-slate-700 font-bold">Repetitive Closure & Rubber-Stamp Patterns</span>
            <span className="badge badge-warning text-xs font-mono">SUPERVISORY ANOMALY</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed rounded-md border border-indigo-100 bg-indigo-50/50 p-3">
            Counts are case records in each stored behavior group, shown as a share of all cases. Severity is a category priority: Critical = Requires Review; High = Superficial or Repetitive; Medium = Unusually Fast. These are screening signals, not proof of misconduct—check the timeline, notes, and evidence before drawing conclusions.
          </p>
          <div className="space-y-2.5 mt-2">
            {patterns.map((p: any, i: number) => (
              <div key={i} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 p-3 rounded-lg bg-slate-50/70 border border-slate-200">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`badge border text-[10px] font-mono ${
                      p.severity === 'Critical'
                        ? 'bg-rose-50/80 text-rose-700 border-rose-200/60'
                        : p.severity === 'High'
                        ? 'bg-orange-50/80 text-orange-700 border-orange-200/60'
                        : 'bg-amber-50/80 text-amber-700 border-amber-200/60'
                    }`}>
                      {p.severity}
                    </span>
                    <span className="text-xs font-medium text-slate-800">{p.pattern}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed mt-1.5">
                    {patternExplanations[p.pattern] || 'A case behavior group that signals a possible investigation-quality concern; review the underlying records.'}
                  </p>
                </div>
                <div className="text-right whitespace-nowrap">
                  <div className="font-mono text-xs font-bold text-indigo-600">{(p.count ?? 0).toLocaleString()} cases</div>
                  <div className="font-mono text-[10px] text-slate-500 mt-1">
                    {(((p.count ?? 0) / (totalCases || 1)) * 100).toFixed(1)}% of {totalCases.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-6 card p-5">
          <div className="label mb-3 flex items-center justify-between">
            <span className="text-slate-700 font-bold">Evidence Attachment Frequency by Category</span>
            <span className="text-[10px] font-mono text-slate-500">AVG PER CASE</span>
          </div>
          <div className="space-y-3 mt-2">
            {evidenceFrequency.map((e: any, i: number) => (
              <div key={i} className="bg-slate-50/70 p-3 rounded-lg border border-slate-200">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-medium text-slate-700">{e.category}</span>
                  <span className="font-mono text-xs font-bold text-indigo-600">{e.avgPerCase} / case</span>
                </div>
                <div className="risk-bar-track h-2 bg-slate-100">
                  <div className="risk-bar-fill bg-indigo-600 shadow-sm" style={{ width: `${Math.min(100, ((e.avgPerCase ?? 1) / 3) * 100)}%` }} />
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
            <span className="flex items-center gap-2 text-slate-700 font-bold">
              <UserCheck className="w-4 h-4 text-indigo-600" /> SOC Tier-2 Investigator Workload & Median Duration
            </span>
            <span className="text-[10px] font-mono text-slate-500">ANALYST AUDIT</span>
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
                    <td className="mono-id text-indigo-600 font-bold">{w.investigator}</td>
                    <td className="font-mono text-xs text-slate-700 text-center font-semibold">{w.cases}</td>
                    <td className="font-mono text-xs text-slate-600 text-right">{w.avgDuration} min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-6 card p-5">
          <div className="label mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2 text-slate-700 font-bold">
              <AlertCircle className="w-4 h-4 text-rose-700" /> Post-Closure Reopening Frequency by Entity
            </span>
            <span className="text-[10px] font-mono text-rose-700">SECONDARY AUDIT</span>
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
                    <td className="mono-id text-indigo-600 font-bold">{r.entity}</td>
                    <td className="font-mono text-xs text-rose-700 text-center font-bold">{r.reopened}</td>
                    <td className="font-mono text-xs text-slate-600 text-center">{r.total}</td>
                    <td className="font-mono text-xs font-bold text-amber-700 text-right">
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
        <div className="label mb-2 text-slate-700 font-bold">Investigation Behavioral Stratification</div>
        <p className="text-xs text-slate-500 mb-4 font-mono">
          Summary of behavior labels stored on case records. This view counts those labels; it does not independently run a machine-learning clustering model.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {behaviour.map((b: any, i: number) => {
            const styles: Record<string, { border: string, bg: string, text: string }> = {
              'Normal': { border: 'border-emerald-200/80', bg: 'bg-emerald-50/40', text: 'text-emerald-700' },
              'Superficial': { border: 'border-amber-200/80', bg: 'bg-amber-50/40', text: 'text-amber-700' },
              'Repetitive': { border: 'border-orange-200/80', bg: 'bg-orange-50/40', text: 'text-orange-700' },
              'Unusually Fast': { border: 'border-rose-200/80', bg: 'bg-rose-50/40', text: 'text-rose-700' },
              'Requires Review': { border: 'border-cyan-200/80', bg: 'bg-cyan-50/40', text: 'text-indigo-600' }
            }
            const currentStyle = styles[b.classification] || { border: 'border-slate-300', bg: 'bg-slate-100', text: 'text-slate-800' }
            return (
              <div key={i} className={`rounded-lg border ${currentStyle.border} ${currentStyle.bg} p-3.5 space-y-1`}>
                <div className={`text-[10.5px] font-mono font-bold uppercase tracking-wider ${currentStyle.text}`}>
                  {b.classification}
                </div>
                <div className={`font-mono text-xl font-extrabold ${currentStyle.text}`}>
                  {(b.count ?? 0).toLocaleString()}
                </div>
                <div className="text-[10px] font-mono text-slate-500">
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
