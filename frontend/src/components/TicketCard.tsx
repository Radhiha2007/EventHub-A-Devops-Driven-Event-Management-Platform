import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/endpoints'
import { errorMessage } from '@/api/client'
import type { EventItem, Registration } from '@/api/types'
import { useAuth } from '@/auth/AuthProvider'
import { formatDate, formatDateTimeUtc, formatTimeRange } from '@/lib/format'
import { loadTickets, saveTicket, type StoredTicket } from '@/lib/tickets'
import { Button } from './ui/Button'
import { Notice } from './ui/States'

export function TicketCard({ ticket, event }: { ticket: StoredTicket; event?: EventItem }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(ticket.credential)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard blocked: the credential is visible and selectable below */
    }
  }
  return (
    <div className="overflow-hidden rounded-card border border-line bg-white shadow-card">
      <div className="flex flex-col items-center gap-4 bg-emerald-50 p-5 sm:flex-row sm:items-center">
        <div className="rounded-2xl bg-white p-3 ring-1 ring-line">
          <QRCodeSVG value={ticket.credential} size={148} level="M" role="img" aria-label="Your check-in QR code" />
        </div>
        <div className="min-w-0 text-center sm:text-left">
          <p className="text-xs font-extrabold uppercase tracking-widest text-emerald-700">Check-in credential</p>
          {event && <p className="mt-1 text-lg font-extrabold">{event.title}</p>}
          {event && (
            <p className="text-sm text-ink-soft">
              {formatDate(event.event_date)} · {formatTimeRange(event.start_time, event.end_time)} · {event.venue}
            </p>
          )}
          <p className="mt-2 text-xs text-ink-soft">
            Show this QR code to the club at the door. They can also type the code below.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-line px-5 py-3">
        <code className="min-w-0 flex-1 break-all rounded-lg bg-cream-100 px-2.5 py-1.5 text-xs" aria-label="Credential text">
          {ticket.credential}
        </code>
        <Button variant="outline" size="sm" onClick={() => void copy()}>
          {copied ? 'Copied ✓' : 'Copy'}
        </Button>
      </div>
    </div>
  )
}

/** A backend registration shown as a ticket: cached QR if present, otherwise (re)issue one from the API. */
export function RegistrationTicket({ registration, event }: { registration: Registration; event?: EventItem }) {
  const { profile } = useAuth()
  const uid = profile!.id
  const qc = useQueryClient()
  const [cached, setCached] = useState<StoredTicket | undefined>(() =>
    loadTickets(uid).find((t) => t.registrationId === registration.id),
  )
  const [confirm, setConfirm] = useState(false)
  const issue = useMutation({
    mutationFn: () => api.reissueQr(registration.id),
    onSuccess: (r) => {
      const t: StoredTicket = {
        registrationId: registration.id,
        eventId: registration.event_id,
        credential: r.qr_credential,
        registeredAt: registration.registered_at,
      }
      saveTicket(uid, t)
      setCached(t)
      setConfirm(false)
      void qc.invalidateQueries({ queryKey: ['my-registrations'] })
    },
  })

  if (registration.checked_in_at) {
    return (
      <Notice tone="success" title="You're checked in ✓">
        Attendance recorded {formatDateTimeUtc(registration.checked_in_at)}. The QR code is no longer needed.
      </Notice>
    )
  }
  if (cached) return <TicketCard ticket={cached} event={event} />
  return (
    <div className="space-y-3 rounded-card border border-line bg-white p-5">
      <p className="text-sm">
        You're registered. Your QR code isn't saved on this device — generate one to show at check-in.
      </p>
      {confirm ? (
        <Notice tone="warn" title="Generate a new QR code?">
          Any QR code you generated earlier (on another device) will stop working.
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="green" loading={issue.isPending} onClick={() => issue.mutate()}>Generate</Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>Cancel</Button>
          </div>
        </Notice>
      ) : (
        <Button variant="green" onClick={() => setConfirm(true)}>Show my QR code</Button>
      )}
      {issue.isError && <Notice tone="error">{errorMessage(issue.error)}</Notice>}
    </div>
  )
}
