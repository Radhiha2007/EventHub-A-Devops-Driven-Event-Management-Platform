import type { ReactNode } from 'react'
import { ApiError } from '@/api/client'
import { Button } from './Button'

export function Notice({
  tone = 'info',
  title,
  children,
  className = '',
}: {
  tone?: 'info' | 'success' | 'warn' | 'error'
  title?: string
  children?: ReactNode
  className?: string
}) {
  const tones = {
    info: 'bg-blue-50 border-blue/30 text-blue-700',
    success: 'bg-emerald-50 border-emerald/30 text-emerald-700',
    warn: 'bg-[#fff2d6] border-[#e7b84a]/60 text-[#6b4a00]',
    error: 'bg-coral-50 border-coral/40 text-coral-700',
  }
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-xl border px-4 py-3 text-sm ${tones[tone]} ${className}`}
    >
      {title && <p className="font-bold">{title}</p>}
      {children && <div className={title ? 'mt-0.5' : ''}>{children}</div>}
    </div>
  )
}

/** Failed request. Never rendered as an "empty" list. */
export function ErrorState({
  error,
  onRetry,
  title,
}: {
  error: unknown
  onRetry?: () => void
  title?: string
}) {
  const api = error instanceof ApiError ? error : null
  const heading =
    title ??
    (api?.isNetworkError
      ? "Can't reach the EventHub API"
      : api?.isForbidden
        ? "You don't have access to this"
        : api?.isNotFound
          ? 'Not found'
          : 'Something went wrong')
  const message = api?.detail ?? (error instanceof Error ? error.message : 'Unexpected error.')
  return (
    <div role="alert" className="rounded-card border border-coral/40 bg-coral-50 p-6 text-center">
      <p className="text-lg font-extrabold text-coral-700">{heading}</p>
      <p className="mx-auto mt-1 max-w-xl text-sm text-charcoal/80">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string
  children?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="rounded-card border border-dashed border-charcoal/25 bg-white/60 p-8 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-cream-100" aria-hidden="true">
        <span className="block h-4 w-4 rounded-full bg-coral" />
        <span className="-ml-1 block h-4 w-4 rotate-45 bg-blue" />
      </div>
      <p className="font-extrabold">{title}</p>
      {children && <div className="mx-auto mt-1 max-w-md text-sm text-ink-soft">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/** For capabilities the backend simply does not provide (distinct from a failed request). */
export function Limitation({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-[#e7b84a] bg-[#fff8e6] px-4 py-3 text-sm text-[#5c4200]">
      <p className="font-bold">
        <span aria-hidden="true">ⓘ </span>
        {title}
      </p>
      <div className="mt-0.5">{children}</div>
    </div>
  )
}
