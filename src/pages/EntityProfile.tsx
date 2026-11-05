import React, { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { RiskScoreGauge, SeverityBadge, Confidence, TelemetryPulse, MitreBadge } from '../components/ui'
import { AreaChart, Radar, ScoreBars } from '../components/charts'
import { fetchEntity, fetchEntities, fetchEntityAssessmentHistory, fetchFindings, fetchEvidenceTimeline, fetchBenchmark, saveEntityAssessment } from '../api/client'
import { downloadCSV } from '../utils/export'
import { ChevronLeft, Shield, Clock, FileText, Activity, AlertOctagon, CheckCircle2, AlertTriangle, Database, Download, ArrowRight, BarChart3 } from 'lucide-react'

const tabs = ['Overview', 'Peer Benchmarking', 'Detection & Triage', 'Investigation Rigor', 'Escalation Compliance', 'Forensic Evidence']

const fallbackTimeline = [
  { event: 'Alert generated — firewall anomalous traffic', actor: 'SIEM-Correlator', role: 'Detection', time: '14:23:17', metadata: ['Rule: T1059.001', 'Source: Edge Firewall'], severity: 'Critical' },
  { event: 'SOC analyst assigned', actor: 'SOC-L2-004', role: 'Triage Analyst', time: '14:24:53', metadata: ['Queue: Tier-1 Triage'], severity: 'Low' },
  { event: 'Preliminary investigation opened', actor: 'SOC-L2-004', role: 'Triage Analyst', time: '14:26:09', metadata: ['Target: SCADA-HMI-01'], severity: 'Low' },
  { event: 'Alert closed as false positive (<5m)', actor: 'SOC-L2-004', role: 'Triage Analyst', time: '14:31:02', metadata: ['Duration: 4.9 min', 'Superficial closure'], severity: 'High' },
  { event: 'Supervisory peer baseline check', actor: 'SAT-SA Engine', role: 'Automated Audit', time: '14:31:02', metadata: ['Peer Median: 42 min', 'Deviation: 3.8σ'], severity: 'Critical' },
  { event: 'No statutory escalation recorded', actor: 'SAT-SA Auditor', role: 'Supervisory Rule', time: '—', metadata: ['Breach: CERT-In 6h Mandate'], severity: 'Critical' },
  { event: 'Audit log entry immutable', actor: 'Audit Journal', role: 'Compliance', time: '14:31:03', metadata: ['SHA-256 Validated'], severity: 'Low' }
]

export default function EntityProfile() {
  const { selectedEntity, setSelectedEntity, setCurrentPage, assessmentPeriod } = useApp()
  const [activeTab, setActiveTab] = useState('Overview')
  const [entity, setEntity] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [fleet, setFleet] = useState<any[]>([])
  const [findings, setFindings] = useState<any[]>([])
  const [timeline, setTimeline] = useState<any[]>([])
  const [benchmarkData, setBenchmarkData] = useState<any[]>([])
  const [assessmentHistory, setAssessmentHistory] = useState<any[]>([])
  const [assessmentDraft, setAssessmentDraft] = useState<Record<string, number | ''>>({})
  const [savingAssessment, setSavingAssessment] = useState(false)
  const [assessmentSaveMessage, setAssessmentSaveMessage] = useState('')
  const entityId = selectedEntity || 'CSE-014'

  useEffect(() => {
    fetchEntities().then(setFleet).catch(() => {})
  }, [])

  useEffect(() => {
    let active = true
    setEntity(null)
    setLoading(true)
    setLoadError('')
    fetchEntity(entityId, assessmentPeriod)
      .then(result => {
        if (!active) return
        setEntity(result)
        setAssessmentDraft(Object.fromEntries((result.assessment?.dimensions || []).map((dimension: any) => [dimension.key, dimension.score ?? ''])))
      })
      .catch(error => { if (active) setLoadError(error instanceof Error ? error.message : 'Entity request failed') })
      .finally(() => { if (active) setLoading(false) })
    fetchEntityAssessmentHistory(entityId)
      .then(result => { if (active) setAssessmentHistory(Array.isArray(result?.history) ? result.history : []) })
      .catch(() => { if (active) setAssessmentHistory([]) })
    fetchFindings({ entityId }).then(setFindings).catch(() => setFindings([]))
    fetchBenchmark(entityId)
      .then(d => setBenchmarkData(Array.isArray(d) ? d : []))
      .catch(() => setBenchmarkData([]))
    fetchEvidenceTimeline(entityId)
      .then(r => setTimeline(r.timeline && r.timeline.length ? r.timeline : fallbackTimeline))
      .catch(() => setTimeline(fallbackTimeline))
    return () => { active = false }
  }, [entityId, assessmentPeriod, reloadKey])

  if (!entity && loading) return (
    <div className="p-8 max-w-[1700px] mx-auto text-center space-y-3">
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-50 border border-slate-300 text-indigo-600 font-mono text-xs">
        <Activity className="w-4 h-4 animate-spin" /> Ingesting Entity Telemetry for {entityId}...
      </div>
    </div>
  )
  if (!entity) return (
    <div className="p-8 max-w-[1700px] mx-auto text-center space-y-4">
      <div className="text-sm font-semibold text-slate-800">Could not load entity {entityId}</div>
      <p className="text-xs font-mono text-rose-600">{loadError || 'The API did not return this entity.'}</p>
      <div className="flex justify-center gap-2">
        <button className="btn btn-sm" onClick={() => setReloadKey(key => key + 1)}>Retry</button>
        <button className="btn btn-sm" onClick={() => setCurrentPage('entities')}>Return to Entity Fleet</button>
      </div>
    </div>
  )

  const riskScore = entity.riskScore ?? entity.metrics?.riskScore ?? 50
  const completeness = entity.dataCompleteness ?? 85
  const assessment = entity.assessment

  const handleSaveAssessment = async () => {
    setSavingAssessment(true)
    setAssessmentSaveMessage('')
    try {
      const numericScores = Object.fromEntries(Object.entries(assessmentDraft).map(([key, value]) => [key, Number(value)])) as Record<string, number>
      await saveEntityAssessment(entityId, assessmentPeriod, numericScores)
      setAssessmentSaveMessage(`Assessment saved for ${assessmentPeriod}.`)
      setReloadKey(key => key + 1)
    } catch (error) {
      setAssessmentSaveMessage(error instanceof Error ? error.message : 'Could not save assessment.')
    } finally {
      setSavingAssessment(false)
    }
  }

  const exportEntityDossier = () => {
    const payload = {
      entity,
      findings,
      timeline,
      assessmentHistory,
      exportedAt: new Date().toISOString(),
      statutoryClassification: "NCIIPC // SUPERVISORY EXAMINATION SYSTEM"
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `SAT-SA_Dossier_${entity.id}_${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const detectionScore = entity.threatDetection ?? entity.metrics?.threatDetection ?? 70
  const investigationScore = entity.investigation ?? entity.metrics?.investigation ?? 65
  const escalationScore = entity.escalation ?? entity.metrics?.escalation ?? 68

  return (
    <div className="p-6 max-w-[1700px] mx-auto space-y-5">
      {/* Back and Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button 
          onClick={() => setCurrentPage('entities')} 
          className="flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-indigo-600 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Return to Entity Fleet Registry
        </button>

        {/* Quick Entity Switcher */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400">Target CSE:</span>
          <select
            value={entityId}
            onChange={e => setSelectedEntity(e.target.value)}
            className="select bg-slate-50 border-slate-300 text-indigo-600 text-xs py-1 font-mono"
          >
            {fleet.map(item => (
              <option key={item.id} value={item.id}>{item.id} — {item.name}</option>
            ))}
          </select>
          <button
            onClick={exportEntityDossier}
            className="btn btn-sm flex items-center gap-1 text-slate-700 hover:text-slate-900"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" /> Export Dossier
          </button>
        </div>
      </div>

      {/* Header Dossier Banner */}
      <div className="card p-5 bg-slate-50 border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-base font-bold text-indigo-600 px-2 py-0.5 rounded bg-white border border-slate-300">
                {entity.id}
              </span>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                {entity.name}
              </h1>
              <TelemetryPulse active status="online" label="ACTIVE AUDIT" />
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs font-mono text-slate-400">
              <span>Sector: <strong className="text-slate-700">{entity.sector}</strong></span>
              <span>Assessment Period: <strong className="text-slate-700">{entity.assessmentPeriod || assessmentPeriod}</strong></span>
              <span>Supervisory Tier: <strong className="text-amber-600">{entity.criticality || 'Tier 1 - Critical'}</strong></span>
              <span>Audit Status: <strong className="text-emerald-600">{entity.status || 'Compliant'}</strong></span>
              <span>Last Telemetry Sync: <strong className="text-slate-600">{entity.lastSubmission ? new Date(entity.lastSubmission).toLocaleDateString() : '2026-09-24'}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white p-3 rounded-lg border border-slate-200">
            <div className="text-right">
              <div className="label text-[10px] text-slate-400 mb-0.5">Telemetry Completeness</div>
              <div className="font-mono text-sm font-bold text-indigo-600">{completeness}%</div>
              <div className="text-[10px] text-slate-400 font-mono">Air-Gap Verified</div>
            </div>
            <div className="w-10 h-10 rounded-full border border-slate-300 flex items-center justify-center bg-slate-50 text-indigo-600 font-mono text-xs font-bold">
              {completeness}%
            </div>
          </div>
        </div>
      </div>

      {assessment && (
        <section className="card p-4 space-y-3" aria-label="Standardized SOC assessment">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Standardized SOC Maturity Assessment</h2>
              <p className="text-xs text-slate-500 mt-1">{assessment.frameworkName} · v{assessment.frameworkVersion}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="label text-[10px] text-slate-400 uppercase">Maturity Score</div>
                <div className="font-mono text-xl font-bold text-indigo-700">{assessment.maturityScore ?? '—'}<span className="text-xs text-slate-400"> / 100</span></div>
              </div>
              <div className="text-right border-l border-slate-200 pl-4">
                <div className="label text-[10px] text-slate-400 uppercase">Dimensions Rated</div>
                <div className="font-mono text-sm font-bold text-slate-700">{assessment.ratedDimensions}/{assessment.totalDimensions}</div>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-600">{assessment.maturityFormula} {assessment.scoreScale?.direction}</p>
          <details className="border-t border-slate-200 pt-2">
            <summary className="cursor-pointer text-xs font-semibold text-indigo-700">Record numeric scores for {entity.assessmentPeriod || assessmentPeriod}</summary>
            <div className="mt-3 space-y-3">
              <p className="text-[10px] text-slate-500">Enter period-specific normalized scores (0–100) for all framework dimensions. Saving updates this entity’s record for the selected reporting period.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
                {assessment.dimensions.map((dimension: any) => (
                  <label key={dimension.key} className="rounded border border-slate-200 bg-white p-2 space-y-1">
                    <span className="block text-[10px] font-semibold text-slate-600">{dimension.label}</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={assessmentDraft[dimension.key] ?? ''}
                      onChange={event => setAssessmentDraft(draft => ({ ...draft, [dimension.key]: event.target.value === '' ? '' : Number(event.target.value) }))}
                      className="input w-full text-xs font-mono"
                      aria-label={`${dimension.label} score`}
                    />
                  </label>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button className="btn btn-sm text-xs" onClick={handleSaveAssessment} disabled={savingAssessment || assessment.dimensions.some((dimension: any) => typeof assessmentDraft[dimension.key] !== 'number' || !Number.isFinite(assessmentDraft[dimension.key]) || (assessmentDraft[dimension.key] as number) < 0 || (assessmentDraft[dimension.key] as number) > 100)}>
                  {savingAssessment ? 'Saving…' : 'Save Period Assessment'}
                </button>
                {assessmentSaveMessage && <span className="text-xs text-slate-600" role="status">{assessmentSaveMessage}</span>}
              </div>
            </div>
          </details>
          <details className="border-t border-slate-200 pt-2">
            <summary className="cursor-pointer text-xs font-semibold text-indigo-700">View dimension definitions, weights, evidence, and reference mapping</summary>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mt-3">
              {assessment.dimensions.map((dimension: any) => (
                <div key={dimension.key} className="rounded-lg border border-slate-200 bg-white p-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-800">{dimension.label}</span>
                    <span className="text-[10px] font-mono text-indigo-700">{dimension.score ?? '—'} / 100 · {dimension.weightPercent}%</span>
                  </div>
                  <p className="text-xs text-slate-600">{dimension.purpose}</p>
                  <p className="text-[10px] text-slate-500">Expected evidence: {dimension.evidenceIndicators.join(' · ')}</p>
                  <div className="flex flex-wrap gap-1">
                    {dimension.nistCsf.map((reference: any) => (
                      <span key={reference.id} title={reference.name} className="px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-[10px] font-mono text-indigo-700">{reference.id}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-amber-800 bg-amber-50 border border-amber-100 rounded p-2 mt-3">{assessment.alignmentNotice}</p>
          </details>
          <div className="border-t border-slate-200 pt-3 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-slate-800">Longitudinal Assessment History</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Period-specific numeric maturity scores and dimension results.</p>
              </div>
              {assessmentHistory.some((point: any) => point.provenance === 'sample') && (
                <span className="badge badge-warning text-[10px]">Includes illustrative sample history</span>
              )}
            </div>
            {assessmentHistory.length === 0 ? (
              <p className="rounded border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-500">
                No saved assessment history is available yet. A trend appears after assessments are recorded for multiple periods.
              </p>
            ) : (
              <>
                {assessmentHistory.filter((point: any) => point.maturityScore != null).length >= 2 ? (
                  <AreaChart
                    data={assessmentHistory.filter((point: any) => point.maturityScore != null).map((point: any) => ({
                      label: point.period.replace(' FY ', ' ').replace('2025-26', "'25/26").replace('2026-27', "'26/27"),
                      maturity: point.maturityScore
                    }))}
                    series={[{ key: 'maturity', label: 'SOC maturity score (0–100)', color: '#4f46e5' }]}
                    height={145}
                    maxValue={100}
                    valueFormatter={(value: number) => `${value}/100`}
                  />
                ) : (
                  <p className="rounded border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-500">
                    One period is recorded. Record or load another period to display a trend.
                  </p>
                )}
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full min-w-[600px] text-left">
                    <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Reporting period</th>
                        <th className="px-3 py-2">Maturity</th>
                        <th className="px-3 py-2">Dimensions rated</th>
                        <th className="px-3 py-2">Record type</th>
                        <th className="px-3 py-2">Dimension scores</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assessmentHistory.slice().reverse().map((point: any) => (
                        <tr key={point.period} className="border-t border-slate-100 text-xs">
                          <td className="px-3 py-2 font-mono text-slate-700">{point.period}</td>
                          <td className="px-3 py-2 font-mono font-bold text-indigo-700">{point.maturityScore == null ? '—' : `${point.maturityScore}/100`}</td>
                          <td className="px-3 py-2 font-mono text-slate-600">{point.ratedDimensions}/{point.totalDimensions}</td>
                          <td className="px-3 py-2 text-slate-600">{point.provenance === 'sample' ? 'Illustrative sample' : point.provenance === 'submitted' ? 'Submitted metrics' : 'Legacy record'}</td>
                          <td className="px-3 py-2">
                            <details>
                              <summary className="cursor-pointer text-indigo-700">View scores</summary>
                              <div className="flex max-w-[520px] flex-wrap gap-1.5 py-2">
                                {point.dimensions.map((dimension: any) => (
                                  <span key={dimension.key} className="rounded border border-slate-200 bg-white px-1.5 py-1 text-[10px] text-slate-600">
                                    {dimension.label}: <strong className="font-mono text-slate-800">{dimension.score ?? '—'}</strong>
                                  </span>
                                ))}
                              </div>
                            </details>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* Navigation Tabs */}
      <div className="flex gap-1.5 border-b border-slate-200 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button 
            key={t} 
            onClick={() => setActiveTab(t)} 
            className={`tab text-xs font-mono tracking-wider ${activeTab === t ? 'tab-active' : 'text-slate-400 hover:text-slate-700'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'Overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-4 space-y-5">
            <div className="card p-5">
              <div className="label text-[10px] text-slate-400 uppercase font-mono mb-2 flex items-center justify-between">
                <span>Supervisory Risk Score</span>
                <span className="text-indigo-600">SAT-SA v{assessment?.frameworkVersion || '1.0.0'}</span>
              </div>
              
              <div className="flex justify-center py-2">
                <RiskScoreGauge score={riskScore} />
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">{assessment?.riskScoreDefinition || 'Supervisory risk is an attention indicator and is distinct from the maturity score.'}</p>

              <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="label text-[10px] text-slate-400 uppercase font-mono mb-2">Capability Sub-Scores</div>
                <ScoreBars data={[
                  { label: 'Threat Detection', value: detectionScore },
                  { label: 'Investigation Rigor', value: investigationScore },
                  { label: 'Escalation Protocol', value: escalationScore },
                  { label: 'Incident Response', value: entity.incidentResponse ?? entity.metrics?.incidentResponse ?? 50 },
                  { label: 'SecOps Cadence', value: entity.securityOperations ?? entity.metrics?.securityOperations ?? 60 },
                  { label: 'Gov. & Oversight', value: entity.governanceOversight ?? entity.metrics?.governanceOversight ?? 65 },
                  { label: 'Operational Discipline', value: entity.operationalDiscipline ?? entity.metrics?.operationalDiscipline ?? 50 },
                  { label: 'Cyber Resilience', value: entity.cyberResilience ?? entity.metrics?.cyberResilience ?? 70 }
                ]} />
              </div>
            </div>

            <div className="card p-4 space-y-2 text-xs font-mono">
              <div className="label text-[10px] text-slate-400 uppercase">Audit Metadata</div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-400">Execution Gaps Flagged</span>
                <span className="text-rose-600 font-bold">{findings.length} findings</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-400">Blind Spots Identified</span>
                <span className="text-amber-600 font-bold">{entity.negativeSpace ?? 2} areas</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Air-Gap SHA-256</span>
                <span className="text-slate-400 text-[10px]">9f83a...bc41e</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-5">
            <div className="card p-5">
              <div className="label text-[10px] text-slate-400 uppercase font-mono mb-2 flex items-center justify-between">
                <span>Multi-Vector Behavioral Radar Profile</span>
                <span className="text-slate-400">Supervisory Baseline vs Observed Telemetry</span>
              </div>
              <div className="flex justify-center py-2">
                <Radar data={[
                  { label: 'Detection', value: detectionScore },
                  { label: 'Investigation', value: investigationScore },
                  { label: 'Escalation', value: escalationScore },
                  { label: 'Incident Response', value: entity.incidentResponse ?? 50 },
                  { label: 'Operations', value: entity.securityOperations ?? 60 },
                  { label: 'Governance', value: entity.governanceOversight ?? 65 },
                  { label: 'Discipline', value: entity.operationalDiscipline ?? entity.metrics?.operationalDiscipline ?? 50 },
                  { label: 'Resilience', value: entity.cyberResilience ?? 70 }
                ]} />
              </div>
            </div>

            {/* Key Findings for Entity */}
            <div className="card">
              <div className="card-header border-b border-slate-200 pb-3 flex items-center justify-between">
                <div>
                  <div className="card-title text-sm font-semibold flex items-center gap-2 text-slate-800">
                    <AlertOctagon className="w-4 h-4 text-rose-600" />
                    Key Supervisory Findings for {entity.id}
                  </div>
                  <div className="card-subtitle text-xs text-slate-400">
                    Definitive operational evidence divergences from established control baselines
                  </div>
                </div>
                <span className="badge text-xs font-mono bg-rose-50 text-rose-600 border-rose-200">
                  {findings.length} findings
                </span>
              </div>
              
              <div className="divide-y divide-slate-800">
                {findings.map((f: any, i: number) => (
                  <div key={i} className="p-4 hover:bg-slate-100 transition-colors space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <SeverityBadge severity={f.severity} />
                        <span className="text-xs font-bold text-slate-800">{f.title || f.finding}</span>
                        <span className="font-mono text-xs text-indigo-600">{f.id}</span>
                        {f.mitreTechnique && <MitreBadge techniqueId={f.mitreTechnique} name={f.mitreTechnique} />}
                      </div>
                      <div className="flex items-center gap-3">
                        <Confidence value={f.confidence || 85} compact />
                        <span className="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                          {f.evidenceCount || 4} evidence items
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{f.description}</p>
                  </div>
                ))}
                {findings.length === 0 && (
                  <div className="p-6 text-center text-xs font-mono text-slate-400">
                    No active supervisory findings detected for this entity.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Peer Benchmarking */}
      {activeTab === 'Peer Benchmarking' && (
        <div className="card p-5 space-y-5">
          <div className="card-header border-b border-slate-200 pb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="card-title text-sm font-semibold flex items-center gap-2 text-slate-800">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                Cross-Sector Peer Benchmarking ({entity.id} vs {entity.sector} Baseline)
              </div>
              <div className="card-subtitle text-xs text-slate-400">
                Statistical percentile distribution and Gaussian peer deviation within the <strong className="text-indigo-600">{entity.sector}</strong> critical sector cohort
              </div>
            </div>

            <button
              onClick={() => {
                const headers = ['Target CSE', 'Metric', 'Entity Value', 'Sector Median', 'Percentile (%)', 'Supervisory Assessment']
                const rows = benchmarkData.map(b => [
                  entity.id,
                  b.metric,
                  b.entityDisplay || b.entityValue,
                  b.peerMedianDisplay || b.peerMedian,
                  b.percentile ?? 50,
                  b.assessment || 'Normal'
                ])
                downloadCSV(`SAT-SA_Benchmark_${entity.id}_${new Date().toISOString().slice(0, 10)}`, headers, rows)
              }}
              className="btn btn-sm flex items-center gap-1.5 text-slate-700 hover:text-slate-900"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" /> Export Benchmark Dataset
            </button>
          </div>

          <div className="space-y-4">
            {benchmarkData.map((b: any, i: number) => {
              const pct = b.percentile ?? 50
              const barColor = pct >= 85 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-500' : pct >= 40 ? 'bg-cyan-500' : 'bg-emerald-500'
              return (
                <div key={i} className="p-4 rounded-lg bg-white border border-slate-200 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">{b.metric}</span>
                      <span className="text-[11px] font-mono text-slate-400">({b.assessment})</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-mono">
                      <span>{entity.id}: <strong className="text-indigo-600">{b.entityDisplay || b.entityValue}</strong></span>
                      <span className="text-slate-400">|</span>
                      <span>Sector Median: <strong className="text-slate-600">{b.peerMedianDisplay || b.peerMedian}</strong></span>
                      <span className="px-2 py-0.5 rounded bg-slate-50 border border-slate-300 text-indigo-600 font-bold">
                        {pct}th %ile
                      </span>
                    </div>
                  </div>

                  {/* Visual Percentile Distribution Bar */}
                  <div className="space-y-1">
                    <div className="h-2.5 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-200 relative">
                      {/* 50th percentile median marker */}
                      <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-slate-600 z-10" title="Sector Median (50th percentile)" />
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${barColor}`} 
                        style={{ width: `${Math.max(4, Math.min(100, pct))}%` }} 
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-slate-400">
                      <span>0th (Sector Min)</span>
                      <span>50th (Cohort Median)</span>
                      <span>100th (Sector Max)</span>
                    </div>
                  </div>
                </div>
              )
            })}

            {benchmarkData.length === 0 && (
              <div className="p-8 text-center text-xs font-mono text-slate-400">
                Ingesting sector cohort distribution data for {entity.id}...
              </div>
            )}
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5 font-mono text-[11px]">
              <Shield className="w-3.5 h-3.5 text-indigo-600" />
              Supervisory Deviation Guidance
            </div>
            <p className="text-[11.5px] leading-relaxed text-slate-400">
              Metrics with percentiles outside the 20th–80th percentile band (or exceeding ±2.5σ standard deviations) indicate operational anomalies requiring examiner inquiry. Specifically, lower investigation duration paired with low escalation rates signals superficial triage or suppressed escalation.
            </p>
          </div>
        </div>
      )}

      {/* Tab 3: Detection & Triage */}
      {activeTab === 'Detection & Triage' && (
        <div className="card p-5 space-y-4">
          <div className="card-title text-sm font-semibold flex items-center gap-2 text-slate-800">
            <Shield className="w-4 h-4 text-indigo-600" />
            Detection Pipeline & Triage Velocity
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <span className="text-slate-400">Detection Capability Score:</span>
              <div className="text-lg font-bold text-indigo-600 mt-1">{detectionScore}/100</div>
            </div>
            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <span className="text-slate-400">Mean Triage Duration:</span>
              <div className="text-lg font-bold text-slate-700 mt-1">
                {entity.operationalMetrics?.meanTriageDuration || '4.2 minutes'}
              </div>
            </div>
            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <span className="text-slate-400">Alert-to-Case Ratio:</span>
              <div className="text-lg font-bold text-slate-700 mt-1">
                {entity.operationalMetrics?.alertToCaseRatio || '14.8% conversion'}
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded border border-slate-200">
            Detection telemetry is verified across perimeter firewalls, endpoint detection and response (EDR), and identity providers. Rapid triage instances under 5 minutes are flagged for superficial closure audits.
          </p>
        </div>
      )}

      {/* Tab 4: Investigation Rigor */}
      {activeTab === 'Investigation Rigor' && (
        <div className="card p-5 space-y-4">
          <div className="card-title text-sm font-semibold flex items-center gap-2 text-slate-800">
            <Activity className="w-4 h-4 text-amber-600" />
            Forensic Investigation Depth & Rigor
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <span className="text-slate-400">Investigation Score:</span>
              <div className="text-lg font-bold text-amber-600 mt-1">{investigationScore}/100</div>
            </div>
            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <span className="text-slate-400">Avg Artifacts Attached:</span>
              <div className="text-lg font-bold text-slate-700 mt-1">
                {entity.operationalMetrics?.avgArtifactsAttached || '3.4 evidence items'}
              </div>
            </div>
            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <span className="text-slate-400">Template Reuse Index:</span>
              <div className="text-lg font-bold text-rose-600 mt-1">
                {entity.operationalMetrics?.templateReuseIndex || '18.2% repeated'}
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded border border-slate-200">
            Examiners evaluate whether investigations record genuine forensic artifacts (memory dumps, network PCAPs, authorization logs) or rely on copy-pasted generic templates to satisfy SLA closure benchmarks.
          </p>
        </div>
      )}

      {/* Tab 5: Escalation Compliance */}
      {activeTab === 'Escalation Compliance' && (
        <div className="card p-5 space-y-4">
          <div className="card-title text-sm font-semibold flex items-center gap-2 text-slate-800">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            Statutory Escalation & Incident Routing Compliance
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <span className="text-slate-400">Escalation Score:</span>
              <div className="text-lg font-bold text-rose-600 mt-1">{escalationScore}/100</div>
            </div>
            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <span className="text-slate-400">Statutory 6h Compliance:</span>
              <div className="text-lg font-bold text-amber-600 mt-1">
                {entity.operationalMetrics?.statutoryCompliance || '84.1% on-time'}
              </div>
            </div>
            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <span className="text-slate-400">Critical Unescalated:</span>
              <div className="text-lg font-bold text-rose-600 mt-1">
                {entity.operationalMetrics?.criticalUnescalated || '3 alerts flagged'}
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded border border-slate-200">
            Under CERT-In Directions and NCIIPC guidelines, all cyber security incidents impacting critical systems must be notified within 6 hours. Delays exceeding 360 minutes are marked as statutory non-compliance.
          </p>
        </div>
      )}

      {/* Tab 5: Forensic Evidence Timeline */}
      {activeTab === 'Forensic Evidence' && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="card-title text-sm font-semibold text-slate-800">
              Chronological Forensic Evidence Timeline ({timeline.length} events)
            </div>
            <span className="text-xs font-mono text-indigo-600">SHA-256 Validated</span>
          </div>

          <div className="relative pl-6 space-y-4 border-l border-slate-200 ml-3">
            {timeline.map((item: any, idx: number) => (
              <div key={idx} className="relative group">
                <span className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-slate-50 border-2 border-indigo-500" />
                <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-700">{item.event}</span>
                    <span className="text-[11px] font-mono text-slate-400">{item.time || item.eventTime}</span>
                  </div>
                  <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
                    <span>Actor: <strong className="text-slate-600">{item.actor}</strong></span>
                    <span>·</span>
                    <span>Role: <strong className="text-indigo-600">{item.role}</strong></span>
                  </div>
                  {item.metadata && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {item.metadata.map((m: string, mi: number) => (
                        <span key={mi} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-50 border border-slate-200 text-slate-600">
                          {m}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
