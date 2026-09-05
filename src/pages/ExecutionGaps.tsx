import React, { useState, useEffect } from 'react'
import StatCard from '../components/StatCard'
import FindingExplanation from '../components/FindingExplanation'
import { SeverityBadge, Confidence } from '../components/ui'
import { fetchFindings } from '../api/client'

export default function ExecutionGaps() {
  const [selected, setSelected] = useState<string | null>(null)
  const [findings, setFindings] = useState<any[]>([])

  useEffect(() => {
    fetchFindings().then(setFindings).catch(() => setFindings([]))
  }, [])

  const finding = findings.find(f => f.id === selected)
  const highConfidence = findings.filter(f => (f.confidence ?? 0) >= 90).length
  const criticalFindings = findings.filter(f => f.severity === 'Critical').length
  const entitiesAffected = new Set(findings.map(f => f.entityId)).size

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="mb-1">
        <h1 className="page-title">Execution Gaps</h1>
        <p className="page-subtitle">Indicators where operational evidence diverges from documented capability</p>
      </div>

      <div className="grid grid-cols-4 gap-3 mt-4 mb-6">
        <StatCard label="Potential Execution Gaps" value={String(findings.length)} trend={3} icon="gap" accent="neutral" />
        <StatCard label="High Confidence" value={String(highConfidence)} trend={1} icon="shield" accent="info" />
        <StatCard label="Critical Findings" value={String(criticalFindings)} trend={0} icon="alert" accent="danger" />
        <StatCard label="Entities Affected" value={String(entitiesAffected)} trend={0} icon="building" accent="neutral" />
      </div>

      <div className="card mb-6">
        <div className="card-header">
          <div className="card-title">Execution Gap Findings</div>
          <button className="btn btn-sm">Export CSV</button>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>ID</th><th>Finding</th><th>Entity</th><th>Control Area</th><th>Evidence</th><th>Confidence</th><th>Severity</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {findings.map(f => (
                <tr key={f.id} className={selected === f.id ? 'bg-blue-50/50' : ''}>
                  <td className="mono-id">{f.id}</td>
                  <td className="text-[12px] font-medium text-slate-700 max-w-[240px] truncate">{f.finding}</td>
                  <td className="mono-id">{f.entityId}</td>
                  <td className="text-[12px] text-slate-600">{f.controlArea}</td>
                  <td className="font-mono text-[12px] text-slate-600">{f.evidenceCount}</td>
                  <td><Confidence value={f.confidence} compact /></td>
                  <td><SeverityBadge severity={f.severity} /></td>
                  <td>
                    <span className={`badge border text-[10.5px] ${f.status === 'Confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : f.status === 'In Review' ? 'bg-blue-50 text-blue-700 border-blue-200' : f.status === 'New' ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-slate-100 text-slate-400 border-slate-200 line-through'}`}>{f.status}</span>
                  </td>
                  <td>
                    <button className="text-[11px] font-medium text-blue-600 hover:text-blue-700" onClick={() => setSelected(selected === f.id ? null : f.id)}>
                      {selected === f.id ? 'Close' : 'View Evidence'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {finding && (
        <FindingExplanation
          finding={`${finding.id} — ${finding.finding}`}
          severity={finding.severity}
          confidence={finding.confidence}
          whyMatters={finding.description}
          evidence={{ cases: finding.evidenceCount, criticalAlerts: finding.severity === 'Critical' ? finding.evidenceCount : 0, escalationRecords: 0 }}
          peerComparison={finding.peerComparison}
          detectionLogic={finding.methodology}
          limitations={finding.limitations}
        />
      )}
    </div>
  )
}