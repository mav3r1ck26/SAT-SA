import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { fetchBenchmark, fetchEntities } from '../../api/client';

export default function PeerBenchmarking() {
  const { setSelectedEntity, setCurrentPage } = useApp();
  const [compEntity, setCompEntity] = useState('CSE-014');
  const [entitiesList, setEntities] = useState<any[]>([]);
  const [benchmarkData, setBenchmarkData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEntities().then(setEntities).catch(() => setEntities([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchBenchmark(compEntity).then(d => { setBenchmarkData(Array.isArray(d) ? d : []); setLoading(false) }).catch(() => { setBenchmarkData([]); setLoading(false) });
  }, [compEntity]);

  const entity = entitiesList.find(e => e.id === compEntity);
  const compSector = entity?.sector || 'Power';

  const getBarColor = (percentile: number) => {
    if (percentile >= 85) return 'bg-red-500';
    if (percentile >= 70) return 'bg-orange-500';
    if (percentile >= 40) return 'bg-blue-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="mb-1">
        <h1 className="page-title">Peer Benchmarking</h1>
        <p className="page-subtitle">Comparative analysis against sector peers</p>
      </div>

      <div className="flex items-center gap-3 mt-4 mb-5">
        <select className="select" value={compEntity} onChange={e => setCompEntity(e.target.value)}>
          {entitiesList.map(e => <option key={e.id} value={e.id}>{e.id} — {e.name}</option>)}
        </select>
        <span className="text-[12px] text-slate-400">vs</span>
        <span className="text-[12px] font-medium text-slate-700">Sector Median ({compSector})</span>
        <div className="flex-1" />
        <button className="btn btn-sm" onClick={() => { setSelectedEntity(compEntity); setCurrentPage('entity') }}>View Entity Profile</button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Peer Comparison</div>
          <div className="text-[11px] text-slate-500">Percentile ranking against {compSector} sector peers</div>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="text-center py-8 text-[12px] text-slate-400">Loading benchmark data...</div>
          ) : (
            <div className="flex flex-col gap-4">
              {benchmarkData.map((m, i) => (
                <div key={i} className="grid grid-cols-[200px_1fr_80px_80px_70px] items-center gap-4">
                  <div><div className="text-[12.5px] font-medium text-slate-800">{m.metric}</div></div>
                  <div className="relative">
                    <div className="risk-bar-track">
                      <div className={`risk-bar-fill ${getBarColor(m.percentile)}`} style={{ width: `${m.percentile}%` }} />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-slate-400">0th</span>
                      <span className="text-[10px] text-slate-400">100th</span>
                    </div>
                  </div>
                  <div className="text-right"><div className="mono-id">{m.entityDisplay}</div></div>
                  <div className="text-right"><div className="text-[12px] text-slate-500">Med: {m.peerMedianDisplay}</div></div>
                  <div className="text-right">
                    <span className={`font-mono text-[12px] font-bold ${m.percentile <= 20 ? 'text-emerald-600' : m.percentile >= 80 ? 'text-red-600' : 'text-slate-600'}`}>
                      {m.percentile}th
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && benchmarkData.length > 0 && (
            <div className="mt-6 pt-4 border-t border-slate-200">
              <div className="label mb-2">Notable Observations</div>
              <div className="flex flex-col gap-2">
                {benchmarkData.filter(m => m.percentile <= 15 || m.percentile >= 85).map((m, i) => (
                  <div key={i} className="flex items-center gap-3 text-[12px]">
                    <span className={`badge border ${m.percentile >= 85 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                      {m.percentile >= 85 ? 'High' : 'Low'}
                    </span>
                    <span className="text-slate-600"><strong className="text-slate-800">{m.metric}</strong>: {m.entityDisplay} — {m.assessment}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}