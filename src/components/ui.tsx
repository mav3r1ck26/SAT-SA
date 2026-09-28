import React from 'react'
import { Shield, AlertTriangle, CheckCircle2, Clock, Activity, Zap, ExternalLink } from 'lucide-react'

export type Severity = 'Critical' | 'High' | 'Medium' | 'Low' | 'Normal' | 'Informational'
export type Status = 'New' | 'In Review' | 'Confirmed' | 'Dismissed' | 'Monitor' | 'Review Required' | 'Compliant' | 'Escalated' | 'Normal' | 'Moderate' | 'High' | 'Critical' | 'Low' | 'Submitted' | 'Assigned' | 'Available' | 'Ready'

const severityStyles: Record<string, { bg: string; text: string; border: string; dot: string; glow: string }> = {
  Critical: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200', dot: 'bg-rose-500', glow: '' },
  High: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', dot: 'bg-orange-500', glow: '' },
  Medium: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', dot: 'bg-amber-500', glow: '' },
  Low: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200', dot: 'bg-indigo-500', glow: '' },
  Normal: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', dot: 'bg-emerald-500', glow: '' },
  Informational: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', dot: 'bg-blue-500', glow: '' }
}

const statusStyles: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  'New': { bg: 'bg-stone-100', text: 'text-slate-600', border: 'border-stone-200', dot: 'bg-slate-500' },
  'In Review': { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200', dot: 'bg-indigo-500' },
  'Confirmed': { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  'Dismissed': { bg: 'bg-stone-50', text: 'text-slate-500', border: 'border-stone-200', dot: 'bg-slate-400' },
  'Monitor': { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', dot: 'bg-amber-500' },
  'Review Required': { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200', dot: 'bg-rose-500' },
  'Compliant': { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  'Escalated': { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', dot: 'bg-purple-500' },
  'Normal': { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  'Moderate': { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', dot: 'bg-amber-500' },
  'Critical': { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200', dot: 'bg-rose-500' },
  'High': { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', dot: 'bg-orange-500' },
  'Low': { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200', dot: 'bg-indigo-500' },
  'Available': { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  'Ready': { bg: 'bg-stone-100', text: 'text-slate-600', border: 'border-stone-200', dot: 'bg-slate-500' },
  'Assigned': { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', dot: 'bg-blue-500' },
  'Submitted': { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200', dot: 'bg-indigo-500' }
}

export function SeverityBadge({ severity }: { severity?: string }) {
  const norm = severity ? severity.charAt(0).toUpperCase() + severity.slice(1).toLowerCase() : 'Low'
  const style = severityStyles[norm] || severityStyles[severity || ''] || severityStyles.Low
  return (
    <span className={`badge ${style.bg} ${style.text} ${style.border} ${style.glow}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      <span className="font-semibold uppercase tracking-wider text-[10px]">{severity || 'Normal'}</span>
    </span>
  )
}

export function StatusBadge({ status }: { status?: string }) {
  const style = (status && statusStyles[status]) || statusStyles.New
  return (
    <span className={`badge ${style.bg} ${style.text} ${style.border}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      <span className="font-medium text-[11px]">{status || '—'}</span>
    </span>
  )
}

export function MitreBadge({ code, techniqueId, name }: { code?: string; techniqueId?: string; name?: string }) {
  const displayCode = code || techniqueId || 'T1059'
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 border border-purple-200 text-purple-700 text-[10.5px] font-mono">
      <Zap className="w-3 h-3 text-purple-600 shrink-0" />
      <span className="font-semibold">{displayCode}</span>
      {name && <span className="text-purple-600/80 truncate max-w-[120px]">· {name}</span>}
    </span>
  )
}

export function Confidence({ value, compact }: { value: number; compact?: boolean }) {
  const color = value >= 90 ? 'text-emerald-600' : value >= 80 ? 'text-indigo-600' : value >= 70 ? 'text-amber-600' : 'text-slate-500'
  const barBg = value >= 90 ? 'bg-emerald-500' : value >= 80 ? 'bg-indigo-500' : value >= 70 ? 'bg-amber-500' : 'bg-slate-400'
  return (
    <span className={`inline-flex items-center gap-2 ${compact ? '' : 'min-w-[105px]'}`}>
      <div className="h-1.5 w-12 rounded-full bg-stone-200 overflow-hidden border border-stone-200">
        <div className={`h-full rounded-full ${barBg}`} style={{ width: `${value}%` }} />
      </div>
      <span className={`font-mono text-[11px] font-semibold ${color}`}>{value}%</span>
    </span>
  )
}

export function RiskScoreBar({ score, showLabel }: { score: number; showLabel?: boolean }) {
  const color = score >= 85 ? 'bg-rose-500' : score >= 70 ? 'bg-orange-500' : score >= 55 ? 'bg-amber-500' : score >= 40 ? 'bg-indigo-500' : 'bg-emerald-500'
  return (
    <div className="flex items-center gap-2">
      <div className="risk-bar-track w-24 bg-stone-200 border border-stone-200">
        <div className={`risk-bar-fill ${color}`} style={{ width: `${Math.min(100, Math.max(0, score))}%` }} />
      </div>
      {showLabel && <span className="font-mono text-[11.5px] font-semibold text-slate-800">{score}</span>}
    </div>
  )
}

export function RiskScoreGauge({ score }: { score: number }) {
  const label = score >= 85 ? 'CRITICAL SUPERVISORY ATTENTION' : score >= 70 ? 'HIGH SUPERVISORY ATTENTION' : score >= 55 ? 'MODERATE ATTENTION' : score >= 40 ? 'LOW ATTENTION' : 'NORMAL COMPLIANT'
  const color = score >= 85 ? 'text-rose-600' : score >= 70 ? 'text-orange-600' : score >= 55 ? 'text-amber-600' : score >= 40 ? 'text-indigo-600' : 'text-emerald-600'
  const ringColor = score >= 85 ? '#f43f5e' : score >= 70 ? '#f97316' : score >= 55 ? '#f59e0b' : score >= 40 ? '#4f46e5' : '#10b981'

  const r = 52
  const circumference = 2 * Math.PI * r
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="flex items-center gap-5 p-2">
      <div className="relative w-32 h-32 shrink-0">
        <svg className="w-32 h-32 -rotate-90" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r={r} fill="none" stroke="#e7e5e4" strokeWidth="10" />
          <circle
            cx="64" cy="64" r={r} fill="none"
            stroke={ringColor} strokeWidth="10" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-extrabold text-slate-900 font-mono leading-none">{score}</span>
          <span className="text-[10px] text-slate-500 font-mono mt-1">/ 100</span>
        </div>
      </div>
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ringColor }} />
          <span className={`text-[12px] font-bold tracking-wider font-mono ${color}`}>{label}</span>
        </div>
        <p className="text-[11.5px] text-slate-500 leading-relaxed max-w-[240px]">
          Composite SOC effectiveness metric derived from ML evaluation of detection, investigation, and escalation logs.
        </p>
      </div>
    </div>
  )
}

export function Trend({ value }: { value: number }) {
  const up = value >= 0
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full border ${up ? 'text-rose-600 bg-rose-50 border-rose-200' : 'text-emerald-600 bg-emerald-50 border-emerald-200'}`}>
      <span>{up ? '▲ +' : '▼ -'}{Math.abs(value)}%</span>
      <span className="text-slate-500 text-[10px]">vs baseline</span>
    </span>
  )
}

export function TelemetryPulse({ active = true, status, label = 'Operational' }: { active?: boolean; status?: string; label?: string }) {
  const isHealthy = active && status !== 'error' && status !== 'warning' && status !== 'critical'
  return (
    <div className="flex items-center gap-2">
      <span className="soc-pulse">
        <span className={`soc-pulse-ring ${isHealthy ? 'bg-emerald-400' : 'bg-rose-400'}`} />
        <span className={`soc-pulse-dot ${isHealthy ? 'bg-emerald-500' : 'bg-rose-500'}`} />
      </span>
      <span className="text-[11px] font-mono font-medium text-slate-600">{label}</span>
    </div>
  )
}
