/** Campus-flavoured hero illustration drawn from simple geometric shapes. Decorative only. */
export function CampusIllustration({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 480 420" className={className} role="img" aria-label="Illustration of a campus hall with a ticket and bunting">
      <circle cx="380" cy="90" r="62" fill="#3979D6" />
      <circle cx="110" cy="70" r="26" fill="#15966A" />
      <rect x="40" y="250" width="400" height="110" rx="24" fill="#FBEFE0" />
      {/* hall */}
      <rect x="110" y="170" width="260" height="150" rx="14" fill="#fff" stroke="#252B30" strokeWidth="4" />
      <path d="M96 172 L240 96 L384 172 Z" fill="#F05D4E" stroke="#252B30" strokeWidth="4" strokeLinejoin="round" />
      <circle cx="240" cy="142" r="14" fill="#FFF8F0" stroke="#252B30" strokeWidth="4" />
      <rect x="214" y="236" width="52" height="84" rx="26" fill="#252B30" />
      {[138, 308].map((x) => (
        <rect key={x} x={x} y="206" width="34" height="42" rx="8" fill="#E6EEFA" stroke="#252B30" strokeWidth="4" />
      ))}
      {/* bunting */}
      <path d="M30 200 Q240 330 450 200" fill="none" stroke="#252B30" strokeWidth="3" />
      {[70, 130, 190, 250, 310, 370, 420].map((x, i) => {
        const y = 200 + 100 * (1 - Math.pow((x - 240) / 210, 2)) * 0.74
        const fill = ['#F05D4E', '#15966A', '#3979D6'][i % 3]
        return <path key={x} d={`M${x - 14} ${y - 4} L${x + 14} ${y - 4} L${x} ${y + 26} Z`} fill={fill} />
      })}
      {/* ticket */}
      <g transform="translate(300 300) rotate(-8)">
        <rect width="150" height="72" rx="14" fill="#15966A" stroke="#252B30" strokeWidth="4" />
        <circle cx="100" cy="0" r="9" fill="#FFF8F0" />
        <circle cx="100" cy="72" r="9" fill="#FFF8F0" />
        <line x1="100" y1="12" x2="100" y2="60" stroke="#FFF8F0" strokeWidth="3" strokeDasharray="5 5" />
        <rect x="18" y="22" width="56" height="8" rx="4" fill="#FFF8F0" />
        <rect x="18" y="40" width="38" height="8" rx="4" fill="#FFF8F0" opacity=".7" />
        <rect x="114" y="24" width="24" height="24" rx="4" fill="#FFF8F0" />
      </g>
    </svg>
  )
}
