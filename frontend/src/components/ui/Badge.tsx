import type { EventStatus } from '@/api/types'
import { titleCase } from '@/lib/format'

const styles: Record<EventStatus, string> = {
  UPCOMING: 'bg-blue-50 text-blue-700 border-blue/30',
  ONGOING: 'bg-emerald-50 text-emerald-700 border-emerald/30',
  COMPLETED: 'bg-charcoal/5 text-ink-soft border-charcoal/15',
  CANCELLED: 'bg-coral-50 text-coral-700 border-coral/30',
}

export function StatusBadge({ status }: { status: EventStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${styles[status]}`}>
      {titleCase(status)}
    </span>
  )
}

export function Pill({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'coral' | 'green' | 'blue' }) {
  const t = {
    neutral: 'bg-cream-100 text-charcoal',
    coral: 'bg-coral-50 text-coral-700',
    green: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-blue-50 text-blue-700',
  }[tone]
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${t}`}>{children}</span>
}
