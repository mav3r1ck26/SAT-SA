import React, { useState } from 'react'
import { Heatmap } from '../components/charts'
import StatCard from '../components/StatCard'
import { TelemetryPulse } from '../components/ui'
import { AlertTriangle, Download, EyeOff, Radio, ShieldAlert, ChevronRight, Filter } from 'lucide-react'
import { fetchBlindSpots, fetchEntities, fetchCoverageMatrix } from '../api/client'
import { downloadCSV } from '../utils/export'
import { useApp } from '../context/AppContext'
import { useEntityScope } from '../hooks/useEntityScope'
import { useApiResource } from '../hooks/useApiResource'
import RequestState from '../components/RequestState'

export default function NegativeSpace() {
  const { setSelectedEntity, setCurrentPage, assessmentPeriod, entityFilter, setEntityFilter } = useApp()
  const entityId = useEntityScope()
  const selectedEntity = entityId || 'ALL'
  const blindSpotsResource = useApiResource(`blind-spots:${assessmentPeriod}:${entityId || 'ALL'}`, signal =>
    fetchBlindSpots(entityId, assessmentPeriod, signal)
  )
  const entitiesResource = useApiResource(`negative-entities:${assessmentPeriod}`, signal =>
    fetchEntities({ period: assessmentPeriod }, signal)
  )
  const matrixResource = useApiResource(`coverage:${assessmentPeriod}:${entityId || 'ALL'}`, signal =>
    fetchCoverageMatrix(entityId, assessmentPeriod, signal)
  )
  const blindSpots = blindSpotsResource.data || []
  const entities = entitiesResource.data || []
  const [selectedSeverity, setSeverityFilter] = useState('ALL')
  const matrixData = matrixResource.data || {
    categories: [],
    columns: [],
    matrix: []
  }

  const filteredSpots = blindSpots.filter(b => {
    if (selectedEntity !== 'ALL' && (b.entityId || b.entity) !== selectedEntity) return false
    if (selectedSeverity !== 'ALL' && b.severity !== selectedSeverity) return false
    return true
  })

  const spotCount = blindSpots.length
  const lowCoverage = blindSpots.filter(b => b.observedPct != null && b.observedPct < 50).length
  const criticalSpots = blindSpots.filter(b => b.severity === 'Critical').length
  const entitiesAffected = new Set(blindSpots.map(b => b.entityId)).size

  const handleExport = () => {
    const headers = ['Category', ...matrixData.columns]
    const rows = matrixData.categories.map((cat, i) => [
      cat,
      ...(matrixData.matrix[i] || [])
    ])
    downloadCSV(`SAT-SA_Negative_Space_Matrix_${selectedEntity}_${new Date().toISOString().slice(0, 10)}`, headers, rows)
  }

  const exportSpotsCSV = () => {
    const headers = ['Entity ID', 'Asset Group', 'Severity', 'Observed Signal (%)', 'Description']
    const rows = filteredSpots.map(b => [
      b.entityId || b.entity,
      b.assetGroup || b.category,
      b.severity || 'Critical',
      b.observedPct ?? b.observed,
      b.description || ''
    ])
    downloadCSV(`SAT-SA_Blind_Spots_${selectedEntity}_${new Date().toISOString().slice(0, 10)}`, headers, rows)
  }

  const navigateToEntity = (eId: string) => {
    setSelectedEntity(eId)
    setCurrentPage('entity')
  }

  const resourceError = blindSpotsResource.error || entitiesResource.error || matrixResource.error
  const retryResource = blindSpotsResource.error ? blindSpotsResource : entitiesResource.error ? entitiesResource : matrixResource
  if (blindSpotsResource.loading || entitiesResource.loading || matrixResource.loading || resourceError) {
    return <RequestState
      loading={blindSpotsResource.loading || entitiesResource.loading || matrixResource.loading}
      error={resourceError}
      retry={retryResource.retry}
      retryInSeconds={retryResource.retryInSeconds}
      loadingMessage="Loading negative-space analytics…"
    />
  }

  return (
    <div className="p-6 max-w-[1700px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="page-title text-xl font-bold tracking-tight text-slate-900">Negative Space & Telemetry Blind Spots</h1>
            <span className="rounded border border-slate-300 bg-slate-50 px-2 py-1 text-[10px] font-mono text-slate-600">RECORDED COVERAGE DATA</span>
          </div>
          <p className="page-subtitle text-slate-400 text-xs mt-0.5">
            Statistical detection of missing, suppressed, or disconnected telemetry pipelines in critical infrastructure
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="btn btn-sm flex items-center gap-1.5 text-slate-700 hover:text-slate-900">
            <Download className="w-3.5 h-3.5 text-indigo-600" /> Export Coverage Heatmap
          </button>
          <button onClick={exportSpotsCSV} className="btn btn-sm flex items-center gap-1.5 text-slate-700 hover:text-slate-900">
            <Download className="w-3.5 h-3.5 text-indigo-600" /> Export Blind Spots (CSV)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard label="Negative Space Indicators" value={String(spotCount)} icon="space" accent="neutral" />
        <StatCard label="Low Coverage Areas (<50%)" value={String(lowCoverage)} icon="gap" accent="warning" />
        <StatCard label="Critical Coverage Gaps" value={String(criticalSpots)} icon="alert" accent="danger" />
        <StatCard label="Entities with Blind Spots" value={String(entitiesAffected)} icon="building" accent="neutral" />
      </div>

      {/* Coverage Matrix */}
      <div className="card">
        <div className="card-header border-b border-slate-200 pb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="card-title text-sm font-semibold flex items-center gap-2 text-slate-800">
              <Radio className="w-4 h-4 text-indigo-600" />
              Cross-Vector Telemetry Fidelity Heatmap Matrix
            </div>
            <div className="card-subtitle text-xs text-slate-400">
              Ratio of observed vs expected event telemetry across critical infrastructure architecture tiers
            </div>
          </div>
          <span className="badge text-[10.5px] font-mono bg-slate-100 text-slate-600 border-slate-300">
            {matrixData.categories.length} × {matrixData.columns.length} recorded dimensions
          </span>
        </div>
        <div className="p-5">
          {matrixData.categories.length ? <Heatmap rows={matrixData.categories} columns={matrixData.columns} data={matrixData.matrix} /> : <p className="p-5 text-sm text-slate-500">No telemetry coverage records are available for this entity and assessment period.</p>}
        </div>
      </div>

      {/* Detected Blind Spots Table */}
      <div className="card">
        <div className="card-header border-b border-slate-200 pb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <EyeOff className="w-4 h-4 text-rose-600" />
            <div>
              <div className="card-title text-sm font-semibold text-slate-800">Identified Sensor Blackouts & Silent Pipelines</div>
              <div className="card-subtitle text-xs text-slate-400">Submissions lacking telemetry from active crown-jewel assets</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Entity Filter */}
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className="text-slate-400">CSE:</span>
              <select
                value={entityFilter}
                onChange={e => setEntityFilter(e.target.value)}
                className="select bg-slate-50 border-slate-300 text-indigo-600 text-xs py-1"
              >
                <option value="ALL">All Entities ({blindSpots.length})</option>
                {entities.map(e => (
                  <option key={e.id} value={e.id}>{e.id} — {e.name}</option>
                ))}
              </select>
            </div>

            {/* Severity Filter */}
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className="text-slate-400">Severity:</span>
              <select
                value={selectedSeverity}
                onChange={e => setSeverityFilter(e.target.value)}
                className="select bg-slate-50 border-slate-300 text-indigo-600 text-xs py-1"
              >
                <option value="ALL">All Severities</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
              </select>
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-800">
          {filteredSpots.length > 0 ? filteredSpots.map((bs, i) => {
            const eId = bs.entityId || bs.entity
            const sev = bs.severity || 'Unknown'
            const sevColor = sev === 'Critical' ? 'text-rose-600 border-rose-200 bg-rose-50' : 'text-amber-600 border-amber-200 bg-amber-50'
            const obsPct = bs.observedPct ?? bs.observed
            return (
              <div key={i} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-3 min-w-0">
                  <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => navigateToEntity(eId)}
                        className="font-mono text-xs font-bold text-indigo-600 hover:text-indigo-600 underline underline-offset-2 flex items-center gap-0.5"
                        title={`Navigate to ${eId} profile`}
                      >
                        {eId}
                        <ChevronRight className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold text-slate-800">{bs.assetGroup || bs.category}</span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${sevColor}`}>
                        {sev}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{bs.description}</p>
                  </div>
                </div>

                <div className="text-right shrink-0 bg-white px-4 py-2 rounded-lg border border-slate-200 min-w-[120px]">
                  <div className={`font-mono text-lg font-bold leading-none ${obsPct != null && obsPct < 50 ? 'text-rose-600' : 'text-amber-600'}`}>
                    {obsPct == null ? '—' : `${obsPct}%`}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 mt-1 uppercase tracking-wider">Observed Signal</div>
                </div>
              </div>
            )
          }) : (
            <div className="p-8 text-center text-xs font-mono text-slate-400">
              No recorded blind-spot findings match the selected criteria.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}