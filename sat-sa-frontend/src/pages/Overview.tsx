import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ChevronLeft, 
  Building2, 
  AlertTriangle, 
  Shield, 
  Gap, 
  Eye, 
  AlertCircle, 
  Search, 
  Zap, 
  BarChart2, 
  GitCompare, 
  ClipboardList, 
  FolderSearch, 
  FileText, 
  Upload, 
  CheckCircle2, 
  History,
  Settings,
  Shield,
  FileQuestion,
  Users,
  TrendingUp,
  TrendingDown,
  Target,
  Activity,
  Clock,
  ChevronLeft,
  AlertTriangle,
  Eye,
  Shield,
  BarChart2,
  GitCompare,
  ClipboardList,
  FolderSearch,
  FileText,
  Upload,
  CheckCircle2,
  History,
  Settings,
  Shield,
  FileQuestion,
  Users,
  TrendingUp,
  TrendingDown,
  Target,
  Activity,
  Clock,
  AlertTriangle as AlertTriangleIcon,
  Eye as EyeIcon,
  Shield as ShieldIcon,
  BarChart2 as BarChartIcon,
  GitCompare as GitCompareIcon,
  ClipboardList as ClipboardListIcon,
  FolderSearch as FolderSearchIcon,
  FileText as FileTextIcon,
  Upload as UploadIcon,
  CheckCircle2 as CheckCircleIcon,
  History as HistoryIcon,
  Settings as SettingsIcon,
  Shield as ShieldIcon2,
  FileQuestion as FileQuestionIcon,
  Users as UsersIcon,
  TrendingUp,
  TrendingDown,
  Target,
  Activity,
  Clock,
  AlertTriangle,
  Eye,
  Shield,
  BarChart2,
  GitCompare,
  ClipboardList,
  FolderSearch,
  FileText,
  Upload,
  CheckCircle2,
  History,
  Settings,
  Shield,
  FileQuestion,
  Users,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { fetchOverview, fetchRiskDistribution } from '../../api/client';
import { OverviewKPIs, RiskDistribution } from '../../api/types';
import StatCard from '../components/StatCard';
import { StackedBar, Donut } from '../components/charts';
import { SeverityBadge, StatusBadge } from '../components/ui';
import { ChevronLeft } from 'lucide-react';

const filterChips = ['All CSEs', 'Criticality', 'Sector', 'Region', 'Risk level', 'Date range'];

const topConcerns = [
  { title: 'Critical alerts closed without escalation', severity: 'Critical' as const, affectedEntities: 7, confidence: 92, evidenceCount: 214 },
  { title: 'Unusually rapid case closure', severity: 'High' as const, affectedEntities: 6, confidence: 89, evidenceCount: 187 },
  { title: 'Missing telemetry from critical systems', severity: 'High' as const, affectedEntities: 5, confidence: 86, evidenceCount: 92 },
  { title: 'Repetitive investigation patterns', severity: 'Medium' as const, affectedEntities: 4, confidence: 78, evidenceCount: 143 },
  { title: 'Significant peer deviation', severity: 'Medium' as const, affectedEntities: 6, confidence: 81, evidenceCount: 76 }
];

const riskBarData = [
  { level: 'Critical', count: 3, color: '#dc2626' },
  { level: 'High', count: 5, color: '#f97316' },
  { level: 'Moderate', count: 8, color: '#f59e0b' },
  { level: 'Low', count: 11, color: '#3b82f6' },
  { level: 'Normal', count: 15, color: '#10b981' }
];

const topConcernsData = [
  { title: 'Critical alerts closed without escalation', severity: 'Critical' as const, affectedEntities: 7, confidence: 92, evidenceCount: 214 },
  { title: 'Unusually rapid case closure', severity: 'High' as const, affectedEntities: 6, confidence: 89, evidenceCount: 187 },
  { title: 'Missing telemetry from critical systems', severity: 'High' as const, affectedEntities: 5, confidence: 86, evidenceCount: 92 },
  { title: 'Repetitive investigation patterns', severity: 'Medium' as const, affectedEntities: 4, confidence: 78, evidenceCount: 143 },
  { title: 'Significant peer deviation', severity: 'Medium' as const, affectedEntities: 6, confidence: 81, evidenceCount: 76 }
];

const filterChips = ['All CSEs', 'Criticality', 'Sector', 'Region', 'Risk level', 'Date range'];

export default function Overview() {
  const [kpis, setKpis] = useState<any[]>([]);
  const [distribution, setDistribution] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchOverview(), fetchRiskDistribution()])
      .then(([overview, dist]) => {
        setKpis(overview.kpis || []);
        setDistribution(dist || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const riskBarData = [
    { level: 'Critical', count: 3, color: '#dc2626' },
    { level: 'High', count: 5, color: '#f97316' },
    { level: 'Moderate', count: 8, color: '#f59e0b' },
    { level: 'Low', count: 11, color: '#3b82f6' },
    { level: 'Normal', count: 15, color: '#10b981' }
  ];

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h1 className="page-title">Supervisory Overview</h1>
          <p className="page-subtitle">Cross-entity analysis of SOC operational evidence</p>
        </div>
      </div>

      <div className="flex gap-1.5 mb-5 flex-wrap">
        {filterChips.map((c, i) => (
          <button key={i} className={`chip-filter ${i === 0 ? 'chip-filter-active' : ''}`}>{c}</button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        {kpis.slice(0, 4).map((kpi, i) => (
          <StatCard key={i} label={kpi.label} value={kpi.display} trend={kpi.trend} icon={kpi.icon}
            accent={kpi.threshold === 'bad' ? 'danger' : kpi.threshold === 'watched' ? 'warning' : 'neutral'} />
        ))}
      </div>
      <div className="grid grid-cols-4 gap-3 mb-6">
        {kpis.slice(4).map((kpi, i) => (
          <StatCard key={i + 4} label={kpi.label} value={kpi.display} trend={kpi.trend} icon={kpi.icon} accent="neutral" />
        ))}
      </div>

      <div className="card mb-6">
        <div className="card-header">
          <div>
            <div className="card-title">Supervisory Risk Landscape</div>
            <div className="card-subtitle">Risk distribution across all assessed CSEs</div>
          </div>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="label mb-2">Risk Distribution</div>
              <StackedBar data={[
                { level: 'Critical', count: 3, color: '#dc2626' },
                { level: 'High', count: 5, color: '#f97316' },
                { level: 'Moderate', count: 8, color: '#f59e0b' },
                { level: 'Low', count: 11, color: '#3b82f6' },
                { level: 'Normal', count: 15, color: '#10b981' }
              ]} />
              <div className="mt-5">
                <div className="label mb-2">Top Supervisory Concerns</div>
                <div className="flex flex-col gap-2">
                  {[
                    { title: 'Critical alerts closed without escalation', severity: 'Critical' as const, affectedEntities: 7, confidence: 92, evidenceCount: 214 },
                    { title: 'Unusually rapid case closure', severity: 'High' as const, affectedEntities: 6, confidence: 89, evidenceCount: 187 },
                    { title: 'Missing telemetry from critical systems', severity: 'High' as const, affectedEntities: 5, confidence: 86, evidenceCount: 92 },
                    { title: 'Repetitive investigation patterns', severity: 'Medium' as const, affectedEntities: 4, confidence: 78, evidenceCount: 143 },
                    { title: 'Significant peer deviation', severity: 'Medium' as const, affectedEntities: 6, confidence: 81, evidenceCount: 76 }
                  ].map((c, i) => (
                    <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                      <SeverityBadge severity={c.severity} />
                      <span className="text-[12.5px] text-slate-700 flex-1">{c.title}</span>
                      <span className="text-[11px] text-slate-500 whitespace-nowrap">{c.affectedEntities} ent.</span>
                      <span className="font-mono text-[11px] text-slate-400 whitespace-nowrap">{c.confidence}%</span>
                      <span className="text-[11px] text-slate-500 whitespace-nowrap">{c.evidenceCount} items</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <div className="label mb-2">Concentration of Concern</div>
              <Donut data={[
                { label: 'Critical (3)', value: 3, color: '#dc2626' },
                { label: 'High (5)', value: 5, color: '#f97316' },
                { label: 'Moderate (8)', value: 8, color: '#f59e0b' },
                { label: 'Low (11)', value: 11, color: '#3b82f6' },
                { label: 'Normal (15)', value: 15, color: '#10b981' }
              ]} centerValue="42" centerLabel="CSEs" />
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Entities Requiring Supervisory Attention</div>
            <div className="card-subtitle">Sorted by supervisory risk score</div>
          </div>
          <div className="flex gap-1.5">
            <button className="btn btn-sm">Search</button>
            <button className="btn btn-sm">Filter</button>
            <button className="btn btn-sm">Export CSV</button>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Entity</th>
                <th>Sector</th>
                <th>Risk Score</th>
                <th>Execution Gaps</th>
                <th>Negative Space</th>
                <th>Peer Deviation</th>
                <th>Priority</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="cursor-pointer">
                <td className="mono-id">CSE-014</td>
                <td className="text-slate-600">Power</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="risk-bar-track w-16">
                      <div className="risk-bar-fill bg-red-500" style={{ width: '87%' }} />
                    </div>
                    <span className="font-mono text-[12px] font-semibold text-slate-700">87</span>
                  </div>
                </td>
                <td className="font-mono text-[12px] text-slate-600">6</td>
                <td className="font-mono text-[12px] text-slate-600">4</td>
                <td><span className="inline-flex px-1.5 py-0.5 rounded text-[10.5px] font-semibold bg-red-50 text-red-600">High</span></td>
                <td><span className="badge bg-red-50 text-red-600 border-red-200">Review Required</span></td>
              </tr>
              <tr className="cursor-pointer">
                <td className="mono-id">CSE-027</td>
                <td className="text-slate-600">Banking</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="risk-bar-track w-16">
                      <div className="risk-bar-fill bg-orange-500" style={{ width: '79%' }} />
                    </div>
                    <span className="font-mono text-[12px] font-semibold text-slate-700">79</span>
                  </div>
                </td>
                <td className="font-mono text-[12px] text-slate-600">4</td>
                <td className="font-mono text-[12px] text-slate-600">2</td>
                <td><span className="inline-flex px-1.5 py-0.5 rounded text-[10.5px] font-semibold bg-amber-50 text-amber-600">Medium</span></td>
                <td><span className="badge bg-orange-50 text-orange-600 border-orange-200">High</span></td>
              </tr>
              <tr className="cursor-pointer">
                <td className="mono-id">CSE-001</td>
                <td className="text-slate-600">Power</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="risk-bar-track w-16">
                      <div className="risk-bar-fill bg-emerald-500" style={{ width: '58%' }} />
                    </div>
                    <span className="font-mono text-[12px] font-semibold text-slate-700">58</span>
                  </div>
                </td>
                <td className="font-mono text-[12px] text-slate-600">2</td>
                <td className="font-mono text-[12px] text-slate-600">1</td>
                <td><span className="inline-flex px-1.5 py-0.5 rounded text-[10.5px] font-semibold bg-emerald-50 text-emerald-600">Low</span></td>
                <td><span className="badge bg-emerald-50 text-emerald-600 border-emerald-200">Compliant</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}