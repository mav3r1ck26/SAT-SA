import React, { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { fetchBenchmark, fetchEntities } from '../api/client'
import { downloadCSV } from '../utils/export'
import { TelemetryPulse } from '../components/ui'
import { BarChart3, ChevronRight, Download, Sliders, Shield, Award } from 'lucide-react'

export default function PeerBenchmarking() {
  const { setSelectedEntity, setCurrentPage } = useApp()
  const [compEntity, setCompEntity] = useState('CSE-014')
  const [entitiesList, setEntities] = useState<any[]>([])
  const [benchmarkData, setBenchmarkData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchEntities().then(setEntities).catch(() => setEntities([]))
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchBenchmark(compEntity)
      .then(d => { setBenchmarkData(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => { setBenchmarkData([]); setLoading(false) })
  }, [compEntity])

  const entity = entitiesList.find(e => e.id === compEntity)
  const compSector = entity?.sector || 'Power & Energy'

  const getBarColor = (percentile: number) => {
    if (percentile >= 85) return 'bg-neonRose shadow-glow-rose'
    if (percentile >= 70) return 'bg-orange-500'
    if (percentile >= 40) return 'bg-cyan-500 shadow-glow-cyan'
    return 'bg-neonEmerald shadow-glow-emerald'
  }

  const handleExport = () => {
    const headers = ['Target CSE', 'Metric', 'Entity Value', 'Sector Median', 'Percentile (%)', 'Supervisory Assessment']
    const rows = benchmarkData.map(b => [
      compEntity,
      b.metric,
      b.entityDisplay || b.entityValue,
      b.peerMedianDisplay || b.peerMedian,
      b.percentile ?? 50,
      b.assessment || 'Normal'
    ])
    downloadCSV(`SAT-SA_Benchmark_${compEntity}_${new Date().toISOString().slice(0, 10)}`, headers, rows)
  }

  return (
    <div className="p-6 max-w-[1700px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="page-title text-2xl font-bold tracking-tight">Cross-Sector Peer Benchmarking</h1>
            <TelemetryPulse active status="online" label="STATISTICAL NORMAL DISTRIBUTION" />
          </div>
          <p className="page-subtitle text-slate-600 mt-0.5">
            Statistical distribution comparison against peer CSEs within the same critical sector operational envelope
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="btn btn-sm flex items-center gap-1.5 text-slate-600 hover:text-slate-700">
            <Download className="w-3.5 h-3.5 text-indigo-600" /> Export Benchmark Dataset
          </button>
        </div>
      </div>

      {/* Target Entity Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-100 p-3.5 rounded-lg border border-stone-200">
        <div className="flex flex-wrap items-center gap-3">
          <div className="label text-indigo-600 font-mono">Target Audit CSE:</div>
          <select 
            className="select bg-white text-slate-700 border-stone-300 text-xs py-1.5"
            value={compEntity} 
            onChange={e => setCompEntity(e.target.value)}
          >
            {entitiesList.map(e => <option key={e.id} value={e.id}>{e.id} — {e.name}</option>)}
          </select>
          <span className="text-xs font-mono text-slate-400">vs</span>
          <span className="text-xs font-mono text-slate-700 bg-white px-2.5 py-1 rounded border border-stone-200">
            Sector Cohort Median (<strong className="text-indigo-600">{compSector}</strong>)
          </span>
        </div>

        <button 
          className="btn btn-sm text-xs font-mono text-indigo-600 flex items-center gap-1"
          onClick={() => { setSelectedEntity(compEntity); setCurrentPage('entity') }}
        >
          View CSE Dossier <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="card">
        <div className="card-header border-b border-stone-200 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            <div className="card-title">Percentile Stratification ({compEntity} vs {compSector} Baseline)</div>
          </div>
          <span className="badge badge-info text-xs font-mono">GAUSSIAN DISTRIBUTION AUDIT</span>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="text-center py-12 text-xs font-mono text-slate-600 animate-pulse">
              Computing cross-entity statistical distributions...
            </div>
          ) : (
            <div className="space-y-4">
              {benchmarkData.map((m: any, i: number) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-[220px_1fr_100px_100px_80px] items-center gap-4 bg-white p-3.5 rounded-lg border border-stone-200 hover:border-stone-300 transition-colors">
                  <div>
                    <div className="text-xs font-bold text-slate-700">{m.metric}</div>
                    <div className="text-[10.5px] font-mono text-slate-600 mt-0.5">{m.assessment || 'Variance detected'}</div>
                  </div>

                  <div className="space-y-1">
                    <div className="risk-bar-track h-2 bg-cyber-900">
                      <div className={`risk-bar-fill ${getBarColor(m.percentile)}`} style={{ width: `${Math.min(100, Math.max(5, m.percentile))}%` }} />
                    </div>
                    <div className="flex justify-between text-[9.5px] font-mono text-slate-400">
                      <span>0th (Deficient)</span>
                      <span>50th (Cohort Median)</span>
                      <span>100th (Upper Limit)</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] uppercase font-mono text-slate-600">Observed</div>
                    <div className="mono-id text-indigo-600 font-bold">{m.entityDisplay}</div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] uppercase font-mono text-slate-600">Cohort Median</div>
                    <div className="text-xs font-mono text-slate-600 font-semibold">{m.peerMedianDisplay}</div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] uppercase font-mono text-slate-600">Ranking</div>
                    <span className={`font-mono text-xs font-bold ${
                      m.percentile <= 20 ? 'text-emerald-600' : m.percentile >= 80 ? 'text-rose-600' : 'text-indigo-600'
                    }`}>
                      {m.percentile}th %ile
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && benchmarkData.length > 0 && (
            <div className="mt-6 pt-5 border-t border-stone-200">
              <div className="label mb-3 text-indigo-600 font-mono">Statistical Outlier Detections (&gt;2.5σ Deviation)</div>
              <div className="space-y-2">
                {benchmarkData.filter((m: any) => m.percentile <= 15 || m.percentile >= 85).map((m: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-md bg-white border border-stone-200 text-xs">
                    <span className={`badge border text-[10px] font-mono ${
                      m.percentile >= 85 
                        ? 'bg-rose-50 text-rose-600 border-rose-200' 
                        : 'bg-emerald-50 text-emerald-600 border-amber-200'
                    }`}>
                      {m.percentile >= 85 ? 'HIGH RISK OUTLIER' : 'EFFICIENT COHORT'}
                    </span>
                    <span className="text-slate-600">
                      <strong className="text-slate-700">{m.metric}</strong>: Observed value <span className="font-mono text-indigo-600">{m.entityDisplay}</span> indicates {m.assessment}.
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}