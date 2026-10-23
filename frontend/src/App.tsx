import { createBrowserRouter, Outlet, RouterProvider } from 'react-router-dom'
import { RequireAuth } from '@/auth/guards'
import { RootLayout } from '@/components/layout/RootLayout'
import { ClubsPage } from '@/pages/ClubsPage'
import { ClubDetailPage } from '@/pages/ClubDetailPage'
import { EventDetailPage } from '@/pages/EventDetailPage'
import { EventsPage } from '@/pages/EventsPage'
import { HomePage } from '@/pages/HomePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { OnboardingPage } from '@/pages/OnboardingPage'
import { SignInPage } from '@/pages/SignInPage'
import { VerifyPage } from '@/pages/VerifyPage'

/** Dashboards load on demand so the public site stays light. */
const lazyPage = (load: () => Promise<Record<string, unknown>>, name: string) => ({
  lazy: async () => ({ Component: (await load())[name] as React.ComponentType }),
})
const student = (name: string) => lazyPage(() => import('@/pages/student/pages'), name)
const club = (name: string) => lazyPage(() => import('@/pages/club/pages'), name)

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'events', element: <EventsPage /> },
      { path: 'events/:eventId', element: <EventDetailPage /> },
      { path: 'clubs', element: <ClubsPage /> },
      { path: 'clubs/:clubId', element: <ClubDetailPage /> },
      { path: 'verify', element: <VerifyPage /> },
      { path: 'verify/:code', element: <VerifyPage /> },
      { path: 'sign-in', element: <SignInPage /> },
      { path: 'onboarding', element: <OnboardingPage /> },
      {
        path: 'dashboard',
        element: <RequireAuth role="STUDENT"><Outlet /></RequireAuth>,
        children: [
          {
            ...student('StudentLayout'),
            children: [
              { index: true, ...student('OverviewPage') },
              { path: 'tickets', ...student('TicketsPage') },
              { path: 'notifications', ...student('NotificationsPage') },
              { path: 'certificates', ...student('CertificatesPage') },
            ],
          },
        ],
      },
      {
        path: 'club',
        element: <RequireAuth role="CLUB"><Outlet /></RequireAuth>,
        children: [
          {
            ...club('ClubLayout'),
            children: [
              { index: true, ...club('ClubOverviewPage') },
              { path: 'events', ...club('ClubEventsPage') },
              { path: 'events/new', ...club('EventFormPage') },
              { path: 'events/:eventId', ...club('EventManagePage') },
              { path: 'events/:eventId/edit', ...club('EventFormPage') },
              { path: 'check-in', ...club('CheckInPage') },
              { path: 'profile', ...club('ClubProfilePage') },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
