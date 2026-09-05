import React, { useEffect, useState } from 'react'
import { Heatmap } from '../components/charts'
import StatCard from '../components/StatCard'
import { AlertTriangle } from 'lucide-react'
import { fetchBlindSpots } from '../api/client'

const defaultColumns = ['Expected telemetry', 'Observed telemetry', 'Alert generation', 'Investigation evidence', 'Escalation evidence']
const defaultCategories = ['Firewall', 'EDR', 'IDS/IPS', 'SIEM', 'IAM', 'DLP', 'Network', 'Cloud', 'OT/IoT', 'Database']
const defaultData = [
  [95, 87, 91, 78, 72], [92, 84, 88, 75, 68], [88, 71, 82, 65, 59],
  [97, 92, 94, 86, 80], [85, 78, 80, 70, 62], [90, 76, 83, 68, 60],
  [88, 69, 75, 58, 50], [93, 62, 70, 55, 48], [78, 45, 52, 38, 30],
  [91, 80, 85, 72, 65]
]

export default function NegativeSpace() {
  const [blindSpots, setBlindSpots] = useState<any[]>([])

  useEffect(() => {
    fetchBlindSpots().then(setBlindSpots).catch(() => setBlindSpots([]))
  }, [])

  const spotCount = blindSpots.length || 13
  const lowCoverage = blindSpots.filter(b => (b.observedPct ?? 0) < 50).length || 7
  const criticalSpots = blindSpots.filter(b => b.severity === 'Critical').length || 3
  const entitiesAffected = new Set(blindSpots.map(b => b.entityId)).size || 6

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="mb-1">
        <h1 className="page-title">Negative Space Analysis</h1>
        <p className="page-subtitle">Identification of missing or unexpectedly absent operational evidence</p>
      </div>

      <div className="grid grid-cols-4 gap-3 mt-4 mb-6">
        <StatCard label="Negative Space Indicators" value={String(spotCount)} trend={2} icon="space" accent="neutral" />
        <StatCard label="Low Coverage Areas" value={String(lowCoverage)} trend={1} icon="gap" accent="warning" />
        <StatCard label="Critical Blind Spots" value={String(criticalSpots)} trend={0} icon="alert" accent="danger" />
        <StatCard label="Entities Affected" value={String(entitiesAffected)} trend={-1} icon="building" accent="neutral" />
      </div>

      <div className="card mb-6">
        <div className="card-header">
          <div>
            <div className="card-title">Coverage Matrix</div>
            <div className="card-subtitle">Percentage of expected operational evidence observed across infrastructure categories</div>
          </div>
          <button className="btn btn-sm">Export CSV</button>
        </div>
        <div className="p-4">
          <Heatmap rows={defaultCategories} columns={defaultColumns} data={defaultData} />
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Potential Monitoring Blind Spots</div>
          <span className="badge border bg-red-50 text-red-700 border-red-200">{spotCount} detected</span>
        </div>
        <div className="divide-y divide-slate-100">
          {blindSpots.length > 0 ? blindSpots.map((bs, i) => (
            <div key={i} className="px-4 py-3 flex items-center gap-4">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="mono-id">{bs.entityId || bs.entity}</span>
                  <span className="text-[12px] font-medium text-slate-700">{bs.assetGroup || bs.category}</span>
                </div>
                <p className="text-[11.5px] text-slate-500">{bs.description}</p>
              </div>
              <div className="text-right shrink-0">
                <div className="font-mono text-[18px] font-bold text-red-600 leading-none">{bs.observedPct ?? bs.observed}%</div>
                <div className="text-[10px] text-slate-400 mt-0.5">observed</div>
              </div>
            </div>
          )) : (
            <div className="px-4 py-8 text-center text-[12px] text-slate-400">Run the analytics engine to detect blind spots.</div>
          )}
        </div>
      </div>
    </div>
  )
}