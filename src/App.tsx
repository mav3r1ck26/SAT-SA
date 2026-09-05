import React from 'react'
import { AppProvider, useApp } from './context/AppContext'
import Shell from './components/Shell'
import Overview from './pages/Overview'
import EntitiesList from './pages/EntitiesList'
import EntityProfile from './pages/EntityProfile'
import ExecutionGaps from './pages/ExecutionGaps'
import NegativeSpace from './pages/NegativeSpace'
import AlertAnalytics from './pages/AlertAnalytics'
import InvestigationAnalytics from './pages/InvestigationAnalytics'
import EscalationAnalytics from './pages/EscalationAnalytics'
import PeerBenchmarking from './pages/PeerBenchmarking'
import ReviewPrioritisation from './pages/ReviewPrioritisation'
import EvidenceExplorer from './pages/EvidenceExplorer'
import Reports from './pages/Reports'
import DataIngestion from './pages/DataIngestion'
import Validation from './pages/Validation'
import AuditTrail from './pages/AuditTrail'
import Settings from './pages/Settings'

function PageRouter() {
  const { currentPage } = useApp()

  const pages: Record<string, React.ComponentType> = {
    'overview': Overview,
    'entities': EntitiesList,
    'entity': EntityProfile,
    'risk': Overview, // Risk is part of overview
    'gaps': ExecutionGaps,
    'negative': NegativeSpace,
    'alerts': AlertAnalytics,
    'investigation': InvestigationAnalytics,
    'escalation': EscalationAnalytics,
    'benchmarking': PeerBenchmarking,
    'prioritisation': ReviewPrioritisation,
    'evidence': EvidenceExplorer,
    'reports': Reports,
    'ingestion': DataIngestion,
    'validation': Validation,
    'audit': AuditTrail,
    'settings': Settings
  }

  const Page = pages[currentPage] || Overview
  return <Page />
}

function App() {
  return (
    <AppProvider>
      <Shell>
        <PageRouter />
      </Shell>
    </AppProvider>
  )
}

export default App
