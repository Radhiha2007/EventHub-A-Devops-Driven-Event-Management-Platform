import { createContext, useContext } from 'react'
import type { Club } from '@/api/types'

export interface ClubCtx {
  /** Clubs whose contact_email matches the signed-in account (the backend's ownership rule). */
  clubs: Club[]
  club: Club | null
  setClubId: (id: string) => void
}
export const ClubContext = createContext<ClubCtx | null>(null)

export function useMyClub(): ClubCtx {
  const c = useContext(ClubContext)
  if (!c) throw new Error('useMyClub must be used inside the club dashboard')
  return c
}
