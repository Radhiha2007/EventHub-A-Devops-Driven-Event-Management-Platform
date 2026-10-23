import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/endpoints'
import { ClubCard } from '@/components/ClubCard'
import { EventCard } from '@/components/EventCard'
import { CampusIllustration } from '@/components/Illustration'
import { QueryBoundary } from '@/components/QueryList'
import { LinkButton } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/States'
import { SectionTitle } from '@/components/ui/Form'
import { useClubMap } from '@/lib/queries'
import { useAuth } from '@/auth/AuthProvider'

export function HomePage() {
  const navigate = useNavigate()
  const { status, profile } = useAuth()
  const [term, setTerm] = useState('')
  const clubs = useClubMap()
  const upcoming = useQuery({
    queryKey: ['events', { event_status: 'UPCOMING' }],
    queryFn: () => api.listEvents({ event_status: 'UPCOMING' }),
  })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    navigate(term.trim() ? `/events?search=${encodeURIComponent(term.trim())}` : '/events')
  }

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.1fr_0.9fr] md:py-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-extrabold uppercase tracking-widest text-emerald-700 ring-1 ring-line">
              <span className="h-2 w-2 rounded-full bg-emerald" aria-hidden="true" /> Campus events & communities
            </p>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Find your people.
              <br />
              <span className="text-coral-600">Show up</span> for what you love.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-ink-soft">
              EventHub brings every club event on campus into one place. Register in a tap, check in with a QR
              code, and collect verifiable certificates.
            </p>
            <form onSubmit={submit} role="search" className="mt-7 flex max-w-xl flex-col gap-3 sm:flex-row">
              <label htmlFor="hero-search" className="sr-only">Search events</label>
              <input
                id="hero-search"
                className="input flex-1"
                placeholder="Search events, venues, topics…"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
              />
              <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-coral-600 px-6 font-semibold text-white hover:bg-coral-700">
                Search
              </button>
            </form>
            <div className="mt-5 flex flex-wrap gap-3">
              <LinkButton to="/events" variant="outline">Browse all events</LinkButton>
              <LinkButton to="/clubs" variant="ghost">Meet the clubs →</LinkButton>
              {status !== 'signed-in' && status !== 'loading' && (
                <LinkButton to="/sign-in" variant="ghost">Sign in</LinkButton>
              )}
              {profile?.onboarding_completed && (
                <LinkButton to={profile.role === 'CLUB' ? '/club' : '/dashboard'} variant="green">
                  Go to dashboard
                </LinkButton>
              )}
            </div>
          </div>
          <CampusIllustration className="mx-auto w-full max-w-md" />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6" aria-labelledby="upcoming-h">
        <SectionTitle eyebrow="Happening soon" title="Upcoming events">
          <Link to="/events" className="text-sm font-bold text-blue-700 hover:underline">See all events →</Link>
        </SectionTitle>
        <span id="upcoming-h" className="sr-only">Upcoming events</span>
        <QueryBoundary query={upcoming} loadingLabel="Loading events…">
          {(events) =>
            events.length === 0 ? (
              <EmptyState title="No upcoming events right now" action={<LinkButton to="/events" variant="outline">View past and ongoing events</LinkButton>}>
                Clubs haven't scheduled anything upcoming yet. Check back soon.
              </EmptyState>
            ) : (
              <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {events.slice(0, 6).map((e) => (
                  <li key={e.id} className="contents"><EventCard event={e} club={clubs.map.get(e.club_id)} /></li>
                ))}
              </ul>
            )
          }
        </QueryBoundary>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6" aria-labelledby="clubs-h">
        <SectionTitle eyebrow="Communities" title="Clubs on campus">
          <Link to="/clubs" className="text-sm font-bold text-blue-700 hover:underline">All clubs →</Link>
        </SectionTitle>
        <span id="clubs-h" className="sr-only">Clubs on campus</span>
        <QueryBoundary query={clubs} loadingLabel="Loading clubs…">
          {(list) =>
            list.length === 0 ? (
              <EmptyState title="No clubs have joined yet">Club accounts can create their club profile from the club dashboard.</EmptyState>
            ) : (
              <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {list.slice(0, 6).map((c) => (
                  <li key={c.id} className="contents"><ClubCard club={c} /></li>
                ))}
              </ul>
            )
          }
        </QueryBoundary>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            { n: '1', c: 'bg-coral', t: 'Discover', d: 'Search by keyword, category, date or club to find events worth your time.' },
            { n: '2', c: 'bg-emerald', t: 'Register & check in', d: 'Students register once and show a personal QR credential at the door.' },
            { n: '3', c: 'bg-blue', t: 'Share feedback, earn certificates', d: 'Rate events you attended and keep certificates anyone can verify online.' },
          ].map((s) => (
            <div key={s.n} className="rounded-card border border-line bg-white p-6 shadow-card">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg font-extrabold text-white ${s.c === 'bg-coral' ? 'bg-coral-600' : s.c === 'bg-emerald' ? 'bg-emerald-600' : 'bg-blue-600'}`} aria-hidden="true">{s.n}</span>
              <h3 className="mt-4 text-lg font-extrabold">{s.t}</h3>
              <p className="mt-1 text-sm text-ink-soft">{s.d}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
