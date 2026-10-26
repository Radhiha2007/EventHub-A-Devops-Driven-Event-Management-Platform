import campusImage from '@/assets/campus-life.png'

export function CampusIllustration({ className = '' }: { className?: string }) {
  return (
    <div className={`relative isolate overflow-hidden rounded-[2rem] bg-[#FFF8F0] ${className}`}>
      <img
        src={campusImage}
        className="block h-auto w-full"
        alt="A colourful campus collage featuring events, students, flowers and a clock tower"
        width={1024}
        height={1024}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{
          boxShadow: 'inset 0 0 35px 12px #FFF8F0',
          opacity: 0.25,
        }}
      />
    </div>
  )
}
