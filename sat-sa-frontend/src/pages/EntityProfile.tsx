import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { cn } from '../lib/utils';
import { fetchEntity, fetchFindings, fetchEvidenceTimeline } from '../api/client';
import type { Entity } from '../api/types';
import { Confidence } from '../components/ui';

const tabs = ['Overview', 'Detection', 'Investigation', 'Escalation', 'Incident Response', 'Operations', 'Governance', 'Resilience', 'Evidence'];

export default function EntityProfile() {
  const { id } = useParams<{ id: string }>();
  const [entity, setEntity] = useState<Entity | null>(null);
  const [findings, setFindings] = useState<any[]>([]);
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('Overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      fetchEntity(id),
      fetchFindings({ entityId: id }),
      fetchEvidenceTimeline(id)
    ]).then(([entityData, findingsData, timelineData]) => {
      setEntity(entityData);
      setFindings(findingsData || []);
      setTimelineData(timelineData?.timeline || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="p-6 max-w-[1600px] mx-auto">
        <div className="text-center py-12 text-slate-400 text-[12px]">Loading entity profile...</div>
      </div>
    );
  }

  if (!entity) {
    return (
      <div className="p-6 max-w-[1600px] mx-auto">
        <div className="text-center py-12 text-slate-400 text-[12px]">Entity not found</div>
      </div>
    );
  }

  const entityFindings = findings.filter(f => f.entityId === entity.id);

  const timeline = timelineData.length > 0 ? timelineData : [
    { event: 'Alert generated — firewall anomaly', actor: 'SIEM', role: 'Detection System', time: '14:23:17', meta: ['BRAC: alerts-tmal'], severity: 'Critical', entity: entity.id },
    { event: 'SOC analyst assigned', actor: 'SOC-L2-004', role: 'Analyst', time: '14:24:53', meta: [], severity: 'Low', entity: entity.id },
    { event: 'Preliminary investigation opened', actor: 'SOC-L2-004', role: 'Analyst', time: '14:26:09', meta: [], severity: 'Low', entity: entity.id },
    { event: 'Alert closed as false positive', actor: 'SOC-L2-004', role: 'Analyst', time: '14:31:02', meta: ['closure-time: 4.9 min'], severity: 'High', entity: entity.id },
    { event: 'Peer baseline check', actor: 'Tool', role: 'Automated', time: '14:31:02', meta: ['peer-median: 42 min'], severity: 'Critical', entity: entity.id },
    { event: 'No escalation record found', actor: '—', role: '—', time: '—', meta: ['missed-step: escalation'], severity: 'High', entity: entity.id },
    { event: 'Audit log entry', actor: 'System', role: 'Audit', time: '14:31:03', meta: ['Immutable record'], severity: 'Low', entity: entity.id }
  ];

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <button onClick={() => window.history.back()} className="flex items-center gap-1.5 text-[12px] font-medium text-slate-500 hover:text-slate-800 mb-4 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Back to Entities
      </button>

      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-navy-950 tracking-tight">
            {entity.id} <span className="font-normal text-slate-400 mx-1.5">—</span>
            <span className="font-normal">{entity.name}</span>
          </h1>
          <div className="flex items-center gap-4 mt-2 text-[12px] text-slate-500">
            <span>Sector: <strong className="text-slate-700">{entity.sector}</strong></span>
            <span>Period: <strong className="text-slate-700">Q2 FY 2026–27</strong></span>
            <span>Status: <strong className="text-slate-700">{entity.status}</strong></span>
            <span>Last Submission: <strong className="text-slate-700">{entity.lastSubmission}</strong></span>
          </div>
        </div>
        <div className="text-right">
          <div className="label mb-0.5">Data Completeness</div>
          <div className="font-mono text-[14px] font-semibold text-slate-700">{entity.dataCompleteness}%</div>
        </div>
      </div>

      <div className="flex gap-1 border-b border-slate-200 mb-6 overflow-x-auto">
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`tab ${activeTab === t ? 'tab-active' : ''} whitespace-nowrap`}>
            {t}
          </button>
        ))}
      </div>

      {activeTab === 'Overview' && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card col-span-1 p-5">
            <div className="label mb-3">Entity Risk Score</div>
            <div className="flex justify-center">
              <svg width="120" height="120">
                <circle cx="60" cy="60" r="50" stroke="url(#grad)" strokeWidth="8" fill="none" strokeLinecap="round"
                  strokeDasharray="314" strokeDashoffset={`${314 - (314 * entity.riskScore) / 100}`} />
                <defs>
                  <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#dc2626" />
                    <stop offset="50%" stopColor="#f97316" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="text-center mt-2">
              <span className="text-3xl font-bold text-navy-950">{entity.riskScore}</span>
            </div>
            <div className="mt-5">
              <div className="label mb-2">Risk Score Breakdown</div>
              <div className="space-y-2">
                {[
                  { label: 'Detection', value: entity.detection },
                  { label: 'Investigation', value: entity.investigation },
                  { label: 'Escalation', value: entity.escalation },
                  { label: 'Operations', value: entity.operations },
                  { label: 'Governance', value: entity.governance },
                  { label: 'Resilience', value: entity.resilience }
                ].map((d, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-[12.5px] text-slate-700">{d.label}</span>
                    <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${d.value}%` }} />
                    </div>
                    <span className="font-mono text-[11px] font-semibold text-slate-700 w-8 text-right">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="col-span-2 flex flex-col gap-4">
            <div className="card p-5">
              <div className="label mb-3">Composite Profile</div>
              <div className="flex justify-center">
                <svg width="200" height="200">
                  <defs>
                    <radialGradient id="grid" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#e2e8f0" />
                      <stop offset="100%" stopColor="#e2e8f0" />
                    </radialGradient>
                  </defs>
                  <polygon points="100,10 195,65 195,135 100,190 5,135 5,65" fill="url(#grid)" stroke="#cbd5e1" strokeWidth="1" />
                  <polygon points="100,10 155,65 155,135 100,190 45,135 45,65" fill="rgba(59,130,246,0.2)" stroke="#3b82f6" strokeWidth="2" />
                  <circle cx="100" cy="100" r="85" fill="none" stroke="#cbd5e1" strokeWidth="1" />
                  <circle cx="100" cy="100" r="55" fill="none" stroke="#cbd5e1" strokeWidth="1" />
                  <circle cx="100" cy="100" r="25" fill="none" stroke="#cbd5e1" strokeWidth="1" />
                  <text x="100" y="15" textAnchor="middle" fontSize="8" fill="#64748b">Detection</text>
                  <text x="165" y="45" textAnchor="middle" fontSize="8" fill="#64748b">Investigation</text>
                  <text x="190" y="100" textAnchor="middle" fontSize="8" fill="#64748b">Escalation</text>
                  <text x="165" y="155" textAnchor="middle" fontSize="8" fill="#64748b">Operations</text>
                  <text x="35" y="155" textAnchor="middle" fontSize="8" fill="#64748b">Governance</text>
                  <text x="10" y="100" textAnchor="middle" fontSize="8" fill="#64748b">Resilience</text>
                </svg>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-title">Key Findings for {entity.id}</div>
                <span className="badge border bg-slate-100 border-slate-200">{entityFindings.length} findings</span>
              </div>
              <div className="divide-y divide-slate-100">
                {entityFindings.map((f, i) => (
                  <div key={i} className="px-4 py-3 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-3 mb-1">
                      <span className={cn('badge border', f.severity === 'Critical' ? 'bg-red-50 text-red-700 border-red-200' : f.severity === 'High' ? 'bg-orange-50 text-orange-700 border-orange-200' : f.severity === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' : f.severity === 'Low' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200')}>{f.severity}</span>
                      <span className="text-[12.5px] font-medium text-slate-800">{f.title}</span>
                      <span className="mono-id ml-1">{f.id}</span>
                    </div>
                    <p className="text-[11.5px] text-slate-500 ml-0.5">{f.description}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <Confidence value={f.confidence} compact />
                      <span className="text-[11px] text-slate-400">{f.evidenceCount} evidence items</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-4">
              <div className="label mb-2">Evidence Timeline</div>
              <div className="flex flex-col gap-0">
                {timeline.map((evt, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="flex flex-col items-center pt-0.5">
                      <div className={cn('w-3 h-3 rounded-full border-2 shrink-0', i === 0 ? 'bg-blue-600 border-blue-600' : evt.actor === '—' ? 'bg-slate-200 border-slate-300' : 'bg-white border-slate-300')} />
                      {i < timeline.length - 1 && <div className="w-px h-full min-h-[36px] bg-slate-200" />}
                    </div>
                    <div className="pb-3 min-w-0">
                      <div className="text-[12.5px] font-semibold text-slate-800">{evt.event}</div>
                      <div className="text-[11px] text-slate-500">
                        {evt.actor} · {evt.role}
                        <span className="mono text-[10px] ml-2 text-slate-400">{evt.time} {evt.time !== '—' ? 'IST' : ''}</span>
                      </div>
                      <div className="flex gap-2 mt-0.5">
                      {evt.meta.map((m: string, j: number) => (
                          <span key={j} className="text-[10.5px] text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded">{m}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab !== 'Overview' && (
        <div className="card p-8">
          <div className="text-center">
            <div className="text-[13px] font-semibold text-slate-700 mb-1">{activeTab} Analytics</div>
            <p className="text-[12px] text-slate-500">Detailed {activeTab.toLowerCase()} data for {entity.id} will be displayed here.</p>
          </div>
        </div>
      )}
    </div>
  );
}
