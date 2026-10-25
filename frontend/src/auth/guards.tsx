import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import type { UserRole } from '@/api/types'
import { LinkButton } from '@/components/ui/Button'
import { ErrorState } from '@/components/ui/States'
import { PageLoader } from '@/components/ui/Spinner'
import { useAuth } from './AuthProvider'

/**
 * Route guard. The role comes from the backend profile (GET /users/me); the frontend never
 * grants a role itself. The backend re-checks every call, so this only shapes the UI.
 */
export function RequireAuth({ role, children }: { role?: UserRole; children: ReactNode }) {
  const { status, profile, error, refreshProfile } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <PageLoader label="Checking your session…" />
  if (status === 'unconfigured' || status === 'signed-out') {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname + location.search }} />
  }
  if (status === 'error' || !profile) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <ErrorState error={new Error(error ?? 'Could not load your profile.')} title="We couldn't load your account" onRetry={() => void refreshProfile()} />
      </div>
    )
  }
  if (!profile.onboarding_completed) return <Navigate to="/onboarding" replace />
  if (role && profile.role !== role) return <Unauthorized required={role} actual={profile.role} />
  return <>{children}</>
}

export function Unauthorized({ required, actual }: { required: UserRole; actual: UserRole }) {
  const label = required === 'CLUB' ? 'club accounts' : 'student accounts'
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <p className="text-6xl font-extrabold text-coral" aria-hidden="true">403</p>
      <h1 className="mt-2 text-2xl font-extrabold">This area is for {label}</h1>
      <p className="mt-2 text-ink-soft">
        You're signed in as a {actual === 'CLUB' ? 'club' : 'student'}. Roles are decided by the EventHub
        backend during onboarding and can't be changed from here.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <LinkButton to={actual === 'CLUB' ? '/club' : '/dashboard'}>Go to my dashboard</LinkButton>
        <LinkButton to="/events" variant="outline">Browse events</LinkButton>
      </div>
    </div>
  )
}
