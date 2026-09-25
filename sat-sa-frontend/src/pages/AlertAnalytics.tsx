import { useEffect, useState } from 'react';
import { MultiBar, BarChart, Donut, AreaChart } from '../../components/charts';
import { fetchAlertAnalytics } from '../../api/client';
import StatCard from '../components/StatCard';

export default function AlertAnalytics() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchAlertAnalytics().then(setData).catch(() => {});
  }, []);

  const totalAlerts = data?.kpis?.totalAlerts ?? 184620;
  const ackTime = data?.kpis?.meanAckTime ?? '4.2 min';
  const closureTime = data?.kpis?.meanClosure ?? '58.3 min';
  const conversion = data?.kpis?.alertToCase ?? '11.2%';
  const criticalClosures = data?.kpis?.criticalClosures ?? 214;
  const volumeByMonth = data?.volumeByMonth ?? [];
  const severityDistribution = data?.severityDistribution ?? [];
  const disposition = data?.disposition ?? [];
  const lifecycle = data?.lifecycle ?? [];
  const conversionData = data?.conversion ?? [];
  const repeatAlerts = data?.repeatAlerts ?? [];
  const criticalClosure = data?.criticalClosure ?? [];

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="mb-1">
        <h1 className="page-title">Alert Analytics</h1>
        <p className="page-subtitle">Comprehensive analysis of alert patterns, lifecycle, and disposition</p>
      </div>

      <div className="grid grid-cols-5 gap-3 mt-4 mb-6">
        <StatCard label="Total Alerts" value={typeof totalAlerts === 'number' ? totalAlerts.toLocaleString() : totalAlerts} trend={14} icon="alerts" accent="neutral" />
        <StatCard label="Mean Ack Time" value={ackTime} trend={-8} icon="gap" accent="info" />
        <StatCard label="Mean Closure" value={closureTime} trend={6} icon="cases" accent="neutral" />
        <StatCard label="Alert-to-Case" value={conversion} trend={-3} icon="samples" accent="neutral" />
        <StatCard label="Critical Closures" value={String(criticalClosures)} trend={22} icon="alert" accent="danger" />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="card col-span-2 p-4">
          <div className="label mb-3">Alert Volume Over Time</div>
          <MultiBar
            data={volumeByMonth.map(d => ({ label: d.month || d.label, critical: d.critical, high: d.high, medium: d.medium, low: d.low }))}
            series={[
              { key: 'critical', label: 'Critical', color: '#dc2626' },
              { key: 'high', label: 'High', color: '#f97316' },
              { key: 'medium', label: 'Medium', color: '#f59e0b' },
              { key: 'low', label: 'Low', color: '#94a3b8' }
            ]}
            height={150}
          />
        </div>
        <div className="card p-4">
          <div className="label mb-3">Severity Distribution</div>
          <div className="flex justify-center mt-4">
            <div style={{width: 130, height: 130}}>
              <svg viewBox="0 0 130 130">
                <defs>
                  <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#dc2626" />
                    <stop offset="50%" stopColor="#f97316" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                </defs>
                <circle cx="65" cy="65" r="50" fill="none" stroke="url(#grad1)" strokeWidth="14" strokeDasharray="314" strokeDashoffset="314" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}