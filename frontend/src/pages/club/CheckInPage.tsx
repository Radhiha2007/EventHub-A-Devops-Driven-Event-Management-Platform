import { CheckInPanel } from '@/components/CheckInPanel'
import { Card } from '@/components/ui/Form'

export function CheckInPage() {
  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-extrabold tracking-tight">Attendance check-in</h2>
      <p className="text-sm text-ink-soft">
        The credential identifies the event on its own, and the backend only accepts it from the club that owns that
        event. Each credential can be used once.
      </p>
      <Card><CheckInPanel /></Card>
    </div>
  )
}
