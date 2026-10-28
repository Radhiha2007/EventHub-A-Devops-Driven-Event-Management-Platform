import { useState, } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/endpoints'
import { errorMessage } from '@/api/client'
import { STATUS_TRANSITIONS, type EventItem, type EventStatus, type Registration } from '@/api/types'
import { CheckInPanel } from '@/components/CheckInPanel'
import { FeedbackSection } from '@/components/FeedbackSection'
import { QueryBoundary } from '@/components/QueryList'
import { StatusBadge } from '@/components/ui/Badge'
import { Button, LinkButton } from '@/components/ui/Button'
import { Card } from '@/components/ui/Form'
import { EmptyState, Notice } from '@/components/ui/States'
import { formatDate, formatDateTimeUtc, formatTimeRange, titleCase } from '@/lib/format'
import { useMyClub } from './ClubContext'

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
    return (
      <p className="text-sm text-ink-soft">
        This event is {event.status.toLowerCase()}. Its status can't be changed any further.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {next.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={s === 'CANCELLED' ? 'danger' : 'outline'}
            onClick={() => {
              change.reset()
              setPending(s)
            }}
          >
            Mark as {titleCase(s)}
          </Button>
        ))}
      </div>

      {pending && (
        <Notice tone="warn" title={`Change status to ${titleCase(pending)}?`}>
          <p>
            This can't be undone
            {pending === 'COMPLETED'
              ? ' — certificates can only be issued once an event is completed'
              : pending === 'CANCELLED'
                ? ' — registrations will close'
                : ''}
            .
          </p>
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              variant={pending === 'CANCELLED' ? 'primary' : 'green'}
              loading={change.isPending}
              disabled={change.isPending}
              onClick={() => change.mutate(pending)}
            >
              Confirm
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={change.isPending}
              onClick={() => setPending(null)}
            >
              Keep {titleCase(event.status)}
            </Button>
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
    const rows = [
      ['Name', 'Email', 'Registered (UTC)', 'Checked in (UTC)'],
      ...regs.map((r) => [
        r.attendee_name,
        r.attendee_email,
        r.registered_at,
        r.checked_in_at ?? '',
      ]),
    ]

    const blob = new Blob([rows.map((r) => r.map(csvEscape).join(',')).join('\n')], {
      type: 'text/csv',
    })
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
        <Button size="sm" variant="outline" onClick={download} disabled={regs.length === 0}>
          Download CSV
        </Button>
      </div>

      {regs.length === 0 ? (
        <EmptyState title="No registrations yet">
          Students who register will appear here.
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-card border border-line bg-white">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-cream-100 text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th scope="col" className="px-4 py-3">Attendee</th>
                <th scope="col" className="px-4 py-3">Registered</th>
                <th scope="col" className="px-4 py-3">Attendance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {regs.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{r.attendee_name}</p>
                    <p className="text-xs text-ink-soft">{r.attendee_email}</p>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {formatDateTimeUtc(r.registered_at)}
                  </td>
                  <td className="px-4 py-3">
                    {r.checked_in_at ? (
                      <span className="font-bold text-emerald-700">
                        ✓ {formatDateTimeUtc(r.checked_in_at)}
                      </span>
                    ) : (
                      <span className="text-ink-soft">Not checked in</span>
                    )}
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


function CertificatesTab({
  event,
  regs,
}: {
  event: EventItem
  regs: Registration[]
}) {
  const checkedInCount = regs.filter((r) => r.checked_in_at).length

  const bulkIssue = useMutation({
    mutationFn: () => api.issueBulkCertificates(event.id),
  })

  if (event.status !== 'COMPLETED') {
    return (
      <Notice tone="info">
        Certificates can only be generated for completed events. Mark this
        event as completed first.
      </Notice>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-card border border-line bg-white p-5 shadow-card">
        <h3 className="text-lg font-bold">Generate attendance certificates</h3>

        <p className="mt-2 text-sm text-ink-soft">
          Generate certificates for all attendees marked present. Students
          who have not checked in will not receive a certificate. Each
          certificate is linked to the recipient's own EventHub account.
        </p>

        <p className="mt-3 text-sm">
          <span className="font-bold">{checkedInCount}</span>{' '}
          attendee{checkedInCount === 1 ? '' : 's'} currently marked present.
        </p>

        {bulkIssue.isError && (
          <div className="mt-4">
            <Notice tone="error">
              {errorMessage(bulkIssue.error)}
            </Notice>
          </div>
        )}

        {bulkIssue.isSuccess && (
          <div className="mt-4 space-y-3">
            <Notice tone="success" title="Certificate generation finished">
              Successfully issued {bulkIssue.data.issued} certificate
              {bulkIssue.data.issued === 1 ? '' : 's'}.
            </Notice>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-card border border-line p-4">
                <p className="text-sm text-ink-soft">Eligible attendees</p>
                <p className="text-2xl font-bold">
                  {bulkIssue.data.eligible}
                </p>
              </div>

              <div className="rounded-card border border-line p-4">
                <p className="text-sm text-ink-soft">New certificates</p>
                <p className="text-2xl font-bold">
                  {bulkIssue.data.issued}
                </p>
              </div>

              <div className="rounded-card border border-line p-4">
                <p className="text-sm text-ink-soft">Already issued</p>
                <p className="text-2xl font-bold">
                  {bulkIssue.data.already_issued}
                </p>
              </div>

              <div className="rounded-card border border-line p-4">
                <p className="text-sm text-ink-soft">Failed</p>
                <p className="text-2xl font-bold">
                  {bulkIssue.data.failed}
                </p>
              </div>
            </div>

            {bulkIssue.data.skipped_unlinked > 0 && (
              <Notice tone="info">
                {bulkIssue.data.skipped_unlinked} checked-in registration
                {bulkIssue.data.skipped_unlinked === 1 ? '' : 's'} could not
                be linked to an eligible student account.
              </Notice>
            )}
          </div>
        )}

        <div className="mt-5">
          <Button
            type="button"
            variant="green"
            loading={bulkIssue.isPending}
            disabled={bulkIssue.isPending}
            onClick={() => bulkIssue.mutate()}
          >
            {bulkIssue.isPending
              ? 'Generating certificates…'
              : 'Generate certificates for all present attendees'}
          </Button>
        </div>
      </div>
    </div>
  )
}


type Tab = 'roster' | 'checkin' | 'feedback' | 'certificates'

export function EventManagePage() {
  const { eventId = '' } = useParams()
  const { clubs } = useMyClub()
  const [tab, setTab] = useState<Tab>('roster')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const qc = useQueryClient()
  const navigate = useNavigate()

  const event = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => api.getEvent(eventId),
  })

  const owned = event.data ? clubs.some((c) => c.id === event.data.club_id) : false

  const regs = useQuery({
    queryKey: ['registrations', eventId],
    queryFn: () => api.listEventRegistrations(eventId),
    enabled: owned,
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteEvent(eventId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['events'] })
      await qc.removeQueries({ queryKey: ['event', eventId] })
      await qc.removeQueries({ queryKey: ['registrations', eventId] })
      navigate('/club/events', { replace: true })
    },
  })

  const tabs: { id: Tab; label: string }[] = [
    { id: 'roster', label: 'Roster' },
    { id: 'checkin', label: 'Check-in' },
    { id: 'feedback', label: 'Feedback' },
    { id: 'certificates', label: 'Certificates' },
  ]

  return (
    <div className="space-y-5">
      <Link to="/club/events" className="text-sm font-bold text-blue-700 hover:underline">
        ← All events
      </Link>

      <QueryBoundary query={event} loadingLabel="Loading event…">
        {(e) =>
          !owned ? (
            <Notice tone="error" title="You can't manage this event">
              It belongs to a club that isn't linked to your account. The backend only allows the
              club whose contact email matches yours.
            </Notice>
          ) : (
            <>
              <Card>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-2xl font-extrabold tracking-tight">{e.title}</h2>
                    <p className="mt-1 text-sm text-ink-soft">
                      {formatDate(e.event_date)} · {formatTimeRange(e.start_time, e.end_time)} · {e.venue}
                    </p>
                    <p className="text-sm text-ink-soft">
                      Registration closes {formatDateTimeUtc(e.registration_deadline)}
                    </p>
                  </div>
                  <StatusBadge status={e.status} />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <LinkButton to={`/club/events/${e.id}/edit`} size="sm" variant="outline">
                    Edit details
                  </LinkButton>
                  <LinkButton to={`/events/${e.id}`} size="sm" variant="ghost">
                    View public page
                  </LinkButton>
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      deleteMutation.reset()
                      setConfirmDelete(true)
                    }}
                  >
                    Delete event
                  </Button>
                </div>

                {confirmDelete && (
                  <div className="mt-4">
                    <Notice tone="error" title="Delete this event permanently?">
                      This action cannot be undone. Associated records may also be affected.

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="danger"
                          loading={deleteMutation.isPending}
                          disabled={deleteMutation.isPending}
                          onClick={() => deleteMutation.mutate()}
                        >
                          Confirm delete
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={deleteMutation.isPending}
                          onClick={() => setConfirmDelete(false)}
                        >
                          Keep event
                        </Button>
                      </div>
                    </Notice>
                  </div>
                )}

                {deleteMutation.isError && (
                  <div className="mt-3">
                    <Notice tone="error" title="Could not delete event">
                      {errorMessage(deleteMutation.error)}
                    </Notice>
                  </div>
                )}

                <div className="mt-4 border-t border-line pt-4">
                  <h3 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-ink-soft">
                    Status
                  </h3>
                  <StatusControls event={e} />
                </div>
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
                    className={`shrink-0 rounded-xl px-4 py-2.5 text-[15px] font-semibold ${
                      tab === t.id
                        ? 'bg-charcoal text-cream'
                        : 'bg-white text-charcoal ring-1 ring-line hover:bg-cream-100'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
                {tab === 'roster' && (
                  <QueryBoundary query={regs} loadingLabel="Loading roster…">
                    {(list) => <Roster event={e} regs={list} />}
                  </QueryBoundary>
                )}
                {tab === 'checkin' && (
                  <Card>
                    <CheckInPanel
                      onCheckedIn={() =>
                        void qc.invalidateQueries({ queryKey: ['registrations', eventId] })
                      }
                    />
                  </Card>
                )}
                {tab === 'feedback' && <FeedbackSection event={e} />}
                {tab === 'certificates' && (
                  <QueryBoundary query={regs} loadingLabel="Loading attendees…">
                    {(list) => <CertificatesTab event={e} regs={list} />}
                  </QueryBoundary>
                )}
              </div>
            </>
          )
        }
      </QueryBoundary>
    </div>
  )
}