import { DashboardLayout } from '@/components/layout/DashboardLayout'

export function StudentLayout() {
  return (
    <DashboardLayout
      title="Student dashboard"
      items={[
        { to: '/dashboard', label: 'Overview', end: true },
        { to: '/dashboard/tickets', label: 'My tickets' },
        { to: '/dashboard/notifications', label: 'Notifications' },
        { to: '/dashboard/certificates', label: 'Certificates' },
      ]}
    />
  )
}
