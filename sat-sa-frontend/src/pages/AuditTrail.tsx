import { useState, useEffect } from 'react';
import { fetchAuditLog, exportAuditLog } from '../../api/client';
import { History, Download } from 'lucide-react';

export default function AuditTrail() {
  const [search, setSearch] = useState('');
  const [records, setRecords] = useState<any[]>([]);
  const [userFilter, setUserFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => {
    const params: Record<string, string> = {};
    if (userFilter) params.user = userFilter;
    if (actionFilter) params.action = actionFilter;
    if (search) params.search = search;
    fetchAuditLog(Object.keys(params).length ? params : undefined).then(setRecords).catch(() => setRecords([]));
  }, [userFilter, actionFilter]);

  const filtered = records.filter(r =>
    !search || (r.user || '').includes(search) || (r.action || '').includes(search) || (r.entityId || '').includes(search) || (r.finding || '').includes(search)
  );

  const handleExport = async () => {
    try {
      const data = await exportAuditLog();
      const csv = ['Timestamp,User,Action,Finding,Entity,Status'];
      data.forEach((r: any) => csv.push(`${r.timestamp},${r.user},${r.action},${r.finding || ''},${r.entityId || ''},${r.status || ''}`));
      const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-trail-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h1 className="page-title">Audit Trail</h1>
          <p className="page-subtitle">Immutable record of all supervisory actions</p>
        </div>
        <button className="btn btn-sm" onClick={handleExport}><History className="w-3.5 h-3.5" /> Export</button>
      </div>

      <div className="flex items-center gap-3 mt-4 mb-4">
        <input className="input max-w-[280px]" placeholder="Filter by user, action, entity..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="select" value={userFilter} onChange={e => setUserFilter(e.target.value)}>
          <option value="">All Users</option>
          <option value="Examiner-07">Examiner-07</option>
          <option value="Examiner-03">Examiner-03</option>
          <option value="Supervisor-02">Supervisor-02</option>
          <option value="Auto-Ingest">Auto-Ingest</option>
        </select>
        <select className="select" value={actionFilter} onChange={e => setActionFilter(e.target.value)}>
          <option value="">All Actions</option>
          <option value="Finding Reviewed">Finding Reviewed</option>
          <option value="Recommendation Assigned">Recommendation Assigned</option>
          <option value="Data Ingested">Data Ingested</option>
        </select>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Timestamp</th><th>User</th><th>Action</th><th>Finding</th><th>Entity</th><th>Status</th></tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={i}>
                  <td className="mono-id">{typeof r.timestamp === 'string' ? r.timestamp.slice(0, 19).replace('T', ' ') : r.timestamp}</td>
                  <td className="text-[12px] font-medium text-slate-700">{r.user}</td>
                  <td className="text-[12px] text-slate-600">{r.action}</td>
                  <td className="mono-id">{r.finding}</td>
                  <td className="mono-id">{r.entityId}</td>
                  <td>
                    <span className={`badge border text-[10.5px] ${r.status === 'Confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : r.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border-blue-200' : r.status === 'Complete' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : r.status === 'Warning' ? 'bg-amber-50 text-amber-700 border-amber-200' : r.status === 'Dismissed' ? 'bg-slate-100 text-slate-500 border-slate-200 line-through' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>{r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}