import React from 'react'
import { ShieldCheck, Database, Lock, FileText, AlertTriangle } from 'lucide-react'

export default function Settings() {
  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <div className="mb-1">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">System configuration and information</p>
      </div>

      <div className="mt-5 flex flex-col gap-4">
        {/* System Info */}
        <div className="card p-5">
          <div className="card-title mb-3">System Information</div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Version', value: 'SAT-SA v1.0.0' },
              { label: 'Environment', value: 'NCIIPC Controlled Environment' },
              { label: 'Connectivity', value: 'Offline / Air-Gapped' },
              { label: 'AI/API Dependency', value: 'None — Local Processing Only' },
              { label: 'Data Classification', value: 'Restricted — Supervisory Use Only' },
              { label: 'Last Deployment', value: '01 Sep 2026' }
            ].map((item, i) => (
              <div key={i} className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-[12px] text-slate-500">{item.label}</span>
                <span className="text-[12px] font-medium text-slate-700">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Security */}
        <div className="card p-5">
          <div className="card-title mb-3">Security & Environment</div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: ShieldCheck, title: 'NCIIPC Controlled Environment', desc: 'Running in isolated supervisory environment.', color: 'text-emerald-500', bg: 'bg-emerald-50' },
              { icon: Database, title: 'Local Data Processing Only', desc: 'All analytics run locally. No external data transmission.', color: 'text-blue-500', bg: 'bg-blue-50' },
              { icon: Lock, title: 'Air-Gapped Network', desc: 'System is disconnected from external networks.', color: 'text-emerald-500', bg: 'bg-emerald-50' },
              { icon: FileText, title: 'Immutable Audit Trail', desc: 'All actions recorded and tamper-proof.', color: 'text-blue-500', bg: 'bg-blue-50' }
            ].map((item, i) => {
              const Icon = item.icon
              return (
                <div key={i} className={`${item.bg} rounded-lg px-4 py-3 flex items-start gap-3`}>
                  <Icon className={`w-5 h-5 shrink-0 ${item.color} mt-0.5`} />
                  <div>
                    <div className="text-[12.5px] font-semibold text-slate-800">{item.title}</div>
                    <p className="text-[11.5px] text-slate-500 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Data Processing */}
        <div className="card p-5">
          <div className="card-title mb-3">Data Processing Notice</div>
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[12px] text-slate-700 leading-relaxed">
                  SAT-SA processes SOC operational data submitted by Critical Sector Entities within the NCIIPC controlled environment.
                  All analytical outputs are system recommendations requiring examiner review before any supervisory action.
                  No data is transmitted externally. No external AI or API services are used.
                  All model outputs include confidence indicators and limitations disclosures.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
