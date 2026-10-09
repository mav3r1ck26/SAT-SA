import React, { createContext, useContext, useEffect, useRef, useState } from 'react'

const pathToPage = (pathname: string) => {
  const entityMatch = pathname.match(/^\/entity\/([^/]+)/)
  if (entityMatch) return { page: 'entity', entityId: decodeURIComponent(entityMatch[1]) }
  const routes: Record<string, string> = {
    '/': 'overview', '/entities': 'entities', '/gaps': 'gaps',
    '/negative-space': 'negative', '/alert-analytics': 'alerts',
    '/investigation-analytics': 'investigation', '/escalation-analytics': 'escalation',
    '/benchmark': 'benchmarking', '/review-queue': 'prioritisation',
    '/evidence': 'evidence', '/reports': 'reports', '/ingestion': 'ingestion',
    '/validation': 'validation', '/audit': 'audit', '/settings': 'settings',
    '/anomalies': 'anomalies',
  }
  return { page: routes[pathname.replace(/\/$/, '') || '/'] || 'overview', entityId: null }
}

const pageToPath = (page: string, entityId: string | null) => {
  if (page === 'entity') return `/entity/${encodeURIComponent(entityId || 'CSE-014')}`
  const routes: Record<string, string> = {
    overview: '/', entities: '/entities', gaps: '/gaps', negative: '/negative-space',
    alerts: '/alert-analytics', investigation: '/investigation-analytics',
    escalation: '/escalation-analytics', benchmarking: '/benchmark',
    prioritisation: '/review-queue', evidence: '/evidence', reports: '/reports',
    ingestion: '/ingestion', validation: '/validation', audit: '/audit',
    settings: '/settings', anomalies: '/anomalies', risk: '/',
  }
  return routes[page] || '/'
}

interface AppState {
  currentPage: string
  setCurrentPage: (page: string) => void
  selectedEntity: string | null
  setSelectedEntity: (id: string | null) => void
  selectedFindingId: string | null
  setSelectedFindingId: (id: string | null) => void
  assessmentPeriod: string
  setAssessmentPeriod: (p: string) => void
  entityFilter: string
  setEntityFilter: (e: string) => void
}

const AppContext = createContext<AppState | undefined>(undefined)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [initialRoute] = useState(() => pathToPage(window.location.pathname))
  const [currentPage, setPage] = useState(initialRoute.page)
  const [selectedEntity, setEntity] = useState<string | null>(initialRoute.entityId)
  const pendingEntityRef = useRef<string | null>(initialRoute.entityId)
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null)
  const [assessmentPeriod, setAssessmentPeriod] = useState('Q2 FY 2026–27')
  const [entityFilter, setEntityFilter] = useState('All CSEs')

  const setCurrentPage = (page: string) => {
    const path = pageToPath(page, pendingEntityRef.current || selectedEntity)
    if (window.location.pathname !== path) window.history.pushState({}, '', path)
    setPage(page)
  }
  const setSelectedEntity = (id: string | null) => {
    pendingEntityRef.current = id
    setEntity(id)
    if (currentPage === 'entity' && window.location.pathname.startsWith('/entity/')) {
      const path = pageToPath('entity', id)
      if (window.location.pathname !== path) window.history.pushState({}, '', path)
    }
  }

  useEffect(() => {
    const onPopState = () => {
      const route = pathToPage(window.location.pathname)
      setPage(route.page)
      pendingEntityRef.current = route.entityId
      if (route.entityId) setEntity(route.entityId)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  return (
    <AppContext.Provider value={{
      currentPage, setCurrentPage,
      selectedEntity, setSelectedEntity, selectedFindingId, setSelectedFindingId,
      assessmentPeriod, setAssessmentPeriod,
      entityFilter, setEntityFilter
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
