import { Link } from 'react-router-dom'
import { RegistrationTicket } from '@/components/TicketCard'
import { QueryBoundary } from '@/components/QueryList'
import { LinkButton } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/States'
import { useMyRegistrations } from '@/lib/useMyRegistrations'

export function TicketsPage() {
  const regs = useMyRegistrations()
  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-extrabold tracking-tight">My tickets</h2>
      <QueryBoundary query={regs} loadingLabel="Loading your registrations…">
        {(list) =>
          list.length === 0 ? (
            <EmptyState title="No registrations yet" action={<LinkButton to="/events">Find an event</LinkButton>}>
              Register for an event and your ticket will appear here.
            </EmptyState>
          ) : (
            <ul className="space-y-5">
              {[...list].sort((a, b) => b.registered_at.localeCompare(a.registered_at)).map((r) => (
                <li key={r.id}>
                  <RegistrationTicket registration={r} event={r.event} />
                  <p className="mt-2 text-sm">
                    <Link to={`/events/${r.event_id}`} className="font-bold text-blue-700 hover:underline">
                      {r.event.title} — open event page →
                    </Link>
                  </p>
                </li>
              ))}
            </ul>
          )
        }
      </QueryBoundary>
    </div>
  )
}
