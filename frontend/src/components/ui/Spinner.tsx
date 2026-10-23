export function Spinner({ size = 20, label }: { size?: number; label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2">
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        className="animate-spin"
        aria-hidden="true"
        fill="none"
      >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span className="sr-only">{label ?? 'Loading'}</span>
    </span>
  )
}

export function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-20 text-ink-soft">
      <Spinner size={24} label={label} />
      <span aria-hidden="true">{label}</span>
    </div>
  )
}
