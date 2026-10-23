import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { Button } from '@/components/ui/Button'
import { Notice } from '@/components/ui/States'
import { PageLoader } from '@/components/ui/Spinner'
import { LogoMark } from '@/components/layout/Logo'
import { errorMessage } from '@/api/client'

export function SignInPage() {
  const { status, profile, signIn, error } = useAuth()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from
  const [busy, setBusy] = useState(false)
  const [signInError, setSignInError] = useState<string | null>(null)

  if (status === 'loading') return <PageLoader label="Checking your session…" />
  if (status === 'signed-in' && profile) {
    return <Navigate to={profile.onboarding_completed ? (from ?? (profile.role === 'CLUB' ? '/club' : '/dashboard')) : '/onboarding'} replace />
  }

  const go = async () => {
    setBusy(true)
    setSignInError(null)
    try {
      await signIn(from)
    } catch (e) {
      setSignInError(errorMessage(e))
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
      <LogoMark size={56} />
      <h1 className="mt-5 text-3xl font-extrabold tracking-tight">Sign in to EventHub</h1>
      <p className="mt-2 text-ink-soft">
        EventHub uses your Microsoft account. New here? You'll choose whether you're a student or a club right after signing in.
      </p>

      <div className="mt-8 w-full space-y-4 text-left">
        {status === 'unconfigured' && (
          <Notice tone="warn" title="Microsoft sign-in isn't configured">
            Set <code>VITE_ENTRA_SPA_CLIENT_ID</code> and <code>VITE_ENTRA_API_CLIENT_ID</code> in <code>.env.local</code> and restart the dev server. See the README.
          </Notice>
        )}
        {status === 'error' && error && <Notice tone="error" title="Sign-in problem">{error}</Notice>}
        {signInError && <Notice tone="error">{signInError}</Notice>}
        <Button size="lg" className="w-full" variant="blue" onClick={() => void go()} loading={busy} disabled={status === 'unconfigured'}>
          <svg width="18" height="18" viewBox="0 0 21 21" aria-hidden="true"><rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg>
          Continue with Microsoft
        </Button>
      </div>
    </div>
  )
}
