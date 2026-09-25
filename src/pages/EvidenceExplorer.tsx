import React, { useEffect, useState } from 'react'
import { fetchEvidenceTimeline } from '../api/client'
import { ChevronRight, ShieldCheck, AlertCircle, Fingerprint, Database, Download } from 'lucide-react'
import FindingExplanation from '../components/FindingExplanation'
import { TelemetryPulse, MitreBadge } from '../components/ui'

const defaultTimeline = [
  { event: 'Alert generated — firewall anomaly', actor: 'SIEM', role: 'Detection System', time: '14:23:17', meta: ['BRAC: alerts-tmal'], severity: 'Critical', entity: 'CSE-014', mitre: 'T1059.001' },
  { event: 'SOC analyst assigned', actor: 'SOC-L2-004', role: 'Analyst', time: '14:24:53', meta: [], severity: 'Low', entity: 'CSE-014' },
  { event: 'Preliminary investigation opened', actor: 'SOC-L2-004', role: 'Analyst', time: '14:26:09', meta: [], severity: 'Low', entity: 'CSE-014' },
  { event: 'Alert closed as false positive', actor: 'SOC-L2-004', role: 'Analyst', time: '14:31:02', meta: ['closure-time: 4.9 min'], severity: 'High', entity: 'CSE-014', mitre: 'T1078' },
  { event: 'Peer baseline check', actor: 'Tool', role: 'Automated', time: '14:31:02', meta: ['peer-median: 42 min'], severity: 'Critical', entity: 'CSE-014' },
  { event: 'No escalation record found', actor: '—', role: '—', time: '—', meta: ['missed-step: escalation'], severity: 'High', entity: 'CSE-014', mitre: 'T1041' },
  { event: 'Audit log entry immutable', actor: 'System', role: 'Audit Engine', time: '14:31:03', meta: ['SHA-256 Verified'], severity: 'Low', entity: 'CSE-014' }
]

const breadcrumb = ['Supervisory Finding', 'Entity CSE-014', 'Case #CASE-00001', 'Alert #ALT-9042', 'Raw Telemetry Evidence']
const flags = [
  { label: 'Detection Signal', value: 'Critical severity firewall burst anomaly' },
  { label: 'Behavioral Signal', value: 'Case closure occurred 8.5x faster than sector peer median' },
  { label: 'Missing Evidence', value: 'No Level-3 Escalation Record found in audit trail' },
  { label: 'Supporting Evidence', value: '7 correlated instances in current examination quarter' }
]

export default function EvidenceExplorer() {
  const [timeline, setTimeline] = useState<any[]>([])

  useEffect(() => {
    fetchEvidenceTimeline('CASE-00001').then(r => setTimeline(r.timeline || defaultTimeline)).catch(() => setTimeline(defaultTimeline))
  }, [])

  return (
    <div className="p-6 max-w-[1700px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyber-800 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="page-title text-2xl font-bold tracking-tight">Forensic Evidence & Audit Explorer</h1>
            <TelemetryPulse active status="online" label="CHAIN OF CUSTODY" />
          </div>
          <p className="page-subtitle text-cyber-400 mt-0.5">
            Cryptographic drilldown from high-level supervisory finding to immutable low-level evidence logs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-sm flex items-center gap-1.5 text-cyber-300">
            <Download className="w-3.5 h-3.5 text-neonCyan" /> Export Audit Trail (JSON)
          </button>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="flex flex-wrap items-center gap-2 bg-cyber-900/60 p-2.5 rounded-lg border border-cyber-800">
        {breadcrumb.map((b, i) => (
          <React.Fragment key={i}>
            <button className={`text-xs font-mono px-2.5 py-1 rounded transition-colors ${
              i === breadcrumb.length - 1 
                ? 'bg-neonCyan/20 text-neonCyan font-bold border border-cyan-500/40' 
                : 'text-cyber-400 hover:text-cyber-200 hover:bg-cyber-800'
            }`}>
              {b}
            </button>
            {i < breadcrumb.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-cyber-600" />}
          </React.Fragment>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 space-y-5">
          <div className="card p-5">
            <div className="label mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2 text-cyber-200 font-bold">
                <Fingerprint className="w-4 h-4 text-neonCyan" /> Chronological Lifecycle Chain of Custody
              </span>
              <span className="text-[10px] font-mono text-neonCyan">TIME-CORRELATED AUDIT SEQUENCE</span>
            </div>

            <div className="space-y-0 relative border-l-2 border-cyber-800 ml-3 pl-5 py-2">
              {timeline.map((evt: any, i: number) => (
                <div key={i} className="relative pb-5 last:pb-1">
                  <div className={`absolute -left-[27px] top-1.5 w-3.5 h-3.5 rounded-full border-2 ${
                    evt.severity === 'Critical' 
                      ? 'bg-neonRose border-cyber-950 ring-2 ring-neonRose/30 animate-pulse' 
                      : evt.severity === 'High' 
                      ? 'bg-neonAmber border-cyber-950' 
                      : 'bg-cyber-700 border-cyber-950'
                  }`} />

                  <div className="bg-cyber-950/80 p-3.5 rounded-lg border border-cyber-800/80 space-y-1.5 hover:border-cyber-700 transition-colors">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-cyber-100">{evt.event}</span>
                        {evt.mitre && <MitreBadge techniqueId={evt.mitre} name={evt.mitre} />}
                      </div>
                      <span className="font-mono text-[11px] text-neonCyan bg-cyber-900 px-2 py-0.5 rounded border border-cyber-800">
                        {evt.time} {evt.time !== '—' ? 'IST' : ''}
                      </span>
                    </div>

                    <div className="text-xs text-cyber-400 font-mono">
                      Actor: <strong className="text-cyber-200">{evt.actor}</strong> · Role: <strong className="text-cyber-300">{evt.role}</strong>
                    </div>

                    {(evt.meta || []).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {(evt.meta || []).map((m: string, j: number) => (
                          <span key={j} className="text-[10.5px] font-mono text-cyber-300 bg-cyber-900 border border-cyber-800 px-2 py-0.5 rounded">
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
            <div className="label text-cyber-200 font-bold">Why Was This Event Flagged by Supervisory Rules?</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {flags.map((f, i) => (
                <div key={i} className="bg-cyber-950/80 rounded-lg p-3 border border-cyber-800 space-y-1">
                  <div className="label text-neonCyan font-mono">{f.label}</div>
                  <div className="text-xs text-cyber-200 font-medium">{f.value}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 text-xs font-mono text-cyber-400 border-t border-cyber-800">
              <div>Telemetry Confidence: <span className="font-bold text-neonCyan">94%</span></div>
              <div>Adjudication: <span className="text-neonAmber font-bold">Formal Examination Recommended</span></div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5">
          <FindingExplanation
            finding="Rapid Critical Alert Closure Without Escalation"
            severity="High"
            confidence={92}
            whyMatters="Operational telemetry confirms the CSE SOC prematurely disposed of high-severity firewall telemetry within 4.9 minutes without mandatory L3 escalation. This creates an unmonitored threat actor persistence window."
            evidence={{ cases: 14, criticalAlerts: 3, escalationRecords: 0 }}
            peerComparison="2.8x below sector median"
            detectionLogic="Model evaluates the duration between alert ingestion and disposition against peer baselines, cross-referenced against absent escalation tokens in the case audit log."
            limitations="Short closure times could theoretically reflect rapid automated deduplication; however, absence of correlation rules suggests manual premature dismissal."
            compact
            mitre="T1059.001"
          />
        </div>
      </div>
    </div>
  )
}