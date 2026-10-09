import React, { useState, useEffect, useRef } from 'react'
import {
  LayoutDashboard, Building2, CircleDot, ScanSearch, Bell,
  ListTodo, FileText, Upload, Settings as SettingsIcon, Search,
  ShieldCheck, AlertTriangle, Database, Clock, ChevronDown, Check, X,
  Radio, HardDrive, Shield, Sparkles, UserCheck, ArrowUpRight,
  BarChart3, Activity, TriangleAlert
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { notifications as initialNotifications } from '../data/mockData'

interface NavItem {
  id: string
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  badgeColor?: string
}

// 7 Focused Primary Supervisory Capabilities
const primaryNav: NavItem[] = [
  { 
    id: 'overview', 
    label: 'Command Overview', 
    description: 'Attention Index & Fleet Ranking', 
    icon: LayoutDashboard 
  },
  { 
    id: 'entities', 
    label: 'Entity Assessment', 
    description: 'CSE Scorecards & Peer Benchmarks', 
    icon: Building2 
  },
  { 
    id: 'gaps', 
    label: 'Execution Gaps', 
    description: 'Behavioral vs Stated Capability', 
    icon: CircleDot, 
    badge: 'Behavioral',
    badgeColor: 'bg-rose-50 text-rose-600 border border-rose-200'
  },
  { 
    id: 'negative', 
    label: 'Negative Space', 
    description: 'Sensor Blind Spots & Missing Data', 
    icon: ScanSearch, 
    badge: 'Dark Spots',
    badgeColor: 'bg-amber-50 text-amber-600 border border-amber-200'
  },
  { 
    id: 'prioritisation', 
    label: 'Review Queue', 
    description: 'Manual Sampling & Evidence Chain', 
    icon: ListTodo, 
    badge: 'Prioritised',
    badgeColor: 'bg-indigo-50 text-indigo-600 border border-indigo-200'
  },
  { 
    id: 'ingestion', 
    label: 'Data Ingestion', 
    description: 'Air-Gap Bundles & Test Datasets', 
    icon: Upload 
  },
  { 
    id: 'reports', 
    label: 'Reports & Governance', 
    description: 'Dossiers, Audit Ledger & ML Specs', 
    icon: FileText 
  },
  { id: 'alerts', label: 'Alert Analytics', description: 'Alert volume, severity, and lifecycle', icon: BarChart3 },
  { id: 'investigation', label: 'Investigation Analytics', description: 'Investigation patterns and evidence depth', icon: Activity },
  { id: 'escalation', label: 'Escalation Analytics', description: 'Escalation rates and delay tiers', icon: Radio },
  { id: 'anomalies', label: 'Anomalies', description: 'Filter and investigate operational outliers', icon: TriangleAlert }
]

const searchCatalog = [
  { type: 'entity', id: 'CSE-001', name: 'National Power Grid Op.', sector: 'Power' },
  { type: 'entity', id: 'CSE-008', name: 'State Telecom Network', sector: 'Telecom' },
  { type: 'entity', id: 'CSE-014', name: 'Central Power Authority (Critical Anomaly)', sector: 'Power' },
  { type: 'entity', id: 'CSE-021', name: 'Regional Transport Alliance', sector: 'Transport' },
  { type: 'entity', id: 'CSE-027', name: 'National Banking Services (SWIFT)', sector: 'Banking' },
  { type: 'entity', id: 'CSE-034', name: 'Renewable Energy Group', sector: 'Energy' },
  { type: 'entity', id: 'CSE-041', name: 'Central Defence Data Ctr', sector: 'Defence' },
  { type: 'entity', id: 'CSE-050', name: 'Govt Digital Services', sector: 'Government' },
  { type: 'entity', id: 'CSE-058', name: 'National Health Net', sector: 'Health' },
  { type: 'entity', id: 'CSE-063', name: 'Metropolitan Water Board', sector: 'Water' },
  { type: 'entity', id: 'CSE-070', name: 'Freight Rail Network', sector: 'Transport' },
  { type: 'finding', id: 'EG-181', name: 'Rapid Closure Without Investigation (<5m)', sector: 'CSE-014' },
  { type: 'finding', id: 'EG-182', name: 'Critical Alert Without Escalation', sector: 'CSE-014' },
  { type: 'finding', id: 'EG-183', name: 'Repeated Template Investigation Disposition', sector: 'CSE-027' },
  { type: 'finding', id: 'NS-186', name: 'Missing Telemetry from OT/ICS SCADA Bus', sector: 'CSE-014' },
  { type: 'module', id: 'overview', name: 'Command Overview (Fleet Attention Index)', sector: 'Module' },
  { type: 'module', id: 'entities', name: 'Entity Assessment & Peer Benchmarking', sector: 'Module' },
  { type: 'module', id: 'gaps', name: 'Execution Gap Divergence Registry', sector: 'Module' },
  { type: 'module', id: 'negative', name: 'Negative Space & Sensor Blind Spots', sector: 'Module' },
  { type: 'module', id: 'prioritisation', name: 'Examiner Manual Review Queue & Evidence', sector: 'Module' },
  { type: 'module', id: 'ingestion', name: 'Air-Gap Telemetry Ingestion & QC', sector: 'Module' },
  { type: 'module', id: 'reports', name: 'Supervisory Dossiers, Audit & Governance', sector: 'Module' }
]

export default function Shell({ children }: { children: React.ReactNode }) {
  const { currentPage, setCurrentPage, setSelectedEntity, assessmentPeriod, setAssessmentPeriod } = useApp()
  const [showNotifications, setShowNotifications] = useState(false)
  const [showPeriodMenu, setShowPeriodMenu] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [notifications, setNotifications] = useState(initialNotifications)
  const [timeString, setTimeString] = useState('')
  const searchRef = useRef<HTMLDivElement>(null)

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

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Global shortcut ⌘K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchFocused(true)
      } else if (e.key === 'Escape') {
        setSearchFocused(false)
        setShowNotifications(false)
        setShowPeriodMenu(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const navigate = (id: string) => {
    setCurrentPage(id)
    if (id === 'entities') setSelectedEntity(null)
    setSearchFocused(false)
    setSearchQuery('')
  }

  const handleSearchResultClick = (item: typeof searchCatalog[0]) => {
    if (item.type === 'entity') {
      setSelectedEntity(item.id)
      setCurrentPage('entity')
    } else if (item.type === 'finding') {
      setCurrentPage('gaps')
    } else if (item.type === 'module') {
      navigate(item.id)
    }
    setSearchFocused(false)
    setSearchQuery('')
  }

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const periods = ['Q2 FY 2026–27', 'Q1 FY 2026–27', 'Q4 FY 2025–26', 'Q3 FY 2025–26']

  const filteredSearchResults = searchQuery.trim()
    ? searchCatalog.filter(item =>
        item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sector.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 8)
    : searchCatalog.slice(0, 6)

  // Map sub-pages to their active parent nav item
  const getActiveNavId = () => {
    if (currentPage === 'entity') return 'entities'
    if (currentPage === 'evidence') return 'prioritisation'
    if (currentPage === 'audit' || currentPage === 'validation' || currentPage === 'settings') return 'reports'
    if (currentPage === 'benchmarking') return 'entities'
    return currentPage
  }

  const activeNavId = getActiveNavId()

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-700 font-sans">
      {/* Light navigation sidebar */}
      <aside className="w-[200px] shrink-0 bg-white text-slate-700 flex flex-col border-r border-slate-200 z-20">
        {/* Brand Header */}
        <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('overview')}>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0 text-indigo-600 shadow-sm">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="text-[13.5px] font-bold text-slate-900 tracking-wide font-mono flex items-center gap-1.5">
              SAT-SA
              <span className="text-[9.5px] font-semibold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                NCIIPC
              </span>
            </div>
          </div>
        </div>

        {/* 7 Streamlined Primary Nav Items */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-4 space-y-1">
          <div className="px-2 pb-2 text-[9.5px] font-bold uppercase tracking-wider text-slate-500 font-mono">
            Supervisory Capabilities
          </div>

          {primaryNav.map(item => {
            const Icon = item.icon
            const active = activeNavId === item.id
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-all group ${
                  active
                    ? 'bg-indigo-50 text-indigo-700 font-medium border-l-2 border-indigo-600'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-l-2 border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 transition-colors ${active ? 'text-indigo-600' : 'text-slate-500 group-hover:text-slate-700'}`} />
                <span className={`text-[12.5px] truncate ${active ? 'text-indigo-700' : 'text-slate-600 group-hover:text-slate-900'}`}>
                  {item.label}
                </span>
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-14 shrink-0 border-b border-slate-200 bg-white px-5 flex items-center justify-between gap-4 z-10">
          {/* Universal Search & Jump Box */}
          <div className="relative flex-1 max-w-md" ref={searchRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search entities, findings..."
                value={searchQuery}
                onFocus={() => setSearchFocused(true)}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full rounded-lg bg-slate-100 border border-slate-300 pl-9 pr-12 py-1.5 text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 font-mono transition-colors"
              />
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono text-slate-500 bg-white rounded border border-slate-300">
                ⌘K
              </kbd>
            </div>

            {/* Fast Search Results Popover */}
            {searchFocused && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-lg shadow-lg p-2 z-50 space-y-1 max-h-80 overflow-y-auto">
                <div className="text-[10px] font-mono text-slate-500 px-2 py-1 uppercase tracking-wider flex items-center justify-between">
                  <span>Direct Supervisory Catalog</span>
                  <span>{filteredSearchResults.length} matches</span>
                </div>
                {filteredSearchResults.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSearchResultClick(item)}
                    className="w-full flex items-center justify-between p-2 rounded hover:bg-slate-50 text-left text-xs transition-colors group"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border uppercase ${
                        item.type === 'entity' 
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200' 
                          : item.type === 'finding'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}>
                        {item.type}
                      </span>
                      <span className="mono-id">{item.id}</span>
                      <span className="text-slate-700 truncate font-sans">{item.name}</span>
                    </div>
                    <span className="text-[10.5px] font-mono text-slate-400 group-hover:text-slate-600 shrink-0">
                      {item.sector}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-3">
            {/* Assessment Period Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowPeriodMenu(!showPeriodMenu)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-mono text-slate-700 hover:border-slate-300 transition-colors"
              >
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                <span>{assessmentPeriod}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showPeriodMenu && (
                <div className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-slate-200 rounded-lg shadow-lg p-1 z-50">
                  <div className="px-2 py-1 text-[10px] font-mono text-slate-500 uppercase">Audit Assessment Period</div>
                  {periods.map(p => (
                    <button
                      key={p}
                      onClick={() => { setAssessmentPeriod(p); setShowPeriodMenu(false) }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs font-mono text-left ${
                        assessmentPeriod === p ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{p}</span>
                      {assessmentPeriod === p && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notifications Flyout */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 transition-colors"
                title="Supervisory Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center font-mono animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-lg shadow-lg p-3 z-50 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-xs font-bold text-slate-900 font-mono flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-indigo-500" /> Supervisory Alerts ({unreadCount})
                    </span>
                    <button onClick={markAllRead} className="text-[10px] text-indigo-600 hover:underline font-mono">
                      Mark read
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {notifications.map(n => (
                      <div
                        key={n.id}
                        className={`p-2.5 rounded border text-xs cursor-pointer transition-colors ${
                          n.read ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-slate-300 hover:border-indigo-300'
                        }`}
                        onClick={() => {
                          setShowNotifications(false)
                          if (n.detail.includes('CSE-014')) {
                            setSelectedEntity('CSE-014')
                            setCurrentPage('entity')
                          } else {
                            setCurrentPage('gaps')
                          }
                        }}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded uppercase font-bold ${
                            n.severity === 'high' ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-amber-50 text-amber-600 border border-amber-200'
                          }`}>
                            {n.type}
                          </span>
                          <span className="text-[9.5px] font-mono text-slate-500">{n.time}</span>
                        </div>
                        <div className="font-semibold text-slate-800 text-xs leading-snug">{n.title}</div>
                        <div className="text-slate-500 text-[11px] mt-0.5 leading-relaxed">{n.detail}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Offline Clock */}
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-mono text-slate-600">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <span>{timeString}</span>
            </div>
          </div>
        </header>

        {/* Scrollable View Container */}
        <main className="flex-1 overflow-y-auto bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  )
}
