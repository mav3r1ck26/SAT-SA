import React, { useEffect, useState } from 'react'
import { fetchIngestionQuality, uploadDataFile } from '../api/client'
import { Upload, FileText, AlertTriangle, CheckCircle2 } from 'lucide-react'

export default function DataIngestion() {
  const [data, setData] = useState<any>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<any>(null)

  useEffect(() => {
    fetchIngestionQuality().then(setData).catch(() => {})
  }, [])

  const totals = data?.totals ?? { alerts: 0, cases: 0 }
  const batches = data?.batches ?? []
  const qualityPct = totals.alerts > 0 ? Math.min(99.9, (totals.alerts / (totals.alerts + 50)) * 100).toFixed(1) : '0.0'

  const workflow = ['Upload', 'Validate', 'Map', 'Analyze', 'Review']
  const sources = ['CSV', 'JSON', 'Database Export', 'API']

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const result = await uploadDataFile(file, 'Manual Upload')
      setUploadResult(result)
      fetchIngestionQuality().then(setData).catch(() => {})
    } catch (err) {
      setUploadResult({ error: String(err) })
    }
    setUploading(false)
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="mb-1">
        <h1 className="page-title">Data Ingestion</h1>
        <p className="page-subtitle">Upload, validate, and process CSE operational data</p>
      </div>

      <div className="card p-4 mt-5 mb-5">
        <div className="label mb-3">Ingestion Workflow</div>
        <div className="flex items-center gap-2">
          {workflow.map((s, i) => (
            <React.Fragment key={i}>
              <div className={`px-3 py-1.5 rounded-md text-[12px] font-medium ${i === 0 ? 'bg-blue-600 text-white' : i < 3 ? 'bg-slate-100 text-slate-500' : 'bg-slate-50 text-slate-400'}`}>{s}</div>
              {i < workflow.length - 1 && <span className="text-slate-300 text-[12px]">{'\u2192'}</span>}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="card p-4 mb-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="label mb-3">Supported Sources</div>
            <div className="flex gap-2">
              {sources.map((s, i) => <div key={i} className="chip">{s}</div>)}
            </div>
          </div>
          <div>
            <label className="btn btn-primary btn-sm cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              {uploading ? 'Uploading...' : 'Upload File'}
              <input type="file" accept=".csv,.json" className="hidden" onChange={handleUpload} disabled={uploading} />
            </label>
          </div>
        </div>
      </div>

      {uploadResult && !uploadResult.error && (
        <div className="mb-5 flex items-center gap-3 rounded-lg border px-3 py-2.5 bg-emerald-50 border-emerald-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-[12px] text-slate-700">Ingested {uploadResult.inserted} of {uploadResult.total} records successfully.</span>
        </div>
      )}
      {uploadResult?.error && (
        <div className="mb-5 flex items-center gap-3 rounded-lg border px-3 py-2.5 bg-red-50 border-red-200">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span className="text-[12px] text-slate-700">{uploadResult.error}</span>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div className="card-title">Data Quality Summary</div>
          <span className="text-[11px] text-slate-500">From MongoDB</span>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[12px] text-slate-500">Quality Score:</span>
            <div className="flex-1 risk-bar-track">
              <div className={`risk-bar-fill ${Number(qualityPct) >= 90 ? 'bg-emerald-500' : Number(qualityPct) >= 75 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${qualityPct}%` }} />
            </div>
            <span className="font-mono text-[13px] font-semibold text-slate-700">{qualityPct}%</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total alerts in DB', value: totals.alerts, icon: FileText },
              { label: 'Total cases in DB', value: totals.cases, icon: CheckCircle2 },
              { label: 'Recent batches', value: batches.length, icon: FileText }
            ].map((stat, i) => {
              const Icon = stat.icon
              return (
                <div key={i} className="bg-slate-50 rounded-lg px-3 py-2.5">
                  <div className="label mb-1">{stat.label}</div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[18px] font-bold leading-none text-navy-900">{stat.value.toLocaleString()}</span>
                    <Icon className="w-4 h-4 text-emerald-400" />
                  </div>
                </div>
              )
            })}
          </div>

          {batches.length > 0 && (
            <div className="mt-4">
              <div className="label mb-2">Recent Ingestion Batches</div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Source</th><th>Records</th><th>Valid</th><th>Quality</th><th>Status</th><th>Date</th></tr></thead>
                  <tbody>
                    {batches.map((b: any, i: number) => (
                      <tr key={i}>
                        <td className="text-[12px]">{b.source}</td>
                        <td className="font-mono text-[12px]">{b.recordsReceived}</td>
                        <td className="font-mono text-[12px]">{b.validRecords}</td>
                        <td className="font-mono text-[12px]">{b.qualityPct}%</td>
                        <td><span className="badge border text-[10.5px] bg-emerald-50 text-emerald-700 border-emerald-200">{b.status}</span></td>
                        <td className="text-[11px] text-slate-500">{new Date(b.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}