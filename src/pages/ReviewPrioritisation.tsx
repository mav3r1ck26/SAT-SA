import React, { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { fetchReviewQueue, reviewFinding, logAuditAction, fetchFindingEvidence, fetchAlertEvidence } from '../api/client'
import { SeverityBadge, Confidence, TelemetryPulse, MitreBadge } from '../components/ui'
import { 
  AlertOctagon, CheckCircle2, UserCheck, ShieldAlert, 
  ArrowRight, Eye, Download, Check, XCircle, Clock, RefreshCw, User,
  ChevronDown, ChevronUp, Fingerprint, Shield, ExternalLink
} from 'lucide-react'
import { downloadCSV } from '../utils/export'

const EXAMINERS = [
  'Examiner-07 (Lead)',
  'Examiner-03 (Senior)',
  'Examiner-12 (Forensics)',
  'Supervisor-02 (Admin)'
]

export default function ReviewPrioritisation() {
  const { setCurrentPage, setSelectedEntity } = useApp()
  const [queue, setQueue] = useState<any[]>([])
  const [filterSeverity, setFilterSeverity] = useState('')
  const [adjudicatingId, setAdjudicatingId] = useState<string | null>(null)
  const [adjudicatedMap, setAdjudicatedMap] = useState<Record<string, string>>({})
  const [assignedMap, setAssignedMap] = useState<Record<string, string>>({})
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [expandedEvidenceId, setExpandedEvidenceId] = useState<string | null>(null)
  const [evidenceMap, setEvidenceMap] = useState<Record<string, any[]>>({})
  const [loadingEvidence, setLoadingEvidence] = useState<Record<string, boolean>>({})

  const loadQueue = () => {
    fetchReviewQueue().then(items => {
      setQueue(items || [])
      const initialAdjudicated: Record<string, string> = {}
      const initialAssigned: Record<string, string> = {}
      for (const item of (items || [])) {
        const key = item.ref || item.findingId || item.id
        if (item.status && item.status !== 'New') {
          initialAdjudicated[key] = item.status
        }
        if (item.reviewedBy) {
          initialAssigned[key] = item.reviewedBy
        }
      }
      setAdjudicatedMap(prev => ({ ...initialAdjudicated, ...prev }))
      setAssignedMap(prev => ({ ...initialAssigned, ...prev }))
    }).catch(() => setQueue([]))
  }

  useEffect(() => {
    loadQueue()
  }, [])

  const filtered = queue.filter(item => {
    const sev = item.severity ?? item.priority?.severity
    if (filterSeverity && sev !== filterSeverity) return false
    return true
  })

  const handleExportCSV = () => {
    const headers = [
      'Priority', 'Entity', 'Finding Ref', 'Severity', 'MITRE ATT&CK', 
      'Finding Title', 'Evidence Count', 'Confidence (%)', 'Risk Score', 
      'Suggested Action', 'Assigned Examiner', 'Adjudication Status'
    ]
    const rows = filtered.map((item, idx) => [
      `#${idx + 1}`,
      item.entityId || item.entity,
      item.ref || item.findingId || `FIND-${idx + 1}`,
      item.severity ?? 'High',
      item.mitre || 'T1059',
      item.reason || item.finding || item.title || 'Behavioral divergence',
      item.evidenceCount ?? 0,
      item.confidence ?? 85,
      item.riskScore ?? item.score ?? 0,
      item.suggestedAction || 'Mandatory Examiner Adjudication',
      assignedMap[item.ref || item.findingId || String(idx)] || 'Unassigned',
      adjudicatedMap[item.ref || item.findingId || String(idx)] || 'Pending'
    ])
    downloadCSV(`SAT-SA_Review_Queue_${new Date().toISOString().slice(0, 10)}`, headers, rows)
  }

  const handleOpenEntity = (item: any) => {
    const entity = item.entityId || item.entity
    if (entity) {
      setSelectedEntity(entity)
      setCurrentPage('entity')
    }
  }

  const handleAssign = async (itemKey: string, examiner: string, entityId?: string, findingId?: string) => {
    setAssignedMap(prev => ({ ...prev, [itemKey]: examiner }))
    setAssigningId(null)
    try {
      await logAuditAction({
        user: examiner,
        action: 'Examiner Assigned to Review Sample',
        actionCategory: 'Finding',
        entityId: entityId || 'CSE-014',
        findingId: findingId || itemKey,
        detail: `Designated examiner ${examiner} assigned for forensic review of sample ${itemKey}.`,
        status: 'Assigned'
      })
    } catch {}
  }

  const handleToggleEvidence = async (itemKey: string, entityId: string) => {
    if (expandedEvidenceId === itemKey) {
      setExpandedEvidenceId(null)
      return
    }
    setExpandedEvidenceId(itemKey)
    if (!evidenceMap[itemKey]) {
      setLoadingEvidence(prev => ({ ...prev, [itemKey]: true }))
      try {
        const item = queue.find(candidate => (candidate.ref || candidate.findingId || candidate.id) === itemKey)
        const res = item?.alertId
          ? await fetchAlertEvidence(item.alertId)
          : item?.findingId
            ? await fetchFindingEvidence(item.findingId)
            : entityId ? await fetchAlertEvidence(itemKey) : null
        if (res?.timeline?.length) {
          const events = res.timeline.map((evt: any) => ({
            event: evt.event || evt.eventType,
            actor: evt.actor || 'System',
            role: evt.role || 'Supervisory Monitor',
            time: evt.eventTime ? new Date(evt.eventTime).toLocaleTimeString('en-US', { hour12: false }) + ' IST' : (evt.time || '12:00:00 IST'),
            severity: evt.eventType === 'Alert Created' ? 'Critical' : evt.eventType === 'Escalation' ? 'High' : 'Low',
            meta: (evt.metadata && evt.metadata.join(', ')) || `Type: ${evt.eventType}`
          }))
          setEvidenceMap(prev => ({ ...prev, [itemKey]: events }))
        } else setEvidenceMap(prev => ({ ...prev, [itemKey]: [] }))
      } catch {
        setEvidenceMap(prev => ({ ...prev, [itemKey]: [] }))
      }
      setLoadingEvidence(prev => ({ ...prev, [itemKey]: false }))
    }
  }

  const handleAdjudicate = async (itemKey: string, findingId: string, status: 'Confirmed' | 'Rejected', entityId?: string) => {
    setAdjudicatingId(itemKey)
    const reviewer = assignedMap[itemKey] || 'Lead Supervisory Examiner'
    try {
      if (findingId) {
        await reviewFinding(findingId, {
          status,
          reviewer,
          note: `Adjudicated directly from Supervisory Prioritisation Queue as ${status}.`
        })
      } else {
        await logAuditAction({
          user: reviewer,
          action: `Finding Adjudicated: ${status}`,
          actionCategory: 'Finding',
          entityId: entityId || 'CSE-014',
          detail: `Examiner adjudicated sample ${itemKey} as ${status}.`,
          status
        })
      }
      setAdjudicatedMap(prev => ({ ...prev, [itemKey]: status }))
    } catch {
      setAdjudicatedMap(prev => ({ ...prev, [itemKey]: status }))
    }
    setAdjudicatingId(null)
  }

  return (
    <div className="p-6 max-w-[1700px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="page-title text-xl font-bold tracking-tight text-slate-900">Supervisory Manual Review Queue</h1>
            <TelemetryPulse active status="alert" label="EXAMINER ADJUDICATION QUEUE" />
          </div>
          <p className="page-subtitle text-slate-500 text-xs mt-0.5">
            Prioritised alert and case samples ranked by ensemble ML risk divergence, requiring statutory examiner adjudication
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select 
            className="select bg-white border-slate-300 text-slate-700 text-xs py-1 font-mono"
            value={filterSeverity}
            onChange={e => setFilterSeverity(e.target.value)}
          >
            <option value="">All Severities ({queue.length})</option>
            <option value="Critical">Critical Only</option>
            <option value="High">High Only</option>
          </select>

          <button 
            onClick={handleExportCSV}
            className="btn btn-sm flex items-center gap-1.5 text-slate-600 hover:text-slate-900"
            title="Download CSV export of prioritized queue"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" /> Export Queue (CSV)
          </button>

          <button 
            onClick={loadQueue}
            className="btn btn-sm flex items-center gap-1.5 text-slate-500 hover:text-slate-800"
            title="Reload review queue"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div className="flex items-center gap-3">
          <span className="badge text-xs font-mono bg-indigo-50 text-indigo-600 border-indigo-200">
            AUTOMATED ENSEMBLE RANKING
          </span>
          <span className="text-xs text-slate-600 font-mono">
            Samples prioritised by ML divergence score and evidence gaps. Designed to support human examiner adjudication.
          </span>
        </div>
        <div className="text-xs font-mono text-slate-500">
          Pending Adjudication: <strong className="text-indigo-600">{filtered.length}</strong>
        </div>
      </div>

      <div className="space-y-4">
        {filtered.length > 0 ? filtered.map((item, idx) => {
          const itemKey = item.ref || item.findingId || String(idx)
          const isCritical = (item.severity ?? item.priority?.severity) === 'Critical'
          const adjudicatedStatus = adjudicatedMap[itemKey]
          const assignedExaminer = assignedMap[itemKey]
          const isAssigning = assigningId === itemKey
          const isEvidenceExpanded = expandedEvidenceId === itemKey
          const timeline = evidenceMap[itemKey] || []
          const isLoadingEvidence = loadingEvidence[itemKey]

          return (
            <div key={itemKey} className="card overflow-hidden border-slate-200 hover:border-slate-300 transition-all">
              {/* Header Bar */}
              <div className={`flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-l-4 ${
                adjudicatedStatus === 'Confirmed'
                  ? 'bg-emerald-50 border-l-emerald-500 border-b border-slate-200'
                  : adjudicatedStatus === 'Rejected'
                  ? 'bg-rose-50 border-l-rose-500 border-b border-slate-200'
                  : isCritical 
                  ? 'bg-rose-50 border-l-rose-500 border-b border-slate-200' 
                  : 'bg-amber-50 border-l-amber-500 border-b border-slate-200'
              }`}>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                    PRIORITY #{String(item.priority ?? idx + 1).padStart(2, '0')}
                  </span>
                  <SeverityBadge severity={item.severity ?? 'High'} />
                  <span className="mono-id text-indigo-600 font-bold">{item.entityId || item.entity}</span>
                  <span className="text-slate-300">/</span>
                  <span className="mono-id text-slate-600">{item.ref || item.findingId}</span>
                  {item.mitre && <MitreBadge techniqueId={item.mitre} name={item.mitre} />}
                  
                  {adjudicatedStatus && (
                    <span className={`badge border text-[10px] font-mono ${
                      adjudicatedStatus === 'Confirmed' 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                        : 'bg-rose-50 text-rose-600 border-rose-200'
                    }`}>
                      {adjudicatedStatus}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs font-mono">
                  {assignedExaminer && (
                    <span className="text-slate-600 bg-white px-2.5 py-0.5 rounded border border-indigo-200 flex items-center gap-1.5">
                      <User className="w-3 h-3 text-indigo-600" /> {assignedExaminer}
                    </span>
                  )}
                  <Confidence value={item.confidence ?? 85} compact />
                  <span className="text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {item.evidenceCount ?? 0} evidence records
                  </span>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">{item.reason || item.finding || item.title}</p>
                  {(item.findingType || item.source) && <span className="badge border border-indigo-200 bg-indigo-50 text-indigo-700 text-[10px] font-mono">{item.findingType || item.source}</span>}
                  {item.alertCategory && <span className="badge border border-slate-300 bg-white text-slate-600 text-[10px] font-mono">{item.alertCategory} alert</span>}
                </div>

                <div className="bg-slate-50 rounded-md p-3.5 border border-slate-200 space-y-1.5">
                  <div className="label text-indigo-600 font-mono text-[10px] uppercase">Forensic Flagging Triggers</div>
                  <ul className="space-y-1">
                    {(item.reasons || item.reasonWrap || [item.reason]).filter(Boolean).map((r: string, j: number) => (
                      <li key={j} className="text-xs text-slate-600 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Inline Examiner Assignment Dropdown */}
                {isAssigning && (
                  <div className="p-3 bg-white rounded-md border border-slate-300 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono text-indigo-600">Select Designated Examiner:</span>
                    {EXAMINERS.map(ex => (
                      <button
                        key={ex}
                        onClick={() => handleAssign(itemKey, ex, item.entityId || item.entity, item.ref || item.findingId)}
                        className="btn btn-sm text-xs font-mono text-slate-700 border-slate-300 hover:border-indigo-600"
                      >
                        {ex}
                      </button>
                    ))}
                    <button
                      onClick={() => setAssigningId(null)}
                      className="btn btn-sm text-xs font-mono text-slate-400 ml-auto"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* Inline Evidence Chain-of-Custody Timeline Drawer */}
                {isEvidenceExpanded && (
                  <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-2 text-xs font-mono text-indigo-600 font-bold">
                        <Fingerprint className="w-4 h-4 text-indigo-600" />
                        Chronological Chain-of-Custody Timeline for {item.ref || item.findingId}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEntity(item)}
                          className="text-[11px] font-mono text-indigo-600 hover:underline flex items-center gap-1"
                        >
                          Open Full CSE Profile <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {isLoadingEvidence ? (
                      <div className="text-xs font-mono text-slate-500 py-3 text-center">
                        Loading live forensic event stream for {item.entityId || item.entity}...
                      </div>
                    ) : (
                      <div className="space-y-2 border-l-2 border-slate-200 ml-2 pl-4 py-1">
                        {timeline.length === 0 && <div className="text-xs text-slate-500 py-2">No event records are linked to this review item yet.</div>}
                        {timeline.map((evt: any, i: number) => (
                          <div key={i} className="text-xs relative pb-2 last:pb-0">
                            <span className={`absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border border-white ${
                              evt.severity === 'Critical' ? 'bg-rose-600' : evt.severity === 'High' ? 'bg-amber-600' : 'bg-slate-300'
                            }`} />
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-slate-700">{evt.event}</span>
                              <span className="text-[10px] font-mono text-indigo-600 bg-white px-1.5 py-0.2 rounded border border-slate-200 shrink-0">
                                {evt.time}
                              </span>
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 flex items-center gap-2 mt-0.5">
                              <span>Actor: <strong className="text-slate-600">{evt.actor}</strong></span>
                              <span>·</span>
                              <span>Role: {evt.role}</span>
                              <span>·</span>
                              <span className="text-slate-500">{evt.meta}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Card Action Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono pt-1">
                  <div className="flex items-center gap-4 text-slate-500">
                    <span>Composite Risk: <strong className="text-rose-600 font-bold">{item.riskScore ?? item.score ?? 0}/100</strong></span>
                    <span>·</span>
                    <span>Fidelity: <strong className="text-indigo-600 font-bold">{item.confidence ?? 0}%</strong></span>
                    <span>·</span>
                    <span className="text-slate-600 italic">Action: {item.suggestedAction || 'Mandatory Examiner Adjudication'}</span>
                  </div>

                  <div className="flex items-center gap-2 ml-auto">
                    <button 
                      onClick={() => handleToggleEvidence(itemKey, item.entityId || item.entity)}
                      className="btn btn-primary btn-sm flex items-center gap-1.5 text-xs font-mono"
                    >
                      <Eye className="w-3.5 h-3.5" /> 
                      {isEvidenceExpanded ? 'Collapse Telemetry' : 'Inspect Telemetry'}
                      {isEvidenceExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    <button 
                      onClick={() => setAssigningId(isAssigning ? null : itemKey)}
                      className="btn btn-sm flex items-center gap-1.5 text-slate-600 text-xs font-mono hover:text-slate-900"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-indigo-600" /> 
                      {assignedExaminer ? 'Reassign' : 'Assign Examiner'}
                    </button>

                    {adjudicatedStatus ? (
                      <span className="text-xs font-mono text-slate-500 px-3 py-1 rounded bg-white border border-slate-200">
                        {adjudicatedStatus === 'Confirmed' ? '✓ Confirmed' : '✕ Dismissed'}
                      </span>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => handleAdjudicate(itemKey, item.ref || item.findingId, 'Confirmed', item.entityId || item.entity)}
                          disabled={adjudicatingId === itemKey}
                          className="btn btn-sm text-emerald-600 border-emerald-200 hover:bg-emerald-100 text-xs font-mono"
                          title="Confirm finding into statutory audit ledger"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1 inline" /> Confirm
                        </button>
                        <button 
                          onClick={() => handleAdjudicate(itemKey, item.ref || item.findingId, 'Rejected', item.entityId || item.entity)}
                          disabled={adjudicatingId === itemKey}
                          className="btn btn-sm text-rose-600 border-rose-200 hover:bg-rose-100 text-xs font-mono"
                          title="Dismiss finding as operational baseline variance"
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1 inline" /> Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        }) : (
          <div className="card p-12 text-center text-xs font-mono text-slate-500 bg-slate-50 border-slate-200">
            No supervisory examination items currently pending in queue.
          </div>
        )}
      </div>
    </div>
  )
}
