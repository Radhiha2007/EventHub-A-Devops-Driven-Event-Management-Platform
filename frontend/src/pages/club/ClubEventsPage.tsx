import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/endpoints'
import { QueryBoundary } from '@/components/QueryList'
import { StatusBadge } from '@/components/ui/Badge'
import { LinkButton } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/States'
import { formatDate, formatTimeRange } from '@/lib/format'
import { useMyClub } from './ClubContext'
import { NoClub } from './NoClub'

export function ClubEventsPage() {
  const { club } = useMyClub()
  const q = useQuery({
    queryKey: ['events', { club_id: club?.id }],
    queryFn: () => api.listEvents({ club_id: club!.id }),
    enabled: Boolean(club),
  })
  if (!club) return <NoClub />
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-extrabold tracking-tight">Events</h2>
        <LinkButton to="/club/events/new">Create event</LinkButton>
      </div>
      <QueryBoundary query={q} loadingLabel="Loading events…">
        {(list) =>
          list.length === 0 ? (
            <EmptyState title="You haven't created any events" action={<LinkButton to="/club/events/new">Create your first event</LinkButton>}>
              Events appear on the public site as soon as you create them.
            </EmptyState>
          ) : (
            <ul className="space-y-3">
              {list.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-white p-4 shadow-card">
                  <div className="min-w-0">
                    <Link to={`/club/events/${e.id}`} className="text-lg font-extrabold hover:underline">{e.title}</Link>
                    <p className="text-sm text-ink-soft">{formatDate(e.event_date)} · {formatTimeRange(e.start_time, e.end_time)} · {e.venue}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={e.status} />
                    <LinkButton to={`/club/events/${e.id}`} size="sm" variant="outline">Manage</LinkButton>
                  </div>
                </li>
              ))}
            </ul>
          )
        }
      </QueryBoundary>
    </div>
  )
}
