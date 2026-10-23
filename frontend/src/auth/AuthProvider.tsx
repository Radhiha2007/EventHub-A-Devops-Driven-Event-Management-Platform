import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/endpoints'
import { ApiError, configureApiClient, errorMessage } from '@/api/client'
import type { UserProfile } from '@/api/types'
import { isAuthConfigured } from '@/config'
import * as msal from './msalClient'

export type AuthStatus =
  | 'loading'
  | 'unconfigured'
  | 'signed-out'
  | 'signed-in'
  | 'error'

interface AuthState {
  status: AuthStatus
  account: msal.SignedInAccount | null
  profile: UserProfile | null
  error: string | null
  signIn: (returnTo?: string) => Promise<void>
  signOut: () => Promise<void>
  /** Re-read /users/me (e.g. after onboarding). */
  refreshProfile: () => Promise<UserProfile | null>
  setProfile: (p: UserProfile) => void
}

const AuthContext = createContext<AuthState | null>(null)
const RETURN_KEY = 'eventhub:returnTo'

export function takeReturnTo(): string | null {
  try {
    const v = sessionStorage.getItem(RETURN_KEY)
    sessionStorage.removeItem(RETURN_KEY)
    return v
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<AuthStatus>(isAuthConfigured ? 'loading' : 'unconfigured')
  const [account, setAccount] = useState<msal.SignedInAccount | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadProfile = useCallback(async (): Promise<UserProfile | null> => {
    try {
      const p = await api.getMyProfile()
      setProfile(p)
      setError(null)
      setStatus('signed-in')
      return p
    } catch (err) {
      // A 401/403 here means the token was rejected by the backend — surface it, don't fake a session.
      setProfile(null)
      setError(
        err instanceof ApiError && (err.isUnauthorized || err.isForbidden)
          ? `The EventHub API rejected your Microsoft sign-in: ${err.detail}`
          : errorMessage(err),
      )
      setStatus('error')
      return null
    }
  }, [])

  useEffect(() => {
    configureApiClient({
      getToken: () => (isAuthConfigured ? msal.getAccessToken() : Promise.resolve(null)),
      onUnauthorized: () => {
        /* Handled per-request; session expiry redirects through MSAL in getAccessToken. */
      },
    })
    if (!isAuthConfigured) return
    let cancelled = false
    ;(async () => {
      try {
        const acct = await msal.initAuth()
        if (cancelled) return
        setAccount(acct)
        if (!acct) {
          setStatus('signed-out')
          return
        }
        await loadProfile()
      } catch (err) {
        if (cancelled) return
        setError(errorMessage(err))
        setStatus('error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [loadProfile])

  const signIn = useCallback(async (returnTo?: string) => {
    try {
      if (returnTo) sessionStorage.setItem(RETURN_KEY, returnTo)
    } catch {
      /* storage unavailable: user simply lands on the default page after sign-in */
    }
    await msal.signIn()
  }, [])

  const signOut = useCallback(async () => {
    queryClient.clear()
    await msal.signOut()
  }, [queryClient])

  const value = useMemo<AuthState>(
    () => ({ status, account, profile, error, signIn, signOut, refreshProfile: loadProfile, setProfile }),
    [status, account, profile, error, signIn, signOut, loadProfile],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
