import React from 'react'

export type Severity = 'Critical' | 'High' | 'Medium' | 'Low' | 'Normal'
export type Status = 'New' | 'In Review' | 'Confirmed' | 'Dismissed' | 'Monitor' | 'Review Required' | 'Compliant' | 'Escalated' | 'Normal' | 'Moderate' | 'High' | 'Critical' | 'Low'

const severityStyles: Record<Severity, string> = {
  Critical: 'bg-red-50 text-red-700 border-red-200',
  High: 'bg-orange-50 text-orange-700 border-orange-200',
  Medium: 'bg-amber-50 text-amber-700 border-amber-200',
  Low: 'bg-blue-50 text-blue-700 border-blue-200',
  Normal: 'bg-emerald-50 text-emerald-700 border-emerald-200'
}

const statusStyles: Record<Status, string> = {
  'New': 'bg-slate-100 text-slate-600 border-slate-200',
  'In Review': 'bg-blue-50 text-blue-700 border-blue-200',
  'Confirmed': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Dismissed': 'bg-slate-100 text-slate-500 border-slate-200 line-through',
  'Monitor': 'bg-amber-50 text-amber-700 border-amber-200',
  'Review Required': 'bg-orange-50 text-orange-700 border-orange-200',
  'Compliant': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Escalated': 'bg-red-50 text-red-700 border-red-200',
  'Normal': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Moderate': 'bg-amber-50 text-amber-700 border-amber-200',
  'Critical': 'bg-red-50 text-red-700 border-red-200',
  'High': 'bg-orange-50 text-orange-700 border-orange-200',
  'Low': 'bg-blue-50 text-blue-700 border-blue-200'
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <span className={`badge border ${severityStyles[severity]}`}>{severity}</span>
}

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`badge border ${statusStyles[status]}`}>{status}</span>
}

export function Confidence({ value, compact }: { value: number; compact?: boolean }) {
  const color = value >= 90 ? 'text-emerald-600' : value >= 80 ? 'text-blue-600' : value >= 70 ? 'text-amber-600' : 'text-slate-500'
  const bg = value >= 90 ? 'bg-emerald-100' : value >= 80 ? 'bg-blue-100' : value >= 70 ? 'bg-amber-100' : 'bg-slate-100'
  return (
    <span className={`inline-flex items-center gap-1.5 ${compact ? '' : 'min-w-[92px]'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${bg}`}>
        <span className="block h-full w-full rounded-full" style={{ width: `${value}%`, backgroundColor: 'currentColor', opacity: 0.2 }} />
      </span>
      <span className={`font-mono text-[11.5px] font-semibold ${color}`}>{value}%</span>
    </span>
  )
}

export function RiskScoreBar({ score, showLabel }: { score: number; showLabel?: boolean }) {
  const color = score >= 85 ? 'bg-red-500' : score >= 70 ? 'bg-orange-500' : score >= 55 ? 'bg-amber-500' : score >= 40 ? 'bg-blue-500' : 'bg-emerald-500'
  return (
    <div className="flex items-center gap-2">
      <div className="risk-bar-track w-24">
        <div className={`risk-bar-fill ${color}`} style={{ width: `${score}%` }} />
      </div>
      {showLabel && <span className="font-mono text-[11.5px] font-semibold text-slate-700">{score}</span>}
    </div>
  )
}

export function RiskScoreGauge({ score }: { score: number }) {
  const label = score >= 85 ? 'CRITICAL SUPERVISORY ATTENTION' : score >= 70 ? 'HIGH SUPERVISORY ATTENTION' : score >= 55 ? 'MODERATE ATTENTION' : score >= 40 ? 'LOW ATTENTION' : 'NORMAL'
  const color = score >= 85 ? 'text-red-600' : score >= 70 ? 'text-orange-600' : score >= 55 ? 'text-amber-600' : score >= 40 ? 'text-blue-600' : 'text-emerald-600'
  const ringColor = score >= 85 ? '#dc2626' : score >= 70 ? '#ea580c' : score >= 55 ? '#d97706' : score >= 40 ? '#2563eb' : '#059669'

  const r = 52
  const circumference = 2 * Math.PI * r
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="flex items-center gap-5">
      <div className="relative w-32 h-32">
        <svg className="w-32 h-32 -rotate-90" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r={r} fill="none" stroke="#e2e8f0" strokeWidth="9" />
          <circle
            cx="64" cy="64" r={r} fill="none"
            stroke={ringColor} strokeWidth="9" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-navy-950 leading-none">{score}</span>
          <span className="text-[10px] text-slate-400 mt-0.5">/ 100</span>
        </div>
      </div>
      <div>
        <div className={`text-[13px] font-bold tracking-wide ${color}`}>{label}</div>
        <p className="text-[11.5px] text-slate-500 mt-1 max-w-[220px]">
          Risk increased 12% compared with previous assessment period.
        </p>
      </div>
    </div>
  )
}

export function Trend({ value }: { value: number }) {
  const up = value >= 0
  const isGood = (value <= 0)
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${up ? 'text-red-600' : 'text-emerald-600'}`}>
      <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
        {up
          ? <path d="M6 9.5V2.5M6 2.5L2.5 6M6 2.5L9.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          : <path d="M6 2.5v7M6 9.5L2.5 6M6 9.5l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
      {up ? '↑' : '↓'} {Math.abs(value)}% vs previous
    </span>
  )
}
