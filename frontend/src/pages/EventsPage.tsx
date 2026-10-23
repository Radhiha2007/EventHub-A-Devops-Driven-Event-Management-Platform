import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/endpoints'
import { EVENT_STATUSES, type EventListParams, type EventStatus } from '@/api/types'
import { EventCard } from '@/components/EventCard'
import { QueryBoundary } from '@/components/QueryList'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/States'
import { useClubMap } from '@/lib/queries'
import { useDebounced } from '@/lib/useDebounced'
import { titleCase } from '@/lib/format'

export function EventsPage() {
  const [sp, setSp] = useSearchParams()
  const clubs = useClubMap()

  const search = sp.get('search') ?? ''
  const category = sp.get('category') ?? ''
  const status = (sp.get('status') ?? '') as EventStatus | ''
  const date = sp.get('date') ?? ''
  const clubId = sp.get('club') ?? ''

  const [term, setTerm] = useState(search)
  const debounced = useDebounced(term)

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(sp)
    if (value) next.set(key, value)
    else next.delete(key)
    setSp(next, { replace: true })
  }

  // keep the URL in sync with the debounced search box
  useEffect(() => {
    if (debounced !== search) setParam('search', debounced.trim())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  const params: EventListParams = {
    search: search || undefined,
    category: category || undefined,
    event_date: date || undefined,
    club_id: clubId || undefined,
    event_status: status || undefined,
  }
  const events = useQuery({ queryKey: ['events', params], queryFn: () => api.listEvents(params) })

  // The backend has no categories endpoint; category is a free-text field, so offer the ones in use.
  const everything = useQuery({ queryKey: ['events', 'all'], queryFn: () => api.listEvents() })
  const categories = useMemo(
    () => [...new Set((everything.data ?? []).map((e) => e.category))].sort((a, b) => a.localeCompare(b)),
    [everything.data],
  )

  const hasFilters = Boolean(search || category || status || date || clubId)

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <p className="text-xs font-extrabold uppercase tracking-widest text-coral-600">Discover</p>
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Campus events</h1>

      <form
        role="search"
        aria-label="Filter events"
        onSubmit={(e) => e.preventDefault()}
        className="mt-6 grid gap-3 rounded-card border border-line bg-white p-4 shadow-card sm:grid-cols-2 lg:grid-cols-5"
      >
        <div className="sm:col-span-2 lg:col-span-2">
          <label htmlFor="f-search" className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-soft">Search</label>
          <input id="f-search" className="input" placeholder="Title, description or venue" value={term} onChange={(e) => setTerm(e.target.value)} />
        </div>
        <div>
          <label htmlFor="f-cat" className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-soft">Category</label>
          <select id="f-cat" className="input" value={category} onChange={(e) => setParam('category', e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            {category && !categories.includes(category) && <option value={category}>{category}</option>}
          </select>
        </div>
        <div>
          <label htmlFor="f-status" className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-soft">Status</label>
          <select id="f-status" className="input" value={status} onChange={(e) => setParam('status', e.target.value)}>
            <option value="">Any status</option>
            {EVENT_STATUSES.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="f-date" className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-soft">Date</label>
          <input id="f-date" type="date" className="input" value={date} onChange={(e) => setParam('date', e.target.value)} />
        </div>
        <div className="sm:col-span-2 lg:col-span-4">
          <label htmlFor="f-club" className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-soft">Club</label>
          <select id="f-club" className="input" value={clubId} onChange={(e) => setParam('club', e.target.value)}>
            <option value="">All clubs</option>
            {(clubs.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <Button
            variant="outline"
            className="w-full"
            disabled={!hasFilters}
            onClick={() => {
              setTerm('')
              setSp(new URLSearchParams(), { replace: true })
            }}
          >
            Clear filters
          </Button>
        </div>
      </form>

      <div className="mt-8" aria-live="polite">
        <QueryBoundary query={events} loadingLabel="Loading events…">
          {(list) =>
            list.length === 0 ? (
              <EmptyState
                title={hasFilters ? 'No events match those filters' : 'No events have been published yet'}
                action={hasFilters ? <Button variant="outline" onClick={() => { setTerm(''); setSp(new URLSearchParams(), { replace: true }) }}>Clear filters</Button> : undefined}
              >
                {hasFilters ? 'Try a broader search or remove a filter.' : 'Clubs will post events here once they create them.'}
              </EmptyState>
            ) : (
              <>
                <p className="mb-4 text-sm font-semibold text-ink-soft">{list.length} event{list.length === 1 ? '' : 's'}</p>
                <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((e) => (
                    <li key={e.id} className="contents"><EventCard event={e} club={clubs.map.get(e.club_id)} /></li>
                  ))}
                </ul>
              </>
            )
          }
        </QueryBoundary>
      </div>
    </div>
  )
}
