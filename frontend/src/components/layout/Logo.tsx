export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#F05D4E" />
      <circle cx="22" cy="10" r="4" fill="#FFF8F0" />
      <rect x="7" y="9" width="9" height="3.5" rx="1.75" fill="#FFF8F0" />
      <rect x="7" y="15" width="18" height="3.5" rx="1.75" fill="#FFF8F0" />
      <rect x="7" y="21" width="12" height="3.5" rx="1.75" fill="#FFF8F0" />
    </svg>
  )
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark />
      <span className="text-xl font-extrabold tracking-tight">
        Event<span className="text-coral-600">Hub</span>
      </span>
    </span>
  )
}
