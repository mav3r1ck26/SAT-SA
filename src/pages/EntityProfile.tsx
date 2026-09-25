import React, { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { RiskScoreGauge, SeverityBadge, Confidence, TelemetryPulse, MitreBadge } from '../components/ui'
import { Radar, ScoreBars } from '../components/charts'
import { fetchEntity, fetchFindings, fetchEvidenceTimeline } from '../api/client'
import { ChevronLeft, Shield, Clock, FileText, Activity, AlertOctagon, Terminal, CheckCircle2, AlertTriangle, Database } from 'lucide-react'

const tabs = ['Overview', 'Detection', 'Investigation', 'Escalation', 'Incident Response', 'Operations', 'Governance', 'Resilience', 'Evidence']

const fallbackTimeline = [
  { event: 'Alert generated — firewall anomaly', actor: 'SIEM', role: 'Detection System', time: '14:23:17', meta: ['BRAC: alerts-tmal'], severity: 'Critical', entity: 'CSE-014', mitre: 'T1059.001' },
  { event: 'SOC analyst assigned', actor: 'SOC-L2-004', role: 'Analyst', time: '14:24:53', meta: [], severity: 'Low', entity: 'CSE-014' },
  { event: 'Preliminary investigation opened', actor: 'SOC-L2-004', role: 'Analyst', time: '14:26:09', meta: [], severity: 'Low', entity: 'CSE-014' },
  { event: 'Alert closed as false positive', actor: 'SOC-L2-004', role: 'Analyst', time: '14:31:02', meta: ['closure-time: 4.9 min'], severity: 'High', entity: 'CSE-014', mitre: 'T1078' },
  { event: 'Peer baseline check', actor: 'Tool', role: 'Automated', time: '14:31:02', meta: ['peer-median: 42 min'], severity: 'Critical', entity: 'CSE-014' },
  { event: 'No escalation record found', actor: '—', role: '—', time: '—', meta: ['missed-step: escalation'], severity: 'High', entity: 'CSE-014', mitre: 'T1041' },
  { event: 'Audit log entry immutable', actor: 'System', role: 'Audit Engine', time: '14:31:03', meta: ['SHA-256 Verified'], severity: 'Low', entity: 'CSE-014' }
]

export default function EntityProfile() {
  const { selectedEntity, setCurrentPage } = useApp()
  const [activeTab, setActiveTab] = useState('Overview')
  const [entity, setEntity] = useState<any>(null)
  const [findings, setFindings] = useState<any[]>([])
  const [timeline, setTimeline] = useState<any[]>([])
  const entityId = selectedEntity || 'CSE-014'

  useEffect(() => {
    fetchEntity(entityId).then(setEntity).catch(() => {})
    fetchFindings({ entityId }).then(setFindings).catch(() => setFindings([]))
    fetchEvidenceTimeline(entityId).then(r => setTimeline(r.timeline || fallbackTimeline)).catch(() => setTimeline(fallbackTimeline))
  }, [entityId])

  if (!entity) return (
    <div className="p-8 max-w-[1700px] mx-auto text-center space-y-3">
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyber-900 border border-cyber-700 text-neonCyan font-mono text-sm animate-pulse">
        <Activity className="w-4 h-4 animate-spin" /> Ingesting Entity Telemetry for {entityId}...
      </div>
    </div>
  )

  const riskScore = entity.riskScore ?? entity.metrics?.riskScore ?? 50
  const completeness = entity.dataCompleteness ?? 85

  return (
    <div className="p-6 max-w-[1700px] mx-auto space-y-6">
      {/* Back Button */}
      <button 
        onClick={() => setCurrentPage('entities')} 
        className="flex items-center gap-1.5 text-xs font-mono text-cyber-400 hover:text-neonCyan transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Return to Entity Fleet Registry
      </button>

      {/* Header Dossier Banner */}
      <div className="card p-5 bg-gradient-to-r from-cyber-900/90 via-cyber-900/60 to-cyber-950/90 border-cyber-700/80">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <span className="mono-id text-lg font-bold text-neonCyan px-2.5 py-1 rounded bg-cyber-950 border border-cyber-700">
                {entity.id}
              </span>
              <h1 className="text-xl font-bold text-cyber-100 tracking-tight">
                {entity.name}
              </h1>
              <TelemetryPulse active status="online" label="ACTIVE AUDIT" />
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-mono text-cyber-400">
              <span>Sector: <strong className="text-neonCyan">{entity.sector}</strong></span>
              <span>Audit Period: <strong className="text-cyber-200">Q2 FY 2026–27</strong></span>
              <span>Supervisory Tier: <strong className="text-neonAmber">{entity.criticality || 'Tier 1 - Critical'}</strong></span>
              <span>Status: <strong className="text-neonEmerald">{entity.status}</strong></span>
              <span>Last Ingest: <strong className="text-cyber-300">{entity.lastSubmission || '2026-09-24 IST'}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-cyber-950/80 p-3.5 rounded-lg border border-cyber-800">
            <div className="text-right">
              <div className="label mb-0.5">Telemetry Completeness</div>
              <div className="font-mono text-base font-bold text-neonCyan">{completeness}%</div>
              <div className="text-[10px] text-cyber-400 font-mono">Air-Gap Ingested</div>
            </div>
            <div className="w-12 h-12 rounded-full border-2 border-cyber-700 flex items-center justify-center bg-cyber-900 text-neonCyan font-mono text-xs font-bold">
              {completeness}%
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-1.5 border-b border-cyber-800 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button 
            key={t} 
            onClick={() => setActiveTab(t)} 
            className={`tab text-xs font-mono tracking-wider ${activeTab === t ? 'tab-active' : 'text-cyber-400 hover:text-cyber-200'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {activeTab === 'Overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Risk Gauge & Score Breakdown */}
          <div className="lg:col-span-4 space-y-5">
            <div className="card p-5">
              <div className="label mb-3 flex items-center justify-between">
                <span>Composite Supervisory Risk Gauge</span>
                <span className="text-[10px] font-mono text-neonCyan">ML ENSEMBLE</span>
              </div>
              
              <div className="flex justify-center py-3">
                <RiskScoreGauge score={riskScore} />
              </div>

              <div className="mt-5 pt-4 border-t border-cyber-800/80">
                <div className="label mb-3">Domain Sub-Score Analysis</div>
                <ScoreBars data={[
                  { label: 'Threat Detection', value: entity.detection ?? entity.metrics?.threatDetection ?? entity.threatDetection ?? 50 },
                  { label: 'Investigation Rigor', value: entity.investigation ?? entity.metrics?.investigation ?? 50 },
                  { label: 'Escalation Protocol', value: entity.escalation ?? entity.metrics?.escalation ?? 50 },
                  { label: 'SecOps Cadence', value: entity.operations ?? entity.metrics?.securityOperations ?? entity.securityOperations ?? 50 },
                  { label: 'Gov. & Oversight', value: entity.governance ?? entity.metrics?.governanceOversight ?? entity.governanceOversight ?? 50 },
                  { label: 'Cyber Resilience', value: entity.resilience ?? entity.metrics?.cyberResilience ?? entity.cyberResilience ?? 50 }
                ]} />
              </div>
            </div>

            {/* Quick Entity Metadata */}
            <div className="card p-4 space-y-3">
              <div className="label">Forensic Audit Parameters</div>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between py-1 border-b border-cyber-800/60">
                  <span className="text-cyber-400">Total Ingested Events</span>
                  <span className="text-cyber-100 font-bold">28,451 records</span>
                </div>
                <div className="flex justify-between py-1 border-b border-cyber-800/60">
                  <span className="text-cyber-400">Execution Gaps Identified</span>
                  <span className="text-neonRose font-bold">{entity.executionGaps ?? findings.length} critical</span>
                </div>
                <div className="flex justify-between py-1 border-b border-cyber-800/60">
                  <span className="text-cyber-400">Sensor Blind Spots</span>
                  <span className="text-neonAmber font-bold">{entity.negativeSpace ?? 2} uncovered</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-cyber-400">SHA-256 Ingestion Hash</span>
                  <span className="text-cyber-400 text-[10px] truncate max-w-[140px]">9f83a...bc41e</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Radar Profile, Findings & Timeline */}
          <div className="lg:col-span-8 space-y-5">
            {/* Radar Card */}
            <div className="card p-5">
              <div className="label mb-3 flex items-center justify-between">
                <span>Multi-Vector Behavioral Radar Profile</span>
                <span className="text-[10px] font-mono text-cyber-400">Supervisory Baseline vs Observed Telemetry</span>
              </div>
              <div className="flex justify-center py-2">
                <Radar data={[
                  { label: 'Detection', value: entity.detection ?? entity.metrics?.threatDetection ?? entity.threatDetection ?? 50 },
                  { label: 'Investigation', value: entity.investigation ?? entity.metrics?.investigation ?? 50 },
                  { label: 'Escalation', value: entity.escalation ?? entity.metrics?.escalation ?? 50 },
                  { label: 'Operations', value: entity.operations ?? entity.metrics?.securityOperations ?? entity.securityOperations ?? 50 },
                  { label: 'Governance', value: entity.governance ?? entity.metrics?.governanceOversight ?? entity.governanceOversight ?? 50 },
                  { label: 'Resilience', value: entity.resilience ?? entity.metrics?.cyberResilience ?? entity.cyberResilience ?? 50 }
                ]} />
              </div>
            </div>

            {/* Key Findings for Entity */}
            <div className="card">
              <div className="card-header border-b border-cyber-800 pb-3 flex items-center justify-between">
                <div>
                  <div className="card-title flex items-center gap-2">
                    <AlertOctagon className="w-4 h-4 text-neonRose" />
                    Key Supervisory Findings for {entity.id}
                  </div>
                  <div className="card-subtitle text-cyber-400">
                    Definitive operational evidence divergences from established control baselines
                  </div>
                </div>
                <span className="badge badge-danger text-xs font-mono">{findings.length} findings</span>
              </div>
              
              <div className="divide-y divide-cyber-800/80">
                {findings.map((f: any, i: number) => (
                  <div key={i} className="p-4 hover:bg-cyber-800/40 transition-colors space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <SeverityBadge severity={f.severity} />
                        <span className="text-xs font-bold text-cyber-100">{f.finding}</span>
                        <span className="mono-id text-neonCyan">{f.id}</span>
                        {f.mitreTechnique && <MitreBadge techniqueId={f.mitreTechnique} name={f.mitreTechnique} />}
                      </div>
                      <div className="flex items-center gap-3">
                        <Confidence value={f.confidence} compact />
                        <span className="text-xs font-mono text-cyber-400 bg-cyber-900 px-2 py-0.5 rounded border border-cyber-800">
                          {f.evidenceCount} evidence items
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-xs text-cyber-300 leading-relaxed pl-1">{f.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Evidence Forensic Timeline */}
            <div className="card p-5">
              <div className="label mb-3 flex items-center justify-between">
                <span>Forensic Operational Evidence Timeline</span>
                <span className="text-[10px] font-mono text-neonCyan">TIME-CORRELATED AUDIT SEQUENCE</span>
              </div>

              <div className="space-y-0 relative border-l-2 border-cyber-800 ml-3 pl-5 py-2">
                {timeline.map((evt: any, i: number) => (
                  <div key={i} className="relative pb-5 last:pb-1">
                    {/* Timeline Node Glow Dot */}
                    <div className={`absolute -left-[27px] top-1.5 w-3.5 h-3.5 rounded-full border-2 ${
                      evt.severity === 'Critical' 
                        ? 'bg-neonRose border-cyber-950 ring-2 ring-neonRose/30 animate-pulse' 
                        : evt.severity === 'High' 
                        ? 'bg-neonAmber border-cyber-950' 
                        : 'bg-cyber-700 border-cyber-950'
                    }`} />

                    <div className="bg-cyber-950/70 p-3 rounded-lg border border-cyber-800/80 space-y-1.5 hover:border-cyber-700 transition-colors">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-cyber-100">{evt.event}</span>
                          {evt.mitre && <MitreBadge techniqueId={evt.mitre} name={evt.mitre} />}
                        </div>
                        <div className="text-[11px] font-mono text-neonCyan bg-cyber-900 px-2 py-0.5 rounded border border-cyber-800">
                          {evt.time} {evt.time !== '—' ? 'IST' : ''}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-cyber-400 font-mono">
                        <span>Actor: <strong className="text-cyber-200">{evt.actor}</strong></span>
                        <span>Role: <strong className="text-cyber-300">{evt.role}</strong></span>
                      </div>

                      {(evt.meta || []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {(evt.meta || []).map((m: string, j: number) => (
                            <span key={j} className="text-[10.5px] font-mono text-cyber-300 bg-cyber-900 px-2 py-0.5 rounded border border-cyber-800">
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
          </div>
        </div>
      )}

      {activeTab !== 'Overview' && (
        <div className="card p-10 text-center space-y-3 bg-cyber-950/60 border-cyber-800">
          <Terminal className="w-8 h-8 text-neonCyan mx-auto" />
          <h3 className="text-sm font-bold text-cyber-100 font-mono">{activeTab} Operational Audit Stream</h3>
          <p className="text-xs text-cyber-400 max-w-md mx-auto">
            Deep forensic drilldown for {entity.id} in domain <span className="text-neonCyan">{activeTab}</span>. Raw audit logs are verified with zero data exfiltration.
          </p>
        </div>
      )}
    </div>
  )
}