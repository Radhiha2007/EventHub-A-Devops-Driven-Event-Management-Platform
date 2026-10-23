import type { ReactElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { EventItem, UserProfile } from '@/api/types'

export const student: UserProfile = {
  id: '22222222-2222-4222-8222-222222222222',
  email: 'stu@uni.edu',
  full_name: 'Stu Dent',
  role: 'STUDENT',
  onboarding_completed: true,
  is_active: true,
}
export const clubUser: UserProfile = { ...student, id: '33333333-3333-4333-8333-333333333333', email: 'club@uni.edu', full_name: 'Club Admin', role: 'CLUB' }

export const baseEvent: EventItem = {
  id: '44444444-4444-4444-8444-444444444444',
  club_id: '55555555-5555-4555-8555-555555555555',
  title: 'Hack Night',
  description: 'Build things.',
  category: 'Technical',
  venue: 'Lab 2',
  poster_url: null,
  event_date: '2030-05-01',
  start_time: '18:00:00',
  end_time: '20:00:00',
  capacity: 50,
  registration_deadline: '2030-04-30T12:00:00',
  status: 'UPCOMING',
  created_at: '2026-10-01T00:00:00',
}

export function renderWithProviders(ui: ReactElement, opts: { route?: string; path?: string } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const route = opts.route ?? '/'
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path={opts.path ?? '*'} element={ui} />
          <Route path="/sign-in" element={<p>SIGN IN PAGE</p>} />
          <Route path="/onboarding" element={<p>ONBOARDING PAGE</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
