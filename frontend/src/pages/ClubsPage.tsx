import { useState } from 'react'
import { ClubCard } from '@/components/ClubCard'
import { QueryBoundary } from '@/components/QueryList'
import { EmptyState } from '@/components/ui/States'
import { useClubs } from '@/lib/queries'

export function ClubsPage() {
  const clubs = useClubs()
  const [term, setTerm] = useState('')
  const needle = term.trim().toLowerCase()
  const filter = <T extends { name: string; description: string | null }>(list: T[]) =>
    needle ? list.filter((c) => `${c.name} ${c.description ?? ''}`.toLowerCase().includes(needle)) : list
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <p className="text-xs font-extrabold uppercase tracking-widest text-coral-600">Communities</p>
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Campus clubs</h1>
      <div className="mt-6 max-w-md">
        <label htmlFor="club-search" className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-soft">Filter clubs</label>
        <input id="club-search" className="input" placeholder="Search by name or description" value={term} onChange={(e) => setTerm(e.target.value)} />
      </div>
      <div className="mt-8">
        <QueryBoundary query={clubs} loadingLabel="Loading clubs…">
          {(all) => {
            const list = filter(all)
            return list.length === 0 ? (
              <EmptyState title={all.length === 0 ? 'No clubs yet' : 'No clubs match your search'}>
                {all.length === 0 ? 'Club accounts can create their club from the club dashboard.' : 'Try a different word.'}
              </EmptyState>
            ) : (
              <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((c) => <li key={c.id} className="contents"><ClubCard club={c} /></li>)}
              </ul>
            )
          }}
        </QueryBoundary>
      </div>
    </div>
  )
}
