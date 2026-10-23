import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/endpoints'
import type { Club } from '@/api/types'

export function useClubs() {
  return useQuery({ queryKey: ['clubs'], queryFn: () => api.listClubs() })
}

/** id -> club lookup for labelling events with their club. */
export function useClubMap() {
  const q = useClubs()
  const map = useMemo(() => new Map<string, Club>((q.data ?? []).map((c) => [c.id, c])), [q.data])
  return { ...q, map }
}
