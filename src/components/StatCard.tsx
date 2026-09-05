import React from 'react'
import { LayoutDashboard, Building2, AlertTriangle, ShieldAlert, CircleDot, Activity, FolderOpen, FileSearch, TrendingUp, TrendingDown } from 'lucide-react'
import { Trend } from './ui'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'building': Building2,
  'alert': AlertTriangle,
  'shield': ShieldAlert,
  'gap': CircleDot,
  'space': Activity,
  'alerts': FolderOpen,
  'cases': FileSearch,
  'samples': LayoutDashboard
}

interface StatCardProps {
  label: string
  value: string
  trend: number
  icon: string
  accent?: 'neutral' | 'warning' | 'danger' | 'info'
}

export default function StatCard({ label, value, trend, icon, accent = 'neutral' }: StatCardProps) {
  const Icon = iconMap[icon] || LayoutDashboard
  const accentStyles = {
    neutral: 'text-navy-900',
    warning: 'text-amber-500',
    danger: 'text-red-500',
    info: 'text-blue-500'
  }[accent]

  return (
    <div className="card p-4 hover:shadow-cardhover transition-shadow">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="label mb-1.5">{label}</div>
          <div className="kpi-value">{value}</div>
        </div>
        <Icon className={`w-4.5 h-4.5 ${accentStyles} opacity-80`} />
      </div>
      <div className="mt-2.5">
        <Trend value={trend} />
      </div>
    </div>
  )
}