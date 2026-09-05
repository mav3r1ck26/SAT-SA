import React, { createContext, useContext, useState } from 'react'

interface AppState {
  currentPage: string
  setCurrentPage: (page: string) => void
  selectedEntity: string | null
  setSelectedEntity: (id: string | null) => void
  assessmentPeriod: string
  setAssessmentPeriod: (p: string) => void
  entityFilter: string
  setEntityFilter: (e: string) => void
}

const AppContext = createContext<AppState | undefined>(undefined)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentPage, setCurrentPage] = useState('overview')
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null)
  const [assessmentPeriod, setAssessmentPeriod] = useState('Q2 FY 2026–27')
  const [entityFilter, setEntityFilter] = useState('All CSEs')

  return (
    <AppContext.Provider value={{
      currentPage, setCurrentPage,
      selectedEntity, setSelectedEntity,
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
