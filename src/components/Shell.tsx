import React, { useState, useEffect } from 'react'
import {
  LayoutDashboard, Building2, ShieldAlert, CircleDot, ScanSearch, Bell,
  FolderSearch, GitBranch, ArrowUpRight, Scale, ListTodo, FileSearch2,
  FileText, Upload, BadgeCheck, History, Settings as SettingsIcon, Search,
  HelpCircle, User, ChevronDown, ShieldCheck, AlertTriangle, Info, Zap,
  Activity, Radio, Terminal, Lock, Clock
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { notifications } from '../data/mockData'

interface NavItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
}

const primaryNav: NavItem[] = [
  { id: 'overview', label: 'Supervisory Overview', icon: LayoutDashboard },
  { id: 'entities', label: 'Entities Fleet', icon: Building2 },
  { id: 'risk', label: 'Supervisory Risk', icon: ShieldAlert },
  { id: 'gaps', label: 'Execution Gaps', icon: CircleDot, badge: 'Active' },
  { id: 'negative', label: 'Negative Space Matrix', icon: ScanSearch }
]

const analyticsNav: NavItem[] = [
  { id: 'alerts', label: 'Alert Analytics', icon: Bell },
  { id: 'investigation', label: 'Investigation Analytics', icon: FolderSearch },
  { id: 'escalation', label: 'Escalation Bottlenecks', icon: GitBranch },
  { id: 'benchmarking', label: 'Peer Benchmarking', icon: ArrowUpRight },
  { id: 'prioritisation', label: 'Review Prioritisation', icon: ListTodo, badge: 'ML' },
  { id: 'evidence', label: 'Evidence Explorer', icon: FileSearch2 }
]

const governanceNav: NavItem[] = [
  { id: 'reports', label: 'Supervisory Dossiers', icon: FileText },
  { id: 'ingestion', label: 'Data Ingestion & QC', icon: Upload },
  { id: 'validation', label: 'Model Ground Truth', icon: BadgeCheck },
  { id: 'audit', label: 'Immutable Audit Trail', icon: History },
  { id: 'settings', label: 'System Configuration', icon: SettingsIcon }
]

function NavLink({ item, active, onClick }: { item: NavItem; active: boolean; onClick: () => void }) {
  const Icon = item.icon
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-left text-[12.5px] font-medium transition-all group ${
        active
          ? 'bg-gradient-to-r from-cyan-500/15 to-transparent text-cyan-300 border-l-2 border-cyan-400 font-semibold'
          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 border-l-2 border-transparent'
      }`}
    >
      <div className="flex items-center gap-2.5 truncate">
        <Icon className={`w-4 h-4 shrink-0 transition-colors ${active ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]' : 'text-slate-400 group-hover:text-slate-200'}`} />
        <span className="truncate tracking-tight">{item.label}</span>
      </div>
      {item.badge && (
        <span className={`text-[9.5px] font-mono px-1.5 py-0.5 rounded ${active ? 'bg-cyan-400/20 text-cyan-200 border border-cyan-400/30' : 'bg-slate-800 text-slate-400 border border-slate-700/50'}`}>
          {item.badge}
        </span>
      )}
    </button>
  )
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const { currentPage, setCurrentPage, selectedEntity, setSelectedEntity, assessmentPeriod, setAssessmentPeriod } = useApp()
  const [showNotifications, setShowNotifications] = useState(false)
  const [timeString, setTimeString] = useState('')
  const unreadCount = notifications.filter(n => !n.read).length

  useEffect(() => {
    const updateTime = () => {
      const d = new Date()
      setTimeString(d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' IST')
    }
    updateTime()
    const t = setInterval(updateTime, 1000)
    return () => clearInterval(t)
  }, [])

  const navigate = (id: string) => {
    setCurrentPage(id)
    if (id === 'entities') setSelectedEntity(null)
  }

  const groupTitle = (label: string) => (
    <div className="px-3 pt-4 pb-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 font-mono flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-sm bg-slate-600" />
        {label}
      </span>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-[#060a12] text-slate-100">
      {/* Sidebar */}
      <aside className="w-[240px] shrink-0 bg-[#0a101f]/95 backdrop-blur-md text-slate-300 flex flex-col border-r border-slate-800/90 z-20">
        {/* Brand Header */}
        <div className="px-4 py-3.5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shrink-0 shadow-glowCyan border border-cyan-300/30">
              <ShieldCheck className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <div>
              <div className="text-[14px] font-bold text-white tracking-wider leading-none font-mono flex items-center gap-1.5">
                SAT-SA
                <span className="text-[9px] font-normal px-1 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/50">v1.0</span>
              </div>
              <div className="text-[9.5px] text-slate-400 mt-0.5 font-medium tracking-tight">Supervisory Analytics</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
          {groupTitle('Analysis & Intelligence')}
          {primaryNav.map(item => (
            <NavLink
              key={item.id}
              item={item}
              active={currentPage === item.id}
              onClick={() => navigate(item.id)}
            />
          ))}
          {groupTitle('Operational Analytics')}
          {analyticsNav.map(item => (
            <NavLink
              key={item.id}
              item={item}
              active={currentPage === item.id}
              onClick={() => navigate(item.id)}
            />
          ))}
          {groupTitle('Supervisory Governance')}
          {governanceNav.map(item => (
            <NavLink
              key={item.id}
              item={item}
              active={currentPage === item.id}
              onClick={() => navigate(item.id)}
            />
          ))}
        </nav>

        {/* Security Posture Status */}
        <div className="p-3 border-t border-slate-800/90 bg-[#080d1a]/80">
          <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="soc-pulse">
                  <span className="soc-pulse-ring bg-emerald-400" />
                  <span className="soc-pulse-dot bg-emerald-500" />
                </span>
                <span className="text-[10.5px] font-bold text-slate-200 font-mono tracking-wide">SECURE AIR-GAP</span>
              </div>
              <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">ONLINE</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono space-y-0.5">
              <div className="flex justify-between">
                <span>NCIIPC Local DB</span>
                <span className="text-slate-300">Connected</span>
              </div>
              <div className="flex justify-between">
                <span>ML Pipeline</span>
                <span className="text-cyan-400">Ensemble</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Command Bar */}
        <header className="h-[54px] shrink-0 bg-[#0a101f]/90 backdrop-blur-md border-b border-slate-800/90 flex items-center justify-between px-5 z-10">
          <div className="flex items-center gap-3">
            {/* Classification Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-950/40 border border-amber-600/40 text-amber-300 font-mono text-[10.5px] font-semibold tracking-wider">
              <Lock className="w-3 h-3 text-amber-400" />
              <span>RESTRICTED // NCIIPC SUPERVISORY</span>
            </div>

            {/* Assessment Period */}
            <div className="flex items-center gap-1.5 bg-[#080d1a] border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11.5px] hover:border-slate-700 cursor-pointer transition-colors">
              <span className="text-slate-500 font-mono text-[10px] uppercase font-semibold">Period:</span>
              <span className="font-semibold text-slate-200 font-mono">{assessmentPeriod}</span>
            </div>
          </div>

          {/* Center Search / Command Palette */}
          <div className="flex-1 max-w-[420px] mx-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                className="w-full bg-[#080d1a]/90 border border-slate-800 rounded-lg pl-9 pr-14 py-1.5 text-[12px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/20 font-mono transition-all"
                placeholder="Search CSEs, alerts, gap findings, case IDs..."
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-500 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700">
                ⌘K
              </span>
            </div>
          </div>

          {/* Right System Info & User */}
          <div className="flex items-center gap-3">
            {/* Clock */}
            <div className="hidden lg:flex items-center gap-1.5 font-mono text-[11px] text-slate-400 bg-[#080d1a] px-2.5 py-1 rounded-lg border border-slate-800">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-200 font-semibold">{timeString || '18:40:00 IST'}</span>
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                className="relative p-2 rounded-lg bg-[#080d1a] border border-slate-800 hover:border-slate-700 hover:text-white transition-colors text-slate-300"
                onClick={() => setShowNotifications(v => !v)}
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-500 text-white text-[9.5px] font-mono font-bold flex items-center justify-center shadow-glowRose">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-[380px] bg-[#0c1324] rounded-xl border border-slate-800 shadow-2xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                    <span className="text-[12.5px] font-semibold text-white flex items-center gap-2">
                      <Bell className="w-3.5 h-3.5 text-cyan-400" />
                      Supervisory Alerts
                    </span>
                    <span className="text-[10.5px] font-mono text-slate-400">{unreadCount} pending</span>
                  </div>
                  <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-800/50">
                    {notifications.map(n => (
                      <div key={n.id} className={`p-3.5 hover:bg-slate-800/40 transition-colors border-l-2 ${n.read ? 'border-transparent' : 'border-cyan-500 bg-cyan-950/10'}`}>
                        <div className="flex items-start gap-2.5">
                          <div className="mt-0.5 shrink-0">
                            {n.severity === 'high'
                              ? <AlertTriangle className="w-4 h-4 text-rose-400" />
                              : n.severity === 'medium'
                                ? <Info className="w-4 h-4 text-amber-400" />
                                : <Info className="w-4 h-4 text-cyan-400" />}
                          </div>
                          <div className="min-w-0">
                            <div className="text-[12px] font-semibold text-slate-200">{n.title}</div>
                            <div className="text-[11.5px] text-slate-400 mt-0.5 leading-snug">{n.detail}</div>
                            <div className="text-[10px] font-mono text-slate-500 mt-1">{n.time} IST</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile */}
            <div className="flex items-center gap-2.5 pl-3 border-l border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-500 border border-cyan-400/40 flex items-center justify-center font-mono font-bold text-slate-950 text-xs shadow-glowCyan">
                E7
              </div>
              <div className="hidden xl:block">
                <div className="text-[12px] font-semibold text-slate-200 leading-none">Examiner-07</div>
                <div className="text-[9.5px] text-slate-500 font-mono mt-0.5">Lead SOC Auditor</div>
              </div>
            </div>
          </div>
        </header>

        {/* Content View */}
        <main className="flex-1 overflow-y-auto bg-[#080d1a]">
          {children}
        </main>
      </div>
    </div>
  )
}