import { FormEvent, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { setupRequired, setupEnabled, login, setup, register, error } = useAuth()
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [bootstrapToken, setBootstrapToken] = useState('')
  const [requestError, setRequestError] = useState('')
  const [requestMessage, setRequestMessage] = useState('')
  const [registering, setRegistering] = useState(false)
  const [busy, setBusy] = useState(false)
  const firstAdmin = setupRequired && setupEnabled

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setRequestError('')
    setRequestMessage('')
    try {
      if (firstAdmin) await setup(bootstrapToken, username, displayName, password)
      else if (registering) {
        await register(username, displayName, password)
        setRequestMessage('Your request has been submitted. A Super Admin must approve your Auditor account before you can sign in.')
        setUsername('')
        setDisplayName('')
        setPassword('')
      }
      else await login(username, password)
    } catch (submitError) {
      setRequestError(submitError instanceof Error ? submitError.message : 'Unable to authenticate.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-2 text-indigo-600"><ShieldCheck /></div>
          <div><h1 className="text-xl font-bold text-slate-900">SAT-SA</h1><p className="text-sm text-slate-500">Supervisory assessment access</p></div>
        </div>
        <h2 className="mb-1 text-lg font-semibold text-slate-900">{firstAdmin ? 'Initial administrator setup' : registering ? 'Request access' : 'Sign in'}</h2>
        <p className="mb-5 text-sm text-slate-500">
          {firstAdmin
            ? 'Use the deployment bootstrap token to create the first Super Admin account.'
            : registering
              ? 'Create credentials for an Auditor account. Your account will remain inactive until a Super Admin approves it.'
              : 'Enter your assigned account credentials.'}
        </p>
        {(requestError || error) && <p role="alert" className="mb-4 rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{requestError || error}</p>}
        {requestMessage && <p role="status" className="mb-4 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{requestMessage}</p>}
        {!setupEnabled && setupRequired && <p role="alert" className="mb-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Initial setup is unavailable. The deployment administrator must configure SATSA_BOOTSTRAP_TOKEN.</p>}
        {firstAdmin && (
          <>
            <label className="mb-1 block text-sm font-medium">Bootstrap token</label>
            <input required autoComplete="off" type="password" value={bootstrapToken} onChange={event => setBootstrapToken(event.target.value)} className="input mb-4 w-full" />
            <label className="mb-1 block text-sm font-medium">Display name</label>
            <input required value={displayName} onChange={event => setDisplayName(event.target.value)} className="input mb-4 w-full" />
          </>
        )}
        {registering && (
          <>
            <label className="mb-1 block text-sm font-medium">Display name</label>
            <input required maxLength={120} value={displayName} onChange={event => setDisplayName(event.target.value)} className="input mb-4 w-full" />
          </>
        )}
        <label className="mb-1 block text-sm font-medium">Username</label>
        <input required maxLength={120} autoComplete="username" value={username} onChange={event => setUsername(event.target.value)} className="input mb-4 w-full" />
        <label className="mb-1 block text-sm font-medium">Password</label>
        <input required autoComplete={firstAdmin || registering ? 'new-password' : 'current-password'} type="password" minLength={firstAdmin || registering ? 12 : undefined} maxLength={256} value={password} onChange={event => setPassword(event.target.value)} className="input mb-6 w-full" />
        {!requestMessage && <button disabled={busy || (setupRequired && !setupEnabled)} className="btn-primary w-full justify-center py-2">{busy ? 'Please wait…' : firstAdmin ? 'Create Super Admin' : registering ? 'Submit access request' : 'Sign in'}</button>}
        {!firstAdmin && !setupRequired && (
          <button
            type="button"
            className="mt-4 w-full text-sm text-indigo-700 hover:text-indigo-900"
            onClick={() => { setRegistering(!registering); setRequestError(''); setRequestMessage(''); setUsername(''); setDisplayName(''); setPassword('') }}
          >
            {registering ? 'Back to sign in' : 'Request access'}
          </button>
        )}
      </form>
    </main>
  )
}
