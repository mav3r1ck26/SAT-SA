import { useEffect, useRef, useState } from 'react'
import { ApiError } from '../api/client'

export function useApiResource<T>(key: string, load: (signal: AbortSignal) => Promise<T>) {
  const loadRef = useRef(load)
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(true)
  const [retryAt, setRetryAt] = useState<number | null>(null)
  const [retryVersion, setRetryVersion] = useState(0)
  const [clock, setClock] = useState(Date.now())
  loadRef.current = load

  useEffect(() => {
    const controller = new AbortController()
    setData(null)
    setError(null)
    setRetryAt(null)
    setLoading(true)
    loadRef.current(controller.signal).then(result => {
      if (!controller.signal.aborted) setData(result)
    }).catch(requestError => {
      if (controller.signal.aborted) return
      const failure = requestError instanceof Error ? requestError : new Error('The request could not be completed.')
      setError(failure)
      if (failure instanceof ApiError && failure.retryAfterMs !== undefined) {
        setRetryAt(Date.now() + failure.retryAfterMs)
      }
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })
    return () => controller.abort()
  }, [key, retryVersion])

  useEffect(() => {
    if (retryAt === null) return
    const timer = window.setInterval(() => setClock(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [retryAt])

  const retryInSeconds = retryAt === null ? 0 : Math.max(0, Math.ceil((retryAt - clock) / 1000))
  const retry = () => {
    if (retryInSeconds > 0) return
    setRetryVersion(value => value + 1)
  }

  return { data, error, loading, retry, retryInSeconds }
}
