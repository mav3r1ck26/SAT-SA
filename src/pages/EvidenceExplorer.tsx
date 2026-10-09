import React, { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { fetchEvidenceTimeline, fetchFindingEvidence } from '../api/client'
import { downloadJSON } from '../utils/export'
import { ChevronRight, Fingerprint, Download } from 'lucide-react'
import FindingExplanation from '../components/FindingExplanation'
import { TelemetryPulse, MitreBadge, SeverityBadge } from '../components/ui'

export default function EvidenceExplorer() {
  const { selectedEntity, selectedFindingId } = useApp()
  const [timeline, setTimeline] = useState<any[]>([])
  const [finding, setFinding] = useState<any>(null)
  const [caseIds, setCaseIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const entityId = selectedEntity || 'CSE-014'

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    const request = selectedFindingId
      ? fetchFindingEvidence(selectedFindingId)
      : fetchEvidenceTimeline(entityId)
    request.then(result => {
      if (!active) return
      setFinding(result.finding || null)
      setCaseIds(result.caseIds || (result.case?.id ? [result.case.id] : []))
      setTimeline((result.timeline || []).map((event: any) => {
        const severityValue = (event.metadata || []).find((item: string) => item.startsWith('Severity:'))?.split(':')[1]?.trim()
        return {
          ...event,
          time: event.eventTime ? new Date(event.eventTime).toLocaleString() : '—',
          meta: event.metadata || [],
          severity: severityValue || (event.eventType === 'Escalation' ? 'High' : 'Low'),
        }
      }))
    }).catch(err => {
      if (active) setError(err instanceof Error ? err.message : 'Evidence request failed')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [entityId, selectedFindingId])

  const handleExport = () => {
    downloadJSON(`SAT-SA_Evidence_Timeline_${finding?.id || caseIds[0] || entityId}_${new Date().toISOString().slice(0, 10)}`, timeline)
  }

  const breadcrumb = ['Supervisory Finding', `Entity ${entityId}`, `Case ${caseIds[0] || '—'}`, finding?.id || 'Entity Evidence', 'Raw Telemetry Evidence']

  return (
    <div className="p-6 max-w-[1700px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="page-title text-2xl font-bold tracking-tight">Forensic Evidence & Audit Explorer</h1>
            <TelemetryPulse active={loading} status={error ? 'alert' : 'online'} label={loading ? 'LOADING EVIDENCE' : 'CHAIN OF CUSTODY'} />
          </div>
          <p className="page-subtitle text-slate-500 mt-0.5">
            Cryptographic drilldown from high-level supervisory finding to immutable low-level evidence logs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} disabled={loading || timeline.length === 0} className="btn btn-sm flex items-center gap-1.5 text-slate-600 hover:text-slate-800">
            <Download className="w-3.5 h-3.5 text-indigo-600" /> Export Audit Trail (JSON)
          </button>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-100/60 p-2.5 rounded-lg border border-slate-200">
        {breadcrumb.map((b, i) => (
          <React.Fragment key={i}>
            <button className={`text-xs font-mono px-2.5 py-1 rounded transition-colors ${
              i === breadcrumb.length - 1 
                ? 'bg-indigo-50 text-indigo-600 font-bold border border-indigo-200' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'
            }`}>
              {b}
            </button>
            {i < breadcrumb.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
          </React.Fragment>
        ))}
      </div>

      {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50/40 px-4 py-3 text-sm text-rose-200">Could not load evidence: {error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 space-y-5">
          <div className="card p-5">
            <div className="label mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-700 font-bold">
                <Fingerprint className="w-4 h-4 text-indigo-600" /> Chronological Lifecycle Chain of Custody
              </span>
              <span className="text-[10px] font-mono text-indigo-600">TIME-CORRELATED AUDIT SEQUENCE</span>
            </div>

            <div className="space-y-0 relative border-l-2 border-slate-200 ml-3 pl-5 py-2">
              {loading && <div className="py-8 text-center text-xs font-mono text-slate-500">Loading timeline from the evidence store…</div>}
              {!loading && timeline.length === 0 && <div className="py-8 text-center text-xs font-mono text-slate-500">No evidence events are linked to this entity or finding yet.</div>}
              {timeline.map((evt: any, i: number) => (
                <div key={i} className="relative pb-5 last:pb-1">
                  <div className={`absolute -left-[27px] top-1.5 w-3.5 h-3.5 rounded-full border-2 ${
                    evt.severity === 'Critical' 
                      ? 'bg-rose-600 border-slate-50 ring-2 ring-rose-300 animate-pulse' 
                      : evt.severity === 'High' 
                      ? 'bg-amber-500 border-slate-50' 
                      : 'bg-slate-300 border-slate-50'
                  }`} />

                  <div className="bg-slate-50/80 p-3.5 rounded-lg border border-slate-200/80 space-y-1.5 hover:border-slate-300 transition-colors">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">{evt.event}</span>
                        {evt.mitreTechnique && <MitreBadge techniqueId={evt.mitreTechnique} name={evt.mitreTechnique} />}
                        {evt.severity && <SeverityBadge severity={evt.severity} />}
                      </div>
                      <span className="font-mono text-[11px] text-indigo-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {evt.time} {evt.time !== '—' ? 'IST' : ''}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 font-mono">
                      Actor: <strong className="text-slate-700">{evt.actor}</strong> · Role: <strong className="text-slate-600">{evt.role}</strong>
                    </div>

                    {(evt.meta || []).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {(evt.meta || []).map((m: string, j: number) => (
                          <span key={j} className="text-[10.5px] font-mono text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
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

          <div className="card p-5 space-y-3">
            <div className="label text-slate-700 font-bold">Finding Context</div>
            {finding ? (
              <>
                <div className="text-sm font-semibold text-slate-800">{finding.title}</div>
                <p className="text-xs leading-relaxed text-slate-600">{finding.whyItMatters || finding.description}</p>
                <div className="flex flex-wrap gap-2 text-xs font-mono text-slate-500 border-t border-slate-200 pt-3">
                  <span>Finding: {finding.id}</span><span>·</span><span>Entity: {finding.entityId}</span><span>·</span><span>{timeline.length} evidence events</span>
                </div>
              </>
            ) : (
              <div className="text-xs text-slate-600">Showing source records for entity {entityId}. Open this page from a finding to see finding-linked evidence.</div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5">
          {finding ? <FindingExplanation
            id={finding.id}
            entityId={finding.entityId}
            finding={finding.title}
            severity={finding.severity}
            confidence={finding.confidence}
            whyMatters={finding.whyItMatters || finding.description}
            evidence={{ cases: caseIds.length, criticalAlerts: timeline.filter(event => event.severity === 'Critical').length, escalationRecords: timeline.filter(event => event.eventType === 'Escalation').length }}
            peerComparison={finding.peerComparison || 'No peer comparison recorded'}
            detectionLogic={finding.detectionLogic || finding.methodology || 'No detection logic recorded'}
            limitations={finding.limitations || 'Review source records before drawing conclusions.'}
            compact
            mitre={finding.mitreTechnique || 'T1059'}
          /> : <div className="card p-5 text-xs text-slate-500">Select a finding’s evidence action to inspect its linked source records.</div>}
        </div>
      </div>
    </div>
  )
}
