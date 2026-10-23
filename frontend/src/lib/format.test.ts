import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  initials,
  isRegistrationWindowOpen,
  localInputToUtc,
  parseDateOnly,
  parseUtc,
  toApiTime,
  toInputTime,
  utcToLocalInput,
} from './format'

afterEach(() => vi.useRealTimers())

describe('date helpers', () => {
  it('treats zone-less backend datetimes as UTC', () => {
    expect(parseUtc('2026-11-09T10:30:00').toISOString()).toBe('2026-11-09T10:30:00.000Z')
    expect(parseUtc('2026-11-09T10:30:00Z').toISOString()).toBe('2026-11-09T10:30:00.000Z')
    expect(parseUtc('2026-11-09T10:30:00+05:30').toISOString()).toBe('2026-11-09T05:00:00.000Z')
  })

  it('parses date-only values as local dates without a UTC off-by-one', () => {
    const d = parseDateOnly('2026-11-09')
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 10, 9])
  })

  it('round-trips a datetime-local value through the UTC wire format', () => {
    const wire = localInputToUtc('2026-11-09T18:45')
    expect(wire).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d$/) // naive, no zone suffix
    expect(utcToLocalInput(wire)).toBe('2026-11-09T18:45')
  })

  it('converts HH:MM to the HH:MM:SS the API expects and back', () => {
    expect(toApiTime('09:05')).toBe('09:05:00')
    expect(toApiTime('09:05:30')).toBe('09:05:30')
    expect(toInputTime('09:05:00')).toBe('09:05')
  })
})

describe('isRegistrationWindowOpen', () => {
  const now = new Date('2026-11-01T12:00:00Z')
  it('is open for an UPCOMING event before the deadline', () => {
    vi.useFakeTimers({ now })
    expect(isRegistrationWindowOpen({ status: 'UPCOMING', registration_deadline: '2026-11-02T00:00:00' })).toBe(true)
  })
  it('is closed after the deadline (deadline is UTC)', () => {
    vi.useFakeTimers({ now })
    expect(isRegistrationWindowOpen({ status: 'UPCOMING', registration_deadline: '2026-11-01T11:59:59' })).toBe(false)
  })
  it.each(['ONGOING', 'COMPLETED', 'CANCELLED'])('is closed for %s events', (status) => {
    vi.useFakeTimers({ now })
    expect(isRegistrationWindowOpen({ status, registration_deadline: '2030-01-01T00:00:00' })).toBe(false)
  })
})

describe('initials', () => {
  it('handles missing and multi-word names', () => {
    expect(initials(null)).toBe('?')
    expect(initials('Mugashree')).toBe('M')
    expect(initials('Asha Rao Iyer')).toBe('AI')
  })
})
