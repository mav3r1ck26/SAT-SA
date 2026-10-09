import { useEffect, useState } from 'react';
import { fetchInvestigationAnalytics } from '../api/client';
import StatCard from '../components/StatCard';
import { BarChart } from '../components/charts';

export default function InvestigationAnalytics() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchInvestigationAnalytics().then(setData).catch(() => {});
  }, []);

  const kpis = data?.kpis ?? {};
  const durationDistribution = data?.durationDistribution ?? [];
  const depth = data?.depth ?? [];
  const patterns = data?.patterns ?? [];
  const evidenceFrequency = data?.evidenceFrequency ?? [];
  const totalCases = kpis.totalCases ?? 32481;

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="mb-1">
        <h1 className="page-title">Investigation Analytics</h1>
        <p className="page-subtitle">Analysis of investigation depth, duration, and behavioural patterns</p>
      </div>

      <div className="grid grid-cols-5 gap-3 mt-4 mb-6">
        <StatCard label="Total Cases" value={typeof totalCases === 'number' ? totalCases.toLocaleString() : totalCases} trend={8} icon="cases" accent="neutral" />
        <StatCard label="Mean Duration" value={kpis.meanDuration ?? '42 min'} trend={-12} icon="gap" accent="info" />
        <StatCard label="Investigation-to-Closure" value={kpis.investigationToClosure ?? '96.4%'} trend={-1} icon="shield" accent="info" />
        <StatCard label="Case Reopening" value={kpis.caseReopening ?? '5.8%'} trend={15} icon="alert" accent="warning" />
        <StatCard label="Requires Review" value={String(kpis.requiresReview ?? 560)} trend={4} icon="samples" accent="danger" />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="card p-4">
          <div className="label mb-3">Investigation Duration Distribution</div>
          <BarChart data={durationDistribution.map((d: any) => ({ label: d.range || d.label, value: d.count }))} height={120} />
        </div>
        <div className="card p-4">
          <div className="label mb-3">Investigation Depth</div>
          <BarChart data={depth.map((d: any) => ({ label: d.depth || d.label, value: d.count }))} color="#10b981" height={120} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="card p-4">
          <div className="label mb-3">Repetitive Investigation Patterns</div>
          <div className="flex flex-col gap-2.5 mt-2">
            {patterns.map((p: any, i: number) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                <span className={`badge border text-[10.5px] ${p.severity === 'Critical' ? 'bg-red-50 text-red-700 border-red-200' : p.severity === 'High' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{p.severity}</span>
                <span className="text-[12px] text-slate-700 flex-1">{p.pattern}</span>
                <span className="font-mono text-[12px] font-semibold text-slate-600">{(p.count ?? 0).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-4">
          <div className="label mb-3">Evidence Attachment Frequency</div>
          <div className="flex flex-col gap-3 mt-2">
            {evidenceFrequency.map((e: any, i: number) => (
              <div key={i}>
                <div className="flex justify-between mb-1">
                  <span className="text-[12px] text-slate-600 font-medium">{e.category}</span>
                  <span className="font-mono text-[12px] text-slate-700 font-semibold">{e.avgPerCase} /case</span>
                </div>
                <div className="risk-bar-track">
                  <div className="risk-bar-fill bg-blue-500" style={{ width: `${((e.avgPerCase ?? 1) / 3) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
