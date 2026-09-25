import React, { useEffect, useState } from 'react'
import { fetchReports, generateReport } from '../api/client'
import { FileText, Clock, CheckCircle2, Loader2, FileDown, Shield, FileCheck, Layers } from 'lucide-react'
import { TelemetryPulse } from '../components/ui'

export default function Reports() {
  const [reports, setReports] = useState<any[]>([])
  const [generating, setGenerating] = useState<string | null>(null)

  useEffect(() => {
    fetchReports().then(setReports).catch(() => setReports([]))
  }, [])

  const handleGenerate = async (id: string) => {
    setGenerating(id)
    try {
      await generateReport(id)
      const updated = await fetchReports()
      setReports(updated)
    } catch { /* ignore */ }
    setGenerating(null)
  }

  const defaultReports = [
    { id: 'RPT-001', name: 'Critical Entity Supervisory Examination Dossier', description: 'Comprehensive risk assessment and operational evidence audit for a single designated CSE', status: 'Available', generatedDate: '2026-08-31 IST', format: ['PDF', 'CSV'] },
    { id: 'RPT-002', name: 'Cross-Entity Sector Comparison Matrix', description: 'Comparative behavioral anomaly distribution and variance across all registered CSEs', status: 'Available', generatedDate: '2026-08-31 IST', format: ['PDF', 'CSV'] },
    { id: 'RPT-003', name: 'Execution Gap Forensic Evidence Synthesis', description: 'All detected behavioral divergences categorized by MITRE ATT&CK and control domains', status: 'Available', generatedDate: '2026-08-30 IST', format: ['PDF'] },
    { id: 'RPT-004', name: 'Negative Space & Sensor Blind Spot Audit', description: 'Detailed sensor blackout, suppressed alert pipelines, and missing telemetry records', status: 'Ready', generatedDate: 'Not generated', format: ['PDF'] },
    { id: 'RPT-005', name: 'Peer Benchmarking & Gaussian Percentile Ranking', description: 'Sector-wide comparative metrics, standard deviation bounds, and outlier indices', status: 'Available', generatedDate: '2026-08-29 IST', format: ['PDF', 'CSV'] },
    { id: 'RPT-006', name: 'Supervisory Manual Review & Adjudication Summary', description: 'Findings requiring statutory examiner adjudication before formal regulatory notification', status: 'Ready', generatedDate: 'Not generated', format: ['PDF'] }
  ]

  const displayReports = reports.length > 0 ? reports : defaultReports

  return (
    <div className="p-6 max-w-[1700px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyber-800 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="page-title text-2xl font-bold tracking-tight">Supervisory Dossiers & Executive Reports</h1>
            <TelemetryPulse active status="online" label="REPORTING ENGINE READY" />
          </div>
          <p className="page-subtitle text-cyber-400 mt-0.5">
            Generate, compile, and export formal examination dossiers and cryptographically verifiable audit packages
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
        {displayReports.map((r: any) => (
          <div key={r.id} className="card p-5 border-cyber-700/80 hover:border-cyber-600 transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-cyber-950 border border-cyber-700 flex items-center justify-center shrink-0 text-neonCyan shadow-glow-cyan/20">
                  <FileText className="w-5 h-5" />
                </div>
                
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="mono-id text-neonCyan font-bold">{r.id}</span>
                    <span className={`badge border text-[10px] font-mono ${
                      r.status === 'Available' 
                        ? 'bg-emerald-950/80 text-neonEmerald border-emerald-800/60' 
                        : r.status === 'Generating' 
                        ? 'bg-blue-950/80 text-neonCyan border-cyan-800/60' 
                        : 'bg-cyber-950 text-cyber-400 border-cyber-700'
                    }`}>
                      {r.status === 'Available' && <CheckCircle2 className="w-3 h-3 mr-1 inline" />}
                      {r.status === 'Generating' && <Loader2 className="w-3 h-3 mr-1 inline animate-spin" />}
                      {r.status}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-cyber-100">{r.name}</h3>
                  <p className="text-xs text-cyber-300 leading-relaxed">{r.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono text-cyber-400 bg-cyber-950/80 px-3 py-2 rounded-md border border-cyber-800/80">
                <Clock className="w-3.5 h-3.5 text-cyber-500" />
                <span>Generated: <strong className="text-cyber-200">{r.generatedAt || r.generatedDate || 'Pending generation'}</strong></span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3.5 border-t border-cyber-800">
              <button 
                className="btn btn-primary btn-sm flex items-center gap-1.5" 
                disabled={generating === r.id} 
                onClick={() => handleGenerate(r.id)}
              >
                {generating === r.id ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Compiling Engine...
                  </>
                ) : (
                  <>
                    <FileCheck className="w-3.5 h-3.5" /> Compile Dossier
                  </>
                )}
              </button>

              <div className="flex items-center gap-1.5 ml-auto">
                {(r.format || ['PDF']).map((f: string) => (
                  <button 
                    key={f} 
                    className="btn btn-sm flex items-center gap-1 text-xs font-mono text-cyber-300 hover:text-cyber-100" 
                    disabled={r.status !== 'Available'}
                  >
                    <FileDown className="w-3.5 h-3.5 text-neonCyan" /> Export {f}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}