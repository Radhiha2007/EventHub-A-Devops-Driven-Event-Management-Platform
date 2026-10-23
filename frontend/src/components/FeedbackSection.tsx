import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/endpoints'
import { ApiError, errorMessage } from '@/api/client'
import type { EventItem } from '@/api/types'
import { useAuth } from '@/auth/AuthProvider'
import { useMyRegistrations } from '@/lib/useMyRegistrations'
import { formatDateTimeUtc } from '@/lib/format'
import { QueryBoundary } from './QueryList'
import { Button } from './ui/Button'
import { Field } from './ui/Form'
import { EmptyState, Notice } from './ui/States'

const MAX_COMMENT = 2000

function Stars({ value }: { value: number }) {
  return (
    <span aria-label={`${value} out of 5`} className="text-[#d98a00]">
      {'★'.repeat(value)}
      <span className="text-charcoal/20">{'★'.repeat(5 - value)}</span>
    </span>
  )
}

export function FeedbackSection({ event }: { event: EventItem }) {
  const { profile, status } = useAuth()
  const qc = useQueryClient()
  const myRegs = useMyRegistrations()
  const attended = Boolean(myRegs.data?.some((r) => r.event_id === event.id && r.checked_in_at))
  const feedback = useQuery({ queryKey: ['feedback', event.id], queryFn: () => api.listEventFeedback(event.id) })

  const [rating, setRating] = useState(0)
  const [comments, setComments] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const submit = useMutation({
    mutationFn: () => api.submitFeedback({ event_id: event.id, rating, comments: comments.trim() || null }),
    onSuccess: () => {
      setRating(0)
      setComments('')
      void qc.invalidateQueries({ queryKey: ['feedback', event.id] })
    },
  })

  // Backend rule: STUDENT, event COMPLETED, and the student must have been checked in (one feedback per event).
  const isStudent = status === 'signed-in' && profile?.role === 'STUDENT'
  const canGiveFeedback = isStudent && event.status === 'COMPLETED' && attended

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (rating < 1) {
      setFormError('Choose a rating from 1 to 5.')
      return
    }
    setFormError(null)
    submit.mutate()
  }

  const fieldErrors = submit.error instanceof ApiError ? submit.error.fieldErrors : {}

  return (
    <section aria-labelledby="fb-h" className="mt-10">
      <h2 id="fb-h" className="text-2xl font-extrabold tracking-tight">Feedback</h2>

      <QueryBoundary query={feedback} loadingLabel="Loading feedback…">
        {(list) => {
          const avg = list.length ? list.reduce((s, f) => s + f.rating, 0) / list.length : 0
          return (
            <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
              <div>
                {canGiveFeedback ? (
                  <form onSubmit={onSubmit} className="space-y-4 rounded-card border border-line bg-white p-5 shadow-card" noValidate>
                    <fieldset>
                      <legend className="mb-1.5 text-sm font-bold">Your rating <span className="text-coral-600" aria-hidden="true">*</span></legend>
                      <div className="flex gap-1" role="radiogroup" aria-label="Rating">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            role="radio"
                            aria-checked={rating === n}
                            aria-label={`${n} star${n > 1 ? 's' : ''}`}
                            onClick={() => setRating(n)}
                            className={`h-11 w-11 rounded-xl text-2xl transition-colors ${n <= rating ? 'bg-[#fff2d6] text-[#d98a00]' : 'bg-cream-100 text-charcoal/30 hover:text-charcoal/60'}`}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                      {formError && <p role="alert" className="mt-1 text-xs font-semibold text-coral-700">{formError}</p>}
                      {fieldErrors.rating && <p role="alert" className="mt-1 text-xs font-semibold text-coral-700">{fieldErrors.rating}</p>}
                    </fieldset>
                    <Field label="Comments" hint={`${comments.length}/${MAX_COMMENT}`} error={fieldErrors.comments}>
                      <textarea className="input min-h-28" maxLength={MAX_COMMENT} value={comments} onChange={(e) => setComments(e.target.value)} />
                    </Field>
                    {submit.isError && !Object.keys(fieldErrors).length && <Notice tone="error">{errorMessage(submit.error)}</Notice>}
                    {submit.isSuccess && <Notice tone="success">Thanks — your feedback was saved.</Notice>}
                    <Button type="submit" variant="green" loading={submit.isPending}>Submit feedback</Button>
                    <p className="text-xs text-ink-soft">One feedback per event. Your name isn't shown with it.</p>
                  </form>
                ) : (
                  <Notice tone="info">
                    {event.status !== 'COMPLETED'
                      ? 'Feedback opens once the event is completed.'
                      : status !== 'signed-in'
                        ? 'Sign in with a student account to leave feedback.'
                        : !isStudent
                          ? 'Only student accounts can leave feedback.'
                          : 'Only students who were checked in at the event can leave feedback.'}
                  </Notice>
                )}
              </div>

              <div>
                {list.length > 0 && (
                  <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <Stars value={Math.round(avg)} />
                    <span>{avg.toFixed(1)} average · {list.length} response{list.length === 1 ? '' : 's'}</span>
                  </p>
                )}
                {list.length === 0 ? (
                  <EmptyState title="No feedback yet">Be the first to share how it went.</EmptyState>
                ) : (
                  <ul className="space-y-3">
                    {list.map((f) => (
                      <li key={f.id} className="rounded-xl border border-line bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                          <Stars value={f.rating} />
                          <time className="text-xs text-ink-soft" dateTime={f.created_at}>{formatDateTimeUtc(f.created_at)}</time>
                        </div>
                        {f.comments && <p className="mt-2 whitespace-pre-line text-sm">{f.comments}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )
        }}
      </QueryBoundary>
    </section>
  )
}
