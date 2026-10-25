import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/endpoints'
import { useAuth } from '@/auth/AuthProvider'
import { Button, LinkButton } from '@/components/ui/Button'
import { Card } from '@/components/ui/Form'
import { useMyRegistrations } from '@/lib/useMyRegistrations'

function Stat({ label, value, to, tone, error }: { label: string; value: string; to: string; tone: string; error?: boolean }) {
  return (
    <Link to={to} className={`rounded-card border border-line p-5 shadow-card transition-transform hover:-translate-y-0.5 ${tone}`}>
      <p className="text-3xl font-extrabold">{error ? '—' : value}</p>
      <p className="text-sm font-bold">{label}</p>
      {error && <p className="mt-1 text-xs">Couldn't load</p>}
    </Link>
  )
}

export function OverviewPage() {
  const { profile } = useAuth()
  const [copied, setCopied] = useState(false)
  const id = profile!.id

  const unread = useQuery({ queryKey: ['notifications', id, 'unread'], queryFn: () => api.listNotifications(id, true) })
  const certs = useQuery({ queryKey: ['certificates', id], queryFn: () => api.listMyCertificates(id) })
  const regs = useMyRegistrations()

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(id)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* the id is visible and selectable */
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="My registrations" value={String(regs.data?.length ?? 0)} to="/dashboard/tickets" tone="bg-emerald-50 text-emerald-700" error={regs.isError} />
        <Stat label="Unread notifications" value={String(unread.data?.length ?? 0)} to="/dashboard/notifications" tone="bg-blue-50 text-blue-700" error={unread.isError} />
        <Stat label="Certificates" value={String(certs.data?.length ?? 0)} to="/dashboard/certificates" tone="bg-coral-50 text-coral-700" error={certs.isError} />
      </div>

      <Card>
        <h2 className="text-lg font-extrabold">Your profile</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-xs font-bold uppercase tracking-wide text-ink-soft">Name</dt><dd className="font-semibold">{profile!.full_name ?? '—'}</dd></div>
          <div><dt className="text-xs font-bold uppercase tracking-wide text-ink-soft">Email</dt><dd className="font-semibold">{profile!.email ?? '—'}</dd></div>
          <div><dt className="text-xs font-bold uppercase tracking-wide text-ink-soft">Role</dt><dd className="font-semibold">Student</dd></div>
          <div><dt className="text-xs font-bold uppercase tracking-wide text-ink-soft">Onboarding</dt><dd className="font-semibold">{profile!.onboarding_completed ? 'Complete' : 'Pending'}</dd></div>
        </dl>
        <div className="mt-4 rounded-xl bg-cream p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">Your EventHub ID</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 break-all text-sm font-semibold">{id}</code>
            <Button size="sm" variant="outline" onClick={() => void copyId()}>{copied ? 'Copied ✓' : 'Copy'}</Button>
          </div>
          <p className="mt-2 text-xs text-ink-soft">
            Clubs need this ID to issue you a certificate after an event — the roster they see doesn't include it, so share it with them.
          </p>
        </div>
      </Card>

      <div className="flex flex-wrap gap-3">
        <LinkButton to="/events">Find events</LinkButton>
        <LinkButton to="/clubs" variant="outline">Browse clubs</LinkButton>
      </div>
    </div>
  )
}
