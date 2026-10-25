import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { clubUser, renderWithProviders, student } from '@/test/utils'
import { RequireAuth } from './guards'

const auth = vi.hoisted(() => ({ value: {} as Record<string, unknown> }))
vi.mock('./AuthProvider', () => ({ useAuth: () => auth.value }))

const set = (v: Record<string, unknown>) => { auth.value = { error: null, refreshProfile: vi.fn(), ...v } }
const ui = (role?: 'STUDENT' | 'CLUB') => <RequireAuth role={role}><p>SECRET AREA</p></RequireAuth>

beforeEach(() => set({ status: 'signed-in', profile: student }))

describe('RequireAuth', () => {
  it('shows a loader while the session is being checked', () => {
    set({ status: 'loading', profile: null })
    renderWithProviders(ui('STUDENT'))
    expect(screen.getAllByText(/checking your session/i).length).toBeGreaterThan(0)
    expect(screen.queryByText('SECRET AREA')).not.toBeInTheDocument()
  })

  it.each(['signed-out', 'unconfigured'])('sends %s visitors to sign-in', (status) => {
    set({ status, profile: null })
    renderWithProviders(ui('STUDENT'))
    expect(screen.getByText('SIGN IN PAGE')).toBeInTheDocument()
  })

  it('sends users who have not onboarded to onboarding', () => {
    set({ status: 'signed-in', profile: { ...student, onboarding_completed: false } })
    renderWithProviders(ui('STUDENT'))
    expect(screen.getByText('ONBOARDING PAGE')).toBeInTheDocument()
  })

  it('renders the area for the matching role', () => {
    renderWithProviders(ui('STUDENT'))
    expect(screen.getByText('SECRET AREA')).toBeInTheDocument()
  })

  it('blocks a student from the club area and a club from the student area', () => {
    renderWithProviders(ui('CLUB'))
    expect(screen.queryByText('SECRET AREA')).not.toBeInTheDocument()
    expect(screen.getByText(/area is for club accounts/i)).toBeInTheDocument()
    set({ status: 'signed-in', profile: clubUser })
    renderWithProviders(ui('STUDENT'))
    expect(screen.getByText(/area is for student accounts/i)).toBeInTheDocument()
  })

  it('shows a retryable error when the backend rejects the sign-in, instead of pretending to be signed in', () => {
    set({ status: 'error', profile: null, error: 'The EventHub API rejected your Microsoft sign-in: Invalid Microsoft access token' })
    renderWithProviders(ui('STUDENT'))
    expect(screen.queryByText('SECRET AREA')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(/rejected your Microsoft sign-in/)
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })
})
