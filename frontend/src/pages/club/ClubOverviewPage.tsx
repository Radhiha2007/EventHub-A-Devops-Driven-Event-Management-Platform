import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/endpoints'
import { EVENT_STATUSES } from '@/api/types'
import { LinkButton } from '@/components/ui/Button'
import { Card } from '@/components/ui/Form'
import { ErrorState } from '@/components/ui/States'
import { PageLoader } from '@/components/ui/Spinner'
import { StatusBadge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/format'
import { Link } from 'react-router-dom'
import { useMyClub } from './ClubContext'
import { NoClub } from './NoClub'

export function ClubOverviewPage() {
  const { club, clubs, setClubId } = useMyClub()
  const events = useQuery({
    queryKey: ['events', { club_id: club?.id }],
    queryFn: () => api.listEvents({ club_id: club!.id }),
    enabled: Boolean(club),
  })
  if (!club) return <NoClub />

  return (
    <div className="space-y-6">
      {clubs.length > 1 && (
        <div className="max-w-sm">
          <label htmlFor="club-switch" className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-soft">Active club</label>
          <select id="club-switch" className="input" value={club.id} onChange={(e) => setClubId(e.target.value)}>
            {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}
      <Card>
        <h2 className="text-2xl font-extrabold tracking-tight">{club.name}</h2>
        <p className="mt-1 whitespace-pre-line text-sm text-ink-soft">{club.description || 'No description yet.'}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <LinkButton to="/club/events/new" size="sm">Create event</LinkButton>
          <LinkButton to="/club/check-in" size="sm" variant="green">Check people in</LinkButton>
          <LinkButton to={`/clubs/${club.id}`} size="sm" variant="outline">View public page</LinkButton>
        </div>
      </Card>

      {events.isPending ? <PageLoader label="Loading events…" /> : events.isError ? (
        <ErrorState error={events.error} onRetry={() => void events.refetch()} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            {EVENT_STATUSES.map((s) => (
              <div key={s} className="rounded-card border border-line bg-white p-4 shadow-card">
                <p className="text-3xl font-extrabold">{events.data.filter((e) => e.status === s).length}</p>
                <StatusBadge status={s} />
              </div>
            ))}
          </div>
          <Card>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold">Next up</h3>
              <Link to="/club/events" className="text-sm font-bold text-blue-700 hover:underline">All events →</Link>
            </div>
            {events.data.filter((e) => e.status === 'UPCOMING' || e.status === 'ONGOING').length === 0 ? (
              <p className="mt-3 text-sm text-ink-soft">Nothing scheduled. <Link className="font-bold text-blue-700 hover:underline" to="/club/events/new">Create an event</Link>.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line">
                {events.data.filter((e) => e.status === 'UPCOMING' || e.status === 'ONGOING').slice(0, 5).map((e) => (
                  <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div>
                      <Link to={`/club/events/${e.id}`} className="font-bold hover:underline">{e.title}</Link>
                      <p className="text-sm text-ink-soft">{formatDate(e.event_date)} · {e.venue}</p>
                    </div>
                    <StatusBadge status={e.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
