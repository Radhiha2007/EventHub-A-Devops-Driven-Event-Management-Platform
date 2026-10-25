import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { api } from '@/api/endpoints'
import { ApiError, errorMessage } from '@/api/client'
import type { UserRole } from '@/api/types'
import { useAuth } from '@/auth/AuthProvider'
import { Button } from '@/components/ui/Button'
import { ErrorState, Notice } from '@/components/ui/States'
import { PageLoader } from '@/components/ui/Spinner'

const options: { role: UserRole; title: string; blurb: string; points: string[]; tone: string }[] = [
  {
    role: 'STUDENT',
    title: "I'm a student",
    blurb: 'Discover events and keep track of your campus life.',
    points: ['Register for events and get a QR credential', 'Leave feedback after events', 'Collect verifiable certificates'],
    tone: 'emerald',
  },
  {
    role: 'CLUB',
    title: "I'm a club",
    blurb: 'Run events for your community.',
    points: ['Create your club profile and events', 'See the registration roster and check people in', 'Issue certificates to attendees'],
    tone: 'blue',
  },
]

export function OnboardingPage() {
  const { status, profile, setProfile, error, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [choice, setChoice] = useState<UserRole | null>(null)
  const [busy, setBusy] = useState(false)
  const [fail, setFail] = useState<string | null>(null)

  if (status === 'loading') return <PageLoader label="Checking your session…" />
  if (status === 'signed-out' || status === 'unconfigured') return <Navigate to="/sign-in" replace />
  if (status === 'error' || !profile) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <ErrorState error={new Error(error ?? 'Could not load your account.')} onRetry={() => void refreshProfile()} />
      </div>
    )
  }
  if (profile.onboarding_completed) return <Navigate to={profile.role === 'CLUB' ? '/club' : '/dashboard'} replace />

  const confirm = async () => {
    if (!choice) return
    setBusy(true)
    setFail(null)
    try {
      // The role is set by the backend. A 409 means onboarding was already finished elsewhere.
      const updated = await api.completeOnboarding(choice)
      setProfile(updated)
      navigate(updated.role === 'CLUB' ? '/club' : '/dashboard', { replace: true })
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        await refreshProfile()
      }
      setFail(errorMessage(e))
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <p className="text-xs font-extrabold uppercase tracking-widest text-coral-600">Welcome{profile.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}</p>
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">How will you use EventHub?</h1>
      <p className="mt-2 text-ink-soft">
        Pick the account type that fits. <strong className="text-charcoal">This can only be chosen once</strong> — the backend locks it after you confirm.
      </p>

      <div role="radiogroup" aria-label="Account type" className="mt-8 grid gap-4 sm:grid-cols-2">
        {options.map((o) => {
          const selected = choice === o.role
          const ring = o.tone === 'emerald' ? 'border-emerald bg-emerald-50' : 'border-blue bg-blue-50'
          return (
            <button
              key={o.role}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setChoice(o.role)}
              className={`rounded-card border-2 p-6 text-left transition-colors ${selected ? ring : 'border-line bg-white hover:bg-cream-100'}`}
            >
              <span className="flex items-center justify-between">
                <span className="text-xl font-extrabold">{o.title}</span>
                <span className={`flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs ${selected ? 'border-charcoal bg-charcoal text-white' : 'border-charcoal/30'}`} aria-hidden="true">{selected ? '✓' : ''}</span>
              </span>
              <span className="mt-1 block text-sm text-ink-soft">{o.blurb}</span>
              <ul className="mt-4 space-y-1.5 text-sm">
                {o.points.map((p) => <li key={p} className="flex gap-2"><span aria-hidden="true">•</span>{p}</li>)}
              </ul>
            </button>
          )
        })}
      </div>

      {choice === 'CLUB' && (
        <Notice tone="info" className="mt-5">
          Club accounts manage the club whose <strong>contact email matches your Microsoft email</strong> ({profile.email ?? 'unknown'}). You can create that club on the next screen.
        </Notice>
      )}
      {fail && <Notice tone="error" className="mt-5">{fail}</Notice>}

      <Button size="lg" className="mt-6" disabled={!choice} loading={busy} onClick={() => void confirm()}>
        Continue as {choice === 'CLUB' ? 'a club' : choice === 'STUDENT' ? 'a student' : '…'}
      </Button>
    </div>
  )
}
