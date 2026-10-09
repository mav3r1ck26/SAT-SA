import { useEffect, useState } from 'react';
import { fetchAnomalies } from '../api/client';
import StatCard from '../components/StatCard';
import { cn } from '../lib/utils';

export default function Anomalies() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchAnomalies().then(setData).catch(() => {});
  }, []);

  const anomalies: any[] = Array.isArray(data) ? data : data?.anomalies ?? [];
  const volumeSpikes = anomalies.filter((a: any) => a.type === 'VOLUME_SPIKE').length;
  const durationAnomalies = anomalies.filter((a: any) => a.type === 'DURATION_ANOMALY').length;
  const lowEvidenceAnomalies = anomalies.filter((a: any) => a.type === 'LOW_EVIDENCE').length;

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="mb-1">
        <h1 className="page-title">Anomaly Detection</h1>
        <p className="page-subtitle">Statistical anomalies in SOC operational patterns</p>
      </div>

      <div className="grid grid-cols-4 gap-3 mt-4 mb-6">
        <StatCard label="Total Anomalies" value={anomalies.length.toString()} trend={0} icon="alert" accent="neutral" />
        <StatCard label="Volume Spikes" value={volumeSpikes.toString()} trend={0} icon="alert" accent="warning" />
        <StatCard label="Duration Anomalies" value={durationAnomalies.toString()} trend={0} icon="alert" accent="info" />
        <StatCard label="Low Evidence" value={lowEvidenceAnomalies.toString()} trend={0} icon="alert" accent="danger" />
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Detected Anomalies</div>
          <span className="badge border bg-slate-100 border-slate-200">{anomalies.length} items</span>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Type</th><th>Entity</th><th>Case</th><th>Severity</th><th>Confidence</th><th>Description</th><th>Anomaly Score</th></tr>
            </thead>
            <tbody>
              {anomalies.map((a: any, i: number) => (
                <tr key={i}>
                  <td><span className={cn('badge border text-[10.5px]', a.type === 'VOLUME_SPIKE' ? 'bg-blue-50 text-blue-700 border-blue-200' : a.type === 'DURATION_ANOMALY' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-amber-50 text-amber-700 border-amber-200')}>{a.type}</span></td>
                  <td className="mono-id">{a.entityId}</td>
                  <td className="mono-id">{a.caseId}</td>
                  <td><span className={cn('badge border text-[10.5px]', a.severity === 'Critical' ? 'bg-red-50 text-red-700 border-red-200' : a.severity === 'High' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-amber-50 text-amber-700 border-amber-200')}>{a.severity}</span></td>
                  <td className="font-mono text-[12px] font-semibold text-slate-700">{a.confidence}%</td>
                  <td className="text-[12px] text-slate-600 max-w-[300px] truncate">{a.description}</td>
                  <td className="font-mono text-[12px] font-semibold text-slate-700">{a.anomalyScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
