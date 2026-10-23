import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/endpoints'
import { errorMessage } from '@/api/client'
import type { AppNotification, NotificationType } from '@/api/types'
import { useAuth } from '@/auth/AuthProvider'
import { QueryBoundary } from '@/components/QueryList'
import { Pill } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState, Notice } from '@/components/ui/States'
import { formatDateTimeUtc } from '@/lib/format'

const typeLabel: Record<NotificationType, string> = {
  EVENT_REMINDER: 'Reminder',
  EVENT_UPDATE: 'Event update',
  REGISTRATION: 'Registration',
  GENERAL: 'General',
}

export function NotificationsPage() {
  const { profile } = useAuth()
  const id = profile!.id
  const qc = useQueryClient()
  const [unreadOnly, setUnreadOnly] = useState(false)
  const key = ['notifications', id, unreadOnly ? 'unread' : 'all']
  const list = useQuery({ queryKey: key, queryFn: () => api.listNotifications(id, unreadOnly) })

  const toggle = useMutation({
    mutationFn: (n: AppNotification) => api.setNotificationRead(n.id, !n.is_read),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['notifications', id] }),
  })

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-extrabold tracking-tight">Notifications</h2>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" className="h-5 w-5 accent-emerald-600" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} />
          Unread only
        </label>
      </div>
      {toggle.isError && <Notice tone="error">{errorMessage(toggle.error)}</Notice>}
      <QueryBoundary query={list} loadingLabel="Loading notifications…">
        {(items) =>
          items.length === 0 ? (
            <EmptyState title={unreadOnly ? "You're all caught up" : 'No notifications yet'}>
              {unreadOnly
                ? 'No unread notifications.'
                : 'Updates about new events, changes to events you registered for, your attendance and issued certificates will show up here.'}
            </EmptyState>
          ) : (
            <ul className="space-y-3">
              {items.map((n) => (
                <li key={n.id} className={`rounded-card border p-4 ${n.is_read ? 'border-line bg-white' : 'border-blue/40 bg-blue-50'}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {!n.is_read && <span className="h-2.5 w-2.5 rounded-full bg-blue" aria-label="Unread" />}
                        <p className="font-extrabold">{n.title}</p>
                        <Pill tone="blue">{typeLabel[n.notification_type] ?? n.notification_type}</Pill>
                      </div>
                      <p className="mt-1 whitespace-pre-line text-sm">{n.message}</p>
                      <p className="mt-1 text-xs text-ink-soft">{formatDateTimeUtc(n.created_at)}</p>
                    </div>
                    <Button size="sm" variant="outline" loading={toggle.isPending && toggle.variables?.id === n.id} onClick={() => toggle.mutate(n)}>
                      Mark as {n.is_read ? 'unread' : 'read'}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )
        }
      </QueryBoundary>
    </div>
  )
}
