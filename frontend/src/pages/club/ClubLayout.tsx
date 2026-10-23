import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/endpoints'
import { useAuth } from '@/auth/AuthProvider'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ErrorState } from '@/components/ui/States'
import { PageLoader } from '@/components/ui/Spinner'
import { ownsClub } from '@/lib/clubAccess'
import { ClubContext } from './ClubContext'

const KEY = 'eventhub:selectedClub'

export function ClubLayout() {
  const { profile } = useAuth()
  const all = useQuery({ queryKey: ['clubs'], queryFn: () => api.listClubs() })
  const [selected, setSelected] = useState<string | null>(() => {
    try {
      return localStorage.getItem(KEY)
    } catch {
      return null
    }
  })

  const mine = useMemo(() => (all.data ?? []).filter((c) => ownsClub(profile, c)), [all.data, profile])
  const club = mine.find((c) => c.id === selected) ?? mine[0] ?? null

  if (all.isPending) return <PageLoader label="Loading your club…" />
  if (all.isError) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <ErrorState error={all.error} onRetry={() => void all.refetch()} />
      </div>
    )
  }

  return (
    <ClubContext.Provider
      value={{
        clubs: mine,
        club,
        setClubId: (id) => {
          setSelected(id)
          try {
            localStorage.setItem(KEY, id)
          } catch {
            /* non-critical */
          }
        },
      }}
    >
      <DashboardLayout
        title="Club dashboard"
        items={[
          { to: '/club', label: 'Overview', end: true },
          { to: '/club/events', label: 'Events' },
          { to: '/club/check-in', label: 'Check-in' },
          { to: '/club/profile', label: 'Club profile' },
        ]}
      />
    </ClubContext.Provider>
  )
}
