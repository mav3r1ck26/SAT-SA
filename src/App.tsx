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
import Anomalies from './pages/Anomalies'
import Login from './pages/Login'
import { AuthProvider, useAuth } from './context/AuthContext'

function PageRouter() {
  const { currentPage } = useApp()
  const { user } = useAuth()

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
    'anomalies': Anomalies,
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
  const allowed =
    (currentPage !== 'settings' || user?.role === 'Super Admin') &&
    (currentPage !== 'audit' || ['Super Admin', 'Supervisor', 'Examiner', 'Auditor'].includes(user?.role || ''))
  if (!allowed) {
    return <div role="alert" className="m-8 rounded border border-amber-200 bg-amber-50 p-5 text-amber-900">Your role does not have access to this page.</div>
  }
  return <Page />
}

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AuthenticatedApp />
      </AppProvider>
    </AuthProvider>
  )
}

function AuthenticatedApp() {
  const { user, ready } = useAuth()
  const { currentPage, selectedEntity, setSelectedEntity, setCurrentPage } = useApp()
  React.useEffect(() => {
    if (user?.role === 'SOC Manager' && user.assignedEntityIds.length) {
      if (!user.assignedEntityIds.includes(selectedEntity || '')) setSelectedEntity(user.assignedEntityIds[0])
      if (currentPage !== 'entity') setCurrentPage('entity')
    }
  }, [user, currentPage, selectedEntity, setCurrentPage, setSelectedEntity])
  if (!ready) return <main className="min-h-screen grid place-items-center text-slate-500">Checking access…</main>
  if (!user) return <Login />
  if (user.role === 'SOC Manager' && user.assignedEntityIds.length === 0) {
    return <main role="alert" className="min-h-screen grid place-items-center text-rose-700">This account has no assigned entities. Contact a Super Admin.</main>
  }
  return <Shell><PageRouter /></Shell>
}

export default App
