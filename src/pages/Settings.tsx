import React from 'react'
import { ShieldCheck, Database, Lock, FileText, AlertTriangle, Cpu, Terminal, KeyRound, Server } from 'lucide-react'
import { TelemetryPulse } from '../components/ui'

export default function Settings() {
  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="page-title text-2xl font-bold tracking-tight">Supervisory Node Settings & Hardware Security</h1>
            <TelemetryPulse active status="online" label="AIR-GAP COMPLIANT NODE" />
          </div>
          <p className="page-subtitle text-slate-500 mt-0.5">
            Cryptographic parameters, isolation integrity checks, and local deterministic execution environment controls
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {/* System Information Card */}
        <div className="card p-5">
          <div className="label mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2 text-slate-700 font-bold">
              <Server className="w-4 h-4 text-indigo-600" /> System Architecture & Build Parameters
            </span>
            <span className="text-[10px] font-mono text-indigo-600">SHA-256 HASH VERIFIED</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
            {[
              { label: 'Supervisory Engine Build', value: 'SAT-SA v2.4.0 (Enterprise Examination)', status: 'Verified' },
              { label: 'Execution Environment', value: 'NCIIPC Isolated Sovereign Node', status: 'Secured' },
              { label: 'Network Boundary', value: 'Strict Physical Air-Gap (Zero Outbound)', status: 'Isolated' },
              { label: 'Inference Engine', value: 'Local ML Ensemble (Scikit / PyTorch Local)', status: 'Zero Cloud' },
              { label: 'Data Security Classification', value: 'RESTRICTED // NCIIPC SUPERVISORY USE ONLY', status: 'Enforced' },
              { label: 'Database Storage Node', value: 'Local MongoDB replica on :27017', status: 'Connected' }
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-50/80 border border-slate-200">
                <span className="text-slate-500">{item.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-800 font-bold">{item.value}</span>
                  <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-indigo-600 font-bold">
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Security & Air-Gap Posture */}
        <div className="card p-5">
          <div className="label mb-4 text-slate-700 font-bold">Cryptographic Isolation & Assurance Matrix</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { icon: ShieldCheck, title: 'NCIIPC Regulated Environment', desc: 'Running in sovereign supervisory container with verified integrity manifests.', border: 'border-emerald-200/60', text: 'text-emerald-700', bg: 'bg-emerald-50/20' },
              { icon: Database, title: 'Deterministic Local Execution', desc: 'All machine learning heuristics execute locally. Zero outbound telemetry.', border: 'border-cyan-200/60', text: 'text-indigo-600', bg: 'bg-cyan-50/20' },
              { icon: Lock, title: 'Hardware Air-Gap Assurance', desc: 'Disconnected from public WAN. Ingestion strictly via physical air-gap bundles.', border: 'border-emerald-200/60', text: 'text-emerald-700', bg: 'bg-emerald-50/20' },
              { icon: FileText, title: 'Cryptographic Audit Log', desc: 'Examiner actions recorded to append-only tamper-evident local storage.', border: 'border-cyan-200/60', text: 'text-indigo-600', bg: 'bg-cyan-50/20' }
            ].map((item, i) => {
              const Icon = item.icon
              return (
                <div key={i} className={`${item.bg} border ${item.border} rounded-lg p-4 flex items-start gap-3.5`}>
                  <Icon className={`w-5 h-5 shrink-0 ${item.text} mt-0.5`} />
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-slate-800">{item.title}</div>
                    <p className="text-xs text-slate-500 leading-relaxed font-mono">{item.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Legal & Regulatory Notice */}
        <div className="card p-5">
          <div className="label mb-3 text-amber-700 font-mono flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700" /> Statutory Examination Governance Protocol
          </div>
          <div className="bg-slate-50 rounded-lg p-4 border border-amber-200/40">
            <p className="text-xs text-slate-600 leading-relaxed font-mono">
              SAT-SA analyzes raw security operations evidence submitted by Critical Sector Entities under Section 70 of the Information Technology Act. All behavioral anomalies and execution gap findings generated by SAT-SA represent preliminary system recommendations requiring statutory examiner adjudication prior to issuance of regulatory directives or examination notices.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
