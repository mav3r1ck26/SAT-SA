import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'

export interface AuthUser {
  id: string
  username: string
  displayName: string
  role: 'Super Admin' | 'Supervisor' | 'Examiner' | 'Auditor' | 'SOC Manager'
  assignedEntityIds: string[]
}

interface AuthState {
  user: AuthUser | null
  ready: boolean
  setupRequired: boolean
  setupEnabled: boolean
  error: string | null
  login: (username: string, password: string) => Promise<void>
  setup: (bootstrapToken: string, username: string, displayName: string, password: string) => Promise<void>
  register: (username: string, displayName: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

async function postAuth<T>(path: string, body?: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api/auth/${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: body === undefined ? undefined : JSON.stringify(body)
    })
  } catch {
    throw new Error('Cannot reach the SAT-SA API. Start MongoDB and the backend, then try again.')
  }

  const responseText = await response.text()
  let payload: { success?: boolean; data?: T; error?: { message?: string } }
  try {
    payload = responseText ? JSON.parse(responseText) : {}
  } catch {
    throw new Error(`The SAT-SA API returned an invalid response (HTTP ${response.status}).`)
  }
  if (!response.ok) {
    throw new Error(payload.error?.message || `Authentication request failed (HTTP ${response.status}).`)
  }
  if (!Object.prototype.hasOwnProperty.call(payload, 'data')) {
    if (payload.success) return undefined as T
    throw new Error('The SAT-SA API returned an incomplete response.')
  }
  return payload.data as T
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [ready, setReady] = useState(false)
  const [setupRequired, setSetupRequired] = useState(false)
  const [setupEnabled, setSetupEnabled] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setReady(false)
    setError(null)
    try {
      const status = await postAuth<{ setupRequired: boolean; setupEnabled: boolean }>('status')
      setSetupRequired(Boolean(status.setupRequired))
      setSetupEnabled(Boolean(status.setupEnabled))
      try {
        setUser(await postAuth<AuthUser>('me'))
      } catch (sessionError) {
        if (sessionError instanceof Error && /Authentication required|Session is invalid|Session has expired/i.test(sessionError.message)) {
          setUser(null)
        } else {
          throw sessionError
        }
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to connect to the authentication service.')
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const login = async (username: string, password: string) => {
    setError(null)
    setUser(await postAuth<AuthUser>('login', { username, password }))
    setSetupRequired(false)
  }
  const setup = async (bootstrapToken: string, username: string, displayName: string, password: string) => {
    setError(null)
    setUser(await postAuth<AuthUser>('setup', { bootstrapToken, username, displayName, password }))
    setSetupRequired(false)
  }
  const register = async (username: string, displayName: string, password: string) => {
    setError(null)
    await postAuth<{ message: string }>('register', { username, displayName, password })
  }
  const logout = async () => {
    await postAuth<void>('logout', {})
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, ready, setupRequired, setupEnabled, error, login, setup, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
