import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/endpoints'
import { errorMessage } from '@/api/client'
import type { Certificate } from '@/api/types'
import { useAuth } from '@/auth/AuthProvider'
import { QueryBoundary } from '@/components/QueryList'
import { Button, LinkButton } from '@/components/ui/Button'
import { EmptyState, Notice } from '@/components/ui/States'
import { formatDateTimeUtc } from '@/lib/format'

function CertRow({ c }: { c: Certificate }) {
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const event = useQuery({ queryKey: ['event', c.event_id], queryFn: () => api.getEvent(c.event_id) })
  const link = `${window.location.origin}/verify/${encodeURIComponent(c.certificate_code)}`
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* link is visible on the verify page */
    }
  }
  const download = async () => {
    setDownloading(true)
    setDownloadError(null)
    try {
      const { blob, filename } = await api.downloadCertificate(c.id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename ?? `certificate-${c.certificate_code}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setDownloadError(errorMessage(err))
    } finally {
      setDownloading(false)
    }
  }
  return (
    <li className="rounded-card border border-line bg-white p-5 shadow-card">
      <p className="text-xs font-extrabold uppercase tracking-widest text-emerald-700">Certificate of attendance</p>
      <p className="mt-1 text-xl font-extrabold">
        {event.data ? <Link className="hover:underline" to={`/events/${c.event_id}`}>{event.data.title}</Link> : event.isError ? 'Event unavailable' : 'Loading event…'}
      </p>
      <p className="text-sm text-ink-soft">Issued to {c.recipient_name} · {formatDateTimeUtc(c.issued_at)}</p>
      <p className="mt-2 break-all font-mono text-xs">{c.certificate_code}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" loading={downloading} onClick={() => void download()}>Download PDF</Button>
        <LinkButton to={`/verify/${encodeURIComponent(c.certificate_code)}`} size="sm" variant="green">Open verification page</LinkButton>
        <Button size="sm" variant="outline" onClick={() => void copy()}>{copied ? 'Link copied ✓' : 'Copy verification link'}</Button>
      </div>
      {downloadError && <div className="mt-3"><Notice tone="error" title="Couldn't download the certificate">{downloadError}</Notice></div>}
    </li>
  )
}

export function CertificatesPage() {
  const { profile } = useAuth()
  const id = profile!.id
  const q = useQuery({ queryKey: ['certificates', id], queryFn: () => api.listMyCertificates(id) })
  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-extrabold tracking-tight">Certificates</h2>
      <QueryBoundary query={q} loadingLabel="Loading certificates…">
        {(list) =>
          list.length === 0 ? (
            <EmptyState title="No certificates yet" action={<LinkButton to="/events" variant="outline">Find events</LinkButton>}>
              Clubs can issue a certificate once an event is completed and your attendance was checked in.
            </EmptyState>
          ) : (
            <ul className="space-y-4">{list.map((c) => <CertRow key={c.id} c={c} />)}</ul>
          )
        }
      </QueryBoundary>
    </div>
  )
}
