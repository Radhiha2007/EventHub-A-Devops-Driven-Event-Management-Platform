import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/endpoints'
import { EventCard } from '@/components/EventCard'
import { QueryBoundary } from '@/components/QueryList'
import { LinkButton } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/States'
import { useAuth } from '@/auth/AuthProvider'
import { ownsClub } from '@/lib/clubAccess'

export function ClubDetailPage() {
  const { clubId = '' } = useParams()
  const { profile } = useAuth()
  const club = useQuery({ queryKey: ['club', clubId], queryFn: () => api.getClub(clubId) })
  const events = useQuery({ queryKey: ['events', { club_id: clubId }], queryFn: () => api.listEvents({ club_id: clubId }) })

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link to="/clubs" className="text-sm font-bold text-blue-700 hover:underline">← All clubs</Link>
      <QueryBoundary query={club}>
        {(c) => (
          <>
            <header className="mt-4 rounded-card border border-line bg-white p-6 shadow-card sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{c.name}</h1>
                  <p className="mt-3 max-w-2xl whitespace-pre-line text-ink-soft">{c.description || 'This club has not added a description yet.'}</p>
                </div>
                {profile?.role === 'CLUB' && ownsClub(profile, c) && (
                  <LinkButton to="/club/profile" variant="outline" size="sm">Edit club profile</LinkButton>
                )}
              </div>
              <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                {c.advisor_name && (
                  <div><dt className="text-xs font-bold uppercase tracking-wide text-ink-soft">Faculty advisor</dt><dd className="font-semibold">{c.advisor_name}</dd></div>
                )}
                {c.contact_email && (
                  <div><dt className="text-xs font-bold uppercase tracking-wide text-ink-soft">Contact</dt><dd><a className="font-semibold text-blue-700 hover:underline" href={`mailto:${c.contact_email}`}>{c.contact_email}</a></dd></div>
                )}
              </dl>
            </header>
            <h2 className="mb-5 mt-10 text-2xl font-extrabold tracking-tight">Events by {c.name}</h2>
            <QueryBoundary query={events} loadingLabel="Loading events…">
              {(list) =>
                list.length === 0 ? (
                  <EmptyState title="No events from this club yet">Check back soon.</EmptyState>
                ) : (
                  <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {list.map((e) => <li key={e.id} className="contents"><EventCard event={e} club={c} /></li>)}
                  </ul>
                )
              }
            </QueryBoundary>
          </>
        )}
      </QueryBoundary>
    </div>
  )
}
