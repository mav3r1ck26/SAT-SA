import { useEffect, useState } from 'react';
import { fetchReports, generateReport } from '../api/client';
import { FileText, Clock, CheckCircle2, Loader2, FileDown } from 'lucide-react';

export default function Reports() {
  const [reports, setReports] = useState<any[]>([]);
  const [generating, setGenerating] = useState<string | null>(null);

  useEffect(() => {
    fetchReports().then(setReports).catch(() => setReports([]));
  }, []);

  const handleGenerate = async (id: string) => {
    setGenerating(id);
    try {
      await generateReport(id);
      const updated = await fetchReports();
      setReports(updated);
    } catch { }
    setGenerating(null);
  };

  const defaultReports = [
    { id: 'RPT-001', name: 'Entity Assessment Report', description: 'Comprehensive risk assessment for a single entity', status: 'Available', generatedDate: '2026-08-31', format: ['PDF', 'CSV'] },
    { id: 'RPT-002', name: 'Cross-Entity Comparison', description: 'Comparative analysis across all CSEs', status: 'Available', generatedDate: '2026-08-31', format: ['PDF', 'CSV'] },
    { id: 'RPT-003', name: 'Execution Gap Summary', description: 'All detected execution gaps with confidence scores', status: 'Available', generatedDate: '2026-08-30', format: ['PDF'] },
    { id: 'RPT-004', name: 'Negative Space Analysis', description: 'Blind spot and missing evidence analysis', status: 'Ready', generatedDate: 'Not generated', format: ['PDF'] },
    { id: 'RPT-005', name: 'Peer Benchmarking Report', description: 'Sector-wide comparative metrics', status: 'Available', generatedDate: '2026-08-29', format: ['PDF', 'CSV'] },
    { id: 'RPT-006', name: 'Manual Review Summary', description: 'Findings requiring examiner attention', status: 'Ready', generatedDate: 'Not generated', format: ['PDF'] }
  ];

  const displayReports = reports.length > 0 ? reports : defaultReports;

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="mb-1">
        <h1 className="page-title">Supervisory Reports</h1>
        <p className="page-subtitle">Generate and export supervisory assessment reports</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-5">
        {displayReports.map(r => (
          <div key={r.id} className="card p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-navy-900 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-semibold text-navy-950">{r.name}</div>
                <p className="text-[12px] text-slate-500 mt-0.5">{r.description}</p>
                <div className="flex items-center gap-3 mt-2.5">
                  <span className={`badge border text-[10.5px] ${r.status === 'Available' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : r.status === 'Generating' ? 'bg-blue-50 text-blue-700 border-blue-200' : r.status === 'Ready' ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {r.status === 'Available' && <CheckCircle2 className="w-3 h-3 mr-0.5" />}
                    {r.status === 'Generating' && <Loader2 className="w-3 h-3 mr-0.5 animate-spin" />}
                    {r.status}
                  </span>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {r.generatedDate}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
              <button className="btn btn-primary btn-sm" disabled={generating === r.id} onClick={() => handleGenerate(r.id)}>
                {generating === r.id ? 'Generating...' : 'Generate Report'}
              </button>
              {r.format.map((f: string) => (
                <button key={f} className="btn btn-sm" disabled={r.status !== 'Available'}>
                  <FileDown className="w-3 h-3" />
                  Export {f}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
