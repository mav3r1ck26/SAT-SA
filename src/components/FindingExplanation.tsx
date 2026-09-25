import React from 'react'
import { SeverityBadge, MitreBadge } from './ui'
import { Shield, AlertTriangle, Cpu, Terminal, Eye, FileSpreadsheet, CheckCircle } from 'lucide-react'

interface EvidenceStats {
  cases: number
  criticalAlerts: number
  escalationRecords: number
}

interface ExplanationProps {
  finding: string
  severity: 'Critical' | 'High' | 'Medium' | 'Low'
  confidence: number
  whyMatters: string
  evidence: EvidenceStats
  peerComparison: string
  detectionLogic: string
  limitations: string
  compact?: boolean
  mitre?: string
}

export default function FindingExplanation({ 
  finding, 
  severity, 
  confidence, 
  whyMatters, 
  evidence, 
  peerComparison, 
  detectionLogic, 
  limitations, 
  compact,
  mitre = 'T1059'
}: ExplanationProps) {
  return (
    <div className={`card ${compact ? '' : 'p-5'} border-cyber-700/80 bg-cyber-900/90 shadow-cyber`}>
      {!compact && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-cyber-800">
          <div>
            <div className="label mb-1 text-neonCyan font-mono">Forensic Finding Dossier</div>
            <div className="text-base font-bold text-cyber-100 flex items-center gap-2">
              <Shield className="w-4 h-4 text-neonRose" />
              {finding}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <MitreBadge techniqueId={mitre} name={mitre} />
            <SeverityBadge severity={severity} />
            <div className="bg-cyber-950 px-3 py-1 rounded border border-cyber-800 text-right">
              <div className="text-[9.5px] uppercase font-mono text-cyber-400">Confidence</div>
              <span className="font-mono text-sm font-bold text-neonCyan">{confidence}%</span>
            </div>
          </div>
        </div>
      )}

      <div className={`${compact ? 'border-t border-cyber-800 mt-3 pt-3' : ''} space-y-4`}>
        <div>
          <div className="label mb-1 text-cyber-300">Supervisory Risk Implications</div>
          <p className="text-xs text-cyber-200 leading-relaxed bg-cyber-950/60 p-3 rounded-md border border-cyber-800">
            {whyMatters}
          </p>
        </div>

        {/* 4 Forensic Evidence Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-cyber-950/80 rounded-md p-3 border border-cyber-800">
            <div className="label mb-1 text-cyber-400">Associated Cases</div>
            <div className="font-mono text-lg font-bold text-cyber-100">{evidence.cases}</div>
            <div className="text-[10px] text-cyber-500 font-mono">SOC Ingested</div>
          </div>
          <div className="bg-cyber-950/80 rounded-md p-3 border border-cyber-800">
            <div className="label mb-1 text-cyber-400">Critical Alerts</div>
            <div className="font-mono text-lg font-bold text-neonAmber">{evidence.criticalAlerts}</div>
            <div className="text-[10px] text-cyber-500 font-mono">Raw telemetry</div>
          </div>
          <div className="bg-cyber-950/80 rounded-md p-3 border border-red-900/60 bg-red-950/20">
            <div className="label mb-1 text-neonRose font-semibold">Escalation Gaps</div>
            <div className="font-mono text-lg font-bold text-neonRose">{evidence.escalationRecords}</div>
            <div className="text-[10px] text-red-400/80 font-mono">Missing actions</div>
          </div>
          <div className="bg-cyber-950/80 rounded-md p-3 border border-cyan-900/60 bg-cyan-950/20">
            <div className="label mb-1 text-neonCyan font-semibold">Peer Baseline Delta</div>
            <div className="text-xs font-bold text-neonCyan mt-1 truncate">{peerComparison}</div>
            <div className="text-[10px] text-cyber-400 font-mono">Sector median</div>
          </div>
        </div>

        {/* Detection Logic */}
        <div>
          <div className="label mb-1 text-cyber-300 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-neonCyan" /> Supervisory Detection Logic (Deterministic & ML Ensemble)
          </div>
          <div className="text-xs font-mono text-cyber-300 bg-cyber-950 p-3 rounded-md border border-cyber-800/90 leading-relaxed">
            <span className="text-cyber-500 select-none">$ [AUDIT_RULE] </span>
            {detectionLogic}
          </div>
        </div>

        {/* Limitations */}
        <div>
          <div className="label mb-1 text-amber-400/90 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-neonAmber" /> Forensic Examination Boundary Conditions
          </div>
          <p className="text-xs text-cyber-300 bg-amber-950/20 rounded-md p-3 leading-relaxed border border-amber-800/40">
            {limitations}
          </p>
        </div>

        {!compact && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-cyber-800">
            <button className="btn btn-primary btn-sm flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" /> View Raw Telemetry Evidence
            </button>
            <button className="btn btn-sm flex items-center gap-1.5 text-cyber-300">
              <FileSpreadsheet className="w-3.5 h-3.5 text-neonCyan" /> Export Finding Dossier
            </button>
            <button className="btn btn-sm ml-auto text-xs font-mono text-neonEmerald border-emerald-800/50 hover:bg-emerald-950/30">
              <CheckCircle className="w-3.5 h-3.5 mr-1 inline" /> Sign Examiner Note
            </button>
          </div>
        )}
      </div>
    </div>
  )
}