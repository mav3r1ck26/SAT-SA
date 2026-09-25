import React, { useEffect, useState } from 'react'
import { fetchReviewQueue } from '../api/client'
import { SeverityBadge, Confidence, TelemetryPulse, MitreBadge } from '../components/ui'
import { AlertOctagon, CheckCircle2, UserCheck, ShieldAlert, ArrowRight, Eye, Download } from 'lucide-react'

export default function ReviewPrioritisation() {
  const [queue, setQueue] = useState<any[]>([])

  useEffect(() => {
    fetchReviewQueue().then(setQueue).catch(() => setQueue([]))
  }, [])

  return (
    <div className="p-6 max-w-[1700px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyber-800 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="page-title text-2xl font-bold tracking-tight">Supervisory Manual Review Queue</h1>
            <TelemetryPulse active status="alert" label="TRIAGE BACKLOG" />
          </div>
          <p className="page-subtitle text-cyber-400 mt-0.5">
            Prioritized examination queue of high-divergence findings requiring supervisory examiner adjudication
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-sm flex items-center gap-1.5 text-cyber-300">
            <Download className="w-3.5 h-3.5 text-neonCyan" /> Export Queue (CSV)
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 bg-cyber-900/80 p-3 rounded-lg border border-cyber-800">
        <span className="badge badge-info text-xs font-mono">AUTOMATED RANKING</span>
        <span className="text-xs text-cyber-300 font-mono">
          Ranked dynamically by ensemble ML risk score and evidentiary completeness. Requires formal cryptographic sign-off.
        </span>
      </div>

      <div className="space-y-4">
        {queue.length > 0 ? queue.map((item, idx) => {
          const isCritical = (item.severity ?? item.priority?.severity) === 'Critical'
          return (
            <div key={idx} className="card overflow-hidden border-cyber-700/80 shadow-cyber">
              {/* Header Bar */}
              <div className={`flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-l-4 ${
                isCritical 
                  ? 'bg-red-950/40 border-l-neonRose border-b border-cyber-800' 
                  : 'bg-amber-950/40 border-l-neonAmber border-b border-cyber-800'
              }`}>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-neonCyan bg-cyber-950 px-2 py-0.5 rounded border border-cyber-800">
                    PRIORITY #{String(item.priority ?? idx + 1).padStart(2, '0')}
                  </span>
                  <SeverityBadge severity={item.severity ?? 'High'} />
                  <span className="mono-id text-neonCyan font-bold">{item.entityId || item.entity}</span>
                  <span className="text-cyber-600">/</span>
                  <span className="mono-id text-cyber-300">{item.ref || item.findingId}</span>
                  {item.mitre && <MitreBadge techniqueId={item.mitre} name={item.mitre} />}
                </div>

                <div className="flex items-center gap-4 text-xs font-mono">
                  <Confidence value={item.confidence ?? 85} compact />
                  <span className="text-cyber-400 bg-cyber-950 px-2 py-0.5 rounded border border-cyber-800">
                    {item.evidenceCount ?? 0} evidence records
                  </span>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                <p className="text-sm font-semibold text-cyber-100">{item.reason || item.finding || item.title}</p>

                <div className="bg-cyber-950/80 rounded-md p-3.5 border border-cyber-800 space-y-1.5">
                  <div className="label text-neonCyan font-mono">Forensic Flagging Triggers</div>
                  <ul className="space-y-1">
                    {(item.reasons || item.reasonWrap || [item.reason]).filter(Boolean).map((r: string, j: number) => (
                      <li key={j} className="text-xs text-cyber-300 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-neonCyan mt-1.5 shrink-0" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono pt-1">
                  <div className="flex items-center gap-4 text-cyber-400">
                    <span>Composite Risk: <strong className="text-neonRose font-bold">{item.riskScore ?? item.score ?? 0}/100</strong></span>
                    <span>·</span>
                    <span>Fidelity: <strong className="text-neonCyan font-bold">{item.confidence ?? 0}%</strong></span>
                    <span>·</span>
                    <span className="text-cyber-300 italic">Action: {item.suggestedAction || 'Mandatory Examiner Adjudication'}</span>
                  </div>

                  <div className="flex items-center gap-2 ml-auto">
                    <button className="btn btn-primary btn-sm flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5" /> Review Telemetry
                    </button>
                    <button className="btn btn-sm flex items-center gap-1.5 text-cyber-300">
                      <UserCheck className="w-3.5 h-3.5" /> Assign Examiner
                    </button>
                    <button className="btn btn-sm text-neonEmerald border-emerald-800/60 hover:bg-emerald-950/30">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1 inline" /> Adjudicate
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        }) : (
          <div className="card p-12 text-center text-xs font-mono text-cyber-400 bg-cyber-950/60 border-cyber-800">
            No supervisory examination items currently pending in queue.
          </div>
        )}
      </div>
    </div>
  )
}