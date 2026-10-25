import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/endpoints'
import { ApiError } from '@/api/client'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Form'
import { ErrorState, Notice } from '@/components/ui/States'
import { PageLoader } from '@/components/ui/Spinner'
import { formatDateTimeUtc } from '@/lib/format'

function Result({ code }: { code: string }) {
  const q = useQuery({
    queryKey: ['verify', code],
    queryFn: () => api.verifyCertificate(code),
    retry: false,
  })
  const event = useQuery({
    queryKey: ['event', q.data?.event_id],
    queryFn: () => api.getEvent(q.data!.event_id),
    enabled: Boolean(q.data?.event_id),
  })
  if (q.isPending) return <PageLoader label="Verifying…" />
  if (q.isError) {
    if (q.error instanceof ApiError && q.error.isNotFound) {
      return (
        <Notice tone="error" title="Certificate not found">
          No certificate with the code <code className="break-all">{code}</code> exists. Check for typos and try again.
        </Notice>
      )
    }
    return <ErrorState error={q.error} onRetry={() => void q.refetch()} />
  }
  const c = q.data
  return (
    <div className="rounded-card border-2 border-emerald bg-white p-6 shadow-card">
      <p className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-extrabold text-emerald-700">
        <span aria-hidden="true">✓</span> {c.valid ? 'Valid certificate' : 'Certificate record found'}
      </p>
      <p className="mt-4 text-sm text-ink-soft">This certifies attendance by</p>
      <p className="text-3xl font-extrabold tracking-tight">{c.recipient_name}</p>
      {event.data && (
        <p className="mt-2 text-lg">
          at <Link className="font-bold text-blue-700 hover:underline" to={`/events/${event.data.id}`}>{event.data.title}</Link>
        </p>
      )}
      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-xs font-bold uppercase tracking-wide text-ink-soft">Issued</dt><dd className="font-semibold">{formatDateTimeUtc(c.issued_at)}</dd></div>
        <div><dt className="text-xs font-bold uppercase tracking-wide text-ink-soft">Certificate code</dt><dd className="break-all font-mono text-xs font-semibold">{c.certificate_code}</dd></div>
      </dl>
    </div>
  )
}

export function VerifyPage() {
  const { code } = useParams()
  const navigate = useNavigate()
  const [value, setValue] = useState(code ?? '')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const v = value.trim()
    if (v) navigate(`/verify/${encodeURIComponent(v)}`)
  }
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <p className="text-xs font-extrabold uppercase tracking-widest text-coral-600">Certificates</p>
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Verify a certificate</h1>
      <p className="mt-2 text-ink-soft">Anyone can check that an EventHub certificate is genuine. No account needed.</p>
      <form onSubmit={submit} className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Field label="Certificate code">
            <input className="input font-mono" placeholder="EVH-…" value={value} onChange={(e) => setValue(e.target.value)} />
          </Field>
        </div>
        <Button type="submit" variant="green" disabled={!value.trim()}>Verify</Button>
      </form>
      <div className="mt-8" aria-live="polite">{code && <Result code={code} />}</div>
    </div>
  )
}
