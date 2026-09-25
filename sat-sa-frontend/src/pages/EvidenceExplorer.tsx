import { useEffect, useState } from 'react';
import { fetchEvidenceTimeline } from '../../api/client';
import { ChevronRight, Clock, ShieldAlert, FileText } from 'lucide-react';
import FindingExplanation from '../components/FindingExplanation';

const defaultTimeline = [
  { event: 'Alert generated — firewall anomaly', actor: 'SIEM', role: 'Detection System', time: '14:23:17', meta: ['BRAC: alerts-tmal'], severity: 'Critical', entity: 'CSE-014' },
  { event: 'SOC analyst assigned', actor: 'SOC-L2-004', role: 'Analyst', time: '14:24:53', meta: [], severity: 'Low', entity: 'CSE-014' },
  { event: 'Preliminary investigation opened', actor: 'SOC-L2-004', role: 'Analyst', time: '14:26:09', meta: [], severity: 'Low', entity: 'CSE-014' },
  { event: 'Alert closed as false positive', actor: 'SOC-L2-004', role: 'Analyst', time: '14:31:02', meta: ['closure-time: 4.9 min'], severity: 'High', entity: 'CSE-014' },
  { event: 'Peer baseline check', actor: 'Tool', role: 'Automated', time: '14:31:02', meta: ['peer-median: 42 min'], severity: 'Critical', entity: 'CSE-014' },
  { event: 'No escalation record found', actor: '—', role: '—', time: '—', meta: ['missed-step: escalation'], severity: 'High', entity: 'CSE-014' },
  { event: 'Audit log entry', actor: 'System', role: 'Audit', time: '14:31:03', meta: ['Immutable record'], severity: 'Low', entity: 'CSE-014' }
];

const breadcrumb = ['Finding', 'Entity', 'Case', 'Alert', 'Evidence'];
const flags = [
  { label: 'Detection Signal', value: 'Critical alert' },
  { label: 'Behavioural Signal', value: 'Closure occurred significantly faster than peer baseline' },
  { label: 'Missing Evidence', value: 'No escalation record found' },
  { label: 'Supporting Evidence', value: '7 similar cases' }
];

export default function EvidenceExplorer() {
  const [timeline, setTimeline] = useState<any[]>([]);

  useEffect(() => {
    fetchEvidenceTimeline('CASE-00001').then(r => setTimeline(r.timeline || defaultTimeline)).catch(() => setTimeline(defaultTimeline));
  }, []);

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="mb-1">
        <h1 className="page-title">Evidence Explorer</h1>
        <p className="page-subtitle">Navigate from finding to original evidence record</p>
      </div>

      <div className="flex items-center gap-1.5 mt-4 mb-5">
        {breadcrumb.map((b, i) => (
          <React.Fragment key={i}>
            <button className={`text-[12px] font-medium px-2 py-0.5 rounded ${i === breadcrumb.length - 1 ? 'bg-navy-900 text-white' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}>{b}</button>
            {i < breadcrumb.length - 1 && <ChevronRight className="w-3 h-3 text-slate-300" />}
          </React.Fragment>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <div className="card p-4 mb-4">
            <div className="label mb-3">Alert Lifecycle Timeline</div>
            <div className="flex flex-col gap-0">
              {timeline.map((evt, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="flex flex-col items-center pt-0.5">
                    <div className={`w-3 h-3 rounded-full border-2 shrink-0 ${i === 0 ? 'bg-blue-600 border-blue-600' : evt.actor === '—' ? 'bg-slate-200 border-slate-300' : 'bg-white border-slate-300'}`} />
                    {i < timeline.length - 1 && <div className="w-px h-full min-h-[44px] bg-slate-200" />}
                  </div>
                  <div className="pb-3 min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="text-[13px] font-semibold text-slate-800">{evt.event}</div>
                      <span className="mono text-[10.5px] text-slate-400">{evt.time} {evt.time !== '—' ? 'IST' : ''}</span>
                    </div>
                    <div className="text-[11px] text-slate-500">{evt.actor} · {evt.role}</div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {evt.meta.map((m, j) => (
                        <span key={j} className="text-[10.5px] text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">{m}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="label mb-3">Why was this flagged?</div>
            <div className="grid grid-cols-2 gap-3">
              {flags.map((f, i) => (
                <div key={i} className="bg-slate-50 rounded-md px-3 py-2">
                  <div className="label mb-0.5">{f.label}</div>
                  <div className="text-[12.5px] text-slate-700 font-medium">{f.value}</div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-6 mt-3 px-1">
              <div className="text-[11px] text-slate-500">
                Confidence: <span className="font-mono font-semibold text-slate-700">94%</span>
              </div>
              <div className="text-[11px] text-slate-500">
                Recommended: <span className="font-medium text-slate-700">Manual examination recommended</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <FindingExplanation
            finding="Potential Execution Gap"
            severity="High"
            confidence={92}
            whyMatters="This finding suggests that the SOC's documented incident response capability may not be fully executed in practice. The pattern of rapid closure without escalation across multiple high-severity alerts warrants supervisory examination."
            evidence={{ cases: 14, criticalAlerts: 3, escalationRecords: 0 }}
            peerComparison="2.8x below peer median"
            detectionLogic="The analytical model identifies cases where the time between alert creation and closure falls below the 5th percentile of peer response times for alerts of comparable severity, cross-referenced against the absence of an escalation record in the case timeline."
            limitations="Short closure times could reflect efficient triage by experienced analysts. Escalation may occur through channels outside the documented system. This finding indicates a pattern warranting review, not a confirmed gap."
            compact
          />
        </div>
      </div>
    </div>
  );
}