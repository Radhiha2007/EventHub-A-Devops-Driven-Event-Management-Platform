import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/endpoints'
import { ApiError, errorMessage } from '@/api/client'
import { STATUS_TRANSITIONS, type EventItem, type EventStatus, type Registration } from '@/api/types'
import { CheckInPanel } from '@/components/CheckInPanel'
import { FeedbackSection } from '@/components/FeedbackSection'
import { QueryBoundary } from '@/components/QueryList'
import { StatusBadge } from '@/components/ui/Badge'
import { Button, LinkButton } from '@/components/ui/Button'
import { Card, Field } from '@/components/ui/Form'
import { EmptyState, Limitation, Notice } from '@/components/ui/States'
import { formatDate, formatDateTimeUtc, formatTimeRange, titleCase } from '@/lib/format'
import { useMyClub } from './ClubContext'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function StatusControls({ event }: { event: EventItem }) {
  const qc = useQueryClient()
  const [pending, setPending] = useState<EventStatus | null>(null)
  const next = STATUS_TRANSITIONS[event.status]
  const change = useMutation({
    mutationFn: (s: EventStatus) => api.updateEventStatus(event.id, s),
    onSuccess: () => {
      setPending(null)
      void qc.invalidateQueries({ queryKey: ['event', event.id] })
      void qc.invalidateQueries({ queryKey: ['events'] })
    },
  })

  if (next.length === 0) {
    return <p className="text-sm text-ink-soft">This event is {event.status.toLowerCase()}. Its status can't be changed any further.</p>
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {next.map((s) => (
          <Button key={s} size="sm" variant={s === 'CANCELLED' ? 'danger' : 'outline'} onClick={() => { change.reset(); setPending(s) }}>
            Mark as {titleCase(s)}
          </Button>
        ))}
      </div>
      {pending && (
        <Notice tone="warn" title={`Change status to ${titleCase(pending)}?`}>
          <p>This can't be undone{pending === 'COMPLETED' ? ' — certificates can only be issued once an event is completed' : pending === 'CANCELLED' ? ' — registrations will close' : ''}.</p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant={pending === 'CANCELLED' ? 'primary' : 'green'} loading={change.isPending} onClick={() => change.mutate(pending)}>Confirm</Button>
            <Button size="sm" variant="ghost" onClick={() => setPending(null)}>Keep {titleCase(event.status)}</Button>
          </div>
        </Notice>
      )}
      {change.isError && <Notice tone="error">{errorMessage(change.error)}</Notice>}
    </div>
  )
}

function csvEscape(v: string) {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

function Roster({ event, regs }: { event: EventItem; regs: Registration[] }) {
  const checked = regs.filter((r) => r.checked_in_at).length
  const download = () => {
    const rows = [['Name', 'Email', 'Registered (UTC)', 'Checked in (UTC)'], ...regs.map((r) => [r.attendee_name, r.attendee_email, r.registered_at, r.checked_in_at ?? ''])]
    const blob = new Blob([rows.map((r) => r.map(csvEscape).join(',')).join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${event.title.replace(/[^\w-]+/g, '_')}-roster.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold">
          {regs.length} of {event.capacity} seats registered · {checked} checked in
        </p>
        <Button size="sm" variant="outline" onClick={download} disabled={regs.length === 0}>Download CSV</Button>
      </div>
      {regs.length === 0 ? (
        <EmptyState title="No registrations yet">Students who register will appear here.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-card border border-line bg-white">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-cream-100 text-xs uppercase tracking-wide text-ink-soft">
              <tr><th scope="col" className="px-4 py-3">Attendee</th><th scope="col" className="px-4 py-3">Registered</th><th scope="col" className="px-4 py-3">Attendance</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {regs.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3"><p className="font-semibold">{r.attendee_name}</p><p className="text-xs text-ink-soft">{r.attendee_email}</p></td>
                  <td className="px-4 py-3 text-ink-soft">{formatDateTimeUtc(r.registered_at)}</td>
                  <td className="px-4 py-3">
                    {r.checked_in_at ? <span className="font-bold text-emerald-700">✓ {formatDateTimeUtc(r.checked_in_at)}</span> : <span className="text-ink-soft">Not checked in</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function CertificatesTab({ event, regs }: { event: EventItem; regs: Registration[] }) {
  const [recipientId, setRecipientId] = useState('')
  const [pick, setPick] = useState('')
  const [name, setName] = useState('')
  const [localErr, setLocalErr] = useState<string | null>(null)
  const issue = useMutation({
    mutationFn: () => api.issueCertificate({ event_id: event.id, recipient_id: recipientId.trim(), recipient_name: name.trim() }),
    onSuccess: () => { setRecipientId(''); setName(''); setPick('') },
  })
  const checkedIn = regs.filter((r) => r.checked_in_at)
  const fe = issue.error instanceof ApiError ? issue.error.fieldErrors : {}

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!UUID_RE.test(recipientId.trim())) return setLocalErr('The student ID must be a valid UUID (they can copy it from their dashboard).')
    if (!name.trim()) return setLocalErr('Recipient name is required.')
    setLocalErr(null)
    issue.mutate()
  }

  if (event.status !== 'COMPLETED') {
    return <Notice tone="info">Certificates can only be issued for completed events. Mark this event as completed first.</Notice>
  }
  return (
    <div className="space-y-4">
      <Limitation title="You need the student's EventHub ID">
        The backend issues certificates by the student's account ID, which the roster doesn't include. Ask each attendee to
        copy their ID from <em>Student dashboard → Overview</em>. The backend then verifies they registered and were checked in.
      </Limitation>
      <form onSubmit={submit} className="space-y-4 rounded-card border border-line bg-white p-5 shadow-card" noValidate>
        <Field label="Checked-in attendee (optional shortcut)" hint="Fills in the recipient name. The backend records the name from the registration itself.">
          <select className="input" value={pick} onChange={(e) => { setPick(e.target.value); const r = checkedIn.find((x) => x.id === e.target.value); if (r) setName(r.attendee_name) }}>
            <option value="">Select an attendee…</option>
            {checkedIn.map((r) => <option key={r.id} value={r.id}>{r.attendee_name} ({r.attendee_email})</option>)}
          </select>
        </Field>
        <Field label="Student's EventHub ID" required error={fe.recipient_id}>
          <input className="input font-mono" value={recipientId} onChange={(e) => setRecipientId(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" autoComplete="off" />
        </Field>
        <Field label="Recipient name" required error={fe.recipient_name}>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        {localErr && <Notice tone="error">{localErr}</Notice>}
        {issue.isError && <Notice tone="error">{errorMessage(issue.error)}</Notice>}
        {issue.isSuccess && (
          <Notice tone="success" title="Certificate issued">
            Code <code className="break-all">{issue.data.certificate_code}</code> for {issue.data.recipient_name}.{' '}
            <Link className="font-bold underline" to={`/verify/${encodeURIComponent(issue.data.certificate_code)}`}>Open verification page</Link>
          </Notice>
        )}
        <Button type="submit" variant="green" loading={issue.isPending}>Issue certificate</Button>
      </form>
    </div>
  )
}

type Tab = 'roster' | 'checkin' | 'feedback' | 'certificates'

export function EventManagePage() {
  const { eventId = '' } = useParams()
  const { clubs } = useMyClub()
  const [tab, setTab] = useState<Tab>('roster')
  const qc = useQueryClient()
  const event = useQuery({ queryKey: ['event', eventId], queryFn: () => api.getEvent(eventId) })
  const owned = event.data ? clubs.some((c) => c.id === event.data.club_id) : false
  const regs = useQuery({
    queryKey: ['registrations', eventId],
    queryFn: () => api.listEventRegistrations(eventId),
    enabled: owned,
  })

  const tabs: { id: Tab; label: string }[] = [
    { id: 'roster', label: 'Roster' },
    { id: 'checkin', label: 'Check-in' },
    { id: 'feedback', label: 'Feedback' },
    { id: 'certificates', label: 'Certificates' },
  ]

  return (
    <div className="space-y-5">
      <Link to="/club/events" className="text-sm font-bold text-blue-700 hover:underline">← All events</Link>
      <QueryBoundary query={event} loadingLabel="Loading event…">
        {(e) =>
          !owned ? (
            <Notice tone="error" title="You can't manage this event">
              It belongs to a club that isn't linked to your account. The backend only allows the club whose contact email matches yours.
            </Notice>
          ) : (
            <>
              <Card>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-2xl font-extrabold tracking-tight">{e.title}</h2>
                    <p className="mt-1 text-sm text-ink-soft">{formatDate(e.event_date)} · {formatTimeRange(e.start_time, e.end_time)} · {e.venue}</p>
                    <p className="text-sm text-ink-soft">Registration closes {formatDateTimeUtc(e.registration_deadline)}</p>
                  </div>
                  <StatusBadge status={e.status} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <LinkButton to={`/club/events/${e.id}/edit`} size="sm" variant="outline">Edit details</LinkButton>
                  <LinkButton to={`/events/${e.id}`} size="sm" variant="ghost">View public page</LinkButton>
                </div>
                <div className="mt-4 border-t border-line pt-4">
                  <h3 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-ink-soft">Status</h3>
                  <StatusControls event={e} />
                </div>
                <p className="mt-4 text-xs text-ink-soft">Events can't be deleted — the backend doesn't offer a delete endpoint. Cancel an event instead.</p>
              </Card>

              <div role="tablist" aria-label="Event management" className="flex gap-1 overflow-x-auto">
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    role="tab"
                    id={`tab-${t.id}`}
                    aria-selected={tab === t.id}
                    aria-controls={`panel-${t.id}`}
                    onClick={() => setTab(t.id)}
                    className={`shrink-0 rounded-xl px-4 py-2.5 text-[15px] font-semibold ${tab === t.id ? 'bg-charcoal text-cream' : 'bg-white text-charcoal ring-1 ring-line hover:bg-cream-100'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
                {tab === 'roster' && (
                  <QueryBoundary query={regs} loadingLabel="Loading roster…">{(list) => <Roster event={e} regs={list} />}</QueryBoundary>
                )}
                {tab === 'checkin' && (
                  <Card>
                    <CheckInPanel onCheckedIn={() => void qc.invalidateQueries({ queryKey: ['registrations', eventId] })} />
                  </Card>
                )}
                {tab === 'feedback' && <FeedbackSection event={e} />}
                {tab === 'certificates' && (
                  <QueryBoundary query={regs} loadingLabel="Loading attendees…">{(list) => <CertificatesTab event={e} regs={list} />}</QueryBoundary>
                )}
              </div>
            </>
          )
        }
      </QueryBoundary>
    </div>
  )
}
