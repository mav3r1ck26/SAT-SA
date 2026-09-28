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
    neutral: { iconColor: 'text-indigo-600', iconBg: 'bg-indigo-50 border-indigo-200', glow: '' },
    warning: { iconColor: 'text-amber-600', iconBg: 'bg-amber-50 border-amber-200', glow: '' },
    danger: { iconColor: 'text-rose-600', iconBg: 'bg-rose-50 border-rose-200', glow: '' },
    info: { iconColor: 'text-blue-600', iconBg: 'bg-blue-50 border-blue-200', glow: '' },
    success: { iconColor: 'text-emerald-600', iconBg: 'bg-emerald-50 border-emerald-200', glow: '' }
  }[accent]

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-xs text-slate-500 mb-2">{label}</div>
          <div className="font-mono text-xl font-semibold text-slate-900">{value}</div>
        </div>
        <div className="shrink-0">
          <Icon className={`w-5 h-5 ${accentStyles.iconColor}`} />
        </div>
      </div>

      <div className="mt-4">
        <Trend value={trend} />
      </div>
    </div>
  )
}