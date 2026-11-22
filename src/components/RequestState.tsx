import React from 'react'

interface RequestStateProps {
  loading: boolean
  error: Error | null
  retry: () => void
  retryInSeconds: number
  loadingMessage?: string
}

export default function RequestState({
  loading,
  error,
  retry,
  retryInSeconds,
  loadingMessage = 'Loading data…'
}: RequestStateProps) {
  if (loading) {
    return <div role="status" className="m-6 rounded border border-slate-200 bg-white p-5 text-sm text-slate-500">{loadingMessage}</div>
  }
  if (!error) return null
  return (
    <div role="alert" className="m-6 rounded border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
      <p>{error.message}</p>
      <button className="btn btn-sm mt-3" disabled={retryInSeconds > 0} onClick={retry}>
        {retryInSeconds > 0 ? `Retry in ${retryInSeconds}s` : 'Retry'}
      </button>
    </div>
  )
}
