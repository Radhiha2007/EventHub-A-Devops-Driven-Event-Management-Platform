import type { Club, UserProfile } from '@/api/types'

/**
 * The backend authorises a CLUB account to manage a club only when the account email equals
 * the club's contact_email (case-insensitive) — see backend/app/core/club_access.py.
 * There is no endpoint returning "my clubs", so we derive it the same way from GET /api/clubs.
 */
export function ownsClub(profile: UserProfile | null, club: Pick<Club, 'contact_email'>): boolean {
  const a = (profile?.email ?? '').trim().toLowerCase()
  const b = (club.contact_email ?? '').trim().toLowerCase()
  return Boolean(a) && a === b
}
