import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Overview } from './pages/Overview';
import { EntitiesList } from './pages/EntitiesList';
import { EntityProfile } from './pages/EntityProfile';
import { ExecutionGaps } from './pages/ExecutionGaps';
import { NegativeSpace } from './pages/NegativeSpace';
import { AlertAnalytics } from './pages/AlertAnalytics';
import { InvestigationAnalytics } from './pages/InvestigationAnalytics';
import { EscalationAnalytics } from './pages/EscalationAnalytics';
import { PeerBenchmarking } from './pages/PeerBenchmarking';
import { ReviewPrioritisation } from './pages/ReviewPrioritisation';
import { EvidenceExplorer } from './pages/EvidenceExplorer';
import { Reports } from './pages/Reports';
import { DataIngestion } from './pages/DataIngestion';
import { Validation } from './pages/Validation';
import { AuditTrail } from './pages/AuditTrail';
import { Settings } from './pages/Settings';
import { Anomalies } from './pages/Anomalies';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Overview />} />
          <Route path="entities" element={<EntitiesList />} />
          <Route path="entity/:id" element={<EntityProfile />} />
          <Route path="gaps" element={<ExecutionGaps />} />
          <Route path="negative-space" element={<NegativeSpace />} />
          <Route path="alert-analytics" element={<AlertAnalytics />} />
          <Route path="investigation-analytics" element={<InvestigationAnalytics />} />
          <Route path="escalation-analytics" element={<EscalationAnalytics />} />
          <Route path="anomalies" element={<Anomalies />} />
          <Route path="benchmark" element={<PeerBenchmarking />} />
          <Route path="review-queue" element={<ReviewPrioritisation />} />
          <Route path="evidence" element={<EvidenceExplorer />} />
          <Route path="reports" element={<Reports />} />
          <Route path="ingestion" element={<DataIngestion />} />
          <Route path="validation" element={<Validation />} />
          <Route path="audit" element={<AuditTrail />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;