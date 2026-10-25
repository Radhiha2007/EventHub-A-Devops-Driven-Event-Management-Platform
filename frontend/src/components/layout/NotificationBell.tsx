import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/endpoints'
import { useAuth } from '@/auth/AuthProvider'

/** Bell with unread count for signed-in students (GET /api/notifications/recipient/{id}?unread_only=true). */
export function NotificationBell({ onClick }: { onClick?: () => void }) {
  const { status, profile } = useAuth()
  const enabled = status === 'signed-in' && profile?.role === 'STUDENT' && profile.onboarding_completed
  const unread = useQuery({
    queryKey: ['notifications', profile?.id, 'unread'],
    queryFn: () => api.listNotifications(profile!.id, true),
    enabled,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  })
  if (!enabled) return null
  const n = unread.data?.length ?? 0
  return (
    <Link
      to="/dashboard/notifications"
      onClick={onClick}
      aria-label={n > 0 ? `Notifications, ${n} unread` : 'Notifications'}
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-charcoal hover:bg-cream-100"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.7 21a2 2 0 0 1-3.4 0" />
      </svg>
      {n > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-coral px-1 text-[11px] font-extrabold text-white">
          {n > 99 ? '99+' : n}
        </span>
      )}
    </Link>
  )
}
