import React from 'react'
import {
  LayoutDashboard, Building2, AlertTriangle, ShieldAlert, CircleDot,
  Activity, FolderOpen, FileSearch, TrendingUp, TrendingDown, Cpu, ShieldCheck
} from 'lucide-react'
import { Trend } from './ui'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'building': Building2,
  'alert': AlertTriangle,
  'shield': ShieldAlert,
  'gap': CircleDot,
  'space': Activity,
  'alerts': FolderOpen,
  'cases': FileSearch,
  'samples': LayoutDashboard,
  'cpu': Cpu,
  'compliance': ShieldCheck
}

interface StatCardProps {
  label: string
  value: string
  trend: number
  icon: string
  accent?: 'neutral' | 'warning' | 'danger' | 'info' | 'success'
}

export default function StatCard({ label, value, trend, icon, accent = 'neutral' }: StatCardProps) {
  const Icon = iconMap[icon] || LayoutDashboard

  const accentStyles = {
    neutral: { iconColor: 'text-cyan-400', iconBg: 'bg-cyan-950/40 border-cyan-800/40', glow: 'border-slate-800/80 hover:border-cyan-500/40' },
    warning: { iconColor: 'text-amber-400', iconBg: 'bg-amber-950/40 border-amber-800/40', glow: 'border-slate-800/80 hover:border-amber-500/40' },
    danger: { iconColor: 'text-rose-400', iconBg: 'bg-rose-950/40 border-rose-800/40', glow: 'border-slate-800/80 hover:border-rose-500/40' },
    info: { iconColor: 'text-blue-400', iconBg: 'bg-blue-950/40 border-blue-800/40', glow: 'border-slate-800/80 hover:border-blue-500/40' },
    success: { iconColor: 'text-emerald-400', iconBg: 'bg-emerald-950/40 border-emerald-800/40', glow: 'border-slate-800/80 hover:border-emerald-500/40' }
  }[accent]

  return (
    <div className={`card p-4.5 bg-gradient-to-b from-[#0e1628]/95 to-[#090e1c]/95 ${accentStyles.glow} relative overflow-hidden group`}>
      {/* Background corner glow */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-cyan-500/10 transition-all" />

      <div className="flex items-start justify-between relative z-10">
        <div className="min-w-0">
          <div className="label mb-2 text-slate-400 tracking-wider font-mono">{label}</div>
          <div className="kpi-value text-2xl font-bold tracking-tight text-white font-mono">{value}</div>
        </div>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center border shrink-0 ${accentStyles.iconBg}`}>
          <Icon className={`w-4.5 h-4.5 ${accentStyles.iconColor}`} />
        </div>
      </div>

      <div className="mt-3.5 pt-2.5 border-t border-slate-800/60 flex items-center justify-between relative z-10">
        <Trend value={trend} />
        <span className="text-[10px] font-mono text-slate-400">NCIIPC-Q2</span>
      </div>
    </div>
  )
}