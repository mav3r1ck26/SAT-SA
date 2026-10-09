import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SeverityBadge, MitreBadge } from './ui'
import { 
  Shield, AlertTriangle, Cpu, Eye, FileSpreadsheet, CheckCircle2, 
  XCircle, Edit3, Loader2, Check
} from 'lucide-react'
import { reviewFinding } from '../api/client'
import { downloadJSON } from '../utils/export'

interface EvidenceStats {
  cases: number
  criticalAlerts: number
  escalationRecords: number
}

interface ExplanationProps {
  id?: string
  entityId?: string
  finding: string
  severity: 'Critical' | 'High' | 'Medium' | 'Low'
  confidence: number
  whyMatters: string
  evidence: EvidenceStats
  peerComparison: string
  detectionLogic: string
  limitations: string
  compact?: boolean
  mitre?: string
  status?: string
  examinerNote?: string
  reviewedBy?: string
  onUpdate?: () => void
}

export default function FindingExplanation({ 
  id,
  entityId,
  finding, 
  severity, 
  confidence, 
  whyMatters, 
  evidence, 
  peerComparison, 
  detectionLogic, 
  limitations, 
  compact,
  mitre = 'T1059',
  status: initialStatus = 'In Review',
  examinerNote: initialNote = '',
  reviewedBy: initialReviewer = '',
  onUpdate
}: ExplanationProps) {
  const navigate = useNavigate()
  const [currentStatus, setCurrentStatus] = useState(initialStatus)
  const [examinerNote, setExaminerNote] = useState(initialNote)
  const [noteInput, setNoteInput] = useState(initialNote)
  const [showNoteEditor, setShowNoteEditor] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const handleReview = async (newStatus: 'Confirmed' | 'Rejected', noteToSave?: string) => {
    if (!id) return
    setActionLoading(true)
    setFeedback(null)
    try {
      await reviewFinding(id, {
        status: newStatus,
        reviewer: 'Lead Supervisory Examiner (NCIIPC)',
        note: noteToSave !== undefined ? noteToSave : examinerNote
      })
      setCurrentStatus(newStatus)
      if (noteToSave !== undefined) setExaminerNote(noteToSave)
      setFeedback(`Finding marked as ${newStatus}. Adjudication logged to audit ledger.`)
      if (onUpdate) onUpdate()
    } catch (err) {
      setFeedback(`Adjudication failed: ${String(err)}`)
    }
    setActionLoading(false)
  }

  const handleSaveNote = async () => {
    if (!id) return
    setActionLoading(true)
    try {
      await reviewFinding(id, {
        status: currentStatus,
        reviewer: 'Lead Supervisory Examiner (NCIIPC)',
        note: noteInput
      })
      setExaminerNote(noteInput)
      setShowNoteEditor(false)
      setFeedback('Examiner note signed and cryptographically attached.')
      if (onUpdate) onUpdate()
    } catch (err) {
      setFeedback(`Failed to sign note: ${String(err)}`)
    }
    setActionLoading(false)
  }

  const handleExportDossier = () => {
    const filename = `${id || 'FINDING'}_Dossier_${new Date().toISOString().slice(0, 10)}.json`
    const dossierData = {
      findingId: id,
      entityId,
      finding,
      severity,
      confidence,
      status: currentStatus,
      mitre,
      whyMatters,
      evidence,
      peerComparison,
      detectionLogic,
      limitations,
      examinerNote,
      reviewedBy: initialReviewer || 'Lead Supervisory Examiner',
      exportedAt: new Date().toISOString()
    }
    downloadJSON(filename, dossierData)
  }

  const handleViewEvidence = () => {
    if (entityId) {
      navigate(`/entity/${encodeURIComponent(entityId)}`)
    } else {
      navigate('/evidence')
    }
  }

  return (
    <div className={`card ${compact ? '' : 'p-5'} border-stone-300 bg-white shadow-sm`}>
      {!compact && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-stone-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="label text-indigo-600 font-mono">Forensic Finding Dossier</span>
              {id && <span className="mono-id text-xs text-slate-600 font-bold">[{id}]</span>}
              <span className={`badge border text-[10px] font-mono ${
                currentStatus === 'Confirmed' 
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                  : currentStatus === 'Rejected'
                  ? 'bg-rose-50 text-rose-600 border-rose-200'
                  : 'bg-indigo-50 text-indigo-600 border-indigo-200'
              }`}>
                {currentStatus}
              </span>
            </div>
            <div className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Shield className="w-4 h-4 text-rose-600" />
              {finding}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <MitreBadge techniqueId={mitre} name={mitre} />
            <SeverityBadge severity={severity} />
            <div className="bg-white px-3 py-1 rounded border border-stone-200 text-right">
              <div className="text-[9.5px] uppercase font-mono text-slate-500">Confidence</div>
              <span className="font-mono text-sm font-bold text-indigo-600">{confidence}%</span>
            </div>
          </div>
        </div>
      )}

      <div className={`${compact ? 'border-t border-stone-200 mt-3 pt-3' : ''} space-y-4`}>
        {feedback && (
          <div className="flex items-center gap-2 p-3 bg-indigo-50 border border-indigo-200 rounded-md text-xs font-mono text-indigo-600">
            <Check className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        <div>
          <div className="label mb-1 text-slate-600">Supervisory Risk Implications</div>
          <p className="text-xs text-slate-700 leading-relaxed bg-stone-50 p-3 rounded-md border border-stone-200">
            {whyMatters}
          </p>
        </div>

        {/* 4 Forensic Evidence Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-stone-50 rounded-md p-3 border border-stone-200">
            <div className="label mb-1 text-slate-500">Associated Cases</div>
            <div className="font-mono text-lg font-bold text-slate-800">{evidence.cases}</div>
            <div className="text-[10px] text-slate-400 font-mono">SOC Ingested</div>
          </div>
          <div className="bg-stone-50 rounded-md p-3 border border-stone-200">
            <div className="label mb-1 text-slate-500">Critical Alerts</div>
            <div className="font-mono text-lg font-bold text-amber-600">{evidence.criticalAlerts}</div>
            <div className="text-[10px] text-slate-400 font-mono">Raw telemetry</div>
          </div>
          <div className="bg-stone-50 rounded-md p-3 border border-rose-200 bg-rose-50">
            <div className="label mb-1 text-rose-600 font-semibold">Escalation Gaps</div>
            <div className="font-mono text-lg font-bold text-rose-600">{evidence.escalationRecords}</div>
            <div className="text-[10px] text-rose-600 font-mono">Missing actions</div>
          </div>
          <div className="bg-stone-50 rounded-md p-3 border border-indigo-200 bg-indigo-50">
            <div className="label mb-1 text-indigo-600 font-semibold">Peer Baseline Delta</div>
            <div className="text-xs font-bold text-indigo-600 mt-1 truncate">{peerComparison}</div>
            <div className="text-[10px] text-slate-500 font-mono">Sector median</div>
          </div>
        </div>

        {/* Detection Logic */}
        <div>
          <div className="label mb-1 text-slate-600 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-indigo-600" /> Supervisory Detection Logic (Deterministic & ML Ensemble)
          </div>
          <div className="text-xs font-mono text-slate-600 bg-white p-3 rounded-md border border-stone-200 leading-relaxed">
            <span className="text-slate-400 select-none">$ [AUDIT_RULE] </span>
            {detectionLogic}
          </div>
        </div>

        {/* Limitations */}
        <div>
          <div className="label mb-1 text-amber-600 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Forensic Examination Boundary Conditions
          </div>
          <p className="text-xs text-slate-600 bg-amber-50 rounded-md p-3 leading-relaxed border border-amber-200">
            {limitations}
          </p>
        </div>

        {/* Examiner Note Display & Editor */}
        {examinerNote && !showNoteEditor && (
          <div className="p-3 bg-stone-50 rounded-md border border-emerald-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="label text-emerald-600 font-mono flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Signed Examiner Finding Note
              </span>
              <button 
                onClick={() => { setNoteInput(examinerNote); setShowNoteEditor(true) }}
                className="text-[11px] font-mono text-slate-500 hover:text-slate-700 flex items-center gap-1"
              >
                <Edit3 className="w-3 h-3" /> Edit Note
              </button>
            </div>
            <p className="text-xs text-slate-700 font-mono bg-stone-50 p-2.5 rounded border border-stone-200">
              "{examinerNote}"
            </p>
          </div>
        )}

        {showNoteEditor && (
          <div className="p-3 bg-white rounded-md border border-stone-300 space-y-2">
            <div className="label text-indigo-600 font-mono">Sign Examiner Supervisory Note</div>
            <textarea
              className="input w-full h-20 text-xs font-mono bg-white border-stone-300 text-slate-800 p-2 resize-none"
              placeholder="Enter official examination observation, legal finding reference, or CSE directive note..."
              value={noteInput}
              onChange={e => setNoteInput(e.target.value)}
            />
            <div className="flex items-center justify-end gap-2">
              <button 
                onClick={() => setShowNoteEditor(false)}
                className="btn btn-sm text-xs font-mono text-slate-500"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveNote}
                disabled={actionLoading}
                className="btn btn-primary btn-sm text-xs font-mono flex items-center gap-1.5"
              >
                {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Sign & Save Note
              </button>
            </div>
          </div>
        )}

        {!compact && (
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-stone-200">
            <button 
              onClick={handleViewEvidence}
              className="btn btn-primary btn-sm flex items-center gap-1.5 text-xs font-mono"
            >
              <Eye className="w-3.5 h-3.5" /> View Telemetry Evidence
            </button>
            
            <button 
              onClick={handleExportDossier}
              className="btn btn-sm flex items-center gap-1.5 text-slate-600 text-xs font-mono"
              title="Download standalone finding dossier JSON"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" /> Export Finding Dossier
            </button>

            {!examinerNote && !showNoteEditor && (
              <button 
                onClick={() => setShowNoteEditor(true)}
                className="btn btn-sm text-xs font-mono text-slate-600 hover:text-slate-800 flex items-center gap-1"
              >
                <Edit3 className="w-3.5 h-3.5 text-indigo-600" /> Add Note
              </button>
            )}

            <div className="flex items-center gap-1.5 ml-auto">
              <button 
                onClick={() => handleReview('Confirmed')}
                disabled={actionLoading || currentStatus === 'Confirmed'}
                className={`btn btn-sm text-xs font-mono flex items-center gap-1 ${
                  currentStatus === 'Confirmed' 
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200 cursor-default' 
                    : 'text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {currentStatus === 'Confirmed' ? 'Confirmed' : 'Confirm Finding'}
              </button>

              <button 
                onClick={() => handleReview('Rejected')}
                disabled={actionLoading || currentStatus === 'Rejected'}
                className={`btn btn-sm text-xs font-mono flex items-center gap-1 ${
                  currentStatus === 'Rejected' 
                    ? 'bg-rose-50 text-rose-600 border-rose-200 cursor-default' 
                    : 'text-rose-600 border-rose-200 hover:bg-rose-100'
                }`}
              >
                <XCircle className="w-3.5 h-3.5" />
                {currentStatus === 'Rejected' ? 'Dismissed' : 'Dismiss / Reject'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
