import React, { useState } from 'react'
import {
  LayoutDashboard, Building2, ShieldAlert, CircleDot, ScanSearch, Bell,
  FolderSearch, GitBranch, ArrowUpRight, Scale, ListTodo, FileSearch2,
  FileText, Upload, BadgeCheck, History, Settings as SettingsIcon, Search,
  HelpCircle, User, ChevronDown, ShieldCheck, AlertTriangle, Info
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { notifications } from '../data/mockData'

interface NavItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const primaryNav: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'entities', label: 'Entities', icon: Building2 },
  { id: 'risk', label: 'Supervisory Risk', icon: ShieldAlert },
  { id: 'gaps', label: 'Execution Gaps', icon: CircleDot },
  { id: 'negative', label: 'Negative Space', icon: ScanSearch }
]

const analyticsNav: NavItem[] = [
  { id: 'alerts', label: 'Alert Analytics', icon: Bell },
  { id: 'investigation', label: 'Investigation Analytics', icon: FolderSearch },
  { id: 'escalation', label: 'Escalation Analytics', icon: GitBranch },
  { id: 'benchmarking', label: 'Peer Benchmarking', icon: ArrowUpRight },
  { id: 'prioritisation', label: 'Review Prioritisation', icon: ListTodo },
  { id: 'evidence', label: 'Evidence Explorer', icon: FileSearch2 }
]

const governanceNav: NavItem[] = [
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'ingestion', label: 'Data Ingestion', icon: Upload },
  { id: 'validation', label: 'Validation', icon: BadgeCheck },
  { id: 'audit', label: 'Audit Trail', icon: History },
  { id: 'settings', label: 'Settings', icon: SettingsIcon }
]

function NavLink({ item, active, onClick }: { item: NavItem; active: boolean; onClick: () => void }) {
  const Icon = item.icon
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[12.5px] font-medium transition-colors ${
        active
          ? 'bg-blue-600/15 text-blue-100 border border-blue-500/20'
          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
      }`}
    >
      <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-blue-400' : 'text-slate-500'}`} />
      <span className="truncate">{item.label}</span>
    </button>
  )
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const { currentPage, setCurrentPage, selectedEntity, setSelectedEntity, assessmentPeriod, setAssessmentPeriod } = useApp()
  const [showNotifications, setShowNotifications] = useState(false)
  const unreadCount = notifications.filter(n => !n.read).length

  const navigate = (id: string) => {
    setCurrentPage(id)
    if (id === 'entities') setSelectedEntity(null)
  }

  const groupTitle = (label: string) => (
    <div className="px-2.5 pt-4 pb-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">{label}</span>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      {/* Sidebar */}
      <aside className="w-[224px] shrink-0 bg-navy-950 text-slate-300 flex flex-col border-r border-navy-800">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-navy-800/80 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <div className="text-[14px] font-bold text-white tracking-tight leading-none">SAT-SA</div>
            <div className="text-[9.5px] text-slate-500 mt-0.5 uppercase tracking-wider">Supervisory Analytics</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-2">
          {groupTitle('Analysis')}
          {primaryNav.map(item => (
            <NavLink
              key={item.id}
              item={item}
              active={currentPage === item.id}
              onClick={() => navigate(item.id)}
            />
          ))}
          {analyticsNav.map(item => (
            <NavLink
              key={item.id}
              item={item}
              active={currentPage === item.id}
              onClick={() => navigate(item.id)}
            />
          ))}
          {groupTitle('Governance')}
          {governanceNav.map(item => (
            <NavLink
              key={item.id}
              item={item}
              active={currentPage === item.id}
              onClick={() => navigate(item.id)}
            />
          ))}
        </nav>

        {/* Bottom status */}
        <div className="px-4 py-3 border-t border-navy-800/80">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
            <div>
              <div className="text-[10.5px] font-semibold text-slate-300">NCIIPC Controlled Environment</div>
              <div className="text-[9.5px] text-slate-500">● Offline / Air-Gapped</div>
            </div>
          </div>
          <div className="mt-2.5 text-[10px] text-slate-500 leading-tight">
            <div className="text-[9.5px] font-semibold uppercase tracking-wider text-slate-600">Data Last Updated</div>
            03 Sep 2026, 18:40 IST
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-[52px] shrink-0 bg-navy-950/95 border-b border-navy-800/80 flex items-center gap-3 px-4">
          <div className="flex items-center gap-1.5 mr-2">
            <span className="hidden md:block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Supervisory</span>
          </div>

          {/* Assessment period */}
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-md px-2 py-1 cursor-pointer hover:bg-white/10 transition-colors">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold hidden sm:block">Period</span>
            <span className="text-[12px] font-medium text-slate-200">{assessmentPeriod}</span>
            <ChevronDown className="w-3 h-3 text-slate-500" />
          </div>

          {/* Entity selector */}
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-md px-2 py-1 cursor-pointer hover:bg-white/10 transition-colors">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold hidden sm:block">Entity</span>
            <span className="text-[12px] font-medium text-slate-200">All CSEs</span>
            <ChevronDown className="w-3 h-3 text-slate-500" />
          </div>

          {/* Search */}
          <div className="flex-1 max-w-[360px] ml-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                className="w-full bg-white/5 border border-white/10 rounded-md pl-8 pr-3 py-1.5 text-[12px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/60 focus:bg-white/10"
                placeholder="Search entities, alerts, cases, findings..."
              />
            </div>
          </div>

          <div className="flex-1" />

          {/* Notifications */}
          <div className="relative">
            <button
              className="relative p-1.5 rounded-md hover:bg-white/10 transition-colors text-slate-300"
              onClick={() => setShowNotifications(v => !v)}
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-full mt-1.5 w-[360px] bg-white rounded-lg border border-slate-200 shadow-lg z-50">
                <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-navy-950">Notifications</span>
                  <span className="text-[11px] text-slate-400">{unreadCount} unread</span>
                </div>
                <div className="max-h-[360px] overflow-y-auto">
                  {notifications.map(n => (
                    <button key={n.id} className={`w-full text-left px-4 py-2.5 hover:bg-slate-50 border-l-2 ${n.read ? 'border-transparent' : 'border-blue-500'}`}>
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5 shrink-0">
                          {n.severity === 'high'
                            ? <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                            : n.severity === 'medium'
                              ? <Info className="w-3.5 h-3.5 text-amber-500" />
                              : <Info className="w-3.5 h-3.5 text-blue-500" />}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[12px] font-semibold text-slate-800 leading-tight">{n.title}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{n.detail}</div>
                          <div className="text-[10px] text-slate-400 mt-1">{n.time} IST</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="px-4 py-2 border-t border-slate-100 text-center">
                  <button className="text-[11px] font-medium text-blue-600 hover:text-blue-700">View all notifications</button>
                </div>
              </div>
            )}
          </div>

          {/* Help */}
          <button className="p-1.5 rounded-md hover:bg-white/10 transition-colors text-slate-300">
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* User */}
          <div className="flex items-center gap-2 pl-2 border-l border-white/10">
            <div className="w-6.5 h-6.5 rounded-full bg-blue-600/30 border border-blue-400/30 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-blue-200" />
            </div>
            <div className="hidden lg:block">
              <div className="text-[12px] font-semibold text-slate-200 leading-none">Examiner-07</div>
              <div className="text-[9.5px] text-slate-500 mt-0.5">Supervisory Examiner</div>
            </div>
            <ChevronDown className="w-3 h-3 text-slate-500" />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}