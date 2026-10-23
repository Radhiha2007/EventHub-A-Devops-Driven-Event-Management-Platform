import { beforeEach, describe, expect, it } from 'vitest'
import { STATUS_TRANSITIONS } from '@/api/types'
import { ownsClub } from './clubAccess'
import { findTicket, loadTickets, saveTicket } from './tickets'

describe('STATUS_TRANSITIONS mirrors backend/app/services/event.py', () => {
  it('allows exactly the backend transitions', () => {
    expect(STATUS_TRANSITIONS.UPCOMING).toEqual(['ONGOING', 'COMPLETED', 'CANCELLED'])
    expect(STATUS_TRANSITIONS.ONGOING).toEqual(['COMPLETED', 'CANCELLED'])
    expect(STATUS_TRANSITIONS.COMPLETED).toEqual([])
    expect(STATUS_TRANSITIONS.CANCELLED).toEqual([])
  })
})

describe('ownsClub (email match rule from backend/app/core/club_access.py)', () => {
  const profile = { id: 'u', email: ' Club@Uni.EDU ', full_name: 'C', role: 'CLUB', onboarding_completed: true, is_active: true } as const
  it('matches case-insensitively and ignores surrounding whitespace', () => {
    expect(ownsClub(profile, { contact_email: 'club@uni.edu' })).toBe(true)
  })
  it('does not match a different or missing email', () => {
    expect(ownsClub(profile, { contact_email: 'other@uni.edu' })).toBe(false)
    expect(ownsClub(profile, { contact_email: null })).toBe(false)
    expect(ownsClub(null, { contact_email: 'club@uni.edu' })).toBe(false)
    expect(ownsClub({ ...profile, email: null }, { contact_email: null })).toBe(false)
  })
})

describe('local ticket store', () => {
  beforeEach(() => localStorage.clear())
  const t = (eventId: string, credential: string) => ({ registrationId: 'r' + eventId, eventId, credential, registeredAt: '2026-11-01T00:00:00' })

  it('saves per user and replaces the ticket for the same event', () => {
    expect(saveTicket('u1', t('e1', 'a'))).toBe(true)
    saveTicket('u1', t('e2', 'b'))
    saveTicket('u1', t('e1', 'c'))
    expect(loadTickets('u1').map((x) => x.credential).sort()).toEqual(['b', 'c'])
    expect(findTicket('u1', 'e1')?.credential).toBe('c')
    expect(loadTickets('u2')).toEqual([])
  })

  it('survives corrupt storage', () => {
    localStorage.setItem('eventhub:tickets:u1', '{not json')
    expect(loadTickets('u1')).toEqual([])
  })
})
