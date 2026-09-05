import React, { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { RiskScoreGauge, SeverityBadge, Confidence } from '../components/ui'
import { Radar, ScoreBars } from '../components/charts'
import { fetchEntity, fetchFindings, fetchEvidenceTimeline } from '../api/client'
import { ChevronLeft } from 'lucide-react'

const tabs = ['Overview', 'Detection', 'Investigation', 'Escalation', 'Incident Response', 'Operations', 'Governance', 'Resilience', 'Evidence']

const fallbackTimeline = [
  { event: 'Alert generated — firewall anomaly', actor: 'SIEM', role: 'Detection System', time: '14:23:17', meta: ['BRAC: alerts-tmal'], severity: 'Critical', entity: 'CSE-014' },
  { event: 'SOC analyst assigned', actor: 'SOC-L2-004', role: 'Analyst', time: '14:24:53', meta: [], severity: 'Low', entity: 'CSE-014' },
  { event: 'Preliminary investigation opened', actor: 'SOC-L2-004', role: 'Analyst', time: '14:26:09', meta: [], severity: 'Low', entity: 'CSE-014' },
  { event: 'Alert closed as false positive', actor: 'SOC-L2-004', role: 'Analyst', time: '14:31:02', meta: ['closure-time: 4.9 min'], severity: 'High', entity: 'CSE-014' },
  { event: 'Peer baseline check', actor: 'Tool', role: 'Automated', time: '14:31:02', meta: ['peer-median: 42 min'], severity: 'Critical', entity: 'CSE-014' },
  { event: 'No escalation record found', actor: '—', role: '—', time: '—', meta: ['missed-step: escalation'], severity: 'High', entity: 'CSE-014' },
  { event: 'Audit log entry', actor: 'System', role: 'Audit', time: '14:31:03', meta: ['Immutable record'], severity: 'Low', entity: 'CSE-014' }
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
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="text-center py-12 text-slate-400 text-[12px]">Loading entity {entityId}...</div>
    </div>
  )

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <button onClick={() => setCurrentPage('entities')} className="flex items-center gap-1.5 text-[12px] font-medium text-slate-500 hover:text-slate-800 mb-4 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Back to Entities
      </button>

      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-navy-950 tracking-tight">
            {entity.id} <span className="font-normal text-slate-400 mx-1.5">—</span>
            <span className="font-normal">{entity.name}</span>
          </h1>
          <div className="flex items-center gap-4 mt-2 text-[12px] text-slate-500">
            <span>Sector: <strong className="text-slate-700">{entity.sector}</strong></span>
            <span>Period: <strong className="text-slate-700">Q2 FY 2026–27</strong></span>
            <span>Status: <strong className="text-slate-700">{entity.status}</strong></span>
            <span>Last Submission: <strong className="text-slate-700">{entity.lastSubmission}</strong></span>
          </div>
        </div>
        <div className="text-right">
          <div className="label mb-0.5">Data Completeness</div>
          <div className="font-mono text-[14px] font-semibold text-slate-700">{entity.dataCompleteness}%</div>
        </div>
      </div>

      <div className="flex gap-1 border-b border-slate-200 mb-6 overflow-x-auto">
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)} className={`tab ${activeTab === t ? 'tab-active' : ''}`}>{t}</button>
        ))}
      </div>

      {activeTab === 'Overview' && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card col-span-1 p-5">
            <div className="label mb-3">Entity Risk Score</div>
            <RiskScoreGauge score={entity.riskScore} />
            <div className="mt-5">
              <div className="label mb-2">Risk Score Breakdown</div>
              <ScoreBars data={[
                { label: 'Detection', value: entity.detection },
                { label: 'Investigation', value: entity.investigation },
                { label: 'Escalation', value: entity.escalation },
                { label: 'Operations', value: entity.operations },
                { label: 'Governance', value: entity.governance },
                { label: 'Resilience', value: entity.resilience }
              ]} />
            </div>
          </div>

          <div className="col-span-2 flex flex-col gap-4">
            <div className="card p-5">
              <div className="label mb-3">Composite Profile</div>
              <div className="flex justify-center">
                <Radar data={[
                  { label: 'Detection', value: entity.detection },
                  { label: 'Investigation', value: entity.investigation },
                  { label: 'Escalation', value: entity.escalation },
                  { label: 'Operations', value: entity.operations },
                  { label: 'Governance', value: entity.governance },
                  { label: 'Resilience', value: entity.resilience }
                ]} />
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-title">Key Findings for {entity.id}</div>
                <span className="badge border bg-slate-100 border-slate-200">{findings.length} findings</span>
              </div>
              <div className="divide-y divide-slate-100">
                {findings.map((f: any, i: number) => (
                  <div key={i} className="px-4 py-3 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-3 mb-1">
                      <SeverityBadge severity={f.severity} />
                      <span className="text-[12.5px] font-medium text-slate-800">{f.finding}</span>
                      <span className="mono-id ml-1">{f.id}</span>
                    </div>
                    <p className="text-[11.5px] text-slate-500 ml-0.5">{f.description}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <Confidence value={f.confidence} compact />
                      <span className="text-[11px] text-slate-400">{f.evidenceCount} evidence items</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-4">
              <div className="label mb-2">Evidence Timeline</div>
              <div className="flex flex-col gap-0">
                {timeline.map((evt: any, i: number) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="flex flex-col items-center pt-0.5">
                      <div className={`w-3 h-3 rounded-full border-2 shrink-0 ${i === 0 ? 'bg-blue-600 border-blue-600' : evt.actor === '—' ? 'bg-slate-200 border-slate-300' : 'bg-white border-slate-300'}`} />
                      {i < timeline.length - 1 && <div className="w-px h-full min-h-[36px] bg-slate-200" />}
                    </div>
                    <div className="pb-3 min-w-0">
                      <div className="text-[12.5px] font-semibold text-slate-800">{evt.event}</div>
                      <div className="text-[11px] text-slate-500">
                        {evt.actor} · {evt.role}
                        <span className="mono text-[10px] ml-2 text-slate-400">{evt.time} {evt.time !== '—' ? 'IST' : ''}</span>
                      </div>
                      <div className="flex gap-2 mt-0.5">
                        {(evt.meta || []).map((m: string, j: number) => (
                          <span key={j} className="text-[10.5px] text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded">{m}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab !== 'Overview' && (
        <div className="card p-8">
          <div className="text-center">
            <div className="text-[13px] font-semibold text-slate-700 mb-1">{activeTab} Analytics</div>
            <p className="text-[12px] text-slate-500">Detailed {activeTab.toLowerCase()} data for {entity.id} will be displayed here.</p>
          </div>
        </div>
      )}
    </div>
  )
}