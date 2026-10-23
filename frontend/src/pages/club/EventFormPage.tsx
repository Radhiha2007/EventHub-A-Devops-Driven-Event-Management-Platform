import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/endpoints'
import { ApiError, errorMessage } from '@/api/client'
import type { EventItem, EventUpdate } from '@/api/types'
import { QueryBoundary } from '@/components/QueryList'
import { Button } from '@/components/ui/Button'
import { Card, Field } from '@/components/ui/Form'
import { Notice } from '@/components/ui/States'
import { localInputToUtc, toApiTime, toInputTime, utcToLocalInput } from '@/lib/format'
import { useMyClub } from './ClubContext'
import { NoClub } from './NoClub'

interface FormState {
  title: string
  description: string
  category: string
  venue: string
  poster_url: string
  event_date: string
  start_time: string
  end_time: string
  capacity: string
  registration_deadline: string
}

function initial(e?: EventItem): FormState {
  return {
    title: e?.title ?? '',
    description: e?.description ?? '',
    category: e?.category ?? '',
    venue: e?.venue ?? '',
    poster_url: e?.poster_url ?? '',
    event_date: e?.event_date ?? '',
    start_time: e ? toInputTime(e.start_time) : '',
    end_time: e ? toInputTime(e.end_time) : '',
    capacity: e ? String(e.capacity) : '',
    registration_deadline: e ? utcToLocalInput(e.registration_deadline) : '',
  }
}

function validate(f: FormState): Partial<Record<keyof FormState, string>> {
  const errs: Partial<Record<keyof FormState, string>> = {}
  if (!f.title.trim()) errs.title = 'Title is required.'
  if (!f.category.trim()) errs.category = 'Category is required.'
  if (!f.venue.trim()) errs.venue = 'Venue is required.'
  if (!f.event_date) errs.event_date = 'Pick a date.'
  if (!f.start_time) errs.start_time = 'Pick a start time.'
  if (!f.end_time) errs.end_time = 'Pick an end time.'
  else if (f.start_time && f.end_time <= f.start_time) errs.end_time = 'End time must be after the start time.'
  const cap = Number(f.capacity)
  if (!f.capacity) errs.capacity = 'Capacity is required.'
  else if (!Number.isInteger(cap) || cap <= 0) errs.capacity = 'Capacity must be a whole number greater than 0.'
  if (!f.registration_deadline) errs.registration_deadline = 'Pick a registration deadline.'
  if (f.poster_url.trim()) {
    try {
      const u = new URL(f.poster_url.trim())
      if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error()
    } catch {
      errs.poster_url = 'Enter a full http(s) image URL, or leave blank.'
    }
  }
  return errs
}

function EventForm({ existing }: { existing?: EventItem }) {
  const { club } = useMyClub()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [f, setF] = useState<FormState>(() => initial(existing))
  const [errs, setErrs] = useState<Partial<Record<keyof FormState, string>>>({})
  const categories = useQuery({ queryKey: ['events', 'all'], queryFn: () => api.listEvents() })
  const suggestions = [...new Set((categories.data ?? []).map((e) => e.category))]

  const set = (k: keyof FormState) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }))

  const save = useMutation({
    mutationFn: async () => {
      const common = {
        title: f.title.trim(),
        description: f.description.trim() || null,
        category: f.category.trim(),
        venue: f.venue.trim(),
        poster_url: f.poster_url.trim() || null,
        event_date: f.event_date,
        start_time: toApiTime(f.start_time),
        end_time: toApiTime(f.end_time),
        capacity: Number(f.capacity),
        // datetime-local is in the user's zone; the backend compares this field with UTC "now".
        registration_deadline: localInputToUtc(f.registration_deadline),
      }
      if (existing) {
        const patch: Record<string, unknown> = {}
        const before = initial(existing)
        ;(Object.keys(common) as (keyof typeof common)[]).forEach((k) => {
          if (f[k] !== before[k]) patch[k] = common[k]
        })
        return Object.keys(patch).length ? api.updateEvent(existing.id, patch as EventUpdate) : existing
      }
      return api.createEvent({ club_id: club!.id, ...common })
    },
    onSuccess: (e) => {
      void qc.invalidateQueries({ queryKey: ['events'] })
      void qc.invalidateQueries({ queryKey: ['event', e.id] })
      navigate(`/club/events/${e.id}`)
    },
  })
  const apiFe = save.error instanceof ApiError ? save.error.fieldErrors : {}

  const submit = (ev: FormEvent) => {
    ev.preventDefault()
    const v = validate(f)
    setErrs(v)
    if (Object.keys(v).length === 0) save.mutate()
  }
  const err = (k: keyof FormState) => errs[k] ?? apiFe[k]

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <Card className="space-y-4">
        <Field label="Title" required error={err('title')}><input className="input" value={f.title} onChange={set('title')} maxLength={255} /></Field>
        <Field label="Description" error={err('description')}><textarea className="input min-h-32" value={f.description} onChange={set('description')} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category" required error={err('category')} hint="Free text, e.g. Technical, Cultural, Sports.">
            <input className="input" list="category-options" value={f.category} onChange={set('category')} maxLength={100} />
          </Field>
          <Field label="Venue" required error={err('venue')}><input className="input" value={f.venue} onChange={set('venue')} maxLength={255} /></Field>
        </div>
        <datalist id="category-options">{suggestions.map((c) => <option key={c} value={c} />)}</datalist>
        <Field label="Poster image URL" error={err('poster_url')} hint="Optional. A link to an image; uploads aren't supported by the backend.">
          <input className="input" inputMode="url" placeholder="https://…" value={f.poster_url} onChange={set('poster_url')} />
        </Field>
      </Card>

      <Card className="grid gap-4 sm:grid-cols-3">
        <Field label="Date" required error={err('event_date')}><input type="date" className="input" value={f.event_date} onChange={set('event_date')} /></Field>
        <Field label="Starts" required error={err('start_time')}><input type="time" className="input" value={f.start_time} onChange={set('start_time')} /></Field>
        <Field label="Ends" required error={err('end_time')}><input type="time" className="input" value={f.end_time} onChange={set('end_time')} /></Field>
        <Field label="Capacity" required error={err('capacity')} hint="Registrations stop when this is reached.">
          <input type="number" min={1} step={1} className="input" value={f.capacity} onChange={set('capacity')} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Registration deadline" required error={err('registration_deadline')} hint="In your local time. Students can't register after this moment.">
            <input type="datetime-local" className="input" value={f.registration_deadline} onChange={set('registration_deadline')} />
          </Field>
        </div>
      </Card>

      {save.isError && <Notice tone="error">{errorMessage(save.error)}</Notice>}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant="green" size="lg" loading={save.isPending}>{existing ? 'Save changes' : 'Create event'}</Button>
        <Link to={existing ? `/club/events/${existing.id}` : '/club/events'} className="inline-flex min-h-12 items-center rounded-xl px-4 font-semibold hover:bg-charcoal/5">Cancel</Link>
      </div>
    </form>
  )
}

export function EventFormPage() {
  const { eventId } = useParams()
  const { club, clubs } = useMyClub()
  const event = useQuery({ queryKey: ['event', eventId], queryFn: () => api.getEvent(eventId!), enabled: Boolean(eventId) })

  if (!eventId) {
    if (!club) return <NoClub />
    return (
      <div className="space-y-5">
        <h2 className="text-2xl font-extrabold tracking-tight">Create an event for {club.name}</h2>
        <EventForm key="new" />
      </div>
    )
  }
  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-extrabold tracking-tight">Edit event</h2>
      <QueryBoundary query={event} loadingLabel="Loading event…">
        {(e) =>
          clubs.some((c) => c.id === e.club_id) ? (
            <EventForm key={e.id} existing={e} />
          ) : (
            <Notice tone="error" title="You can't edit this event">It belongs to a club your account isn't linked to.</Notice>
          )
        }
      </QueryBoundary>
    </div>
  )
}
