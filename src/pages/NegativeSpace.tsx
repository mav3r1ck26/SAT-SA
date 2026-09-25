import React, { useEffect, useState } from 'react'
import { Heatmap } from '../components/charts'
import StatCard from '../components/StatCard'
import { TelemetryPulse } from '../components/ui'
import { AlertTriangle, Download, EyeOff, Radio, ShieldAlert } from 'lucide-react'
import { fetchBlindSpots } from '../api/client'

const defaultColumns = ['Expected Telemetry', 'Observed Telemetry', 'Alert Gen. Stream', 'Case Evidence', 'Escalation Logs']
const defaultCategories = ['Firewall Core', 'EDR Agents', 'IDS/IPS Sensor', 'SIEM Collector', 'IAM Audit', 'DLP Gateway', 'Network NetFlow', 'Cloud Trail', 'OT/SCADA Probe', 'DB Audit']
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
    <div className="p-6 max-w-[1700px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyber-800 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="page-title text-2xl font-bold tracking-tight">Negative Space & Telemetry Blind Spots</h1>
            <TelemetryPulse active status="alert" label="SENSOR DARK SPOTS" />
          </div>
          <p className="page-subtitle text-cyber-400 mt-0.5">
            Statistical detection of missing, suppressed, or disconnected telemetry pipelines in critical infrastructure
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-sm flex items-center gap-1.5 text-cyber-300">
            <Download className="w-3.5 h-3.5 text-neonCyan" /> Export Telemetry Coverage Matrix
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard label="Negative Space Indicators" value={String(spotCount)} trend={2} icon="space" accent="neutral" />
        <StatCard label="Low Coverage Areas (<50%)" value={String(lowCoverage)} trend={1} icon="gap" accent="warning" />
        <StatCard label="Critical Sensor Gaps" value={String(criticalSpots)} trend={0} icon="alert" accent="danger" />
        <StatCard label="Entities with Blind Spots" value={String(entitiesAffected)} trend={-1} icon="building" accent="neutral" />
      </div>

      {/* Coverage Matrix */}
      <div className="card">
        <div className="card-header border-b border-cyber-800 pb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="card-title flex items-center gap-2">
              <Radio className="w-4 h-4 text-neonCyan" />
              Cross-Vector Telemetry Fidelity Heatmap Matrix
            </div>
            <div className="card-subtitle text-cyber-400">
              Ratio of observed vs expected event telemetry across critical infrastructure architecture tiers
            </div>
          </div>
          <span className="badge badge-info text-xs font-mono">10x5 SENSOR AUDIT TENSOR</span>
        </div>
        <div className="p-5">
          <Heatmap rows={defaultCategories} columns={defaultColumns} data={defaultData} />
        </div>
      </div>

      {/* Detected Blind Spots Table */}
      <div className="card">
        <div className="card-header border-b border-cyber-800 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <EyeOff className="w-4 h-4 text-neonRose" />
            <div className="card-title">Identified Sensor Blackouts & Silent Pipelines</div>
          </div>
          <span className="badge badge-danger text-xs font-mono">{spotCount} detected</span>
        </div>

        <div className="divide-y divide-cyber-800/80">
          {blindSpots.length > 0 ? blindSpots.map((bs, i) => (
            <div key={i} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-cyber-800/40 transition-colors">
              <div className="flex items-start gap-3 min-w-0">
                <AlertTriangle className="w-4 h-4 text-neonRose mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="mono-id text-neonCyan">{bs.entityId || bs.entity}</span>
                    <span className="text-xs font-bold text-cyber-100">{bs.assetGroup || bs.category}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyber-950 border border-cyber-700 text-cyber-300">
                      {bs.severity || 'Critical'}
                    </span>
                  </div>
                  <p className="text-xs text-cyber-300 leading-relaxed">{bs.description}</p>
                </div>
              </div>

              <div className="text-right shrink-0 bg-cyber-950 px-4 py-2 rounded-lg border border-cyber-800">
                <div className="font-mono text-lg font-bold text-neonRose leading-none">
                  {bs.observedPct ?? bs.observed}%
                </div>
                <div className="text-[10px] font-mono text-cyber-400 mt-1 uppercase">Observed Signal</div>
              </div>
            </div>
          )) : (
            <div className="p-8 text-center text-xs font-mono text-cyber-400">
              No critical sensor blind spots detected in current examination run.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}