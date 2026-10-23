import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/endpoints'
import { errorMessage } from '@/api/client'
import type { EventItem } from '@/api/types'
import { useAuth } from '@/auth/AuthProvider'
import { FeedbackSection } from '@/components/FeedbackSection'
import { Poster } from '@/components/EventCard'
import { QueryBoundary } from '@/components/QueryList'
import { RegistrationTicket } from '@/components/TicketCard'
import { Button, LinkButton } from '@/components/ui/Button'
import { StatusBadge, Pill } from '@/components/ui/Badge'
import { Notice } from '@/components/ui/States'
import { formatDate, formatDateTimeUtc, formatTimeRange, isRegistrationWindowOpen } from '@/lib/format'
import { ownsClub } from '@/lib/clubAccess'
import { saveTicket } from '@/lib/tickets'
import { useMyRegistrations } from '@/lib/useMyRegistrations'

function RegistrationPanel({ event }: { event: EventItem }) {
  const { status, profile } = useAuth()
  const qc = useQueryClient()
  const myRegs = useMyRegistrations()
  const existing = myRegs.data?.find((r) => r.event_id === event.id)

  const register = useMutation({
    mutationFn: () => api.registerForEvent(event.id),
    onSuccess: (r) => {
      if (!profile) return
      saveTicket(profile.id, {
        registrationId: r.id,
        eventId: r.event_id,
        credential: r.qr_credential,
        registeredAt: r.registered_at,
      })
      void qc.invalidateQueries({ queryKey: ['my-registrations'] })
    },
  })

  const open = isRegistrationWindowOpen(event)

  if (status === 'loading') return null

  if (status !== 'signed-in' || !profile) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-ink-soft">Sign in with your Microsoft account to register for this event.</p>
        <LinkButton to="/sign-in" state={{ from: `/events/${event.id}` }} className="w-full">Sign in to register</LinkButton>
      </div>
    )
  }

  if (!profile.onboarding_completed) {
    return <LinkButton to="/onboarding" className="w-full">Finish setting up your account</LinkButton>
  }

  if (profile.role === 'CLUB') {
    return (
      <Notice tone="info">
        Registration is for student accounts. You're signed in as a club account.
      </Notice>
    )
  }

  if (existing) {
    return (
      <div className="space-y-3">
        <Notice tone="success" title="You're registered 🎉">
          {existing.checked_in_at ? 'Your attendance has been recorded.' : 'Show your QR code to the club at check-in.'}
        </Notice>
        <RegistrationTicket registration={existing} event={event} />
        <p className="text-xs text-ink-soft">
          <Link to="/dashboard/tickets" className="font-bold text-blue-700 hover:underline">See all your tickets</Link>
        </p>
      </div>
    )
  }
  if (myRegs.isPending && myRegs.fetchStatus !== 'idle') return <p className="text-sm text-ink-soft">Checking your registration…</p>

  return (
    <div className="space-y-3">
      {!open && (
        <Notice tone="warn">
          {event.status !== 'UPCOMING'
            ? `Registration is closed: this event is ${event.status.toLowerCase()}.`
            : `Registration closed on ${formatDateTimeUtc(event.registration_deadline)}.`}
        </Notice>
      )}
      <Button variant="primary" size="lg" className="w-full" onClick={() => register.mutate()} loading={register.isPending} disabled={!open || myRegs.isError}>
        Register for this event
      </Button>
      {register.isError && <Notice tone="error">{errorMessage(register.error)}</Notice>}
      <p className="text-xs text-ink-soft">
        Registering uses your signed-in name and email ({profile.full_name ?? 'no name'}, {profile.email ?? 'no email'}).
      </p>
    </div>
  )
}

export function EventDetailPage() {
  const { eventId = '' } = useParams()
  const { profile } = useAuth()
  const event = useQuery({ queryKey: ['event', eventId], queryFn: () => api.getEvent(eventId) })
  const club = useQuery({
    queryKey: ['club', event.data?.club_id],
    queryFn: () => api.getClub(event.data!.club_id),
    enabled: Boolean(event.data?.club_id),
  })

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link to="/events" className="text-sm font-bold text-blue-700 hover:underline">← All events</Link>
      <QueryBoundary query={event} loadingLabel="Loading event…">
        {(e) => (
          <>
            <div className="mt-4 overflow-hidden rounded-card border border-line bg-white shadow-card">
              <Poster event={e} className="h-48 w-full sm:h-64" />
              <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.5fr_1fr]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill tone="coral">{e.category}</Pill>
                    <StatusBadge status={e.status} />
                  </div>
                  <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">{e.title}</h1>
                  {club.data && (
                    <p className="mt-2 text-sm">
                      Hosted by <Link className="font-bold text-blue-700 hover:underline" to={`/clubs/${club.data.id}`}>{club.data.name}</Link>
                    </p>
                  )}
                  <p className="mt-5 whitespace-pre-line text-[15px] leading-relaxed text-charcoal/90">
                    {e.description || 'The organisers have not added a description yet.'}
                  </p>
                  <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                    {[
                      ['Date', formatDate(e.event_date)],
                      ['Time', formatTimeRange(e.start_time, e.end_time)],
                      ['Venue', e.venue],
                      ['Capacity', `${e.capacity} seats`],
                      ['Registration deadline', formatDateTimeUtc(e.registration_deadline)],
                    ].map(([k, v]) => (
                      <div key={k} className="rounded-xl bg-cream p-3">
                        <dt className="text-xs font-bold uppercase tracking-wide text-ink-soft">{k}</dt>
                        <dd className="mt-0.5 font-semibold">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  {club.data && profile?.role === 'CLUB' && ownsClub(profile, club.data) && (
                    <LinkButton to={`/club/events/${e.id}`} variant="blue" className="mt-6">Manage this event</LinkButton>
                  )}
                </div>
                <aside aria-label="Registration" className="lg:border-l lg:border-line lg:pl-8">
                  <h2 className="mb-3 text-lg font-extrabold">Registration</h2>
                  <RegistrationPanel event={e} />
                </aside>
              </div>
            </div>
            <FeedbackSection event={e} />
          </>
        )}
      </QueryBoundary>
    </div>
  )
}
