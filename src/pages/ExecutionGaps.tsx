import React, { useState, useEffect } from 'react'
import StatCard from '../components/StatCard'
import FindingExplanation from '../components/FindingExplanation'
import { SeverityBadge, Confidence, MitreBadge, TelemetryPulse } from '../components/ui'
import { fetchFindings } from '../api/client'
import { AlertOctagon, Download, Filter, ShieldAlert, Cpu, Eye, ChevronDown, ChevronUp } from 'lucide-react'

export default function ExecutionGaps() {
  const [selected, setSelected] = useState<string | null>(null)
  const [findings, setFindings] = useState<any[]>([])
  const [filterSeverity, setFilterSeverity] = useState('')

  useEffect(() => {
    fetchFindings().then(setFindings).catch(() => setFindings([]))
  }, [])

  const filtered = findings.filter(f => !filterSeverity || f.severity === filterSeverity)
  const finding = findings.find(f => f.id === selected)
  const highConfidence = findings.filter(f => (f.confidence ?? 0) >= 90).length
  const criticalFindings = findings.filter(f => f.severity === 'Critical').length
  const entitiesAffected = new Set(findings.map(f => f.entityId)).size

  return (
    <div className="p-6 max-w-[1700px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyber-800 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="page-title text-2xl font-bold tracking-tight">Execution Gap Findings</h1>
            <TelemetryPulse active status="alert" label="BEHAVIORAL DIVERGENCES" />
          </div>
          <p className="page-subtitle text-cyber-400 mt-0.5">
            Cryptographically audited evidence points where actual SOC operational telemetry diverges from stated defensive capability
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-sm flex items-center gap-1.5 text-cyber-300">
            <Download className="w-3.5 h-3.5 text-neonCyan" /> Export Findings (JSON / CSV)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard label="Identified Execution Gaps" value={String(findings.length)} trend={3} icon="gap" accent="neutral" />
        <StatCard label="High Confidence (≥90%)" value={String(highConfidence)} trend={1} icon="shield" accent="info" />
        <StatCard label="Critical Severity Gaps" value={String(criticalFindings)} trend={0} icon="alert" accent="danger" />
        <StatCard label="Entities Impacted" value={String(entitiesAffected)} trend={0} icon="building" accent="warning" />
      </div>

      <div className="card overflow-hidden">
        <div className="card-header border-b border-cyber-800 pb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-neonRose" />
            <div className="card-title">Active Supervisory Findings Registry</div>
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-cyber-400" />
            <select 
              className="select bg-cyber-950/80 border-cyber-700/80 text-cyber-200 text-xs py-1"
              value={filterSeverity}
              onChange={e => setFilterSeverity(e.target.value)}
            >
              <option value="">All Severities ({findings.length})</option>
              <option value="Critical">Critical Only</option>
              <option value="High">High Only</option>
              <option value="Medium">Medium Only</option>
            </select>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Finding ID</th>
                <th>Behavioral Finding Description</th>
                <th>Entity Target</th>
                <th>MITRE ATT&CK</th>
                <th>Security Control Domain</th>
                <th className="text-center">Evidence Count</th>
                <th>Confidence</th>
                <th>Severity</th>
                <th>Audit Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => (
                <tr 
                  key={f.id} 
                  className={`cursor-pointer transition-colors ${selected === f.id ? 'bg-cyber-800/80 border-l-2 border-l-neonCyan' : 'hover:bg-cyber-800/40'}`}
                  onClick={() => setSelected(selected === f.id ? null : f.id)}
                >
                  <td className="mono-id text-neonCyan font-bold">{f.id}</td>
                  <td className="text-xs font-semibold text-cyber-100 max-w-[320px]">
                    <div className="truncate">{f.finding}</div>
                  </td>
                  <td className="mono-id text-cyber-300">{f.entityId}</td>
                  <td>
                    <MitreBadge techniqueId={f.mitreTechnique || 'T1059'} name={f.mitreTechnique || 'T1059'} />
                  </td>
                  <td className="text-xs text-cyber-300 font-mono">{f.controlArea}</td>
                  <td className="font-mono text-xs text-cyber-200 text-center font-bold">{f.evidenceCount}</td>
                  <td><Confidence value={f.confidence} compact /></td>
                  <td><SeverityBadge severity={f.severity} /></td>
                  <td>
                    <span className={`badge border text-[10.5px] font-mono ${
                      f.status === 'Confirmed' 
                        ? 'bg-emerald-950/80 text-neonEmerald border-emerald-800/60' 
                        : f.status === 'In Review' 
                        ? 'bg-blue-950/80 text-neonCyan border-cyan-800/60' 
                        : 'bg-cyber-900 text-cyber-400 border-cyber-700'
                    }`}>
                      {f.status}
                    </span>
                  </td>
                  <td className="text-right">
                    <button 
                      className="text-xs font-mono text-neonCyan hover:text-cyber-100 flex items-center gap-1 ml-auto"
                    >
                      {selected === f.id ? (
                        <>Collapse <ChevronUp className="w-3.5 h-3.5" /></>
                      ) : (
                        <>Inspect <ChevronDown className="w-3.5 h-3.5" /></>
                      )}
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
          mitre={finding.mitreTechnique || 'T1059'}
        />
      )}
    </div>
  )
}