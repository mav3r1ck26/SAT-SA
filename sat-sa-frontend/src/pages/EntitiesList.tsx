import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Download } from 'lucide-react';
import { fetchEntities } from '../api/client';
import type { Entity } from '../api/types';
import { RiskScoreBar } from '../components/ui';
import { cn } from '../lib/utils';
import { downloadCSV } from '../utils/export';

export default function EntitiesList() {
  const navigate = useNavigate();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [search, setSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState('');
  const [criticalityFilter, setCriticalityFilter] = useState('');
  const [sortKey, setSortKey] = useState<keyof Entity>('riskScore');
  const [sortAsc, setSortAsc] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const data = await fetchEntities();
      setEntities(data);
    } catch (e) {
      console.error(e);
      setEntities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = entities
    .filter(e => !search || 
      e.id.toLowerCase().includes(search.toLowerCase()) || 
      e.name.toLowerCase().includes(search.toLowerCase()) || 
      e.sector.toLowerCase().includes(search.toLowerCase()))
    .filter(e => !sectorFilter || e.sector === sectorFilter)
    .filter(e => !criticalityFilter || e.criticality === criticalityFilter)
    .sort((a, b) => {
      const dir = sortAsc ? 1 : -1;
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === 'string') return aVal.localeCompare(String(bVal ?? '')) * dir;
      return (Number(aVal || 0) - Number(bVal || 0)) * dir;
    });

  const toggleSort = (key: keyof Entity) => {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(false); }
  };

  const sectors = [...new Set(entities.map(e => e.sector))].sort();
  const criticalities = ['Critical', 'High', 'Medium', 'Low'];
  const sortableColumns: Array<{ key: keyof Entity; label: string }> = [
    { key: 'id', label: 'Entity' },
    { key: 'name', label: 'Name' },
    { key: 'sector', label: 'Sector' },
    { key: 'criticality', label: 'Criticality' },
    { key: 'riskScore', label: 'Risk Score' },
    { key: 'executionGaps', label: 'Gaps' },
    { key: 'negativeSpace', label: 'Neg. Space' },
    { key: 'priority', label: 'Priority' },
    { key: 'status', label: 'Status' },
  ];

  const exportEntities = () => downloadCSV('sat-sa-entities.csv', [
    'Entity ID', 'Name', 'Sector', 'Criticality', 'Risk Score', 'Execution Gaps', 'Negative Space', 'Priority', 'Status',
  ], filtered.map(e => [
    e.id, e.name, e.sector, e.criticality, e.riskScore, e.executionGaps, e.negativeSpace, e.priority, e.status,
  ]));

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h1 className="page-title">Entities</h1>
          <p className="page-subtitle">All assessed Critical Sector Entities</p>
        </div>
        <button className="btn btn-sm" onClick={exportEntities}><Download className="w-3.5 h-3.5" /> Export CSV</button>
      </div>

      <div className="flex items-center gap-3 mb-4 mt-3">
        <div className="relative max-w-[280px] flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input 
            className="input pl-8 w-full" 
            placeholder="Search entity, name, sector..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
        <select className="select" value={sectorFilter} onChange={e => setSectorFilter(e.target.value)}>
          <option value="">All Sectors</option>
          {sectors.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="select" value={criticalityFilter} onChange={e => setCriticalityFilter(e.target.value)}>
          <option value="">All Criticality</option>
          {criticalities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-slate-400">Loading entities...</div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  {sortableColumns.map(col => (
                    <th 
                      key={col.key} 
                      className="cursor-pointer select-none"
                      onClick={() => toggleSort(col.key)}
                    >
                      <span className="flex items-center gap-1">
                        {col.label}
                        <span className="text-slate-300">
                          {sortKey === col.key ? (sortAsc ? '↑' : '↓') : '↕'}
                        </span>
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.id} className="cursor-pointer" onClick={() => navigate(`/entity/${encodeURIComponent(e.id)}`)}>
                    <td className="mono-id">{e.id}</td>
                    <td className="text-[12px] text-slate-700 font-medium">{e.name}</td>
                    <td className="text-[12px] text-slate-600">{e.sector}</td>
                    <td><span className={cn('badge border', e.criticality === 'Critical' ? 'bg-red-50 text-red-700 border-red-200' : e.criticality === 'High' ? 'bg-orange-50 text-orange-700 border-orange-200' : e.criticality === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200')}>{e.criticality}</span></td>
                    <td>
                      <RiskScoreBar score={e.riskScore ?? 50} showLabel />
                    </td>
                    <td className="font-mono text-[12px] text-slate-600 text-center">{e.executionGaps}</td>
                    <td className="font-mono text-[12px] text-slate-600 text-center">{e.negativeSpace}</td>
                    <td><span className={cn('badge border', e.priority === 'Critical' ? 'bg-red-50 text-red-700 border-red-200' : e.priority === 'High' ? 'bg-orange-50 text-orange-700 border-orange-200' : e.priority === 'Moderate' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200')}>{e.priority}</span></td>
                    <td><span className={cn('badge border', e.status === 'Review Required' ? 'bg-amber-50 text-amber-700 border-amber-200' : e.status === 'Compliant' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200')}>{e.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
