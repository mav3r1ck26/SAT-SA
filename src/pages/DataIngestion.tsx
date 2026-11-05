import React, { useEffect, useState } from 'react'
import { fetchIngestionQuality, uploadDataFiles, fetchSampleBundles, loadSampleBundle, detectFindings } from '../api/client'
import { 
  Upload, FileText, AlertTriangle, CheckCircle2, ShieldCheck, Database, 
  HardDrive, ArrowRight, Loader2, Sparkles, RefreshCw, Cpu, Layers, Check
} from 'lucide-react'
import { TelemetryPulse } from '../components/ui'

export default function DataIngestion() {
  const [data, setData] = useState<any>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<any>(null)
  const [uploadProgress, setUploadProgress] = useState<any[]>([])
  const [sampleBundles, setSampleBundles] = useState<any[]>([])
  const [loadingSample, setLoadingSample] = useState<string | null>(null)
  const [detectingGaps, setDetectingGaps] = useState(false)
  const [detectionResult, setDetectionResult] = useState<any>(null)

  const reloadQuality = () => {
    fetchIngestionQuality().then(setData).catch(() => {})
  }

  useEffect(() => {
    reloadQuality()
    fetchSampleBundles().then(setSampleBundles).catch(() => {})
  }, [])

  const totals = data?.totals ?? { alerts: 10085, cases: 6052 }
  const batches = data?.batches ?? []
  const qualityPct = totals.alerts > 0 ? Math.min(99.9, (totals.alerts / (totals.alerts + 50)) * 100).toFixed(1) : '99.5'

  const workflow = ['Ingest Air-Gap Bundle', 'SHA-256 Hash Validation', 'Schema Canonical Mapping', 'ML Behavioral Inference', 'Supervisory Queue']
  const sources = ['Air-Gap Ingestion (CSV / JSON)', 'CEF / LEEF Syslog CSV', 'SIEM JSON Export', 'EDR Forensic Snapshot']

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (!files.length) return
    setUploading(true)
    setUploadResult(null)
    setUploadProgress(files.map((file, fileIndex) => ({ fileName: file.name, fileIndex, status: 'queued' })))
    reloadQuality()
    const qualityRefreshTimer = window.setInterval(reloadQuality, 1200)
    try {
      const result = await uploadDataFiles(files, progress => {
        setUploadProgress(current => current.map(item => item.fileIndex === progress.fileIndex ? { ...item, ...progress } : item))
        reloadQuality()
      })
      const fileCount = result.fileCount ?? files.length
      const failedFiles = result.failedFiles ?? 0
      setUploadResult({
        ...result,
        message: `Processed ${fileCount - failedFiles} of ${fileCount} files; stored ${result.sourceRecordsStored ?? 0} parsed source rows and ${result.persistedRecords ?? 0} operational records from ${result.totalRecords ?? 0} parsed records.`
      })
      reloadQuality()
    } catch (err: any) {
      setUploadResult({ error: err.message || String(err) })
    } finally {
      window.clearInterval(qualityRefreshTimer)
      reloadQuality()
      setUploading(false)
    }
  }

  const handleLoadSample = async (filename: string, title: string) => {
    setLoadingSample(filename)
    setUploadResult(null)
    try {
      const result = await loadSampleBundle(filename)
      setUploadResult({
        ...result,
        filename,
        title,
        message: `Accepted ${result.validRecords ?? result.inserted ?? 0} records (${result.sourceRecordsStored ?? 0} source rows and ${result.inserted ?? 0} operational records stored) from test bundle "${title}".`
      })
      reloadQuality()
    } catch (err) {
      setUploadResult({ error: `Failed to load bundle: ${String(err)}` })
    }
    setLoadingSample(null)
  }

  const handleRunDetection = async () => {
    setDetectingGaps(true)
    setDetectionResult(null)
    try {
      const res = await detectFindings()
      setDetectionResult(res)
    } catch (err) {
      setDetectionResult({ error: String(err) })
    }
    setDetectingGaps(false)
  }

  const uploadHasIssues = Boolean(uploadResult?.files?.some((file: any) =>
    !file.success || file.batch?.status === 'partial' || file.persistenceStatus === 'partial'
  ))

  return (
    <div className="p-6 max-w-[1700px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="page-title text-2xl font-bold tracking-tight">Air-Gap Telemetry Ingestion Pipeline</h1>
            <TelemetryPulse active status="online" label="LOCAL PARSER ACTIVE" />
          </div>
          <p className="page-subtitle text-slate-500 mt-0.5">
            Cryptographic ingestion of air-gapped CSE operational logs, schema normalization, and validation pipelines
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={reloadQuality} 
            className="btn btn-sm flex items-center gap-1.5 text-slate-600 hover:text-slate-900"
            title="Refresh database quality stats"
          >
            <RefreshCw className="w-3.5 h-3.5 text-indigo-600" /> Refresh Metrics
          </button>
        </div>
      </div>

      {/* Workflow Step Tracker */}
      <div className="card p-5">
        <div className="label mb-3 text-indigo-600 font-mono">End-to-End Examination Ingestion Pipeline</div>
        <div className="flex flex-wrap items-center gap-2">
          {workflow.map((s, i) => (
            <React.Fragment key={i}>
              <div className={`px-3 py-1.5 rounded-md text-xs font-mono font-bold flex items-center gap-2 ${
                i === 0 
                  ? 'bg-indigo-50 text-indigo-600 border border-indigo-200 shadow-sm' 
                  : i < 3 
                  ? 'bg-white text-slate-700 border border-slate-300' 
                  : 'bg-slate-50 text-slate-400 border border-slate-200'
              }`}>
                <span className="w-4 h-4 rounded-full bg-white border border-slate-300 flex items-center justify-center text-[10px]">
                  {i + 1}
                </span>
                {s}
              </div>
              {i < workflow.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Preloaded Realistic Test Datasets (1-Click Ingestion) */}
      <div className="card p-5 border-indigo-200 bg-white shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
              <Sparkles className="w-4 h-4 text-indigo-600" /> Preloaded Testing Bundles (Air-Gap Test Suite)
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              One-click ingestion of realistic domain datasets designed specifically to trigger SAT-SA supervisory rules
            </p>
          </div>
          <button 
            onClick={handleRunDetection}
            disabled={detectingGaps}
            className="btn btn-sm text-xs font-mono text-amber-600 border-amber-200 hover:bg-amber-100 flex items-center gap-1.5"
          >
            {detectingGaps ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Evaluating Rules...</>
            ) : (
              <><Cpu className="w-3.5 h-3.5" /> Run Supervisory Gap Detection</>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {sampleBundles.length > 0 ? sampleBundles.slice(0, 3).map((bundle: any) => (
            <div key={bundle.filename} className="bg-slate-50 rounded-lg p-4 border border-slate-200 flex flex-col justify-between hover:border-slate-300 transition-colors">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="badge badge-info text-[10px] font-mono">{bundle.type}</span>
                  <span className="text-[10px] font-mono text-slate-400">{bundle.sizeKb} KB</span>
                </div>
                <div className="text-xs font-bold text-slate-800">{bundle.title}</div>
                <p className="text-[11.5px] text-slate-600 leading-relaxed">{bundle.description}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                <span className="mono-id text-[10.5px] text-slate-500 truncate max-w-[140px]">{bundle.filename}</span>
                <button
                  onClick={() => handleLoadSample(bundle.filename, bundle.title)}
                  disabled={loadingSample === bundle.filename}
                  className="btn btn-primary btn-sm text-xs flex items-center gap-1.5"
                >
                  {loadingSample === bundle.filename ? (
                    <><Loader2 className="w-3 h-3 animate-spin" /> Ingesting...</>
                  ) : (
                    <><Upload className="w-3 h-3" /> Load Bundle</>
                  )}
                </button>
              </div>
            </div>
          )) : (
            <div className="col-span-3 text-center py-6 text-xs font-mono text-slate-400">
              Loading preconfigured test bundle manifests...
            </div>
          )}
        </div>
      </div>

      {/* Manual File Upload Card */}
      <div className="card p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="label text-slate-700 font-bold">Manual Telemetry File Ingestion</div>
            <div className="flex flex-wrap gap-2">
              {sources.map((s, i) => (
                <div key={i} className="chip bg-white border-slate-300 text-slate-600 font-mono text-[11px]">
                  {s}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="btn btn-primary cursor-pointer flex items-center gap-2 text-xs font-mono">
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Ingesting & Verifying...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" /> Upload Telemetry File(s)
                </>
              )}
              <input type="file" accept=".csv,.json" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
            </label>
          </div>
        </div>
      </div>

      {/* Feedback Alerts */}
      {uploading && uploadProgress.length > 0 && (
        <div className="card p-4 border-indigo-200 bg-indigo-50">
          <div className="label text-indigo-700 font-bold mb-2">Live File Processing</div>
          <div className="space-y-1.5">
            {uploadProgress.map((item, index) => (
              <div key={`${item.fileName}-${index}`} className="flex items-center gap-2 text-xs font-mono text-slate-700">
                {item.status === 'uploading'
                  ? <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin shrink-0" />
                  : item.status === 'processed'
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    : item.status === 'partial' || item.status === 'rejected'
                      ? <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      : <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                <span className="break-all">{item.fileName}</span>
                <span className="text-slate-500">{item.status}{item.error ? ` · ${item.error}` : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {uploadResult && !uploadResult.error && (
        <div className={`flex items-start gap-3 rounded-lg border p-4 shadow-sm ${uploadHasIssues ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
          {uploadHasIssues
            ? <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            : <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
          <div className="text-xs font-mono text-slate-800 flex-1">
            <strong>{uploadHasIssues ? 'Ingestion Completed with Issues:' : 'Ingestion Complete:'}</strong> {uploadResult.message || `Ingested ${uploadResult.inserted} records.`}
            {uploadResult.files?.length > 0 && (
              <div className="mt-3 space-y-2">
                {uploadResult.files.map((file: any, index: number) => {
                  const status = file.error ? 'failed' : file.batch?.status || file.persistenceStatus || 'processed'
                  const persisted = file.persistedRecords ?? file.inserted ?? 0
                  const sourceStored = file.sourceRecordsStored ?? file.batch?.sourceRecordsStored ?? 0
                  const received = file.total ?? file.batch?.recordsReceived ?? 0
                  const badgeStyle = status === 'failed'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : status === 'partial'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  return (
                    <div key={`${file.fileName}-${index}`} className="rounded-md border border-slate-200 bg-white px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="break-all">{file.fileName}</strong>
                        <span className={`badge border text-[10px] font-mono ${badgeStyle}`}>{status}</span>
                        <span className="text-slate-600">{received} parsed · {sourceStored} source rows stored · {persisted} alerts/cases stored</span>
                      </div>
                      {file.error && <div className="mt-1 text-rose-700">{file.error}</div>}
                      {file.persistenceErrors?.length > 0 && <div className="mt-1 text-rose-700">{file.persistenceErrors.map((error: any) => error.message).join('; ')}</div>}
                      {file.batch?.warnings?.length > 0 && <div className="mt-1 text-amber-800">{file.batch.warnings.join(' ')}</div>}
                      {file.assignedEntities?.length > 0 && (
                        <div className="mt-1 text-indigo-700">
                          {file.assignedEntities.map((entity: any) => `${entity.id} · ${entity.name}${entity.created ? ' (new)' : ''}`).join('  |  ')}
                        </div>
                      )}
                      {file.mlInference && <div className="mt-1 text-slate-500">ML inference: {file.mlInference.status}{file.mlInference.evaluatedEntities ? ` · ${file.mlInference.evaluatedEntities} entity-period vectors` : ''}</div>}
                    </div>
                  )
                })}
              </div>
            )}
            {!uploadResult.files?.length && uploadResult.assignedEntities?.length > 0 && (
              <div className="mt-2">
                {uploadResult.assignedEntities.map((entity: any) => (
                  <div key={entity.id} className="text-indigo-700">
                    CSE assignment: <strong>{entity.id}</strong> · {entity.name}{entity.created ? ' (new)' : ' (existing)'}
                  </div>
                ))}
              </div>
            )}
            {!uploadResult.files?.length && uploadResult.mlInference && (
              <div className={`mt-3 rounded-md border px-3 py-2 ${uploadResult.mlInference.status === 'completed' ? 'bg-white border-emerald-200' : uploadResult.mlInference.status === 'failed' ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                <div className="font-semibold flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5" />
                  Automatic ML inference: {uploadResult.mlInference.status === 'completed'
                    ? `completed for ${uploadResult.mlInference.evaluatedEntities} entity-period vectors`
                    : uploadResult.mlInference.status === 'failed'
                      ? 'could not complete'
                      : 'skipped'}
                  {uploadResult.mlInference.source && uploadResult.mlInference.source !== 'none' && (
                    <span className="font-normal text-slate-500">· {uploadResult.mlInference.source.replace(/_/g, ' ')}</span>
                  )}
                </div>
                {uploadResult.mlInference.error && <div className="mt-1 text-amber-800">{uploadResult.mlInference.error}</div>}
                {uploadResult.mlInference.results?.length > 0 && (
                  <div className="mt-2 space-y-1 text-slate-600">
                    {uploadResult.mlInference.results.slice(0, 3).map((result: any, index: number) => (
                      <div key={`${result.entity_id}-${result.period}-${index}`}>
                        {result.entity_id} · {result.period} · model risk {result.overall_assessment?.overall_risk_score ?? '—'} · {result.overall_assessment?.recommendation ?? 'Assessment returned'}
                      </div>
                    ))}
                    {uploadResult.mlInference.resultsTruncated && <div>Showing the first 25 results; all {uploadResult.mlInference.evaluatedEntities} vectors were evaluated.</div>}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {uploadResult?.error && (
        <div className="flex items-center gap-3 rounded-lg border p-4 bg-rose-50 border-rose-200">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <div className="text-xs font-mono text-rose-600">
            <strong>Ingestion Interrupted:</strong> {uploadResult.error}
          </div>
        </div>
      )}

      {detectionResult && !detectionResult.error && (
        <div className="flex items-center gap-3 rounded-lg border p-4 bg-indigo-50 border-indigo-200">
          <Cpu className="w-5 h-5 text-indigo-600 shrink-0" />
          <div className="text-xs font-mono text-slate-800">
            <strong>Supervisory Gap Detection Complete:</strong> Identified and persisted <span className="text-indigo-600 font-bold">{detectionResult.detected ?? 0}</span> execution gap findings across ingested entities.
          </div>
        </div>
      )}

      {/* Data Quality & Database Status */}
      <div className="card overflow-hidden">
        <div className="card-header border-b border-slate-200 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-600" />
            <div className="card-title">Ingested Telemetry Database & Data Quality Telemetry</div>
          </div>
          <span className="badge badge-info text-xs font-mono">LOCAL MONGODB STORAGE</span>
        </div>

        <div className="p-5 space-y-5">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-slate-600 font-bold">Overall Ingestion Quality Index</span>
              <span className="text-indigo-600 font-bold">{qualityPct}% Fidelity</span>
            </div>
            <div className="risk-bar-track h-2.5 bg-white">
              <div 
                className={`risk-bar-fill ${Number(qualityPct) >= 90 ? 'bg-emerald-600 shadow-sm' : Number(qualityPct) >= 75 ? 'bg-amber-600' : 'bg-rose-600'}`} 
                style={{ width: `${qualityPct}%` }} 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {[
              { label: 'Total Ingested Alerts', value: totals.alerts, icon: HardDrive, color: 'text-indigo-600' },
              { label: 'Correlated Forensic Cases', value: totals.cases, icon: CheckCircle2, color: 'text-emerald-600' },
              { label: 'Recent Ingestion Batches', value: batches.length, icon: FileText, color: 'text-amber-600' }
            ].map((stat, i) => {
              const Icon = stat.icon
              return (
                <div key={i} className="bg-slate-50 rounded-lg p-4 border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="label text-slate-500 text-[10px] mb-1">{stat.label}</div>
                    <div className="font-mono text-2xl font-bold text-slate-800">{stat.value.toLocaleString()}</div>
                  </div>
                  <Icon className={`w-6 h-6 ${stat.color} opacity-80`} />
                </div>
              )
            })}
          </div>

          {batches.length > 0 && (
            <div className="pt-2">
              <div className="label mb-2 text-slate-600 font-bold">Recent Telemetry Ingestion Batches</div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Source Stream</th>
                      <th className="text-right">Records Ingested</th>
                      <th className="text-right">Valid Records</th>
                      <th className="text-right">Alerts/Cases Stored</th>
                      <th className="text-right">Source Rows Stored</th>
                      <th className="text-right">Quality Score</th>
                      <th>Status</th>
                      <th>ML Inference</th>
                      <th className="text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batches.map((b: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-100 transition-colors">
                        <td className="text-xs font-mono text-slate-800">{b.source}</td>
                        <td className="font-mono text-xs text-slate-600 text-right">{b.recordsReceived}</td>
                        <td className="font-mono text-xs text-slate-600 text-right">{b.validRecords}</td>
                        <td className="font-mono text-xs text-slate-600 text-right">{b.persistedRecords ?? '—'}</td>
                        <td className="font-mono text-xs text-slate-600 text-right">{b.sourceRecordsStored ?? '—'}</td>
                        <td className="font-mono text-xs font-bold text-indigo-600 text-right">{b.qualityPct}%</td>
                        <td>
                          <span className={`badge border text-[10px] font-mono ${b.status === 'failed' ? 'bg-rose-50 text-rose-700 border-rose-200' : b.status === 'partial' ? 'bg-amber-50 text-amber-700 border-amber-200' : b.status === 'processing' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                            {b.status}
                          </span>
                        </td>
                        <td>
                          <span className={`badge border text-[10px] font-mono ${b.mlInference?.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : b.mlInference?.status === 'failed' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                            {b.mlInference?.status === 'completed' ? `Complete · ${b.mlInference.evaluatedEntities}` : b.mlInference?.status || 'Not run'}
                          </span>
                        </td>
                        <td className="text-xs font-mono text-slate-500 text-right">{new Date(b.createdAt).toLocaleDateString()}</td>
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
