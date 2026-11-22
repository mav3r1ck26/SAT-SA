import { useEffect, useState } from 'react'
import { ShieldCheck, Database, Lock, FileText, AlertTriangle, Cpu, Terminal, KeyRound, Server, BookOpen, UserCheck, UserX } from 'lucide-react'
import { TelemetryPulse } from '../components/ui'
import { approveAuthAccount, fetchApiHealth, fetchAssessmentFramework, fetchAuthAccounts, fetchConfigurations, fetchMLHealth, rejectAuthAccount, verifyAuditChain, updateConfiguration, type AuthAccount } from '../api/client'
import { useApiResource } from '../hooks/useApiResource'

export default function Settings() {
  const frameworkResource = useApiResource('settings-framework', signal => fetchAssessmentFramework(signal))
  const configurationsResource = useApiResource('settings-configurations', signal => fetchConfigurations(signal))
  const healthResource = useApiResource('settings-api-health', signal => fetchApiHealth(signal))
  const mlHealthResource = useApiResource('settings-ml-health', signal => fetchMLHealth(signal))
  const auditResource = useApiResource('settings-audit-chain', signal => verifyAuditChain(signal))
  const framework = frameworkResource.data
  const health = healthResource.data
  const mlHealth = mlHealthResource.data
  const auditStatus = auditResource.data
  const [configurationOverrides, setConfigurationOverrides] = useState<Record<string, any>>({})
  const configurations = (configurationsResource.data || []).map(config => ({
    ...config,
    ...configurationOverrides[config.key]
  }))
  const [savingKey, setSavingKey] = useState('')
  const [saveMessage, setSaveMessage] = useState('')
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [pendingAccounts, setPendingAccounts] = useState<AuthAccount[]>([])
  const [accountsLoading, setAccountsLoading] = useState(true)
  const [accountsError, setAccountsError] = useState('')
  const [accountActionId, setAccountActionId] = useState('')
  const [accountMessage, setAccountMessage] = useState('')

  const refreshPendingAccounts = async () => {
    setAccountsError('')
    try {
      const accounts = await fetchAuthAccounts()
      setPendingAccounts(accounts.filter(account => account.pendingApproval))
    } catch (error) {
      setAccountsError(error instanceof Error ? error.message : 'Access requests could not be loaded.')
    } finally {
      setAccountsLoading(false)
    }
  }

  useEffect(() => { void refreshPendingAccounts() }, [])

  const reviewAccount = async (account: AuthAccount, approve: boolean) => {
    setAccountActionId(account.id)
    setAccountMessage('')
    setAccountsError('')
    try {
      if (approve) await approveAuthAccount(account.id)
      else await rejectAuthAccount(account.id)
      setAccountMessage(approve
        ? `${account.displayName}'s Auditor account is approved and active.`
        : `${account.displayName}'s access request was rejected.`)
      await refreshPendingAccounts()
    } catch (error) {
      setAccountsError(error instanceof Error ? error.message : 'The access request could not be updated.')
    } finally {
      setAccountActionId('')
    }
  }

  useEffect(() => {
    if (configurationsResource.data) {
      setDrafts(Object.fromEntries(configurationsResource.data.map(config => [config.key, JSON.stringify(config.value)])))
    }
  }, [configurationsResource.data])

  const saveConfig = async (config: any) => {
    setSavingKey(config.key)
    setSaveMessage('')
    try {
      const value = JSON.parse(drafts[config.key])
      const result = await updateConfiguration(config.key, value)
      setConfigurationOverrides(current => ({
        ...current,
        [config.key]: { value: result.value, version: result.version }
      }))
      setDrafts(current => ({ ...current, [config.key]: JSON.stringify(result.value) }))
      setSaveMessage(`${config.key} saved as version ${result.version}.`)
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Configuration update failed.')
    } finally {
      setSavingKey('')
    }
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="page-title text-2xl font-bold tracking-tight">Assessment Settings & Service Status</h1>
            <TelemetryPulse active={health?.status === 'ok'} status={health?.status === 'ok' ? 'online' : healthResource.error ? 'alert' : 'offline'} label={health?.status === 'ok' ? 'API AVAILABLE' : healthResource.loading ? 'CHECKING API' : 'API UNAVAILABLE'} />
          </div>
          <p className="page-subtitle text-slate-500 mt-0.5">
            Configured assessment parameters and live service status. Deployment isolation must be verified outside the application.
          </p>
        </div>
      </div>

      <div className="space-y-5">
        <section className="card p-5 space-y-4" aria-labelledby="access-requests-heading">
          <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <h2 id="access-requests-heading" className="font-semibold text-slate-800">Account access requests</h2>
              <p className="mt-1 text-xs text-slate-500">New registrations are inactive Auditor accounts until you approve them.</p>
            </div>
            <span className="badge badge-info font-mono">{pendingAccounts.length} pending</span>
          </div>
          {accountMessage && <p role="status" className="text-sm text-indigo-700">{accountMessage}</p>}
          {accountsError && <p role="alert" className="text-sm text-rose-700">{accountsError}</p>}
          {accountsLoading ? (
            <p role="status" className="text-sm text-slate-500">Loading access requests…</p>
          ) : pendingAccounts.length === 0 ? (
            <p className="text-sm text-slate-500">There are no pending access requests.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {pendingAccounts.map(account => (
                <div key={account.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-medium text-slate-800">{account.displayName}</div>
                    <div className="text-xs text-slate-500">{account.username} · Auditor · Requested {new Date(account.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="btn btn-primary btn-sm inline-flex items-center gap-1"
                      disabled={accountActionId !== ''}
                      onClick={() => void reviewAccount(account, true)}
                    >
                      <UserCheck className="h-3.5 w-3.5" /> {accountActionId === account.id ? 'Saving…' : 'Approve'}
                    </button>
                    <button
                      className="btn btn-sm inline-flex items-center gap-1"
                      disabled={accountActionId !== ''}
                      onClick={() => void reviewAccount(account, false)}
                    >
                      <UserX className="h-3.5 w-3.5" /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="card p-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <div className="flex items-center gap-2 text-slate-800 font-bold">
                <BookOpen className="w-4 h-4 text-indigo-600" /> Standardized SOC Assessment Framework
              </div>
              <p className="text-xs text-slate-500 mt-1">Versioned assessment dimensions and evidence expectations used for consistent entity scoring.</p>
            </div>
            {framework && <span className="badge badge-info font-mono">{framework.id} v{framework.version}</span>}
          </div>

          {frameworkResource.error ? (
            <div role="alert" className="text-xs text-rose-600">
              {frameworkResource.error.message}
              <button className="btn btn-sm ml-3" disabled={frameworkResource.retryInSeconds > 0} onClick={frameworkResource.retry}>
                {frameworkResource.retryInSeconds > 0 ? `Retry in ${frameworkResource.retryInSeconds}s` : 'Retry'}
              </button>
            </div>
          ) : !framework ? (
            <p role="status" className="text-xs text-slate-500">Loading assessment framework…</p>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1.5">
                  <div className="font-semibold text-slate-800">Maturity calculation</div>
                  <p className="text-slate-600">{framework.maturityFormula}</p>
                  <p className="text-slate-500">{framework.dimensionScoreDefinition}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1.5">
                  <div className="font-semibold text-slate-800">NIST CSF 2.0 reference</div>
                  {framework.references?.map((reference: any) => (
                    <a key={reference.id} href={reference.url} target="_blank" rel="noreferrer" className="text-indigo-700 underline underline-offset-2">
                      {reference.title} ({reference.publisher}, {reference.year})
                    </a>
                  ))}
                  <p className="text-slate-500">{framework.alignmentNotice}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                {framework.dimensions?.map((dimension: any) => (
                  <div key={dimension.key} className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-bold text-slate-800">{dimension.label}</div>
                      <span className="text-[10px] font-mono text-indigo-700">{dimension.weightPercent ?? Math.round(dimension.weight * 100)}% weight</span>
                    </div>
                    <p className="text-xs text-slate-600">{dimension.purpose}</p>
                    <div className="text-[10px] font-mono text-slate-500">Input: {dimension.inputMetric}</div>
                    <div className="flex flex-wrap gap-1">
                      {dimension.nistCsf?.map((reference: any) => (
                        <span key={reference.id} title={reference.name} className="px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-[10px] font-mono text-indigo-700">
                          {reference.id}
                        </span>
                      ))}
                    </div>
                    <div className="text-[10px] text-slate-500">Evidence: {dimension.evidenceIndicators?.join(' · ')}</div>
                  </div>
                ))}
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900">
                <strong>Risk and maturity are separate measures.</strong> {framework.riskScoreDefinition}
              </div>
            </>
          )}
        </div>

        <div className="card p-5 space-y-4">
          <div className="flex items-start justify-between border-b border-slate-200 pb-3">
            <div>
              <h2 className="font-semibold text-slate-800">Validated configuration</h2>
              <p className="mt-1 text-xs text-slate-500">Values are JSON encoded. Updates are versioned and added to the audit chain.</p>
            </div>
          </div>
          {configurationsResource.error && (
            <p role="alert" className="text-sm text-rose-700">
              Configuration data is unavailable: {configurationsResource.error.message}
              <button className="btn btn-sm ml-3" disabled={configurationsResource.retryInSeconds > 0} onClick={configurationsResource.retry}>
                {configurationsResource.retryInSeconds > 0 ? `Retry in ${configurationsResource.retryInSeconds}s` : 'Retry'}
              </button>
            </p>
          )}
          {saveMessage && <p role="status" className="text-sm text-indigo-700">{saveMessage}</p>}
          {configurations.map(config => (
            <div key={config.key} className="grid gap-3 border-b border-slate-100 pb-4 md:grid-cols-[1fr_2fr_auto] md:items-center">
              <div>
                <div className="text-sm font-medium text-slate-800">{config.key}</div>
                <div className="text-xs text-slate-500">{config.description}</div>
                <div className="text-[10px] text-slate-400">{config.category} · {config.version == null ? 'version not reported' : `v${config.version}`}{config.minValue != null || config.maxValue != null ? ` · range ${config.minValue ?? '−∞'} to ${config.maxValue ?? '∞'}` : ''}</div>
              </div>
              <textarea
                aria-label={`${config.key} JSON value`}
                disabled={!config.isEditable || savingKey === config.key}
                value={drafts[config.key] || ''}
                onChange={event => setDrafts(current => ({ ...current, [config.key]: event.target.value }))}
                rows={config.dataType === 'object' || config.dataType === 'array' ? 3 : 1}
                className="input w-full font-mono text-xs disabled:bg-slate-100"
              />
              <button
                className="btn btn-primary"
                disabled={!config.isEditable || savingKey === config.key || drafts[config.key] === JSON.stringify(config.value)}
                onClick={() => void saveConfig(config)}
              >
                {savingKey === config.key ? 'Saving…' : config.isEditable ? 'Save' : 'Locked'}
              </button>
            </div>
          ))}
          {!configurationsResource.error && configurationsResource.loading && <p role="status" className="text-sm text-slate-500">Loading configuration…</p>}
          {!configurationsResource.loading && !configurationsResource.error && configurations.length === 0 && <p className="text-sm text-slate-500">No configuration values are reported by the API.</p>}
        </div>

        {/* System Information Card */}
        <div className="card p-5">
          <div className="label mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2 text-slate-700 font-bold">
              <Server className="w-4 h-4 text-indigo-600" /> System Architecture & Build Parameters
            </span>
            <span className="text-[10px] font-mono text-slate-500">LIVE STATUS</span>
          </div>

            {healthResource.error && <p role="alert" className="mb-3 text-sm text-rose-700">API health unavailable: {healthResource.error.message} <button className="btn btn-sm ml-2" disabled={healthResource.retryInSeconds > 0} onClick={healthResource.retry}>{healthResource.retryInSeconds > 0 ? `Retry in ${healthResource.retryInSeconds}s` : 'Retry'}</button></p>}
            {mlHealthResource.error && <p role="alert" className="mb-3 text-sm text-rose-700">ML health unavailable: {mlHealthResource.error.message} <button className="btn btn-sm ml-2" disabled={mlHealthResource.retryInSeconds > 0} onClick={mlHealthResource.retry}>{mlHealthResource.retryInSeconds > 0 ? `Retry in ${mlHealthResource.retryInSeconds}s` : 'Retry'}</button></p>}
            {auditResource.error && <p role="alert" className="mb-3 text-sm text-rose-700">Audit verification unavailable: {auditResource.error.message} <button className="btn btn-sm ml-2" disabled={auditResource.retryInSeconds > 0} onClick={auditResource.retry}>{auditResource.retryInSeconds > 0 ? `Retry in ${auditResource.retryInSeconds}s` : 'Retry'}</button></p>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
            {[
                { label: 'API service', value: health?.status || (healthResource.loading ? 'Checking…' : 'Not available'), status: health?.status || 'Unknown' },
                { label: 'Database connection', value: health?.database || (healthResource.loading ? 'Checking…' : 'Not available'), status: health?.database || 'Unknown' },
                { label: 'ML service', value: mlHealth?.status || (mlHealthResource.loading ? 'Checking…' : 'Not available'), status: mlHealth?.status || 'Unknown' },
                { label: 'ML model artifact', value: mlHealth?.models_loaded == null ? 'Not reported' : mlHealth.models_loaded ? 'Loaded' : 'Not loaded', status: mlHealth?.models_loaded == null ? 'Unknown' : mlHealth.models_loaded ? 'Loaded' : 'Not loaded' },
                { label: 'Audit chain', value: auditStatus?.valid == null ? 'Not available' : auditStatus.valid ? `Verified (${auditStatus.checked} events)` : 'Verification failed', status: auditStatus?.valid == null ? 'Unknown' : auditStatus.valid ? 'Verified' : 'Failed' }
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-50/80 border border-slate-200">
                <span className="text-slate-500">{item.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-800 font-bold">{item.value}</span>
                  <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-indigo-600 font-bold">
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Security & Air-Gap Posture */}
        <div className="card p-5">
          <div className="label mb-4 text-slate-700 font-bold">Runtime Checks</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { icon: ShieldCheck, title: 'API & database', desc: healthResource.error?.message || `API: ${health?.status || 'not reported'}; database: ${health?.database || 'not reported'}.`, border: 'border-slate-200', text: 'text-indigo-600', bg: 'bg-slate-50' },
              { icon: Cpu, title: 'ML service', desc: mlHealthResource.error?.message || `Service status: ${mlHealth?.status || 'not reported'}; model loaded: ${mlHealth?.models_loaded == null ? 'not reported' : mlHealth.models_loaded ? 'yes' : 'no'}.`, border: 'border-slate-200', text: 'text-indigo-600', bg: 'bg-slate-50' },
              { icon: FileText, title: 'Audit chain verification', desc: auditResource.error?.message || (auditStatus?.valid ? `${auditStatus.checked} events passed chain verification.` : auditStatus?.valid === false ? 'Audit chain verification failed.' : 'Verification not available.'), border: 'border-slate-200', text: 'text-indigo-600', bg: 'bg-slate-50' }
            ].map((item, i) => {
              const Icon = item.icon
              return (
                <div key={i} className={`${item.bg} border ${item.border} rounded-lg p-4 flex items-start gap-3.5`}>
                  <Icon className={`w-5 h-5 shrink-0 ${item.text} mt-0.5`} />
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-slate-800">{item.title}</div>
                    <p className="text-xs text-slate-500 leading-relaxed font-mono">{item.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Legal & Regulatory Notice */}
        <div className="card p-5">
          <div className="label mb-3 text-amber-700 font-mono flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700" /> Statutory Examination Governance Protocol
          </div>
          <div className="bg-slate-50 rounded-lg p-4 border border-amber-200/40">
            <p className="text-xs text-slate-600 leading-relaxed font-mono">
              SAT-SA analyzes raw security operations evidence submitted by Critical Sector Entities under Section 70 of the Information Technology Act. All behavioral anomalies and execution gap findings generated by SAT-SA represent preliminary system recommendations requiring statutory examiner adjudication prior to issuance of regulatory directives or examination notices.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
