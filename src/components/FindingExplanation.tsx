import React from 'react'
import { SeverityBadge } from './ui'

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
}

export default function FindingExplanation({ finding, severity, confidence, whyMatters, evidence, peerComparison, detectionLogic, limitations, compact }: ExplanationProps) {
  return (
    <div className={`card ${compact ? '' : 'p-5'}`}>
      {!compact && (
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="label mb-1">Finding</div>
            <div className="text-[15px] font-semibold text-navy-950">{finding}</div>
          </div>
          <div className="flex items-center gap-2.5">
            <SeverityBadge severity={severity} />
            <div>
              <div className="label mb-0.5 text-right">Confidence</div>
              <span className="font-mono text-[14px] font-bold text-navy-900">{confidence}%</span>
            </div>
          </div>
        </div>
      )}

      <div className={`${compact ? 'border-t border-slate-100 mt-3 pt-3' : ''} grid gap-4`}>
        <div>
          <div className="label mb-1">Why this matters</div>
          <p className="text-[12.5px] text-slate-600">{whyMatters}</p>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <div className="bg-slate-50 rounded-md p-2.5">
            <div className="label mb-1">Cases</div>
            <div className="font-mono text-[16px] font-bold text-navy-900">{evidence.cases}</div>
          </div>
          <div className="bg-slate-50 rounded-md p-2.5">
            <div className="label mb-1">Critical Alerts</div>
            <div className="font-mono text-[16px] font-bold text-navy-900">{evidence.criticalAlerts}</div>
          </div>
          <div className="bg-red-50 rounded-md p-2.5">
            <div className="label mb-1 text-red-500">Escalation Records</div>
            <div className="font-mono text-[16px] font-bold text-red-700">{evidence.escalationRecords}</div>
          </div>
          <div className="bg-blue-50 rounded-md p-2.5">
            <div className="label mb-1 text-blue-600">Peer Comparison</div>
            <div className="text-[13px] font-semibold text-blue-700">{peerComparison}</div>
          </div>
        </div>

        <div>
          <div className="label mb-1">Detection Logic</div>
          <p className="text-[12.5px] text-slate-600 bg-slate-50 rounded-md p-3 leading-relaxed">{detectionLogic}</p>
        </div>

        <div>
          <div className="label mb-1">Limitations</div>
          <p className="text-[12px] text-slate-500 bg-amber-50/50 rounded-md p-3 leading-relaxed border border-amber-100">
            {limitations}
          </p>
        </div>

        {!compact && (
          <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
            <button className="btn btn-primary btn-sm">View Evidence</button>
            <button className="btn btn-sm">View Methodology</button>
            <button className="btn btn-sm ml-auto">Add Examiner Note</button>
          </div>
        )}
      </div>
    </div>
  )
}